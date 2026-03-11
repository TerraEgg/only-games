"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Loader2,
  RefreshCcw,
  WifiOff,
  Download,
} from "lucide-react";

interface GameEmbedProps {
  url: string;
  title: string;
}

/** Check if a URL points to a .swf file */
function isSWF(url: string): boolean {
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    return pathname.toLowerCase().endsWith(".swf");
  } catch {
    return url.toLowerCase().endsWith(".swf");
  }
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 0.01) {
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
  }
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(gb < 10 ? 1 : 0)} GB`;
}

function getLikelyTotalBytes(headers: Headers): number | null {
  const len = headers.get("content-length");
  if (!len) return null;
  const n = Number(len);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function GameEmbed({ url, title }: GameEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const ruffleContainerRef = useRef<HTMLDivElement>(null);
  const rufflePlayerRef = useRef<HTMLElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fsMode, setFsMode] = useState<"none" | "native" | "fallback">("none");
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [swf, setSwf] = useState(false);

  // Loading UX + resilience
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [loadElapsed, setLoadElapsed] = useState(0);
  const loadStartRef = useRef(Date.now());

  // Loop detection for iframe games
  const iframeLoadCountRef = useRef(0);
  const iframeLoadTimestampsRef = useRef<number[]>([]);
  const loopDetectedRef = useRef(false);

  // Detect SWF after mount to avoid hydration mismatch
  useEffect(() => {
    setSwf(isSWF(url));
  }, [url]);

  // Reset state whenever the game url changes or we force reload
  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    setDownloadedBytes(0);
    setTotalBytes(null);
    setLoadElapsed(0);
    loadStartRef.current = Date.now();
    iframeLoadCountRef.current = 0;
    iframeLoadTimestampsRef.current = [];
    loopDetectedRef.current = false;
  }, [url, reloadToken, swf]);

  // Elapsed timer while loading
  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => {
      setLoadElapsed(Math.floor((Date.now() - loadStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [loading]);

  const retry = useCallback(() => {
    setReloadToken((t) => t + 1);
  }, []);

  // ── Fire game-open on mount, game-close on unmount ────────────
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("game-open", { detail: { url, title } })
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("game-close", { detail: { url, title } })
      );
    };
  }, [url, title]);

  // ── Keep iframe alive — prevent browser from throttling/freezing ──
  useEffect(() => {
    if (swf) return;
    if (loading) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Periodically poke the iframe to prevent the browser from suspending it
    const iv = setInterval(() => {
      try {
        iframe.contentWindow?.postMessage("keep-alive", "*");
      } catch {
        // cross-origin — the postMessage attempt alone keeps the frame alive
      }
    }, 10_000);

    return () => clearInterval(iv);
  }, [swf, loading, reloadToken]);

  // ── Load Ruffle for SWF games ─────────────────────────────────
  useEffect(() => {
    if (!swf) return;

    let cancelled = false;
    // Track if we already fetched to prevent duplicate downloads
    const abortController = new AbortController();

    async function loadRuffle() {
      try {
        // Best-effort download progress — only fetch once
        try {
          const swfUrl = url.startsWith("/")
            ? url
            : `/api/swf-proxy?url=${encodeURIComponent(url)}`;

          const res = await fetch(swfUrl, {
            signal: abortController.signal,
            cache: "force-cache",
          });

          if (res.ok && res.body) {
            const total = getLikelyTotalBytes(res.headers);
            if (total) setTotalBytes(total);

            const reader = res.body.getReader();
            let received = 0;
            while (true) {
              const { done, value } = await reader.read();
              if (done || cancelled) break;
              if (value) {
                received += value.byteLength;
                if (!cancelled) setDownloadedBytes(received);
              }
            }
          }
        } catch (e: unknown) {
          // If it was an abort, stop entirely
          if (e instanceof DOMException && e.name === "AbortError") return;
          // Ignore other progress errors; Ruffle load still might succeed
        }

        if (cancelled) return;

        // Dynamically load Ruffle if not already loaded
        if (!(window as unknown as Record<string, unknown>).RufflePlayer) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "/ruffle/ruffle.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Ruffle"));
            document.head.appendChild(script);
          });
        }

        if (cancelled) return;

        const ruffle = (window as unknown as Record<string, unknown>)
          .RufflePlayer as {
          newest: () => {
            createPlayer: () => HTMLElement & {
              load: (config: Record<string, unknown>) => Promise<void>;
            };
          };
        };

        const player = ruffle.newest().createPlayer();
        player.style.width = "100%";
        player.style.height = "100%";

        if (ruffleContainerRef.current) {
          ruffleContainerRef.current.innerHTML = "";
          ruffleContainerRef.current.appendChild(player);
          rufflePlayerRef.current = player;
        }

        const swfUrl = url.startsWith("/")
          ? url
          : `/api/swf-proxy?url=${encodeURIComponent(url)}`;

        await player.load({
          url: swfUrl,
          autoplay: "on",
          unmuteOverlay: "hidden",
          logLevel: "error",
          contextMenu: "rightClickOnly",
          preferredRenderer: "webgl",
          maxExecutionDuration: 15,
          playerRuntime: "flashPlayer",
        });

        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) {
          setLoadError("This game failed to load. Please try again.");
          setLoading(false);
        }
      }
    }

    loadRuffle();

    return () => {
      cancelled = true;
      abortController.abort();
      if (ruffleContainerRef.current) {
        ruffleContainerRef.current.innerHTML = "";
      }
      rufflePlayerRef.current = null;
    };
  }, [swf, url, reloadToken]);

  // ── iframe onLoad handler with loop detection ─────────────────
  const handleIframeLoad = useCallback(() => {
    const now = Date.now();
    iframeLoadCountRef.current += 1;
    iframeLoadTimestampsRef.current.push(now);

    // Keep only the last 10 timestamps
    if (iframeLoadTimestampsRef.current.length > 10) {
      iframeLoadTimestampsRef.current = iframeLoadTimestampsRef.current.slice(-10);
    }

    const timestamps = iframeLoadTimestampsRef.current;
    const loadCount = iframeLoadCountRef.current;

    // Loop detection: if we've had 4+ loads within 15 seconds, it's looping
    if (loadCount >= 4 && timestamps.length >= 4) {
      const oldest = timestamps[timestamps.length - 4];
      const elapsed = now - oldest;
      if (elapsed < 15_000) {
        // Detected a loop — stop the iframe from reloading
        loopDetectedRef.current = true;
        setLoadError(
          "This game appears to be stuck in a loading loop. Try clicking Retry — if it persists, the game host may be having issues."
        );
        setLoading(false);

        // Stop the iframe from further loading
        try {
          const iframe = iframeRef.current;
          if (iframe) {
            iframe.contentWindow?.stop();
          }
        } catch {
          // cross-origin
        }
        return;
      }
    }

    // Normal load success — first load only
    if (loadCount === 1 || !loopDetectedRef.current) {
      setLoadError(null);
      setLoading(false);

      // Restore save data cross-domain to terraegg.github.io
      try {
        if (url && url.includes("terraegg.github.io")) {
          const iframe = iframeRef.current;
          if (iframe && iframe.contentWindow) {
            const saves: Record<string, string> = {};
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && !k.startsWith("og_") && !k.startsWith("next")) {
                const v = localStorage.getItem(k);
                if (v !== null) saves[k] = v;
              }
            }
            iframe.contentWindow.postMessage(
              { type: "RESTORE_SAVE_DATA", payload: JSON.stringify(saves) },
              "https://terraegg.github.io"
            );
          }
        }
      } catch (e) {
        console.error("Failed to restore saves to remote iframe", e);
      }
    }
  }, [url]);

  // If an iframe never fires onLoad, auto-timeout and offer retry
  useEffect(() => {
    if (swf) return;
    if (!loading) return;

    const t = window.setTimeout(() => {
      setLoadError((prev) =>
        prev ?? "This game is taking too long to load."
      );
      setLoading(false);
    }, 45_000);

    return () => window.clearTimeout(t);
  }, [loading, swf, url, reloadToken]);

  // ── Fullscreen toggle ──────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    if (fsMode !== "none") {
      // Currently fullscreen — exit
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          // event handler or setState below will clean up
        }
      }
      setFsMode("none");
      setIsFullscreen(false);
      return;
    }

    // Try fullscreening the iframe / ruffle element directly first
    // This gives the game proper fullscreen dimensions from the browser
    const gameEl = swf
      ? ruffleContainerRef.current
      : iframeRef.current;
    const containerEl = containerRef.current;

    // Attempt 1: fullscreen the game element directly
    if (gameEl) {
      try {
        await gameEl.requestFullscreen();
        setFsMode("native");
        setIsFullscreen(true);
        return;
      } catch {
        // Game element can't go fullscreen — try container
      }
    }

    // Attempt 2: fullscreen the container div
    if (containerEl) {
      try {
        await containerEl.requestFullscreen();
        setFsMode("native");
        setIsFullscreen(true);
        return;
      } catch {
        // Native failed entirely
      }
    }

    // Attempt 3: CSS fallback
    setFsMode("fallback");
    setIsFullscreen(true);
  }, [fsMode, swf]);

  // Sync when browser exits native fullscreen (Escape key, etc.)
  useEffect(() => {
    function onFsChange() {
      if (!document.fullscreenElement && fsMode === "native") {
        setFsMode("none");
        setIsFullscreen(false);
      }
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [fsMode]);

  // Escape key exits CSS fallback fullscreen
  useEffect(() => {
    if (fsMode !== "fallback") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setFsMode("none");
        setIsFullscreen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fsMode]);

  // ── Volume / mute toggle ──────────────────────────────────────
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = next ? 0 : 1;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      const ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      audioCtxRef.current = ctx;
      gainNodeRef.current = gain;
    } catch {}
    return () => {
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  const progressPct =
    totalBytes && totalBytes > 0
      ? Math.min(Math.round((downloadedBytes / totalBytes) * 100), 100)
      : null;
  const progressText =
    downloadedBytes > 0 || totalBytes
      ? `${formatBytes(downloadedBytes)}${
          totalBytes ? ` / ${formatBytes(totalBytes)}` : ""
        }`
      : null;

  return (
    <div
      ref={containerRef}
      className={`game-container group relative ${
        fsMode === "native"
          ? "game-container--native-fs"
          : fsMode === "fallback"
            ? "game-container--fs-fallback"
            : ""
      }`}
    >
      {/* Loading / Error overlay */}
      {(loading || loadError) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/90 rounded-2xl border border-zinc-800/60">
          <div className="flex w-full max-w-xs flex-col items-center gap-4 px-6 text-center">
            {loadError ? (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
                  <WifiOff className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{"Couldn't load game"}</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{loadError}</p>
                </div>
                <button
                  onClick={retry}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-500"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Retry
                </button>
              </>
            ) : (
              <>
                <div className="relative flex h-16 w-16 items-center justify-center">
                  {progressPct !== null ? (
                    <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                      <circle
                        cx="32" cy="32" r="28" fill="none"
                        stroke="currentColor" strokeWidth="3"
                        className="text-zinc-800"
                      />
                      <circle
                        cx="32" cy="32" r="28" fill="none"
                        stroke="currentColor" strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPct / 100)}`}
                        className="text-accent-400 transition-all duration-300"
                      />
                    </svg>
                  ) : (
                    <Loader2 className="h-10 w-10 animate-spin text-accent-400" />
                  )}
                  {progressPct !== null && (
                    <span className="absolute text-xs font-bold text-accent-400">
                      {progressPct}%
                    </span>
                  )}
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-sm font-medium text-zinc-200">
                    Loading game&hellip;
                  </span>
                  {progressText && (
                    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Download className="h-3 w-3" />
                      {progressText}
                    </span>
                  )}
                  {loadElapsed >= 5 && !progressText && (
                    <span className="text-[11px] text-zinc-600">
                      Still loading&hellip; {loadElapsed}s
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Game content — SWF via Ruffle or iframe */}
      <div className="game-frame">
        {swf ? (
          <div
            key={`swf-${reloadToken}`}
            ref={ruffleContainerRef}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <iframe
            key={`iframe-${reloadToken}`}
            ref={iframeRef}
            src={url}
            title={title}
            allowFullScreen
            allow="autoplay; gamepad; fullscreen; pointer-lock"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-pointer-lock"
            loading="eager"
            onLoad={handleIframeLoad}
            onError={() => {
              setLoadError("The game host blocked loading in an iframe.");
              setLoading(false);
            }}
          />
        )}
      </div>

      {/* Floating controls — visible on hover */}
      <div
        className={`absolute bottom-3 right-3 z-20 flex items-center gap-2 transition-opacity duration-200 ${
          loading || !!loadError
            ? "opacity-0"
            : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <button
          onClick={toggleMute}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/70 text-white backdrop-blur-sm transition hover:bg-black/90"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={toggleFullscreen}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/70 text-white backdrop-blur-sm transition hover:bg-black/90"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

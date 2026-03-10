"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Maximize, Minimize, Volume2, VolumeX, Loader2, RefreshCcw, WifiOff } from "lucide-react";

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
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
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
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [swf, setSwf] = useState(false);

  // Loading UX + resilience
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

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
  }, [url, reloadToken, swf]);

  const retry = useCallback(() => {
    // Force a full reload of iframe/ruffle
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

  // ── Load Ruffle for SWF games ─────────────────────────────────
  useEffect(() => {
    if (!swf) return;

    let cancelled = false;

    async function loadRuffle() {
      try {
        // Best-effort download progress (same-origin proxy usually provides content-length)
        // This is purely for UI; Ruffle still does its own load.
        try {
          const swfUrl = url.startsWith("/")
            ? url
            : `/api/swf-proxy?url=${encodeURIComponent(url)}`;

          const res = await fetch(swfUrl, {
            signal: AbortSignal.timeout(30_000),
            cache: "force-cache",
          });

          if (res.ok && res.body) {
            const total = getLikelyTotalBytes(res.headers);
            if (total) setTotalBytes(total);

            const reader = res.body.getReader();
            let received = 0;
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                received += value.byteLength;
                if (!cancelled) setDownloadedBytes(received);
              }
            }
          }
        } catch {
          // Ignore progress errors; Ruffle load still might succeed
        }

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

        // Get the Ruffle API
        const ruffle = (window as unknown as Record<string, unknown>)
          .RufflePlayer as {
          newest: () => {
            createPlayer: () => HTMLElement & {
              load: (config: Record<string, unknown>) => Promise<void>;
            };
          };
        };

        const player = ruffle.newest().createPlayer();
        // Size the player to fill its container
        player.style.width = "100%";
        player.style.height = "100%";

        if (ruffleContainerRef.current) {
          ruffleContainerRef.current.innerHTML = "";
          ruffleContainerRef.current.appendChild(player);
          rufflePlayerRef.current = player;
        }

        // Route through proxy to avoid CORS issues with external SWF files
        const swfUrl = url.startsWith("/")
          ? url
          : `/api/swf-proxy?url=${encodeURIComponent(url)}`;

        // webgpu can cause random freezes on some devices/browsers.
        // Prefer WebGL for stability, but allow Ruffle to pick if needed.
        await player.load({
          url: swfUrl,
          autoplay: "on",
          unmuteOverlay: "hidden",
          logLevel: "error",
          contextMenu: "rightClickOnly",
          preferredRenderer: "webgl",
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
      // Clean up player
      if (ruffleContainerRef.current) {
        ruffleContainerRef.current.innerHTML = "";
      }
      rufflePlayerRef.current = null;
    };
  }, [swf, url, reloadToken]);

  // If an iframe never fires onLoad (some providers hang), auto-timeout and offer retry
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
    const el = containerRef.current;
    if (!el) return;

    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fallback: make it fill the viewport via CSS
      setIsFullscreen((f) => !f);
    }
  }, []);

  // Track real fullscreen changes (esc key, etc.)
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

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

  // Initialize audio context on first user interaction (best-effort)
  useEffect(() => {
    try {
      const ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      audioCtxRef.current = ctx;
      gainNodeRef.current = gain;
    } catch {
      // Audio API not supported
    }
    return () => {
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  const showProgress = loading && (downloadedBytes > 0 || totalBytes);
  const progressText = showProgress
    ? `${formatBytes(downloadedBytes)}${
        totalBytes ? ` / ${formatBytes(totalBytes)}` : ""
      }`
    : null;

  return (
    <div
      ref={containerRef}
      className={`game-container group relative ${
        isFullscreen && !document.fullscreenElement
          ? "game-container--fs-fallback"
          : ""
      }`}
    >
      {/* Loading / Error overlay */}
      {(loading || loadError) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/90 rounded-2xl border border-zinc-800/60">
          <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
            {loadError ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900/60 border border-zinc-800/60">
                  <WifiOff className="h-6 w-6 text-zinc-300" />
                </div>
                <p className="text-sm font-medium text-white">Couldn’t load game</p>
                <p className="text-xs text-zinc-400">{loadError}</p>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    onClick={retry}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-500"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Retry
                  </button>
                </div>
              </>
            ) : (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-accent-400" />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm text-zinc-200">Loading game…</span>
                  {progressText && (
                    <span className="text-xs text-zinc-500">Downloading {progressText}</span>
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
            allow="autoplay; gamepad; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms"
            loading="eager"
            onLoad={() => {
              setLoadError(null);
              setLoading(false);
            }}
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
          loading || !!loadError ? "opacity-0" : "opacity-0 group-hover:opacity-100"
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
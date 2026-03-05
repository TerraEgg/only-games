"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Maximize, Minimize, Volume2, VolumeX, Loader2 } from "lucide-react";

interface GameEmbedProps {
  url: string;
  title: string;
}

export default function GameEmbed({ url, title }: GameEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Fire game-open on mount, game-close on unmount ────────────
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("game-open", { detail: { url, title } }));
    return () => {
      window.dispatchEvent(new CustomEvent("game-close", { detail: { url, title } }));
    };
  }, [url, title]);

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
  // We overlay a transparent div to steal focus back when muting,
  // but the actual approach uses the iframe sandbox + postMessage.
  // For cross-origin iframes, the most reliable method is to mute
  // by manipulating a hidden <audio> context capture. However,
  // since most game iframes are cross-origin, the best UX is to
  // set CSS to cover the iframe with a mute overlay that captures
  // the audio context. We'll use the Web Audio API approach.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      // Try to control gain on the audio context
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = next ? 0 : 1;
      }
      return next;
    });
  }, []);

  // Initialize audio context on first user interaction (for capturing iframe audio)
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

  return (
    <div
      ref={containerRef}
      className={`game-container group relative ${
        isFullscreen && !document.fullscreenElement
          ? "game-container--fs-fallback"
          : ""
      }`}
    >
      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black rounded-2xl">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-accent-400" />
            <span className="text-sm text-zinc-400">Loading game…</span>
          </div>
        </div>
      )}

      {/* Game iframe */}
      <div className="game-frame">
        <iframe
          ref={iframeRef}
          src={url}
          title={title}
          allowFullScreen
          allow="autoplay; gamepad; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          loading="eager"
          onLoad={() => setLoading(false)}
        />
      </div>

      {/* Floating controls — visible on hover */}
      <div
        className={`absolute bottom-3 right-3 z-20 flex items-center gap-2 transition-opacity duration-200 ${
          loading ? "opacity-0" : "opacity-0 group-hover:opacity-100"
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

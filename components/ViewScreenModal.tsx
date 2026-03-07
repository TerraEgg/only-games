"use client";

import { useEffect, useRef, useState } from "react";
import Portal from "@/components/Portal";
import { X, Monitor, Globe, Loader2, Camera, ZoomIn, ZoomOut } from "lucide-react";

interface Props {
  userId?: string;
  guestId?: string;
  label: string;
  onClose: () => void;
}

export default function ViewScreenModal({ userId, guestId, label, onClose }: Props) {
  const [page, setPage] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    let alive = true;

    async function poll() {
      try {
        const params = userId ? `userId=${userId}` : `guestId=${guestId}`;
        const res = await fetch(`/api/admin/view-screen?${params}`);
        const data = await res.json();
        if (!alive) return;
        if (data.page) setPage(data.page);
        if (data.screenshot) {
          setScreenshot(data.screenshot);
          setLastUpdate(Date.now());
        }
      } catch {} finally {
        if (alive) setLoading(false);
      }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => { alive = false; clearInterval(interval); };
  }, [userId, guestId]);

  const timeSince = lastUpdate
    ? Math.max(0, Math.floor((Date.now() - lastUpdate) / 1000))
    : null;

  // Refresh timeSince display
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div
          className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60"
          style={{ maxHeight: "92vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/60 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/10">
                <Monitor className="h-4 w-4 text-accent-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  Live View: {label}
                </h2>
                <div className="flex items-center gap-3 mt-0.5">
                  {page && (
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3 w-3 text-zinc-500" />
                      <span className="text-xs text-zinc-400 font-mono max-w-[300px] truncate">{page}</span>
                    </div>
                  )}
                  {screenshot && (
                    <div className="flex items-center gap-1.5">
                      <Camera className="h-3 w-3 text-emerald-500" />
                      <span className="text-[10px] text-emerald-400">
                        Live
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {timeSince !== null && timeSince > 0 && (
                        <span className="text-[10px] text-zinc-600">{timeSince}s ago</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {screenshot && (
                <button
                  onClick={() => setZoomed((v) => !v)}
                  className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                  title={zoomed ? "Zoom out" : "Zoom in"}
                >
                  {zoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Screenshot */}
          <div className="flex-1 overflow-auto bg-zinc-900/50 flex items-center justify-center p-4">
            {loading ? (
              <div className="flex h-80 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              </div>
            ) : screenshot ? (
              <img
                src={screenshot}
                alt="Live screen capture"
                className={`rounded-lg border border-zinc-800/60 shadow-lg transition-all duration-300 ${
                  zoomed ? "max-w-none w-[150%] cursor-zoom-out" : "max-w-full max-h-[75vh] cursor-zoom-in"
                }`}
                onClick={() => setZoomed((v) => !v)}
                draggable={false}
              />
            ) : (
              <div className="flex h-80 flex-col items-center justify-center gap-3">
                <Monitor className="h-12 w-12 text-zinc-700" />
                <p className="text-sm text-zinc-500">
                  Waiting for screen capture...
                </p>
                <p className="text-xs text-zinc-600">
                  Screenshots appear automatically when the user is active
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

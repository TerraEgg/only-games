"use client";

import Link from "next/link";
import { Gamepad2, Loader2 } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";

interface GameCardProps {
  slug: string;
  title: string;
  thumbnail: string | null;
  categoryName: string;
  playCount: number;
}

const MAX_RETRIES = 5;
const RETRY_DELAYS = [2000, 4000, 8000, 16000, 30000]; // exponential backoff

export default function GameCard({
  slug,
  title,
  thumbnail,
  categoryName,
  playCount,
}: GameCardProps) {
  const [navigating, setNavigating] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [imgSrc, setImgSrc] = useState(thumbnail);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const handleImageLoad = useCallback(() => {
    setImgLoaded(true);
    setImgError(false);
    setRetryCount(0);
  }, []);

  const handleImageError = useCallback(() => {
    if (retryCount < MAX_RETRIES && thumbnail) {
      setImgError(true);
      const delay = RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)];
      retryTimerRef.current = setTimeout(() => {
        // Append a cache-busting query param to force re-fetch
        const sep = thumbnail.includes("?") ? "&" : "?";
        setImgSrc(`${thumbnail}${sep}_r=${retryCount + 1}&t=${Date.now()}`);
        setImgError(false);
        setRetryCount((c) => c + 1);
      }, delay);
    } else {
      setImgError(true);
    }
  }, [retryCount, thumbnail]);

  const showLoading = thumbnail && !imgLoaded && !imgError;
  const showError = imgError && retryCount >= MAX_RETRIES;
  const showRetrying = imgError && retryCount < MAX_RETRIES;

  return (
    <Link
      href={`/games/${slug}`}
      onClick={() => setNavigating(true)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/50 transition hover:border-accent-500/30 hover:bg-zinc-900"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-800">
        {imgSrc && !showError ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt={title}
              loading="lazy"
              decoding="async"
              onLoad={handleImageLoad}
              onError={handleImageError}
              className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
            {/* Loading shimmer overlay */}
            {showLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%] animate-shimmer" />
                <Loader2 className="relative z-10 h-6 w-6 animate-spin text-zinc-500" />
              </div>
            )}
            {/* Retrying overlay */}
            {showRetrying && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
                <span className="text-[10px] font-medium text-amber-400/80">
                  Retrying…
                </span>
              </div>
            )}
          </>
        ) : showError ? (
          <div className="flex h-full flex-col items-center justify-center gap-1.5">
            <Gamepad2 className="h-8 w-8 text-zinc-700" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
              Failed to Load
            </span>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1.5">
            <Gamepad2 className="h-8 w-8 text-zinc-700" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
              No Thumbnail
            </span>
          </div>
        )}
        {/* Navigation loading overlay */}
        {navigating && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <h3 className="line-clamp-1 text-sm font-semibold text-white">
          {title}
        </h3>
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-xs font-medium text-accent-400">
            {categoryName}
          </span>
          <span className="text-xs text-zinc-500">
            {playCount.toLocaleString()} plays
          </span>
        </div>
      </div>
    </Link>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

interface AdUnitProps {
  /** "horizontal" = leaderboard/banner, "in-feed" = rectangle blended in content */
  variant?: "horizontal" | "in-feed";
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

// Module-level cache so we don't re-fetch on every AdUnit mount
let adCheckCache: { showAds: boolean; ts: number } | null = null;

async function shouldShowAds(): Promise<boolean> {
  if (adCheckCache && Date.now() - adCheckCache.ts < 60_000) return adCheckCache.showAds;
  try {
    const res = await fetch("/api/ads");
    const data = await res.json();
    adCheckCache = { showAds: !!data.showAds, ts: Date.now() };
    return adCheckCache.showAds;
  } catch {
    return true; // default to showing ads on error
  }
}

export default function AdUnit({ variant = "horizontal", className = "" }: AdUnitProps) {
  const pushed = useRef(false);
  const insRef = useRef<HTMLModElement>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  // Check if ads are enabled (global + per-user)
  useEffect(() => {
    shouldShowAds().then(setEnabled);
  }, []);

  useEffect(() => {
    if (enabled !== true) return;
    if (pushed.current) return;
    const ins = insRef.current;
    if (!ins) return;

    function tryPush() {
      if (pushed.current) return;
      if (ins!.offsetWidth > 0) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          pushed.current = true;
        } catch {
          // ad blocked or not loaded
        }
      }
    }

    const ro = new ResizeObserver(() => tryPush());
    ro.observe(ins);
    const timer = setTimeout(tryPush, 300);

    return () => {
      ro.disconnect();
      clearTimeout(timer);
    };
  }, [enabled]);

  // Don't render anything if ads are disabled or still checking
  if (enabled !== true) return null;

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", width: "100%" }}
        data-ad-client="ca-pub-1525573862471709"
        data-ad-format={variant === "horizontal" ? "horizontal" : "auto"}
        data-ad-slot="8145871561"
        data-full-width-responsive="true"
      />
    </div>
  );
}

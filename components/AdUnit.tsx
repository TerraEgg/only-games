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

export default function AdUnit({ variant = "horizontal", className = "" }: AdUnitProps) {
  const pushed = useRef(false);
  const insRef = useRef<HTMLModElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
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

        // Check if an ad actually filled after a delay
        setTimeout(() => {
          const container = containerRef.current;
          if (!container) return;
          // AdSense injects content (iframes) into the ins element when an ad fills
          const hasAd =
            ins!.querySelector("iframe") !== null ||
            ins!.getAttribute("data-ad-status") === "filled";
          setFilled(hasAd);
        }, 2000);
      }
    }

    const ro = new ResizeObserver(() => tryPush());
    ro.observe(ins);
    const timer = setTimeout(tryPush, 300);

    return () => {
      ro.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden transition-all duration-300 ${className}`}
      style={{
        minHeight: filled ? undefined : 0,
        maxHeight: filled ? undefined : 0,
        opacity: filled ? 1 : 0,
      }}
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", width: "100%", minHeight: 50 }}
        data-ad-client="ca-pub-1525573862471709"
        data-ad-format={variant === "horizontal" ? "horizontal" : "auto"}
        data-ad-slot="8145871561"
        data-full-width-responsive="true"
      />
    </div>
  );
}

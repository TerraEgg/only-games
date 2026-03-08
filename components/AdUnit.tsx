"use client";

import { useEffect, useRef } from "react";

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

  useEffect(() => {
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // ad blocked or not loaded
    }
  }, []);

  return (
    <div
      className={`mx-auto flex w-full items-center justify-center overflow-hidden ${className}`}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-1525573862471709"
        data-ad-format={variant === "horizontal" ? "horizontal" : "auto"}
        data-ad-slot=""
        data-full-width-responsive="true"
      />
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * Client component placed on game pages.
 * Sends tracking beacon to /api/tracking on mount (game start)
 * and on unmount / tab close (game end).
 */
export default function TrackingScript({ gameId }: { gameId: string }) {
  const { data: session } = useSession();
  const activityIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    let geo: { lat: number; lon: number } | null = null;

    // Try to get browser geolocation
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          geo = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        },
        () => {} // silently ignore denial
      );
    }

    // Start tracking
    async function startTracking() {
      try {
        const res = await fetch("/api/tracking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId,
            geolocation: geo ? `${geo.lat},${geo.lon}` : null,
            deviceInfo: getDeviceInfo(),
          }),
        });
        const data = await res.json();
        if (data.id) activityIdRef.current = data.id;
      } catch {}
    }

    startTracking();

    // End tracking on unload
    function endTracking() {
      if (!activityIdRef.current) return;
      const body = JSON.stringify({ activityId: activityIdRef.current });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/tracking?end=1", body);
      } else {
        fetch("/api/tracking?end=1", { method: "POST", body, keepalive: true });
      }
    }

    window.addEventListener("beforeunload", endTracking);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") endTracking();
    });

    return () => {
      endTracking();
      window.removeEventListener("beforeunload", endTracking);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, gameId]);

  return null;
}

function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  const mobile = /Mobi|Android/i.test(ua);
  const tablet = /Tablet|iPad/i.test(ua);
  const platform = navigator.platform || "unknown";
  const screen = `${window.screen.width}x${window.screen.height}`;
  return JSON.stringify({
    type: tablet ? "tablet" : mobile ? "mobile" : "desktop",
    platform,
    screen,
    language: navigator.language,
  });
}

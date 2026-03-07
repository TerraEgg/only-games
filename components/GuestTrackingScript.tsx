"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";

const HEARTBEAT_INTERVAL = 30_000;
const FP_KEY = "og_guest_fp";

/**
 * Guest tracking — mirrors TrackingScript but for unauthenticated users.
 * Uses fingerprint from localStorage instead of session.
 */
export default function GuestTrackingScript({ gameId }: { gameId: string }) {
  const { status } = useSession();
  const activityIdRef = useRef<string | null>(null);
  const endedRef = useRef(false);
  const startingRef = useRef(false);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const sendEnd = useCallback(() => {
    const id = activityIdRef.current;
    if (!id || endedRef.current) return;
    endedRef.current = true;

    const payload = JSON.stringify({ activityId: id });
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/guest-tracking?end=1", blob);
    } else {
      fetch("/api/guest-tracking?end=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }
  }, []);

  useEffect(() => {
    // Only run for guests (unauthenticated)
    if (status !== "unauthenticated") return;

    const fp = localStorage.getItem(FP_KEY);
    if (!fp) return;

    endedRef.current = false;
    activityIdRef.current = null;
    startingRef.current = false;

    async function startTracking() {
      if (startingRef.current || activityIdRef.current) return;
      startingRef.current = true;
      try {
        const res = await fetch("/api/guest-tracking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId,
            fingerprint: fp,
            deviceInfo: getDeviceInfo(),
          }),
        });
        const data = await res.json();
        if (data.id && !endedRef.current) {
          activityIdRef.current = data.id;
          startHeartbeat();
        }
      } catch {} finally {
        startingRef.current = false;
      }
    }

    function startHeartbeat() {
      heartbeatRef.current = setInterval(() => {
        const id = activityIdRef.current;
        if (!id || endedRef.current) return;
        fetch("/api/guest-tracking?heartbeat=1", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityId: id }),
        }).catch(() => {});
      }, HEARTBEAT_INTERVAL);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") sendEnd();
    }

    function onBeforeUnload() {
      sendEnd();
    }

    startTracking();

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      sendEnd();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, gameId, sendEnd]);

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

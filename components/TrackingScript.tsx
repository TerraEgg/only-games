"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds

/**
 * Client component placed on game pages.
 * - Sends start tracking on mount
 * - Sends heartbeat every 30s (updates endedAt on server)
 * - Sends final end signal on unmount / tab close
 * - If tab crashes, last heartbeat was max 30s ago; stale sessions
 *   are closed automatically on next session start.
 */
export default function TrackingScript({ gameId }: { gameId: string }) {
  const { data: session } = useSession();
  const activityIdRef = useRef<string | null>(null);
  const endedRef = useRef(false);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Stable send function — works with both fetch and sendBeacon
  const sendEnd = useCallback(() => {
    const id = activityIdRef.current;
    if (!id || endedRef.current) return;
    endedRef.current = true; // prevent double-fire

    const payload = JSON.stringify({ activityId: id });
    // sendBeacon needs a Blob with correct content-type for JSON parsing
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/tracking?end=1", blob);
    } else {
      fetch("/api/tracking?end=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    let geo: string | null = null;

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          geo = `${pos.coords.latitude},${pos.coords.longitude}`;
        },
        () => {}
      );
    }

    // Reset state for this mount
    endedRef.current = false;
    activityIdRef.current = null;

    // ── Start tracking ──────────────────────────────────────────────
    async function startTracking() {
      try {
        const res = await fetch("/api/tracking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId,
            geolocation: geo,
            deviceInfo: getDeviceInfo(),
          }),
        });
        const data = await res.json();
        if (data.id) {
          activityIdRef.current = data.id;
          startHeartbeat();
        }
      } catch {}
    }

    // ── Heartbeat — updates endedAt every 30s ───────────────────────
    function startHeartbeat() {
      heartbeatRef.current = setInterval(() => {
        const id = activityIdRef.current;
        if (!id || endedRef.current) return;
        // Fire-and-forget heartbeat
        fetch(`/api/tracking?heartbeat=1`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityId: id }),
        }).catch(() => {});
      }, HEARTBEAT_INTERVAL);
    }

    // ── Visibility change — end when hidden ──────────────────────────
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        sendEnd();
      }
    }

    // ── Before unload — end on tab close ────────────────────────────
    function onBeforeUnload() {
      sendEnd();
    }

    startTracking();

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      // React cleanup (navigation)
      sendEnd();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, gameId, sendEnd]);

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

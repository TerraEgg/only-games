"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * Tracks guest (non-logged-in) visitors by sending a fingerprint to the server.
 * When the user logs in, it marks the guest session as converted.
 */
function generateFingerprint(): string {
  const nav = window.navigator;
  const screen = window.screen;
  const raw = [
    nav.userAgent,
    nav.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency || "",
  ].join("|");
  // Simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "guest_" + Math.abs(hash).toString(36);
}

const FP_KEY = "og_guest_fp";

export default function GuestTracker() {
  const { data: session, status } = useSession();
  const trackedRef = useRef(false);
  const convertedRef = useRef(false);

  // Track guest on mount (if not logged in)
  useEffect(() => {
    if (status === "loading") return;

    const fp = localStorage.getItem(FP_KEY) || generateFingerprint();
    localStorage.setItem(FP_KEY, fp);

    if (status === "unauthenticated" && !trackedRef.current) {
      trackedRef.current = true;
      fetch("/api/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint: fp }),
      }).catch(() => {});
    }

    // When user logs in, mark guest as converted
    if (status === "authenticated" && session?.user?.id && !convertedRef.current) {
      convertedRef.current = true;
      fetch("/api/guest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint: fp, userId: session.user.id }),
      }).catch(() => {});
    }
  }, [status, session?.user?.id]);

  // Keep updating lastSeen every 60s for guests
  useEffect(() => {
    if (status !== "unauthenticated") return;

    const interval = setInterval(() => {
      const fp = localStorage.getItem(FP_KEY);
      if (fp) {
        fetch("/api/guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fingerprint: fp }),
        }).catch(() => {});
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [status]);

  return null;
}

"use client";

import { useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";

/**
 * Polls /api/auth/ban-check every 30 seconds.
 * If the user has been banned by an admin, immediately:
 *  1. Sets the persistent ban cookie via a redirect
 *  2. Signs them out
 *  3. Redirects to /banned
 *
 * This gives "live banning" — no need to wait for re-login.
 */
const BAN_CHECK_INTERVAL = 30_000; // 30 seconds

export default function BanChecker() {
  const { data: session } = useSession();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only poll if the user is logged in
    if (!session?.user?.id) return;

    async function check() {
      try {
        const res = await fetch("/api/auth/ban-check");
        const data = await res.json();
        if (data.banned) {
          // Set the persistent ban cookie via an API call
          await fetch("/api/auth/set-ban-cookie", { method: "POST" });
          // Sign out and redirect
          signOut({ callbackUrl: "/banned" });
        }
      } catch {
        // Silently ignore network errors
      }
    }

    // Check immediately on mount
    check();

    // Then every 30s
    intervalRef.current = setInterval(check, BAN_CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session?.user?.id]);

  return null;
}

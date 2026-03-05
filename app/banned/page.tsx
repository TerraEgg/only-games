"use client";

import { useEffect, useState, useRef } from "react";
import { ShieldOff, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * Banned page — polls /api/auth/ban-check every 5s.
 * If the admin unbans the user, it clears the ban cookie
 * and redirects them back to the homepage.
 */
export default function BannedPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function checkUnban() {
      try {
        // Build URL with username if available (for when session is gone)
        let url = "/api/auth/ban-check";
        if (session?.user?.username) {
          url += `?username=${encodeURIComponent(session.user.username)}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (!data.banned) {
          setChecking(true);
          // Clear the persistent ban cookie
          await fetch("/api/auth/clear-ban-cookie", { method: "POST" });
          // Redirect to home
          router.push("/");
        }
      } catch {}
    }

    // Check immediately, then every 5s
    checkUnban();
    intervalRef.current = setInterval(checkUnban, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session?.user?.username, router]);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="max-w-md animate-fadeIn text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
          <ShieldOff className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-white">Account Banned</h1>
        <p className="mt-3 text-zinc-400">
          Your access to OnlyGames has been suspended. If you believe this is a
          mistake, please contact support.
        </p>
        <div className="mt-8 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-6 py-4 text-sm text-zinc-500">
          This decision was made by an administrator. Attempting to create a new
          account or circumvent this restriction may result in further action.
        </div>
        {checking && (
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-emerald-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Ban lifted — redirecting...
          </div>
        )}
      </div>
    </div>
  );
}

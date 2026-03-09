"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Portal from "@/components/Portal";

const FP_KEY = "og_guest_fp";

/**
 * CommandListener - handles admin commands for BOTH logged-in users AND guests.
 * Connects to an SSE stream that pushes admin commands instantly:
 *  - ban: redirect to /banned (users only)
 *  - unban: clear ban cookie + reload (users only)
 *  - pause: show fullscreen pause overlay (skipped for admins)
 *  - unpause: remove pause overlay
 *  - message: show notification toast (users only)
 *  - redirect: navigate to URL
 *
 * Guests connect via fingerprint. Admins are immune to pause.
 */
// SessionStorage key for persisting pause state across potential remounts
const PAUSE_KEY = "og_paused";
const PAUSE_MSG_KEY = "og_pause_msg";

function readPauseState(): boolean {
  try { return sessionStorage.getItem(PAUSE_KEY) === "1"; } catch { return false; }
}
function writePauseState(paused: boolean) {
  try {
    if (paused) sessionStorage.setItem(PAUSE_KEY, "1");
    else sessionStorage.removeItem(PAUSE_KEY);
  } catch {}
}
function readPauseMsg(): string {
  try { return sessionStorage.getItem(PAUSE_MSG_KEY) || "Your session has been paused by an administrator."; } catch { return "Your session has been paused by an administrator."; }
}
function writePauseMsg(msg: string) {
  try { sessionStorage.setItem(PAUSE_MSG_KEY, msg); } catch {}
}

export default function CommandListener() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const esRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPaused, setIsPaused] = useState(readPauseState);
  const [pauseMsg, setPauseMsg] = useState(readPauseMsg);

  // Track processed broadcast (targetId=null) command IDs to prevent replays
  const processedBroadcastsRef = useRef<Set<string>>(new Set());

  const userId = session?.user?.id;
  const username = (session?.user as any)?.username;
  const isAdmin = session?.user?.role === "ADMIN";
  const isLoggedIn = status === "authenticated" && !!userId;
  const isGuest = status === "unauthenticated";

  // Check ban/pause status on mount (logged-in users only)
  useEffect(() => {
    if (!isLoggedIn) return;
    (async () => {
      try {
        const res = await fetch("/api/auth/ban-check");
        const data = await res.json();
        if (data.banned) {
          await fetch("/api/auth/set-ban-cookie", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
          });
          signOut({ callbackUrl: "/banned" });
        }
        if (data.paused && !isAdmin) {
          setIsPaused(true);
        }
      } catch {}
    })();
  }, [isLoggedIn, isAdmin]);

  // SSE connection for logged-in users
  useEffect(() => {
    if (!isLoggedIn) return;

    function connect() {
      const es = new EventSource("/api/user/commands");
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const cmd = JSON.parse(event.data);
          handleCommand(cmd);
        } catch {}
      };

      es.onerror = () => {
        es.close();
        reconnectRef.current = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [isLoggedIn]);

  // SSE connection for guest users
  useEffect(() => {
    if (status === "loading" || isLoggedIn) return;
    // Only connect for guests
    if (!isGuest) return;

    // Fingerprint may not be in localStorage yet — wait briefly and retry
    function getFP(): string | null {
      return typeof window !== "undefined" ? localStorage.getItem(FP_KEY) : null;
    }
    let fp = getFP();
    if (!fp) {
      const retryTimer = setTimeout(() => {
        fp = getFP();
        if (fp) connect();
      }, 2000);
      return () => clearTimeout(retryTimer);
    }

    function connect() {
      const es = new EventSource(`/api/guest/commands?fp=${encodeURIComponent(fp!)}`);
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const cmd = JSON.parse(event.data);
          handleCommand(cmd);
        } catch {}
      };

      es.onerror = () => {
        es.close();
        reconnectRef.current = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [status, isLoggedIn, isGuest]);

  // Keep a ref to current values so the SSE handler always sees fresh state
  const stateRef = useRef({ isLoggedIn, isAdmin, username });
  useEffect(() => {
    stateRef.current = { isLoggedIn, isAdmin, username };
  }, [isLoggedIn, isAdmin, username]);

  function handleCommand(cmd: { id?: string; type: string; payload: Record<string, string> }) {
    const { isLoggedIn: loggedIn, isAdmin: admin, username: uname } = stateRef.current;

    // Deduplicate broadcast commands — they are re-sent on every SSE tick
    // Targeted commands are consumed server-side, but broadcasts are not
    if (cmd.id && cmd.id !== "init-pause") {
      if (processedBroadcastsRef.current.has(cmd.id)) return;
      processedBroadcastsRef.current.add(cmd.id);
      // Cap the set size to prevent memory leaks
      if (processedBroadcastsRef.current.size > 200) {
        const arr = Array.from(processedBroadcastsRef.current);
        processedBroadcastsRef.current = new Set(arr.slice(-100));
      }
    }

    switch (cmd.type) {
      case "ban": {
        if (!loggedIn) break;
        fetch("/api/auth/set-ban-cookie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: uname }),
        }).then(() => {
          signOut({ callbackUrl: "/banned" });
        });
        break;
      }
      case "unban": {
        if (!loggedIn) break;
        fetch("/api/auth/clear-ban-cookie", { method: "POST" }).then(() => {
          window.location.href = "/";
        });
        break;
      }
      case "pause": {
        if (admin) break;
        setIsPaused(true);
        writePauseState(true);
        if (cmd.payload?.message) {
          setPauseMsg(cmd.payload.message);
          writePauseMsg(cmd.payload.message);
        }
        break;
      }
      case "unpause": {
        setIsPaused(false);
        writePauseState(false);
        break;
      }
      case "message": {
        if (!loggedIn) break;
        window.dispatchEvent(new Event("og-new-notification"));
        break;
      }
      case "redirect": {
        if (admin) break;
        const url = cmd.payload?.url || cmd.payload?.redirectUrl;
        if (url) {
          // Redirect in-page so the user actually leaves the site
          window.location.href = url;
        }
        break;
      }
    }
  }

  // When paused, block ALL keyboard interaction and prevent closing
  useEffect(() => {
    if (!isPaused) return;

    function blockAll(e: KeyboardEvent) {
      // Block everything: Escape, Tab, F-keys, shortcuts, etc.
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }

    function blockContext(e: MouseEvent) {
      e.preventDefault();
    }

    // Block at capture phase so nothing else can intercept
    document.addEventListener("keydown", blockAll, true);
    document.addEventListener("keyup", blockAll, true);
    document.addEventListener("keypress", blockAll, true);
    document.addEventListener("contextmenu", blockContext, true);

    // Also prevent scrolling
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", blockAll, true);
      document.removeEventListener("keyup", blockAll, true);
      document.removeEventListener("keypress", blockAll, true);
      document.removeEventListener("contextmenu", blockContext, true);
      document.body.style.overflow = "";
    };
  }, [isPaused]);

  return (
    <>
      {/* Pause overlay — completely unclosable */}
      {isPaused && (
        <Portal>
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 backdrop-blur-md"
            style={{ userSelect: "none", pointerEvents: "all" }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="flex flex-col items-center gap-4 text-center px-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
                <svg className="h-10 w-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white">Session Paused</h1>
              <p className="max-w-md text-zinc-400">{pauseMsg}</p>
              <p className="text-sm text-zinc-600">An administrator has paused your session. Please wait.</p>
            </div>
          </div>
        </Portal>
      )}


    </>
  );
}

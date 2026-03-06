"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Bell, X, ExternalLink, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  title: string;
  message: string;
  redirectUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fetchNotificationsRef = useRef<(() => void) | null>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Listen for instant SSE notification events
  useEffect(() => {
    function onNewNotification() {
      fetchNotificationsRef.current?.();
    }
    window.addEventListener("og-new-notification", onNewNotification);
    return () => window.removeEventListener("og-new-notification", onNewNotification);
  }, []);

  // Poll notifications
  useEffect(() => {
    if (!session?.user?.id) return;

    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications");
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);

        // Auto-redirect: if there's a new unread notification with redirectUrl,
        // redirect and mark it as read
        const unreadWithRedirect = (data.notifications || []).find(
          (n: Notification) => !n.isRead && n.redirectUrl
        );
        if (unreadWithRedirect) {
          // Mark as read first
          await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notificationId: unreadWithRedirect.id }),
          });
          // Show the notification popup briefly, then redirect
          setOpen(true);
          setTimeout(() => {
            router.push(unreadWithRedirect.redirectUrl!);
          }, 2000);
        }
      } catch {}
    }

    fetchNotificationsRef.current = fetchNotifications;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15_000); // poll every 15s
    return () => { clearInterval(interval); fetchNotificationsRef.current = null; };
  }, [session?.user?.id, router]);

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  function handleNotificationClick(n: Notification) {
    if (!n.isRead) markRead(n.id);
    if (n.redirectUrl) {
      router.push(n.redirectUrl);
      setOpen(false);
    }
  }

  if (!session?.user?.id) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[9999] mt-2 w-80 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="rounded-lg p-1 text-xs text-accent-400 transition hover:bg-zinc-800"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-600">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex w-full flex-col gap-1 border-b border-zinc-800/40 px-4 py-3 text-left transition hover:bg-zinc-900/60 ${
                    !n.isRead ? "bg-accent-500/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {!n.isRead && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-accent-500" />
                    )}
                    <span className="text-sm font-medium text-white">
                      {n.title}
                    </span>
                    {n.redirectUrl && (
                      <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-zinc-600" />
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {n.message}
                  </p>
                  <span className="text-[10px] text-zinc-600">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-zinc-800/60 px-4 py-2">
              <button
                onClick={() => {
                  router.push("/notifications");
                  setOpen(false);
                }}
                className="w-full rounded-lg py-1.5 text-center text-xs text-accent-400 transition hover:bg-zinc-900"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

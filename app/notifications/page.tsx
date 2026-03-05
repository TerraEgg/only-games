"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Bell, ExternalLink, CheckCheck, Loader2 } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  redirectUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchNotifications();
    }
  }, [status, router]);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {}
    setLoading(false);
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  function handleClick(n: Notification) {
    if (!n.isRead) markRead(n.id);
    if (n.redirectUrl) router.push(n.redirectUrl);
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="mx-auto max-w-2xl animate-fadeIn px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/10">
            <Bell className="h-5 w-5 text-accent-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
            <p className="text-sm text-zinc-500">
              {unreadCount > 0
                ? `${unreadCount} unread message${unreadCount > 1 ? "s" : ""}`
                : "All caught up!"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/20 px-6 py-16 text-center">
          <Bell className="mx-auto mb-3 h-8 w-8 text-zinc-700" />
          <p className="text-zinc-500">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`flex w-full flex-col gap-1.5 rounded-2xl border px-5 py-4 text-left transition ${
                n.isRead
                  ? "border-zinc-800/40 bg-zinc-900/20 hover:bg-zinc-900/40"
                  : "border-accent-500/20 bg-accent-500/5 hover:bg-accent-500/10"
              }`}
            >
              <div className="flex items-center gap-2">
                {!n.isRead && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-accent-500" />
                )}
                <span className="text-sm font-semibold text-white">
                  {n.title}
                </span>
                {n.redirectUrl && (
                  <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-600" />
                )}
              </div>
              <p className="text-sm text-zinc-400">{n.message}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-600">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
                {n.redirectUrl && (
                  <span className="text-xs text-accent-400">
                    Click to open link
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

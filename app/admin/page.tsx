"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Gamepad2,
  FolderOpen,
  Activity,
  MessageSquare,
  ExternalLink,
  Pause,
  Play,
  Loader2,
  Ban,
  Send,
} from "lucide-react";
import Portal from "@/components/Portal";
import { formatDateTime } from "@/lib/utils";

interface Stats {
  userCount: number;
  gameCount: number;
  categoryCount: number;
  activeNow: number;
}

interface RecentActivity {
  id: string;
  ipAddress: string | null;
  deviceInfo: string | null;
  startedAt: string;
  endedAt: string | null;
  user: { username: string };
  game: { title: string };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [modal, setModal] = useState<"message" | "redirect" | "pause" | null>(null);
  const [msgTitle, setMsgTitle] = useState("Staff Message");
  const [msgBody, setMsgBody] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/admin/dashboard");
      const data = await res.json();
      setStats(data.stats);
      setRecentActivity(data.recentActivity || []);
    } catch {} finally {
      setLoading(false);
    }
  }

  async function sendBulkCommand(type: string, payload: Record<string, string>) {
    setActionLoading(true);
    try {
      await fetch("/api/admin/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: null, type, payload }),
      });
    } catch {} finally {
      setActionLoading(false);
      setModal(null);
    }
  }

  async function handleMessageAll() {
    if (!msgBody.trim()) return;
    await sendBulkCommand("message", {
      title: msgTitle.trim() || "Staff Message",
      message: msgBody.trim(),
    });
    setMsgTitle("Staff Message");
    setMsgBody("");
  }

  async function handleRedirectAll() {
    if (!redirectUrl.trim()) return;
    await sendBulkCommand("redirect", { url: redirectUrl.trim() });
    setRedirectUrl("");
  }

  async function handlePauseAll() {
    await sendBulkCommand("pause", { message: "Your session has been paused by an administrator." });
  }

  async function handleUnpauseAll() {
    await sendBulkCommand("unpause", {});
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  const statItems = [
    { label: "Total Users", value: stats?.userCount ?? 0, icon: Users, color: "text-blue-400 bg-blue-500/10" },
    { label: "Total Games", value: stats?.gameCount ?? 0, icon: Gamepad2, color: "text-accent-400 bg-accent-500/10" },
    { label: "Categories", value: stats?.categoryCount ?? 0, icon: FolderOpen, color: "text-emerald-400 bg-emerald-500/10" },
    { label: "Playing Now", value: stats?.activeNow ?? 0, icon: Activity, color: "text-amber-400 bg-amber-500/10" },
  ];

  return (
    <div className="animate-fadeIn">
      <h1 className="mb-6 text-2xl font-bold text-white">Dashboard</h1>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statItems.map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-zinc-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk actions */}
      <h2 className="mb-3 text-lg font-semibold text-white">Bulk Actions</h2>
      <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => { setModal("message"); setMsgTitle("Staff Message"); setMsgBody(""); }}
          className="flex items-center gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-4 text-left transition hover:border-accent-500/30"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/10">
            <MessageSquare className="h-5 w-5 text-accent-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Message All</p>
            <p className="text-xs text-zinc-500">Send to all users</p>
          </div>
        </button>
        <button
          onClick={() => { setModal("redirect"); setRedirectUrl(""); }}
          className="flex items-center gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-4 text-left transition hover:border-orange-500/30"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
            <ExternalLink className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Redirect All</p>
            <p className="text-xs text-zinc-500">Navigate all users</p>
          </div>
        </button>
        <button
          onClick={handlePauseAll}
          disabled={actionLoading}
          className="flex items-center gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-4 text-left transition hover:border-amber-500/30 disabled:opacity-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <Pause className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Pause All</p>
            <p className="text-xs text-zinc-500">Freeze all screens</p>
          </div>
        </button>
        <button
          onClick={handleUnpauseAll}
          disabled={actionLoading}
          className="flex items-center gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-4 text-left transition hover:border-emerald-500/30 disabled:opacity-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <Play className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Unpause All</p>
            <p className="text-xs text-zinc-500">Unfreeze all screens</p>
          </div>
        </button>
      </div>

      {/* Recent Activity */}
      <h2 className="mb-4 text-lg font-semibold text-white">Recent Activity</h2>
      <div className="overflow-hidden rounded-2xl border border-zinc-800/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800/60 bg-zinc-900/30 text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Game</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">IP</th>
              <th className="px-4 py-3 font-medium">Started</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40">
            {recentActivity.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-600">
                  No activity yet
                </td>
              </tr>
            ) : (
              recentActivity.map((a) => (
                <tr key={a.id} className="text-zinc-300">
                  <td className="px-4 py-3 font-medium">{a.user.username}</td>
                  <td className="px-4 py-3">{a.game.title}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-zinc-500">
                    {a.ipAddress || "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{formatDateTime(a.startedAt)}</td>
                  <td className="px-4 py-3">
                    {a.endedAt ? (
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">Ended</span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">Live</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {modal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
              {modal === "message" && (
                <>
                  <h2 className="text-lg font-bold text-white mb-1">Message All Users</h2>
                  <p className="text-sm text-zinc-500 mb-4">Sends a notification to every user instantly.</p>
                  <label className="mb-1 block text-sm text-zinc-400">Title</label>
                  <input
                    type="text"
                    value={msgTitle}
                    onChange={(e) => setMsgTitle(e.target.value)}
                    className="mb-3 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-accent-500/50"
                  />
                  <label className="mb-1 block text-sm text-zinc-400">Message</label>
                  <textarea
                    value={msgBody}
                    onChange={(e) => setMsgBody(e.target.value)}
                    rows={3}
                    className="mb-4 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-accent-500/50"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setModal(null)} className="flex-1 rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900">Cancel</button>
                    <button
                      onClick={handleMessageAll}
                      disabled={actionLoading || !msgBody.trim()}
                      className="flex-1 rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-500 disabled:opacity-50"
                    >
                      {actionLoading ? "Sending..." : "Send to All"}
                    </button>
                  </div>
                </>
              )}
              {modal === "redirect" && (
                <>
                  <h2 className="text-lg font-bold text-white mb-1">Redirect All Users</h2>
                  <p className="text-sm text-zinc-500 mb-4">Force-redirects all connected users to a URL.</p>
                  <label className="mb-1 block text-sm text-zinc-400">URL</label>
                  <input
                    type="text"
                    value={redirectUrl}
                    onChange={(e) => setRedirectUrl(e.target.value)}
                    className="mb-4 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-accent-500/50"
                    placeholder="https://... or /page"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setModal(null)} className="flex-1 rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900">Cancel</button>
                    <button
                      onClick={handleRedirectAll}
                      disabled={actionLoading || !redirectUrl.trim()}
                      className="flex-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50"
                    >
                      {actionLoading ? "Redirecting..." : "Redirect All"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

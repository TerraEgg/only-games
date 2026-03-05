"use client";

import { useEffect, useState } from "react";
import Portal from "@/components/Portal";
import {
  Ban,
  CheckCircle2,
  KeyRound,
  Loader2,
  Search,
  Shield,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { formatDateTime, formatPlayTime } from "@/lib/utils";

interface User {
  id: string;
  username: string;
  role: string;
  isBanned: boolean;
  banReason: string | null;
  totalPlayTime: number;
  createdAt: string;
  lastLogin: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal state
  const [modal, setModal] = useState<{
    type: "ban" | "resetPassword" | "message" | "redirect";
    user: User;
  } | null>(null);
  const [banReason, setBanReason] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msgTitle, setMsgTitle] = useState("Staff Message");
  const [msgBody, setMsgBody] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }

  async function handleBan(userId: string, ban: boolean) {
    setActionLoading(userId);
    await fetch(`/api/admin/users/${userId}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ban, reason: banReason || undefined }),
    });
    setBanReason("");
    setModal(null);
    await fetchUsers();
    setActionLoading(null);
  }

  async function handleResetPassword(userId: string) {
    if (!newPassword || newPassword.length < 6) return;
    setActionLoading(userId);
    await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    setNewPassword("");
    setModal(null);
    setActionLoading(null);
  }

  async function handleSendMessage(userId: string) {
    if (!msgBody.trim()) return;
    setActionLoading(userId);
    await fetch(`/api/admin/users/${userId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: msgTitle.trim() || "Staff Message",
        message: msgBody.trim(),
      }),
    });
    setMsgTitle("Staff Message");
    setMsgBody("");
    setModal(null);
    setActionLoading(null);
  }

  async function handleRedirect(userId: string) {
    if (!redirectUrl.trim()) return;
    setActionLoading(userId);
    await fetch(`/api/admin/users/${userId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Redirect",
        message: `You are being redirected to ${redirectUrl.trim()}`,
        redirectUrl: redirectUrl.trim(),
      }),
    });
    setRedirectUrl("");
    setModal(null);
    setActionLoading(null);
  }

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 py-2 pl-9 pr-4 text-sm text-white outline-none focus:border-accent-500/50"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/60 bg-zinc-900/30 text-left text-xs text-zinc-500">
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Created</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Last Login</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Play Time</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Restrict</th>
                <th className="px-4 py-3 font-medium text-right">Message</th>
                <th className="px-4 py-3 font-medium text-right">Redirect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {filtered.map((user) => (
                <tr key={user.id} className="text-zinc-300">
                  <td className="px-4 py-3 font-medium">{user.username}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-accent-500/10 text-accent-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {user.role === "ADMIN" && (
                        <Shield className="h-3 w-3" />
                      )}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-zinc-500">
                    {formatDateTime(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-zinc-500">
                    {user.lastLogin ? formatDateTime(user.lastLogin) : "Never"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-zinc-500">
                    {formatPlayTime(user.totalPlayTime)}
                  </td>
                  <td className="px-4 py-3">
                    {user.isBanned ? (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                        Banned
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                        Active
                      </span>
                    )}
                  </td>
                  {/* Restrict actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setModal({ type: "resetPassword", user });
                          setNewPassword("");
                        }}
                        disabled={actionLoading === user.id}
                        className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                        title="Reset Password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      {user.isBanned ? (
                        <button
                          onClick={() => handleBan(user.id, false)}
                          disabled={actionLoading === user.id}
                          className="rounded-lg p-1.5 text-emerald-500 transition hover:bg-emerald-500/10"
                          title="Unban"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setModal({ type: "ban", user });
                            setBanReason("");
                          }}
                          disabled={
                            actionLoading === user.id || user.role === "ADMIN"
                          }
                          className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-500/10 disabled:opacity-30"
                          title="Ban"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  {/* Message action */}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setModal({ type: "message", user });
                        setMsgTitle("Staff Message");
                        setMsgBody("");
                      }}
                      disabled={actionLoading === user.id}
                      className="rounded-lg p-1.5 text-accent-500 transition hover:bg-accent-500/10"
                      title="Send Message"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </td>
                  {/* Redirect action */}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setModal({ type: "redirect", user });
                        setRedirectUrl("");
                      }}
                      disabled={actionLoading === user.id}
                      className="rounded-lg p-1.5 text-orange-500 transition hover:bg-orange-500/10"
                      title="Redirect User"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-zinc-600"
                  >
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal overlay */}
      {modal && (
        <Portal>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/50 my-auto">
            {modal.type === "ban" ? (
              <>
                <h2 className="text-lg font-bold text-white mb-1">
                  Ban {modal.user.username}
                </h2>
                <p className="text-sm text-zinc-500 mb-4">
                  This will ban the user and set a persistent cookie on their
                  browser to prevent re-access.
                </p>
                <label className="mb-1 block text-sm text-zinc-400">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="mb-4 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-accent-500/50"
                  placeholder="Reason for ban..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleBan(modal.user.id, true)}
                    disabled={actionLoading === modal.user.id}
                    className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    {actionLoading === modal.user.id ? "Banning..." : "Ban User"}
                  </button>
                </div>
              </>
            ) : modal.type === "resetPassword" ? (
              <>
                <h2 className="text-lg font-bold text-white mb-1">
                  Reset Password
                </h2>
                <p className="text-sm text-zinc-500 mb-4">
                  Set a new password for {modal.user.username}.
                </p>
                <label className="mb-1 block text-sm text-zinc-400">
                  New password
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mb-4 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-accent-500/50"
                  placeholder="Min 6 characters"
                  minLength={6}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleResetPassword(modal.user.id)}
                    disabled={
                      actionLoading === modal.user.id ||
                      newPassword.length < 6
                    }
                    className="flex-1 rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-500 disabled:opacity-50"
                  >
                    {actionLoading === modal.user.id
                      ? "Resetting..."
                      : "Reset Password"}
                  </button>
                </div>
              </>
            ) : modal.type === "message" ? (
              <>
                <h2 className="text-lg font-bold text-white mb-1">
                  Send Message to {modal.user.username}
                </h2>
                <p className="text-sm text-zinc-500 mb-4">
                  Send a direct notification to this user.
                </p>
                <label className="mb-1 block text-sm text-zinc-400">
                  Title
                </label>
                <input
                  type="text"
                  value={msgTitle}
                  onChange={(e) => setMsgTitle(e.target.value)}
                  className="mb-3 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-accent-500/50"
                  placeholder="Staff Message"
                />
                <label className="mb-1 block text-sm text-zinc-400">
                  Message
                </label>
                <textarea
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  rows={3}
                  className="mb-3 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-accent-500/50"
                  placeholder="Type your message..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSendMessage(modal.user.id)}
                    disabled={
                      actionLoading === modal.user.id ||
                      !msgBody.trim()
                    }
                    className="flex-1 rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-500 disabled:opacity-50"
                  >
                    {actionLoading === modal.user.id
                      ? "Sending..."
                      : "Send Message"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white mb-1">
                  Redirect {modal.user.username}
                </h2>
                <p className="text-sm text-zinc-500 mb-4">
                  Force-redirect this user to a specific page. They will be
                  navigated automatically.
                </p>
                <label className="mb-1 block text-sm text-zinc-400">
                  Redirect URL
                </label>
                <input
                  type="text"
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  className="mb-4 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-accent-500/50"
                  placeholder="/some-page or https://..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleRedirect(modal.user.id)}
                    disabled={
                      actionLoading === modal.user.id ||
                      !redirectUrl.trim()
                    }
                    className="flex-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50"
                  >
                    {actionLoading === modal.user.id
                      ? "Redirecting..."
                      : "Redirect User"}
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

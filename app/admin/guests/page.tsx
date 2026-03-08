"use client";

import { useEffect, useState } from "react";
import Portal from "@/components/Portal";
import {
  Loader2,
  Search,
  UserCheck,
  Eye,
  Pause,
  Play,
  ExternalLink,
  Trash2,
  User,
  Monitor,
  ShieldAlert,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import ViewScreenModal from "@/components/ViewScreenModal";

interface GuestSession {
  id: string;
  fingerprint: string;
  ipAddress: string | null;
  userAgent: string | null;
  country: string | null;
  city: string | null;
  isPaused: boolean;
  hasAdblock: boolean;
  lastSeen: string;
  createdAt: string;
  convertedUserId: string | null;
  convertedUsername: string | null;
}

export default function AdminGuestsPage() {
  const [guests, setGuests] = useState<GuestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null); // "action:guestId"

  // Modal state
  const [modal, setModal] = useState<{
    type: "redirect" | "delete";
    guest: GuestSession;
  } | null>(null);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [viewScreenGuest, setViewScreenGuest] = useState<GuestSession | null>(null);

  useEffect(() => {
    fetchGuests();
    const interval = setInterval(fetchGuests, 15_000);
    return () => clearInterval(interval);
  }, []);

  async function fetchGuests() {
    try {
      const res = await fetch("/api/admin/guests");
      const data = await res.json();
      setGuests(Array.isArray(data) ? data : []);
    } catch {} finally {
      setLoading(false);
    }
  }

  async function handlePause(guest: GuestSession) {
    setActionLoading(`pause:${guest.id}`);
    try {
      await fetch(`/api/admin/guests/${guest.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "pause", payload: {} }),
      });
      setGuests((prev) => prev.map((g) => (g.id === guest.id ? { ...g, isPaused: true } : g)));
    } catch {} finally {
      setActionLoading(null);
    }
  }

  async function handleUnpause(guest: GuestSession) {
    setActionLoading(`unpause:${guest.id}`);
    try {
      await fetch(`/api/admin/guests/${guest.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "unpause", payload: {} }),
      });
      setGuests((prev) => prev.map((g) => (g.id === guest.id ? { ...g, isPaused: false } : g)));
    } catch {} finally {
      setActionLoading(null);
    }
  }

  async function handleRedirect() {
    if (!modal || modal.type !== "redirect" || !redirectUrl.trim()) return;
    setActionLoading(`redirect:${modal.guest.id}`);
    try {
      await fetch(`/api/admin/guests/${modal.guest.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "redirect",
          payload: { url: redirectUrl.trim() },
        }),
      });
    } catch {} finally {
      setActionLoading(null);
      setModal(null);
      setRedirectUrl("");
    }
  }

  async function handleDelete() {
    if (!modal || modal.type !== "delete") return;
    setActionLoading(`delete:${modal.guest.id}`);
    try {
      await fetch(`/api/admin/guests/${modal.guest.id}`, { method: "DELETE" });
      setGuests((prev) => prev.filter((g) => g.id !== modal.guest.id));
    } catch {} finally {
      setActionLoading(null);
      setModal(null);
    }
  }

  const filtered = guests.filter((g) => {
    const q = search.toLowerCase();
    return (
      g.fingerprint.toLowerCase().includes(q) ||
      (g.ipAddress || "").includes(q) ||
      (g.country || "").toLowerCase().includes(q) ||
      (g.city || "").toLowerCase().includes(q) ||
      (g.convertedUsername || "").toLowerCase().includes(q)
    );
  });

  const activeGuests = guests.filter(
    (g) => !g.convertedUserId && new Date(g.lastSeen).getTime() > Date.now() - 60 * 1000
  );
  const convertedGuests = guests.filter((g) => !!g.convertedUserId);
  const pausedGuests = guests.filter((g) => g.isPaused);

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Guest Users</h1>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search guests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 py-2 pl-9 pr-4 text-sm text-white outline-none focus:border-accent-500/50"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{activeGuests.length}</p>
            <p className="text-xs text-zinc-500">Active Now</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{convertedGuests.length}</p>
            <p className="text-xs text-zinc-500">Signed Up</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <Pause className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{pausedGuests.length}</p>
            <p className="text-xs text-zinc-500">Paused</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-700/30 text-zinc-400">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{guests.length}</p>
            <p className="text-xs text-zinc-500">Total Visitors</p>
          </div>
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
                <th className="px-4 py-3 font-medium">Fingerprint</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">IP</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Location</th>
                <th className="px-4 py-3 font-medium">Online</th>
                <th className="px-4 py-3 font-medium">Last Seen</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Adblock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {filtered.map((g) => {
                const isActive = !g.convertedUserId && new Date(g.lastSeen).getTime() > Date.now() - 5 * 60 * 1000;
                const isOnline = new Date(g.lastSeen).getTime() > Date.now() - 60 * 1000;
                return (
                  <tr key={g.id} className="text-zinc-300">
                    <td className="px-4 py-3 font-mono text-xs">
                      {g.fingerprint.slice(0, 16)}...
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-zinc-500">
                      {g.ipAddress || "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-zinc-500">
                      {[g.city, g.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                          <span className="h-2 w-2 rounded-full bg-zinc-600" />
                          Offline
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {formatDateTime(g.lastSeen)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {g.hasAdblock ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                          <ShieldAlert className="h-3 w-3" />
                          Yes
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-500">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {g.convertedUserId ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                            <UserCheck className="h-3 w-3" />
                            {g.convertedUsername || "Signed up"}
                          </span>
                        ) : isActive ? (
                          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-500">
                            Inactive
                          </span>
                        )}
                        {g.isPaused && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                            Paused
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {g.convertedUserId && (
                          /* Link to their user profile */
                          <a
                            href={`/admin/users`}
                            title={`View ${g.convertedUsername || "user"} profile`}
                            className="rounded-lg p-1.5 text-accent-400 hover:bg-accent-500/10 transition"
                          >
                            <User className="h-4 w-4" />
                          </a>
                        )}

                        {/* View Screen */}
                        <button
                          onClick={() => setViewScreenGuest(g)}
                          className="rounded-lg p-1.5 text-cyan-400 hover:bg-cyan-500/10 transition"
                          title="View Screen"
                        >
                          <Monitor className="h-4 w-4" />
                        </button>

                        {/* Pause / Unpause */}
                        {g.isPaused ? (
                          <button
                                onClick={() => handleUnpause(g)}
                                title="Unpause session"
                                className="rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-500/10 transition"
                              >
                                {actionLoading === `unpause:${g.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePause(g)}
                                title="Pause session"
                                className="rounded-lg p-1.5 text-amber-400 hover:bg-amber-500/10 transition"
                              >
                                {actionLoading === `pause:${g.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                              </button>
                            )}

                            {/* Redirect */}
                            <button
                              onClick={() => {
                                setRedirectUrl("");
                                setModal({ type: "redirect", guest: g });
                              }}
                              title="Redirect"
                              className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-500/10 transition"
                            >
                              {actionLoading === `redirect:${g.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                            </button>

                            {/* Delete session */}
                            <button
                              onClick={() => setModal({ type: "delete", guest: g })}
                              title="Delete session"
                              className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 transition"
                            >
                              {actionLoading === `delete:${g.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-600">
                    No guest sessions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Redirect Modal */}
      {modal?.type === "redirect" && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white">Redirect Guest</h2>
              <p className="mb-4 mt-1 text-sm text-zinc-500">
                Redirect <span className="font-mono text-zinc-300">{modal.guest.fingerprint.slice(0, 16)}...</span> to a URL.
              </p>
              <input
                type="text"
                placeholder="https://example.com or /page"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-white outline-none focus:border-accent-500/50"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setModal(null)}
                  className="rounded-xl px-4 py-2 text-sm text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRedirect}
                  disabled={!redirectUrl.trim()}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition"
                >
                  Redirect
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Delete Confirmation Modal */}
      {modal?.type === "delete" && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
              <h2 className="text-lg font-bold text-red-400">Delete Guest Session</h2>
              <p className="mb-4 mt-1 text-sm text-zinc-400">
                Are you sure you want to delete the session for{" "}
                <span className="font-mono text-zinc-300">{modal.guest.fingerprint.slice(0, 16)}...</span>?
                This cannot be undone.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setModal(null)}
                  className="rounded-xl px-4 py-2 text-sm text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* View Screen Modal */}
      {viewScreenGuest && (
        <ViewScreenModal
          guestId={viewScreenGuest.id}
          label={`Guest ${viewScreenGuest.fingerprint.slice(0, 12)}...`}
          onClose={() => setViewScreenGuest(null)}
        />
      )}
    </div>
  );
}

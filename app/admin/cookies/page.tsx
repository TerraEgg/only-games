"use client";

import { useEffect, useState } from "react";
import Portal from "@/components/Portal";
import {
  Cookie,
  Loader2,
  Search,
  Pencil,
  Trash2,
  User,
  ChevronDown,
  ChevronRight,
  Database,
  Clock,
  Key,
  Globe,
} from "lucide-react";

interface SavedCookie {
  id: string;
  userId: string;
  key: string;
  value: string;
  domain: string;
  updatedAt: string;
  createdAt: string;
  user: { id: string; username: string };
}

interface GroupedUser {
  userId: string;
  username: string;
  cookies: SavedCookie[];
  totalSize: number;
}

export default function AdminCookiesPage() {
  const [cookies, setCookies] = useState<SavedCookie[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Edit modal
  const [editCookie, setEditCookie] = useState<SavedCookie | null>(null);
  const [editForm, setEditForm] = useState({ key: "", value: "", domain: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCookies();
  }, []);

  async function fetchCookies() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cookies");
      if (res.ok) setCookies(await res.json());
    } catch {
      // silent
    }
    setLoading(false);
  }

  // Group by user
  const grouped: GroupedUser[] = (() => {
    const map = new Map<string, GroupedUser>();
    for (const c of cookies) {
      if (!map.has(c.userId)) {
        map.set(c.userId, {
          userId: c.userId,
          username: c.user.username,
          cookies: [],
          totalSize: 0,
        });
      }
      const g = map.get(c.userId)!;
      g.cookies.push(c);
      g.totalSize += (c.key.length + c.value.length);
    }
    return Array.from(map.values()).sort((a, b) =>
      b.cookies.length - a.cookies.length
    );
  })();

  const filteredGroups = search
    ? grouped
        .map((g) => ({
          ...g,
          cookies: g.cookies.filter(
            (c) =>
              c.key.toLowerCase().includes(search.toLowerCase()) ||
              c.value.toLowerCase().includes(search.toLowerCase()) ||
              g.username.toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter((g) => g.cookies.length > 0)
    : grouped;

  function toggleUser(userId: string) {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function openEdit(c: SavedCookie) {
    setEditCookie(c);
    setEditForm({ key: c.key, value: c.value, domain: c.domain });
  }

  async function handleSave() {
    if (!editCookie) return;
    setSaving(true);
    await fetch(`/api/admin/cookies/${editCookie.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    setEditCookie(null);
    await fetchCookies();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this saved cookie?")) return;
    await fetch(`/api/admin/cookies/${id}`, { method: "DELETE" });
    setCookies((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleDeleteAllForUser(userId: string) {
    const userCookies = cookies.filter((c) => c.userId === userId);
    if (!confirm(`Delete all ${userCookies.length} saved cookies for this user?`)) return;
    await Promise.all(
      userCookies.map((c) =>
        fetch(`/api/admin/cookies/${c.id}`, { method: "DELETE" })
      )
    );
    setCookies((prev) => prev.filter((c) => c.userId !== userId));
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(d: string): string {
    return new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function truncate(s: string, max: number): string {
    return s.length > max ? s.slice(0, max) + "…" : s;
  }

  const totalCookies = cookies.length;
  const totalUsers = grouped.length;
  const totalSize = cookies.reduce((acc, c) => acc + c.key.length + c.value.length, 0);

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Cookie className="h-6 w-6 text-accent-400" />
          <h1 className="text-2xl font-bold text-white">Cookie Sync</h1>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search keys, values, users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 py-2 pl-9 pr-4 text-sm text-white outline-none focus:border-accent-500/50"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <User className="h-4 w-4" />
            <span className="text-xs">Users with Synced Data</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalUsers}</p>
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <Database className="h-4 w-4" />
            <span className="text-xs">Total Entries</span>
          </div>
          <p className="text-2xl font-bold text-accent-400">{totalCookies}</p>
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <Key className="h-4 w-4" />
            <span className="text-xs">Total Data Size</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatBytes(totalSize)}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/60 px-4 py-16 text-center text-zinc-500">
          {search ? "No matching entries found" : "No synced cookie data yet"}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const isExpanded = expandedUsers.has(group.userId);
            return (
              <div
                key={group.userId}
                className="overflow-hidden rounded-2xl border border-zinc-800/60"
              >
                {/* User header */}
                <button
                  onClick={() => toggleUser(group.userId)}
                  className="flex w-full items-center justify-between bg-zinc-900/40 px-4 py-3 text-left transition hover:bg-zinc-900/60"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    )}
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/10">
                      <User className="h-4 w-4 text-accent-400" />
                    </div>
                    <div>
                      <span className="font-medium text-white">
                        {group.username}
                      </span>
                      <span className="ml-2 text-xs text-zinc-500">
                        {group.cookies.length} entries · {formatBytes(group.totalSize)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAllForUser(group.userId);
                    }}
                    className="rounded-lg px-2 py-1 text-xs text-red-400 transition hover:bg-red-500/10"
                  >
                    Delete All
                  </button>
                </button>

                {/* Cookie rows */}
                {isExpanded && (
                  <div className="divide-y divide-zinc-800/40">
                    {group.cookies.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-start gap-3 px-4 py-3 text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Key className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                            <span className="font-mono text-xs text-accent-400 truncate">
                              {c.key}
                            </span>
                          </div>
                          <div className="mt-1 flex items-start gap-2">
                            <span className="rounded bg-zinc-800/60 px-2 py-0.5 font-mono text-[11px] text-zinc-400 break-all max-h-20 overflow-y-auto block">
                              {truncate(c.value, 200)}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-zinc-600">
                            {c.domain && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {c.domain}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(c.updatedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openEdit(c)}
                            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-500/10"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editCookie && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/50 my-auto">
              <h2 className="mb-1 text-lg font-bold text-white">
                Edit Cookie Entry
              </h2>
              <p className="mb-4 text-sm text-zinc-500">
                {editCookie.user.username}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Key
                  </label>
                  <input
                    type="text"
                    value={editForm.key}
                    onChange={(e) =>
                      setEditForm({ ...editForm, key: e.target.value })
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 font-mono text-sm text-white outline-none focus:border-accent-500/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Value
                  </label>
                  <textarea
                    value={editForm.value}
                    onChange={(e) =>
                      setEditForm({ ...editForm, value: e.target.value })
                    }
                    rows={6}
                    className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 font-mono text-xs text-white outline-none focus:border-accent-500/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Domain
                  </label>
                  <input
                    type="text"
                    value={editForm.domain}
                    onChange={(e) =>
                      setEditForm({ ...editForm, domain: e.target.value })
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-accent-500/50"
                  />
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setEditCookie(null)}
                  className="flex-1 rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editForm.key}
                  className="flex-1 rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-500 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Update"}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

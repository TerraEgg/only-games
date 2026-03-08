"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Users,
  Eye,
  Megaphone,
  Search,
} from "lucide-react";

interface AdblockStats {
  usersWithAdblock: number;
  guestsWithAdblock: number;
  totalUsers: number;
  totalGuests: number;
}

interface UserAdsDisabled {
  id: string;
  username: string;
}

export default function AdminAdsPage() {
  const [loading, setLoading] = useState(true);
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [stats, setStats] = useState<AdblockStats | null>(null);
  const [usersAdsDisabled, setUsersAdsDisabled] = useState<UserAdsDisabled[]>([]);
  const [toggling, setToggling] = useState(false);

  // Per-user search + toggle
  const [userSearch, setUserSearch] = useState("");
  const [allUsers, setAllUsers] = useState<{ id: string; username: string; adsDisabled: boolean; hasAdblock: boolean }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userToggling, setUserToggling] = useState<string | null>(null);

  async function fetchData() {
    try {
      const res = await fetch("/api/admin/ads");
      const data = await res.json();
      setAdsEnabled(data.adsEnabled);
      setStats(data.adblockStats);
      setUsersAdsDisabled(data.usersAdsDisabled);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setAllUsers(data.map((u: Record<string, unknown>) => ({
        id: u.id,
        username: u.username,
        adsDisabled: u.adsDisabled ?? false,
        hasAdblock: u.hasAdblock ?? false,
      })));
    } catch {
      // ignore
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    fetchUsers();
  }, []);

  async function handleGlobalToggle() {
    setToggling(true);
    try {
      await fetch("/api/admin/ads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adsEnabled: !adsEnabled }),
      });
      setAdsEnabled(!adsEnabled);
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  }

  async function handleUserToggle(userId: string, disable: boolean) {
    setUserToggling(userId);
    try {
      await fetch("/api/admin/ads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, adsDisabled: disable }),
      });
      setAllUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, adsDisabled: disable } : u))
      );
      if (disable) {
        const user = allUsers.find((u) => u.id === userId);
        if (user) setUsersAdsDisabled((prev) => [...prev, { id: userId, username: user.username }]);
      } else {
        setUsersAdsDisabled((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch {
      // ignore
    } finally {
      setUserToggling(null);
    }
  }

  const filteredUsers = userSearch
    ? allUsers.filter((u) => u.username.toLowerCase().includes(userSearch.toLowerCase()))
    : allUsers;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl animate-fadeIn">
      <h1 className="mb-8 text-2xl font-bold text-white">Advertisement Settings</h1>

      {/* Global toggle */}
      <section className="mb-8 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Megaphone className="h-5 w-5 text-accent-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Global Advertisements</h2>
              <p className="text-xs text-zinc-500">Enable or disable all ads site-wide</p>
            </div>
          </div>
          <button
            onClick={handleGlobalToggle}
            disabled={toggling}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition"
          >
            {toggling ? (
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            ) : adsEnabled ? (
              <ToggleRight className="h-8 w-8 text-emerald-400" />
            ) : (
              <ToggleLeft className="h-8 w-8 text-zinc-500" />
            )}
            <span className={adsEnabled ? "text-emerald-400" : "text-zinc-500"}>
              {adsEnabled ? "Enabled" : "Disabled"}
            </span>
          </button>
        </div>
      </section>

      {/* Adblocker stats */}
      {stats && (
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            Adblocker Detection
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-5">
              <div className="flex items-center gap-3 mb-3">
                <Users className="h-5 w-5 text-accent-400" />
                <span className="text-sm font-medium text-zinc-400">Registered Users</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white">{stats.usersWithAdblock}</span>
                <span className="mb-1 text-sm text-zinc-500">/ {stats.totalUsers} using adblocker</span>
              </div>
              {stats.totalUsers > 0 && (
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all"
                    style={{ width: `${(stats.usersWithAdblock / stats.totalUsers) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-5">
              <div className="flex items-center gap-3 mb-3">
                <Eye className="h-5 w-5 text-accent-400" />
                <span className="text-sm font-medium text-zinc-400">Guest Sessions</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white">{stats.guestsWithAdblock}</span>
                <span className="mb-1 text-sm text-zinc-500">/ {stats.totalGuests} using adblocker</span>
              </div>
              {stats.totalGuests > 0 && (
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all"
                    style={{ width: `${(stats.guestsWithAdblock / stats.totalGuests) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Per-user ad control */}
      <section>
        <h2 className="mb-4 text-sm font-bold text-white">Per-User Ad Control</h2>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search users..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2 pl-10 pr-4 text-sm text-white outline-none focus:border-accent-500/50"
          />
        </div>

        {usersLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent-400" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-800/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/60 bg-zinc-900/30 text-left text-xs text-zinc-500">
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Adblocker</th>
                  <th className="px-4 py-3 font-medium text-right">Ads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="text-zinc-300">
                    <td className="px-4 py-3 font-medium">{user.username}</td>
                    <td className="px-4 py-3">
                      {user.hasAdblock ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                          <ShieldAlert className="h-3 w-3" />
                          Detected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                          None
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleUserToggle(user.id, !user.adsDisabled)}
                        disabled={userToggling === user.id}
                        className="inline-flex items-center gap-1.5"
                      >
                        {userToggling === user.id ? (
                          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                        ) : user.adsDisabled ? (
                          <ToggleLeft className="h-6 w-6 text-zinc-500" />
                        ) : (
                          <ToggleRight className="h-6 w-6 text-emerald-400" />
                        )}
                        <span className={`text-xs ${user.adsDisabled ? "text-zinc-500" : "text-emerald-400"}`}>
                          {user.adsDisabled ? "Off" : "On"}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-zinc-600">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

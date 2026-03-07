"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, MapPin, Monitor, Globe, Users, UserX } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface ActivityRow {
  id: string;
  ipAddress: string | null;
  deviceInfo: string | null;
  userAgent: string | null;
  geolocation: string | null;
  country: string | null;
  city: string | null;
  startedAt: string;
  endedAt: string | null;
  user: { username: string };
  game: { title: string };
}

interface GuestActivityRow {
  id: string;
  ipAddress: string | null;
  deviceInfo: string | null;
  userAgent: string | null;
  country: string | null;
  city: string | null;
  startedAt: string;
  endedAt: string | null;
  guest: { fingerprint: string; ipAddress: string | null; country: string | null; city: string | null };
  game: { title: string };
}

export default function AdminTrackingPage() {
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [guestActivities, setGuestActivities] = useState<GuestActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [guestLoading, setGuestLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "live">("all");
  const [tab, setTab] = useState<"users" | "guests">("users");

  useEffect(() => {
    fetchActivities();
    fetchGuestActivities();
    const interval = setInterval(() => {
      fetchActivities();
      fetchGuestActivities();
    }, 30_000);
    return () => clearInterval(interval);
  }, [filter]);

  async function fetchActivities() {
    setLoading(true);
    const url =
      filter === "live" ? "/api/tracking?live=1" : "/api/tracking?limit=100";
    const res = await fetch(url);
    const data = await res.json();
    setActivities(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function fetchGuestActivities() {
    setGuestLoading(true);
    const url =
      filter === "live" ? "/api/guest-tracking?live=1" : "/api/guest-tracking?limit=100";
    try {
      const res = await fetch(url);
      const data = await res.json();
      setGuestActivities(Array.isArray(data) ? data : []);
    } catch {} finally {
      setGuestLoading(false);
    }
  }

  function parseDevice(raw: string | null) {
    try {
      const d = JSON.parse(raw || "{}");
      return {
        type: d.type || "—",
        screen: d.screen || "—",
        platform: d.platform || "—",
      };
    } catch {
      return { type: "—", screen: "—", platform: "—" };
    }
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">
          {tab === "users" ? "User Tracking" : "Guest Tracking"}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("users")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === "users"
                ? "bg-accent-500/10 text-accent-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            <Users className="h-3 w-3" />
            Users
          </button>
          <button
            onClick={() => setTab("guests")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === "guests"
                ? "bg-accent-500/10 text-accent-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            <UserX className="h-3 w-3" />
            Guests
          </button>
          <div className="mx-1 h-4 w-px bg-zinc-800" />
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filter === "all"
                ? "bg-accent-500/10 text-accent-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("live")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filter === "live"
                ? "bg-emerald-500/10 text-emerald-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Live Now
          </button>
          <button
            onClick={() => { fetchActivities(); fetchGuestActivities(); }}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── User Tracking Table ──────────────────────────────────── */}
      {tab === "users" && (
        loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800/60">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-zinc-800/60 bg-zinc-900/30 text-left text-xs text-zinc-500">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Game</th>
                <th className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-1">
                    <Globe className="h-3 w-3" /> IP
                  </div>
                </th>
                <th className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-1">
                    <Monitor className="h-3 w-3" /> Device
                  </div>
                </th>
                <th className="px-4 py-3 font-medium">Screen</th>
                <th className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Location
                  </div>
                </th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {activities.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-zinc-600"
                  >
                    No activity data
                  </td>
                </tr>
              ) : (
                activities.map((a) => {
                  const dev = parseDevice(a.deviceInfo);
                  const location = [a.city, a.country]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <tr key={a.id} className="text-zinc-300">
                      <td className="px-4 py-3 font-medium">
                        {a.user.username}
                      </td>
                      <td className="px-4 py-3">{a.game.title}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                        {a.ipAddress || "—"}
                      </td>
                      <td className="px-4 py-3 capitalize text-zinc-500">
                        {dev.type} · {dev.platform}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{dev.screen}</td>
                      <td className="px-4 py-3 text-zinc-500">
                        {location || a.geolocation || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {formatDateTime(a.startedAt)}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const isLive = a.endedAt
                            ? new Date(a.endedAt).getTime() > Date.now() - 60_000
                            : new Date(a.startedAt).getTime() > Date.now() - 60_000;
                          return isLive ? (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                              Live
                            </span>
                          ) : (
                            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                              Ended
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )
      )}

      {/* ── Guest Tracking Table ─────────────────────────────────── */}
      {tab === "guests" && (
        guestLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800/60">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-zinc-800/60 bg-zinc-900/30 text-left text-xs text-zinc-500">
                <th className="px-4 py-3 font-medium">Fingerprint</th>
                <th className="px-4 py-3 font-medium">Game</th>
                <th className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-1">
                    <Globe className="h-3 w-3" /> IP
                  </div>
                </th>
                <th className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-1">
                    <Monitor className="h-3 w-3" /> Device
                  </div>
                </th>
                <th className="px-4 py-3 font-medium">Screen</th>
                <th className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Location
                  </div>
                </th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {guestActivities.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-zinc-600"
                  >
                    No guest activity data
                  </td>
                </tr>
              ) : (
                guestActivities.map((a) => {
                  const dev = parseDevice(a.deviceInfo);
                  const location = [a.city, a.country]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <tr key={a.id} className="text-zinc-300">
                      <td className="px-4 py-3 font-mono text-xs">
                        {a.guest.fingerprint.slice(0, 16)}...
                      </td>
                      <td className="px-4 py-3">{a.game.title}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                        {a.ipAddress || a.guest.ipAddress || "—"}
                      </td>
                      <td className="px-4 py-3 capitalize text-zinc-500">
                        {dev.type} · {dev.platform}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{dev.screen}</td>
                      <td className="px-4 py-3 text-zinc-500">
                        {location || [a.guest.city, a.guest.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {formatDateTime(a.startedAt)}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const isLive = a.endedAt
                            ? new Date(a.endedAt).getTime() > Date.now() - 60_000
                            : new Date(a.startedAt).getTime() > Date.now() - 60_000;
                          return isLive ? (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                              Live
                            </span>
                          ) : (
                            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                              Ended
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )
      )}
    </div>
  );
}

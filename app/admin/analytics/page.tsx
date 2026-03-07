"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Eye,
  Activity,
  Gamepad2,
  Loader2,
  BarChart3,
  TrendingUp,
} from "lucide-react";

interface Bucket {
  label: string;
  users: number;
  guests: number;
  sessions: number;
}

interface TopGame {
  title: string;
  count: number;
}

interface AnalyticsData {
  onlineUsers: number;
  onlineGuests: number;
  totalUsers: number;
  totalGuests: number;
  totalSessions: number;
  buckets: Bucket[];
  topGames: TopGame[];
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"24h" | "7d" | "30d">("24h");

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30_000);
    return () => clearInterval(interval);
  }, [range]);

  async function fetchAnalytics() {
    try {
      const res = await fetch(`/api/admin/analytics?range=${range}`);
      const json = await res.json();
      setData(json);
    } catch {} finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  if (!data) return null;

  const maxBucket = Math.max(...data.buckets.map((b) => Math.max(b.users, b.guests)), 1);
  const maxGame = Math.max(...data.topGames.map((g) => g.count), 1);

  const rangeTabs = [
    { key: "24h" as const, label: "24 Hours" },
    { key: "7d" as const, label: "7 Days" },
    { key: "30d" as const, label: "30 Days" },
  ];

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-accent-400" />
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-1">
          {rangeTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setRange(t.key); setLoading(true); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                range === t.key
                  ? "bg-accent-500/10 text-accent-400"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={Users}
          color="text-blue-400 bg-blue-500/10"
          label="Online Users"
          value={data.onlineUsers}
          pulse
        />
        <StatCard
          icon={Eye}
          color="text-emerald-400 bg-emerald-500/10"
          label="Online Guests"
          value={data.onlineGuests}
          pulse
        />
        <StatCard
          icon={Users}
          color="text-zinc-400 bg-zinc-700/30"
          label="Total Users"
          value={data.totalUsers}
        />
        <StatCard
          icon={Eye}
          color="text-zinc-400 bg-zinc-700/30"
          label="Total Guests"
          value={data.totalGuests}
        />
        <StatCard
          icon={Activity}
          color="text-amber-400 bg-amber-500/10"
          label="Sessions"
          value={data.totalSessions}
          sub={range === "24h" ? "last 24h" : range === "7d" ? "last 7d" : "last 30d"}
        />
      </div>

      {/* Activity chart */}
      <div className="mb-8 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent-400" />
          <h2 className="text-sm font-semibold text-white">
            Activity Over Time
          </h2>
          <div className="ml-auto flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
              Users
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              Guests
            </span>
          </div>
        </div>

        <div className="flex gap-[3px]" style={{ height: 200 }}>
          {data.buckets.map((b, i) => {
            const userH = maxBucket ? (b.users / maxBucket) * 100 : 0;
            const guestH = maxBucket ? (b.guests / maxBucket) * 100 : 0;
            return (
              <div key={i} className="group relative flex-1 flex flex-col items-center gap-0.5">
                {/* Tooltip */}
                <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 scale-0 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[10px] shadow-lg transition group-hover:scale-100 whitespace-nowrap z-10">
                  <p className="font-medium text-white">{b.label}</p>
                  <p className="text-blue-400">{b.users} user{b.users !== 1 ? "s" : ""}</p>
                  <p className="text-emerald-400">{b.guests} guest{b.guests !== 1 ? "s" : ""}</p>
                  <p className="text-zinc-500">{b.sessions} sessions</p>
                </div>
                {/* Bars */}
                <div className="flex w-full flex-1 items-end gap-px">
                  <div
                    className="flex-1 rounded-t bg-blue-500/80 transition-all duration-300"
                    style={{ height: `${userH}%`, minHeight: b.users ? 3 : 0 }}
                  />
                  <div
                    className="flex-1 rounded-t bg-emerald-500/80 transition-all duration-300"
                    style={{ height: `${guestH}%`, minHeight: b.guests ? 3 : 0 }}
                  />
                </div>
                {/* Label - show every other for 24h, all for 7d/30d */}
                {(range !== "24h" || i % 3 === 0) && (
                  <span className="text-[9px] text-zinc-600 truncate w-full text-center mt-1">
                    {b.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Games */}
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-accent-400" />
          <h2 className="text-sm font-semibold text-white">Top Games</h2>
          <span className="text-xs text-zinc-500">by session count</span>
        </div>

        {data.topGames.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-600">No game sessions in this period</p>
        ) : (
          <div className="space-y-2.5">
            {data.topGames.map((g, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-5 text-right text-xs font-medium text-zinc-500">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="truncate text-sm text-white">{g.title}</span>
                    <span className="ml-2 text-xs text-zinc-500 shrink-0">{g.count} sessions</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-accent-500/60 transition-all duration-500"
                      style={{ width: `${(g.count / maxGame) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  color,
  label,
  value,
  sub,
  pulse,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  value: number;
  sub?: string;
  pulse?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold text-white">{value}</p>
          {pulse && value > 0 && (
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </div>
        <p className="text-xs text-zinc-500">{label}</p>
        {sub && <p className="text-[10px] text-zinc-600">{sub}</p>}
      </div>
    </div>
  );
}

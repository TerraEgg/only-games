import { prisma } from "@/lib/prisma";
import { Users, Gamepad2, FolderOpen, Activity } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [userCount, gameCount, categoryCount, activeNow, recentActivity] =
    await Promise.all([
      prisma.user.count(),
      prisma.game.count(),
      prisma.category.count(),
      prisma.activity.count({
        where: { endedAt: null },
      }),
      prisma.activity.findMany({
        orderBy: { startedAt: "desc" },
        take: 15,
        include: {
          user: { select: { username: true } },
          game: { select: { title: true } },
        },
      }),
    ]);

  const stats = [
    {
      label: "Total Users",
      value: userCount,
      icon: Users,
      color: "text-blue-400 bg-blue-500/10",
    },
    {
      label: "Total Games",
      value: gameCount,
      icon: Gamepad2,
      color: "text-violet-400 bg-violet-500/10",
    },
    {
      label: "Categories",
      value: categoryCount,
      icon: FolderOpen,
      color: "text-emerald-400 bg-emerald-500/10",
    },
    {
      label: "Playing Now",
      value: activeNow,
      icon: Activity,
      color: "text-amber-400 bg-amber-500/10",
    },
  ];

  return (
    <div className="animate-fadeIn">
      <h1 className="mb-6 text-2xl font-bold text-white">Dashboard</h1>

      {/* Stats */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.color}`}
            >
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-zinc-500">{s.label}</p>
            </div>
          </div>
        ))}
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
              <th className="px-4 py-3 font-medium hidden md:table-cell">Device</th>
              <th className="px-4 py-3 font-medium">Started</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40">
            {recentActivity.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-zinc-600"
                >
                  No activity yet
                </td>
              </tr>
            ) : (
              recentActivity.map((a) => {
                let device = "";
                try {
                  const info = JSON.parse(a.deviceInfo || "{}");
                  device = info.type || "";
                } catch {}
                return (
                  <tr key={a.id} className="text-zinc-300">
                    <td className="px-4 py-3 font-medium">{a.user.username}</td>
                    <td className="px-4 py-3">{a.game.title}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-zinc-500">
                      {a.ipAddress || "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-zinc-500 capitalize">
                      {device || "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {formatDateTime(a.startedAt)}
                    </td>
                    <td className="px-4 py-3">
                      {a.endedAt ? (
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                          Ended
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                          Live
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

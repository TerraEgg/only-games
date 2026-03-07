import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "24h"; // "24h" | "7d" | "30d"

  const now = Date.now();
  const ranges: Record<string, number> = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  const ms = ranges[range] || ranges["24h"];
  const since = new Date(now - ms);

  const [
    onlineUsers,
    onlineGuests,
    totalUsers,
    totalGuests,
    activities,
    guestActivities,
    topGamesRaw,
    topGuestGamesRaw,
  ] = await Promise.all([
    prisma.user.count({
      where: { lastLogin: { gte: new Date(now - 60_000) } },
    }),
    prisma.guestSession.count({
      where: { lastSeen: { gte: new Date(now - 60_000) } },
    }),
    prisma.user.count(),
    prisma.guestSession.count(),
    prisma.activity.findMany({
      where: { startedAt: { gte: since } },
      select: { startedAt: true, userId: true, gameId: true },
    }),
    prisma.guestActivity.findMany({
      where: { startedAt: { gte: since } },
      select: { startedAt: true, guestId: true, gameId: true },
    }),
    prisma.activity.groupBy({
      by: ["gameId"],
      _count: { id: true },
      where: { startedAt: { gte: since } },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
    prisma.guestActivity.groupBy({
      by: ["gameId"],
      _count: { id: true },
      where: { startedAt: { gte: since } },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
  ]);

  // Build time buckets
  const bucketMs = range === "24h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const bucketCount = range === "24h" ? 24 : range === "7d" ? 7 : 30;

  const buckets: { label: string; users: number; guests: number; sessions: number }[] = [];

  for (let i = bucketCount - 1; i >= 0; i--) {
    const start = new Date(now - i * bucketMs);
    if (range === "24h") {
      start.setMinutes(0, 0, 0);
    } else {
      start.setHours(0, 0, 0, 0);
    }
    const end = new Date(start.getTime() + bucketMs);

    const uSessions = activities.filter(
      (a) => a.startedAt >= start && a.startedAt < end
    );
    const gSessions = guestActivities.filter(
      (a) => a.startedAt >= start && a.startedAt < end
    );

    const label =
      range === "24h"
        ? start.toLocaleTimeString("en-US", { hour: "numeric", hour12: true })
        : start.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    buckets.push({
      label,
      users: new Set(uSessions.map((a) => a.userId)).size,
      guests: new Set(gSessions.map((a) => a.guestId)).size,
      sessions: uSessions.length + gSessions.length,
    });
  }

  // Resolve game names for top games
  const allGameIds = Array.from(new Set([
    ...topGamesRaw.map((g) => g.gameId),
    ...topGuestGamesRaw.map((g) => g.gameId),
  ]));
  const gamesLookup = await prisma.game.findMany({
    where: { id: { in: allGameIds } },
    select: { id: true, title: true },
  });
  const gameMap = new Map(gamesLookup.map((g) => [g.id, g.title]));

  // Merge top games
  const gameSessionMap = new Map<string, number>();
  for (const g of topGamesRaw) {
    gameSessionMap.set(g.gameId, (gameSessionMap.get(g.gameId) || 0) + g._count.id);
  }
  for (const g of topGuestGamesRaw) {
    gameSessionMap.set(g.gameId, (gameSessionMap.get(g.gameId) || 0) + g._count.id);
  }
  const topGames = Array.from(gameSessionMap.entries())
    .map(([gameId, count]) => ({ title: gameMap.get(gameId) || "Unknown", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return NextResponse.json({
    onlineUsers,
    onlineGuests,
    totalUsers,
    totalGuests,
    totalSessions: activities.length + guestActivities.length,
    buckets,
    topGames,
  });
}

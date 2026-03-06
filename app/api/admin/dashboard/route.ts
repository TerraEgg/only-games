import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [userCount, gameCount, categoryCount, activeNow, recentActivity] =
    await Promise.all([
      prisma.user.count(),
      prisma.game.count(),
      prisma.category.count(),
      prisma.activity.count({ where: { endedAt: null } }),
      prisma.activity.findMany({
        orderBy: { startedAt: "desc" },
        take: 15,
        include: {
          user: { select: { username: true } },
          game: { select: { title: true } },
        },
      }),
    ]);

  return NextResponse.json({
    stats: { userCount, gameCount, categoryCount, activeNow },
    recentActivity,
  });
}

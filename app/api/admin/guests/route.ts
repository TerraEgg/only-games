import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET — list all guest sessions for admin */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.max(1, parseInt(searchParams.get("limit") || "10")); // default 10 at a time
  const search = searchParams.get("search")?.trim() || "";

  const where: any = {};
  if (search) {
    where.OR = [
      { fingerprint: { contains: search, mode: "insensitive" } },
      { ipAddress: { contains: search, mode: "insensitive" } },
      { country: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, activeCount, convertedCount, pausedCount, guests] = await Promise.all([
    prisma.guestSession.count({ where }),
    prisma.guestSession.count({
      where: {
        convertedUserId: null,
        lastSeen: { gt: new Date(Date.now() - 60 * 1000) },
      },
    }),
    prisma.guestSession.count({ where: { convertedUserId: { not: null } } }),
    prisma.guestSession.count({ where: { isPaused: true } }),
    prisma.guestSession.findMany({
      where,
      orderBy: { lastSeen: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // Resolve converted user names
  const convertedIds = guests
    .filter((g) => g.convertedUserId)
    .map((g) => g.convertedUserId!);

  const users = convertedIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: convertedIds } },
        select: { id: true, username: true },
      })
    : [];

  const userMap = Object.fromEntries(users.map((u) => [u.id, u.username]));

  const result = guests.map((g) => ({
    ...g,
    convertedUsername: g.convertedUserId ? userMap[g.convertedUserId] || null : null,
  }));

  return NextResponse.json({
    data: result,
    stats: { total, activeCount, convertedCount, pausedCount },
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET — list all guest sessions for admin */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const guests = await prisma.guestSession.findMany({
    orderBy: { lastSeen: "desc" },
    take: 200,
  });

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

  return NextResponse.json(result);
}

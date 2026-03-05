import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Lightweight endpoint polled by the client every 30s.
 * Returns { banned: true/false } so the UI can redirect in real-time
 * when an admin bans a user — no re-login needed.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ banned: false });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isBanned: true },
  });

  return NextResponse.json({ banned: !!user?.isBanned });
}

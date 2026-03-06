import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * Lightweight endpoint for checking ban & pause status.
 * Uses activeBanId for precise ban tracking.
 * Falls back to __og_banned_user cookie when session is gone (post-signOut).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const usernameParam = url.searchParams.get("username");

  const session = await getServerSession(authOptions);
  let userId: string | null = (session?.user as any)?.id || null;

  // Resolve username: query param → cookie fallback
  const cookieStore = cookies();
  const resolvedUsername = usernameParam || cookieStore.get("__og_banned_user")?.value || null;

  if (!userId && resolvedUsername) {
    const user = await prisma.user.findUnique({
      where: { username: resolvedUsername },
      select: { isBanned: true, activeBanId: true, isPaused: true },
    });
    return NextResponse.json({
      banned: !!user?.isBanned,
      banId: user?.activeBanId || null,
      paused: !!user?.isPaused,
    });
  }

  if (!userId) {
    return NextResponse.json({ banned: false, paused: false });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBanned: true, activeBanId: true, isPaused: true },
  });

  return NextResponse.json({
    banned: !!user?.isBanned,
    banId: user?.activeBanId || null,
    paused: !!user?.isPaused,
  });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * Lightweight endpoint polled by the client.
 * - BanChecker polls this every 30s to detect live bans.
 * - Banned page polls this every 5s to detect unbans.
 * 
 * Checks the DB directly (not JWT) so ban/unban is always up to date.
 * Also accepts ?username=xxx for the banned page (user may not have session).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const usernameParam = url.searchParams.get("username");

  // Try session first
  const session = await getServerSession(authOptions);
  
  let userId: string | null = session?.user?.id || null;

  // If no session but username provided (banned user checking their status)
  if (!userId && usernameParam) {
    const user = await prisma.user.findUnique({
      where: { username: usernameParam },
      select: { id: true, isBanned: true },
    });
    return NextResponse.json({ banned: !!user?.isBanned });
  }

  // Check by cookie — the banned page passes this
  const cookieStore = cookies();
  const banCookie = cookieStore.get("__og_banned");

  if (!userId && banCookie?.value === "1") {
    // User has ban cookie but no session — they can only check via username param
    // Return banned: true (they still have the cookie)
    return NextResponse.json({ banned: true });
  }

  if (!userId) {
    return NextResponse.json({ banned: false });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBanned: true },
  });

  return NextResponse.json({ banned: !!user?.isBanned });
}

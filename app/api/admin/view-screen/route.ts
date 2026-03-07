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
  const userId = searchParams.get("userId");
  const guestId = searchParams.get("guestId");

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentPage: true, screenCapture: true, lastLogin: true, username: true },
    });
    return NextResponse.json({
      page: user?.currentPage,
      screenshot: user?.screenCapture,
      lastLogin: user?.lastLogin,
      username: user?.username,
    });
  }

  if (guestId) {
    const guest = await prisma.guestSession.findUnique({
      where: { id: guestId },
      select: { currentPage: true, screenCapture: true, lastSeen: true, fingerprint: true },
    });
    return NextResponse.json({
      page: guest?.currentPage,
      screenshot: guest?.screenCapture,
      lastSeen: guest?.lastSeen,
      fingerprint: guest?.fingerprint,
    });
  }

  return NextResponse.json({ error: "Missing userId or guestId" }, { status: 400 });
}

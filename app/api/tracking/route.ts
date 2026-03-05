import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// POST — start tracking OR end tracking (if ?end=1)
export async function POST(req: Request) {
  const url = new URL(req.url);
  const isEnd = url.searchParams.get("end") === "1";

  if (isEnd) {
    // End tracking — works with sendBeacon too
    try {
      const body = await req.json();
      if (body.activityId) {
        const activity = await prisma.activity.update({
          where: { id: body.activityId },
          data: { endedAt: new Date() },
        });

        // Calculate session duration and add to user's totalPlayTime
        if (activity.startedAt) {
          const durationSeconds = Math.floor(
            (new Date().getTime() - new Date(activity.startedAt).getTime()) / 1000
          );
          if (durationSeconds > 0 && durationSeconds < 86400) {
            // Sanity: max 24h per session
            await prisma.user.update({
              where: { id: activity.userId },
              data: { totalPlayTime: { increment: durationSeconds } },
            });
          }
        }
      }
    } catch {}
    return NextResponse.json({ ok: true });
  }

  // Start tracking
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { gameId, geolocation, deviceInfo } = await req.json();

  if (!gameId) {
    return NextResponse.json({ error: "gameId required" }, { status: 400 });
  }

  // Get IP from headers
  const headersList = headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown";

  const userAgent = headersList.get("user-agent") || null;

  // Try to get geo info from IP (best effort, using free ip-api)
  let country: string | null = null;
  let city: string | null = null;

  try {
    if (ip && ip !== "unknown" && ip !== "::1" && ip !== "127.0.0.1") {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=country,city`, {
        signal: AbortSignal.timeout(2000),
      });
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        country = geoData.country || null;
        city = geoData.city || null;
      }
    }
  } catch {}

  const activity = await prisma.activity.create({
    data: {
      userId: session.user.id,
      gameId,
      ipAddress: ip,
      deviceInfo: deviceInfo || null,
      userAgent,
      geolocation: geolocation || null,
      country,
      city,
    },
  });

  // ── Enforce 100-entry limit per user ──────────────────────────────
  // Keep only the most recent 100 activities for this user
  const count = await prisma.activity.count({
    where: { userId: session.user.id },
  });

  if (count > 100) {
    // Find the 100th newest entry's startedAt to delete everything older
    const oldest = await prisma.activity.findMany({
      where: { userId: session.user.id },
      orderBy: { startedAt: "desc" },
      skip: 100,
      take: 1,
      select: { startedAt: true },
    });

    if (oldest.length > 0) {
      await prisma.activity.deleteMany({
        where: {
          userId: session.user.id,
          startedAt: { lte: oldest[0].startedAt },
          // Don't delete the activity we just created
          id: { not: activity.id },
        },
      });
    }
  }

  return NextResponse.json({ id: activity.id }, { status: 201 });
}

// GET — admin: list activities
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(req.url);
  const live = url.searchParams.get("live") === "1";
  const limit = parseInt(url.searchParams.get("limit") || "100");

  const where = live ? { endedAt: null } : {};

  const activities = await prisma.activity.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: limit,
    include: {
      user: { select: { username: true } },
      game: { select: { title: true } },
    },
  });

  return NextResponse.json(activities);
}

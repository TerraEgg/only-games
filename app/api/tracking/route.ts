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
        await prisma.activity.update({
          where: { id: body.activityId },
          data: { endedAt: new Date() },
        });
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

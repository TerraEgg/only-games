import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes — session is stale if no heartbeat

// POST — start tracking, heartbeat, or end tracking
export async function POST(req: Request) {
  const url = new URL(req.url);
  const isEnd = url.searchParams.get("end") === "1";
  const isHeartbeat = url.searchParams.get("heartbeat") === "1";

  // ── Heartbeat — update endedAt to keep session alive ──────────────
  if (isHeartbeat) {
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

  // ── End tracking ──────────────────────────────────────────────────
  if (isEnd) {
    try {
      const body = await req.json();
      if (body.activityId) {
        // Only set endedAt and calculate time if not already finalized
        const activity = await prisma.activity.findUnique({
          where: { id: body.activityId },
          select: { startedAt: true, endedAt: true, userId: true },
        });

        if (activity) {
          const now = new Date();
          await prisma.activity.update({
            where: { id: body.activityId },
            data: { endedAt: now },
          });

          // Calculate actual play duration
          const durationSeconds = Math.floor(
            (now.getTime() - new Date(activity.startedAt).getTime()) / 1000
          );

          // Subtract any time already credited by previous heartbeat-based endedAt
          const alreadyCredited = activity.endedAt
            ? Math.floor(
                (new Date(activity.endedAt).getTime() -
                  new Date(activity.startedAt).getTime()) /
                  1000
              )
            : 0;

          const newTime = durationSeconds - alreadyCredited;

          if (newTime > 0 && durationSeconds < 86400) {
            await prisma.user.update({
              where: { id: activity.userId },
              data: { totalPlayTime: { increment: newTime } },
            });
          }
        }
      }
    } catch {}
    return NextResponse.json({ ok: true });
  }

  // ── Start tracking ────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { gameId, geolocation, deviceInfo } = await req.json();

  if (!gameId) {
    return NextResponse.json({ error: "gameId required" }, { status: 400 });
  }

  // ── Reuse existing active session for same user + game ────────────
  const existing = await prisma.activity.findFirst({
    where: {
      userId: session.user.id,
      gameId,
      endedAt: { gt: new Date(Date.now() - 60_000) }, // heartbeat within last 60s
    },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });

  if (existing) {
    // Session is still alive — return existing ID instead of creating a duplicate
    return NextResponse.json({ id: existing.id }, { status: 200 });
  }

  // ── Close any stale/orphaned sessions for this user ───────────────
  // Sessions that never got an end signal (browser crash, etc.)
  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);
  const staleSessions = await prisma.activity.findMany({
    where: {
      userId: session.user.id,
      OR: [
        { endedAt: null }, // never got any heartbeat or end
        {
          endedAt: { lt: staleThreshold }, // last heartbeat > 2 min ago
          // Only consider truly stale — recent heartbeats mean active
        },
      ],
      // Only look at sessions that started recently-ish (last 24h)
      startedAt: { gt: new Date(Date.now() - 86400000) },
    },
  });

  // Close stale sessions and credit their play time
  for (const stale of staleSessions) {
    const endTime = stale.endedAt || stale.startedAt; // if no heartbeat ever, 0 duration
    const durationSeconds = Math.floor(
      (new Date(endTime).getTime() - new Date(stale.startedAt).getTime()) / 1000
    );

    if (durationSeconds > 0 && durationSeconds < 86400) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { totalPlayTime: { increment: durationSeconds } },
      });
    }

    // Mark as closed — set endedAt if null
    if (!stale.endedAt) {
      await prisma.activity.update({
        where: { id: stale.id },
        data: { endedAt: endTime },
      });
    }
  }

  // ── Get IP & geo ──────────────────────────────────────────────────
  const headersList = headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown";

  const userAgent = headersList.get("user-agent") || null;

  let country: string | null = null;
  let city: string | null = null;

  try {
    if (ip && ip !== "unknown" && ip !== "::1" && ip !== "127.0.0.1") {
      const geoRes = await fetch(
        `http://ip-api.com/json/${ip}?fields=country,city`,
        { signal: AbortSignal.timeout(2000) }
      );
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
  const count = await prisma.activity.count({
    where: { userId: session.user.id },
  });

  if (count > 100) {
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

  // "Live" = endedAt updated within last 60s (heartbeat-based)
  const where = live
    ? { endedAt: { gt: new Date(Date.now() - 60_000) } }
    : {};

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

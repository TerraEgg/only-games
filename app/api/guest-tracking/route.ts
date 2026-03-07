import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

const STALE_THRESHOLD_MS = 2 * 60 * 1000;

// POST — start tracking, heartbeat, or end tracking for guests
export async function POST(req: Request) {
  const url = new URL(req.url);
  const isEnd = url.searchParams.get("end") === "1";
  const isHeartbeat = url.searchParams.get("heartbeat") === "1";

  // ── Heartbeat ─────────────────────────────────────────────────────
  if (isHeartbeat) {
    try {
      const body = await req.json();
      if (body.activityId) {
        await prisma.guestActivity.update({
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
        await prisma.guestActivity.update({
          where: { id: body.activityId },
          data: { endedAt: new Date() },
        });
      }
    } catch {}
    return NextResponse.json({ ok: true });
  }

  // ── Start tracking ────────────────────────────────────────────────
  const body = await req.json();
  const { gameId, fingerprint, deviceInfo } = body;

  if (!gameId || !fingerprint) {
    return NextResponse.json({ error: "gameId and fingerprint required" }, { status: 400 });
  }

  // Look up guest session
  const guest = await prisma.guestSession.findUnique({
    where: { fingerprint },
  });

  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  // Reuse existing active session for same guest + game
  const existing = await prisma.guestActivity.findFirst({
    where: {
      guestId: guest.id,
      gameId,
      endedAt: { gt: new Date(Date.now() - 60_000) },
    },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ id: existing.id }, { status: 200 });
  }

  // Close stale sessions
  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);
  const staleSessions = await prisma.guestActivity.findMany({
    where: {
      guestId: guest.id,
      OR: [
        { endedAt: null },
        { endedAt: { lt: staleThreshold } },
      ],
      startedAt: { gt: new Date(Date.now() - 86400000) },
    },
  });

  for (const stale of staleSessions) {
    if (!stale.endedAt) {
      await prisma.guestActivity.update({
        where: { id: stale.id },
        data: { endedAt: stale.endedAt || stale.startedAt },
      });
    }
  }

  // Get IP & geo
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

  const activity = await prisma.guestActivity.create({
    data: {
      guestId: guest.id,
      gameId,
      ipAddress: ip,
      deviceInfo: deviceInfo || null,
      userAgent,
      country,
      city,
    },
  });

  // Enforce 100-entry limit per guest
  const count = await prisma.guestActivity.count({
    where: { guestId: guest.id },
  });

  if (count > 100) {
    const oldest = await prisma.guestActivity.findMany({
      where: { guestId: guest.id },
      orderBy: { startedAt: "desc" },
      skip: 100,
      take: 1,
      select: { startedAt: true },
    });

    if (oldest.length > 0) {
      await prisma.guestActivity.deleteMany({
        where: {
          guestId: guest.id,
          startedAt: { lte: oldest[0].startedAt },
          id: { not: activity.id },
        },
      });
    }
  }

  return NextResponse.json({ id: activity.id }, { status: 201 });
}

// GET — admin: list guest activities
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(req.url);
  const live = url.searchParams.get("live") === "1";
  const limit = parseInt(url.searchParams.get("limit") || "100");

  const where = live
    ? { endedAt: { gt: new Date(Date.now() - 60_000) } }
    : {};

  const activities = await prisma.guestActivity.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: limit,
    include: {
      guest: { select: { fingerprint: true, ipAddress: true, country: true, city: true } },
      game: { select: { title: true } },
    },
  });

  return NextResponse.json(activities);
}

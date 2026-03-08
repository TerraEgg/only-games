import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET  — return global ads_enabled + per-user overrides + adblock stats
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [setting, usersWithAdblock, guestsWithAdblock, totalUsers, totalGuests, usersAdsDisabled] =
    await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: "ads_enabled" } }),
      prisma.user.count({ where: { hasAdblock: true } }),
      prisma.guestSession.count({ where: { hasAdblock: true } }),
      prisma.user.count(),
      prisma.guestSession.count(),
      prisma.user.findMany({
        where: { adsDisabled: true },
        select: { id: true, username: true },
      }),
    ]);

  return NextResponse.json({
    adsEnabled: setting?.value !== "false", // default true
    adblockStats: {
      usersWithAdblock,
      guestsWithAdblock,
      totalUsers,
      totalGuests,
    },
    usersAdsDisabled,
  });
}

// PATCH — update global toggle or per-user toggle
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();

  // Global toggle
  if (typeof body.adsEnabled === "boolean") {
    await prisma.siteSetting.upsert({
      where: { key: "ads_enabled" },
      update: { value: String(body.adsEnabled) },
      create: { key: "ads_enabled", value: String(body.adsEnabled) },
    });
  }

  // Per-user toggle
  if (body.userId && typeof body.adsDisabled === "boolean") {
    await prisma.user.update({
      where: { id: body.userId },
      data: { adsDisabled: body.adsDisabled },
    });
  }

  return NextResponse.json({ ok: true });
}

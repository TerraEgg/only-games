import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

/**
 * POST — track a guest session (called from client for non-logged-in users)
 * Body: { fingerprint: string }
 */
export async function POST(req: Request) {
  const { fingerprint } = await req.json();
  if (!fingerprint || typeof fingerprint !== "string") {
    return NextResponse.json({ error: "fingerprint required" }, { status: 400 });
  }

  const headersList = await headers();
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

  await prisma.guestSession.upsert({
    where: { fingerprint },
    create: { fingerprint, ipAddress: ip, userAgent, country, city },
    update: { lastSeen: new Date(), ipAddress: ip, userAgent, country, city },
  });

  return NextResponse.json({ ok: true });
}

/**
 * PATCH — mark a guest as converted when they sign in
 * Body: { fingerprint: string, userId: string }
 */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  // Only allow the user themselves or admin
  const { fingerprint, userId } = await req.json();

  if (!fingerprint) {
    return NextResponse.json({ error: "fingerprint required" }, { status: 400 });
  }

  const myUserId = (session?.user as any)?.id;
  if (!myUserId && !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.guestSession.update({
    where: { fingerprint },
    data: { convertedUserId: myUserId || userId },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}

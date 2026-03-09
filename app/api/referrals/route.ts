import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

/**
 * GET — Get current user's referral info: code, referral list, redirect credits.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      referralCode: true,
      prankCredits: true,
      referrals: {
        select: {
          id: true,
          username: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Auto-generate referral code if none exists
  let referralCode = user.referralCode;
  if (!referralCode) {
    referralCode = randomBytes(4).toString("hex"); // 8-char hex
    await prisma.user.update({
      where: { id: session.user.id },
      data: { referralCode },
    });
  }

  // Get pranks sent
  const pranksSent = await prisma.prankRedirect.findMany({
    where: { senderId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      redirectUrl: true,
      executed: true,
      createdAt: true,
      target: { select: { id: true, username: true } },
    },
  });

  return NextResponse.json({
    referralCode,
    prankCredits: user.prankCredits,
    referrals: user.referrals,
    pranksSent,
  });
}

/**
 * POST — Generate/regenerate referral code.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = randomBytes(4).toString("hex");
  await prisma.user.update({
    where: { id: session.user.id },
    data: { referralCode: code },
  });

  return NextResponse.json({ referralCode: code });
}

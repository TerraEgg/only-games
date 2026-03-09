import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { username, password, referralCode } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 24) {
      return NextResponse.json(
        { error: "Username must be 3-24 characters" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if username exists
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);

    // Look up referrer by referral code (if provided)
    let referredById: string | null = null;
    if (referralCode && typeof referralCode === "string" && referralCode.trim()) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: referralCode.trim() },
        select: { id: true },
      });
      if (referrer) referredById = referrer.id;
    }

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        ...(referredById ? { referredById } : {}),
      },
    });

    // Grant the referrer 3 prank credits
    if (referredById) {
      await prisma.user.update({
        where: { id: referredById },
        data: { prankCredits: { increment: 3 } },
      });
    }

    return NextResponse.json(
      { id: user.id, username: user.username },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

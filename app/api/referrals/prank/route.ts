import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST — Send a redirect to a referred friend.
 * Body: { targetId: string, redirectUrl: string }
 * Costs 3 redirect credits. Max 3 redirects per target.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { targetId, redirectUrl } = await req.json();

  if (!targetId || !redirectUrl) {
    return NextResponse.json(
      { error: "targetId and redirectUrl are required" },
      { status: 400 }
    );
  }

  // Validate URL format
  try {
    new URL(redirectUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Check the sender has enough credits (costs 3)
  const sender = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { prankCredits: true },
  });

  if (!sender || sender.prankCredits < 3) {
    return NextResponse.json(
      { error: "Not enough redirect credits. You need 3 per redirect. Invite more friends to earn more!" },
      { status: 403 }
    );
  }

  // Verify the target was referred by this user
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, referredById: true, username: true, role: true },
  });

  if (!target || target.referredById !== session.user.id) {
    return NextResponse.json(
      { error: "You can only redirect users you referred" },
      { status: 403 }
    );
  }

  // Admins can't be redirected
  if (target.role === "ADMIN") {
    return NextResponse.json(
      { error: "Cannot redirect administrators" },
      { status: 403 }
    );
  }

  // Check max 3 redirects per target
  const redirectCount = await prisma.prankRedirect.count({
    where: {
      senderId: session.user.id,
      targetId: targetId,
    },
  });

  if (redirectCount >= 3) {
    return NextResponse.json(
      { error: "Maximum 3 redirects per user reached" },
      { status: 403 }
    );
  }

  // Create the redirect and deduct 3 credits atomically
  const [redirect] = await prisma.$transaction([
    prisma.prankRedirect.create({
      data: {
        senderId: session.user.id,
        targetId: targetId,
        redirectUrl,
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { prankCredits: { decrement: 3 } },
    }),
  ]);

  return NextResponse.json({ ok: true, redirectId: redirect.id }, { status: 201 });
}

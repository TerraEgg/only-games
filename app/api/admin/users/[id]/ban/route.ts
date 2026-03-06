import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST — Ban or unban a user. Creates admin command for instant SSE push.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { ban, reason } = await req.json();
  const { id } = await params;

  // Clean up any old unconsumed ban/unban commands for this user
  // to prevent stale commands from interfering
  await prisma.adminCommand.updateMany({
    where: {
      targetId: id,
      type: { in: ["ban", "unban"] },
      consumed: false,
    },
    data: { consumed: true },
  });

  if (ban) {
    const cmd = await prisma.adminCommand.create({
      data: {
        targetId: id,
        type: "ban",
        payload: JSON.stringify({ reason: reason || null }),
      },
    });

    await prisma.user.update({
      where: { id },
      data: {
        isBanned: true,
        activeBanId: cmd.id,
        banReason: reason || null,
      },
    });
  } else {
    await prisma.adminCommand.create({
      data: {
        targetId: id,
        type: "unban",
        payload: JSON.stringify({}),
      },
    });

    await prisma.user.update({
      where: { id },
      data: { isBanned: false, activeBanId: null, banReason: null },
    });
  }

  return NextResponse.json({ success: true });
}

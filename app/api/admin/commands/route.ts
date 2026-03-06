import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST — Admin issues a command (ban, unban, pause, unpause, message, redirect)
 * Body: { targetId?: string, type: string, payload: object }
 * targetId = null means broadcast to ALL users
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { targetId, type, payload } = await req.json();

  const validTypes = ["ban", "unban", "pause", "unpause", "message", "redirect"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid command type" }, { status: 400 });
  }

  // Create the command
  const cmd = await prisma.adminCommand.create({
    data: {
      targetId: targetId || null,
      type,
      payload: JSON.stringify(payload || {}),
    },
  });

  // For ban/unban/pause/unpause also update user DB state
  if (targetId) {
    if (type === "ban") {
      await prisma.user.update({
        where: { id: targetId },
        data: {
          isBanned: true,
          activeBanId: cmd.id,
          banReason: payload?.reason || null,
        },
      });
    } else if (type === "unban") {
      await prisma.user.update({
        where: { id: targetId },
        data: { isBanned: false, activeBanId: null, banReason: null },
      });
    } else if (type === "pause") {
      await prisma.user.update({
        where: { id: targetId },
        data: { isPaused: true },
      });
    } else if (type === "unpause") {
      await prisma.user.update({
        where: { id: targetId },
        data: { isPaused: false },
      });
    } else if (type === "message") {
      await prisma.notification.create({
        data: {
          userId: targetId,
          fromAdminId: session.user.id,
          title: payload?.title || "Staff Message",
          message: payload?.message || "",
          redirectUrl: payload?.redirectUrl || null,
        },
      });
    }
  } else {
    // Broadcast commands
    if (type === "message") {
      const users = await prisma.user.findMany({ select: { id: true } });
      await prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          fromAdminId: session.user.id,
          title: payload?.title || "Staff Message",
          message: payload?.message || "",
          redirectUrl: payload?.redirectUrl || null,
        })),
      });
    } else if (type === "pause") {
      // Pause all non-admin users
      await prisma.user.updateMany({
        where: { role: "USER" },
        data: { isPaused: true },
      });
      // Also pause all guest sessions
      await prisma.guestSession.updateMany({
        data: { isPaused: true },
      });
    } else if (type === "unpause") {
      await prisma.user.updateMany({
        data: { isPaused: false },
      });
      // Also unpause all guest sessions
      await prisma.guestSession.updateMany({
        data: { isPaused: false },
      });
    } else if (type === "ban") {
      // Only ban non-admin users
      await prisma.user.updateMany({
        where: { role: "USER" },
        data: { isBanned: true, activeBanId: cmd.id, banReason: payload?.reason || "Mass ban" },
      });
    }
  }

  return NextResponse.json({ ok: true, commandId: cmd.id });
}

/**
 * DELETE — Clean up old consumed commands (housekeeping)
 */
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago
  await prisma.adminCommand.deleteMany({
    where: {
      consumed: true,
      createdAt: { lt: cutoff },
    },
  });

  // Also clean broadcast commands older than 1 minute
  const broadcastCutoff = new Date(Date.now() - 60 * 1000);
  await prisma.adminCommand.deleteMany({
    where: {
      targetId: null,
      createdAt: { lt: broadcastCutoff },
    },
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST — Admin issues a command targeting a specific guest session.
 * Supported types: pause, unpause, redirect
 * Body: { type: string, payload?: object }
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const guestId = params.id;
  const { type, payload } = await req.json();

  const validTypes = ["pause", "unpause", "redirect"];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: "Invalid command type for guest. Allowed: pause, unpause, redirect" },
      { status: 400 }
    );
  }

  const guest = await prisma.guestSession.findUnique({ where: { id: guestId } });
  if (!guest) {
    return NextResponse.json({ error: "Guest session not found" }, { status: 404 });
  }

  // Create the admin command targeting this guest session
  const cmd = await prisma.adminCommand.create({
    data: {
      targetId: guestId,
      type,
      payload: JSON.stringify(payload || {}),
    },
  });

  // Update guest session DB state
  if (type === "pause") {
    await prisma.guestSession.update({
      where: { id: guestId },
      data: { isPaused: true },
    });
  } else if (type === "unpause") {
    await prisma.guestSession.update({
      where: { id: guestId },
      data: { isPaused: false },
    });
  }

  return NextResponse.json({ ok: true, commandId: cmd.id });
}

/**
 * DELETE — Remove a guest session record
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const guestId = params.id;

  const guest = await prisma.guestSession.findUnique({ where: { id: guestId } });
  if (!guest) {
    return NextResponse.json({ error: "Guest session not found" }, { status: 404 });
  }

  await prisma.guestSession.delete({ where: { id: guestId } });

  return NextResponse.json({ ok: true });
}

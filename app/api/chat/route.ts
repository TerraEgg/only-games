import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET — Fetch recent chat messages for a room (or global).
 * Query params: roomId (optional, null=global), cursor, limit
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId") || null;
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

  const messages = await prisma.chatMessage.findMany({
    where: { roomId },
    take: limit,
    orderBy: { createdAt: "desc" },
    ...(cursor
      ? { cursor: { id: cursor }, skip: 1 }
      : {}),
    select: {
      id: true,
      content: true,
      createdAt: true,
      roomId: true,
      user: { select: { id: true, username: true, role: true } },
    },
  });

  return NextResponse.json({
    messages: messages.reverse(),
    nextCursor: messages.length === limit ? messages[0]?.id : null,
  });
}

/**
 * POST — Send a new chat message.
 * Body: { content: string, roomId?: string }
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content, roomId } = await req.json();

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  if (content.length > 500) {
    return NextResponse.json({ error: "Message too long (max 500 chars)" }, { status: 400 });
  }

  // Rate limit: max 1 message per second per user
  const lastMsg = await prisma.chatMessage.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  if (lastMsg && Date.now() - new Date(lastMsg.createdAt).getTime() < 1000) {
    return NextResponse.json({ error: "Slow down! Wait a moment." }, { status: 429 });
  }

  const msg = await prisma.chatMessage.create({
    data: {
      userId: session.user.id,
      content: content.trim(),
      roomId: roomId || null,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      roomId: true,
      user: { select: { id: true, username: true, role: true } },
    },
  });

  return NextResponse.json(msg, { status: 201 });
}

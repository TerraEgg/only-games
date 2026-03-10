import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET — List rooms the current user has joined.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return only rooms the user has joined
  const memberships = await prisma.chatRoomMember.findMany({
    where: { userId: session.user.id },
    orderBy: { joinedAt: "asc" },
    select: {
      room: {
        select: {
          id: true,
          name: true,
          _count: { select: { messages: true, members: true } },
        },
      },
    },
  });

  return NextResponse.json({
    rooms: memberships.map((m) => ({
      id: m.room.id,
      name: m.room.name,
      _count: m.room._count,
    })),
  });
}

/**
 * POST — Create a new chat room and auto-join the creator.
 * Body: { name: string }
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Room name is required" }, { status: 400 });
  }

  if (name.trim().length > 30) {
    return NextResponse.json({ error: "Room name too long (max 30 chars)" }, { status: 400 });
  }

  const existing = await prisma.chatRoom.findUnique({ where: { name: name.trim() } });
  if (existing) {
    return NextResponse.json({ error: "Room already exists" }, { status: 409 });
  }

  // Create room + auto-join creator
  const room = await prisma.chatRoom.create({
    data: {
      name: name.trim(),
      createdBy: session.user.id,
      members: {
        create: { userId: session.user.id },
      },
    },
    select: {
      id: true,
      name: true,
      createdBy: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ room }, { status: 201 });
}

/**
 * PUT — Join an existing room by name.
 * Body: { name: string }
 */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Room name is required" }, { status: 400 });
  }

  const room = await prisma.chatRoom.findUnique({ where: { name: name.trim() } });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Check if already a member
  const existing = await prisma.chatRoomMember.findUnique({
    where: { userId_roomId: { userId: session.user.id, roomId: room.id } },
  });

  if (existing) {
    return NextResponse.json({ ok: true, roomId: room.id, alreadyJoined: true });
  }

  await prisma.chatRoomMember.create({
    data: { userId: session.user.id, roomId: room.id },
  });

  return NextResponse.json({ ok: true, roomId: room.id });
}

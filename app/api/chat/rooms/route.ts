import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET — List rooms the current user has joined.
 * ?browse=true — List ALL rooms (for discovering new ones).
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const browse = searchParams.get("browse") === "true";

  if (browse) {
    // Return all rooms with member count + whether current user is a member
    const rooms = await prisma.chatRoom.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        createdBy: true,
        createdAt: true,
        _count: { select: { messages: true, members: true } },
        members: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
    });

    return NextResponse.json({
      rooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        createdBy: r.createdBy,
        messageCount: r._count.messages,
        memberCount: r._count.members,
        joined: r.members.length > 0,
      })),
    });
  }

  // Default: return only rooms the user has joined
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
 * PUT — Join an existing room.
 * Body: { roomId: string }
 */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await req.json();

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Check if already a member
  const existing = await prisma.chatRoomMember.findUnique({
    where: { userId_roomId: { userId: session.user.id, roomId } },
  });

  if (existing) {
    return NextResponse.json({ ok: true, alreadyJoined: true });
  }

  await prisma.chatRoomMember.create({
    data: { userId: session.user.id, roomId },
  });

  return NextResponse.json({ ok: true });
}

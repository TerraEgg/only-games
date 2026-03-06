import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST — Admin sends a notification/DM + creates admin command for instant push
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { title, message, redirectUrl } = await req.json();
  const { id } = await params;

  if (!message || !message.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Create notification in DB
  const notification = await prisma.notification.create({
    data: {
      userId: id,
      fromAdminId: session.user.id,
      title: title?.trim() || "Staff Message",
      message: message.trim(),
      redirectUrl: redirectUrl?.trim() || null,
    },
  });

  // Create admin command for instant SSE delivery
  const cmdType = redirectUrl?.trim() ? "redirect" : "message";
  await prisma.adminCommand.create({
    data: {
      targetId: id,
      type: cmdType,
      payload: JSON.stringify({
        title: title?.trim() || "Staff Message",
        message: message.trim(),
        url: redirectUrl?.trim() || null,
        redirectUrl: redirectUrl?.trim() || null,
      }),
    },
  });

  return NextResponse.json(notification, { status: 201 });
}

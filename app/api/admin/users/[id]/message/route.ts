import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST — Admin sends a notification/DM to a specific user
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

  if (!message || !message.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const notification = await prisma.notification.create({
    data: {
      userId: params.id,
      fromAdminId: session.user.id,
      title: title?.trim() || "Staff Message",
      message: message.trim(),
      redirectUrl: redirectUrl?.trim() || null,
    },
  });

  return NextResponse.json(notification, { status: 201 });
}

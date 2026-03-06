import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE — Delete a user account (admin only)
 * Cascading deletes handle activities, notifications, savedCookies
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent deleting yourself
  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  // Check user exists
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Prevent deleting other admins
  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "Cannot delete admin accounts" }, { status: 400 });
  }

  // Delete user (cascading deletes handle related data)
  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

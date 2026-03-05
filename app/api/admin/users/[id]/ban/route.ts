import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { ban, reason } = await req.json();

  await prisma.user.update({
    where: { id: params.id },
    data: {
      isBanned: !!ban,
      banReason: ban ? reason || null : null,
    },
  });

  return NextResponse.json({ success: true });
}

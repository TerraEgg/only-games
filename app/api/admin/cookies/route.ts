import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET — list all saved cookies grouped by user (admin only) */
export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookies = await prisma.savedCookie.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { id: true, username: true } },
    },
  });

  return NextResponse.json(cookies);
}

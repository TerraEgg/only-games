import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ themeColor: "#00ABED" });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { themeColor: true },
  });
  return NextResponse.json({ themeColor: user?.themeColor ?? "#00ABED" });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { themeColor } = await req.json();
  if (!themeColor || !/^#[0-9A-Fa-f]{6}$/.test(themeColor)) {
    return NextResponse.json({ error: "Invalid color" }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { themeColor },
  });
  return NextResponse.json({ ok: true });
}

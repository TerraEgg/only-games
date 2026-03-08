import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { type, id, page, screenshot, hasAdblock } = await req.json();
    if (!page || !id || !type) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const data: Record<string, string | boolean> = { currentPage: page };
    if (screenshot && typeof screenshot === "string" && screenshot.startsWith("data:image/")) {
      data.screenCapture = screenshot;
    }
    if (typeof hasAdblock === "boolean") {
      data.hasAdblock = hasAdblock;
    }

    if (type === "user") {
      await prisma.user
        .update({ where: { id }, data })
        .catch(() => {});
    } else if (type === "guest") {
      await prisma.guestSession
        .update({ where: { fingerprint: id }, data })
        .catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

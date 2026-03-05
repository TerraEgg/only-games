import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: { id: string };
}

/** PATCH — admin edit a cookie value */
export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const cookie = await prisma.savedCookie.update({
    where: { id: params.id },
    data: {
      ...(body.value !== undefined && { value: body.value }),
      ...(body.key !== undefined && { key: body.key }),
      ...(body.domain !== undefined && { domain: body.domain }),
    },
  });

  return NextResponse.json(cookie);
}

/** DELETE — admin delete a cookie */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.savedCookie.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

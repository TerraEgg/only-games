import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

// PUT — full update
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { title, url, thumbnail, description, categoryId, isFeatured, source } =
    await req.json();

  let slug = slugify(title);
  const existing = await prisma.game.findFirst({
    where: { slug, id: { not: params.id } },
  });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const game = await prisma.game.update({
    where: { id: params.id },
    data: {
      title,
      slug,
      url,
      thumbnail: thumbnail || null,
      description: description || null,
      categoryId,
      isFeatured: !!isFeatured,
      source: source || "INTERNAL",
    },
  });

  return NextResponse.json(game);
}

// PATCH — partial update (toggle active, etc.)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const data = await req.json();

  const game = await prisma.game.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(game);
}

// DELETE
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Delete related activities first
  await prisma.activity.deleteMany({ where: { gameId: params.id } });
  await prisma.game.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}

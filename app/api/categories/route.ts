import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

// GET — list categories (public)
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { games: true } } },
  });

  return NextResponse.json(categories);
}

// POST — create category (admin)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { name, description, icon, sortOrder } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  let slug = slugify(name);
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const category = await prisma.category.create({
    data: {
      name,
      slug,
      description: description || null,
      icon: icon || "Gamepad2",
      sortOrder: sortOrder || 0,
    },
  });

  return NextResponse.json(category, { status: 201 });
}

// PUT — update category (admin)
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const { name, description, icon, sortOrder } = await req.json();

  let slug = slugify(name);
  const existing = await prisma.category.findFirst({
    where: { slug, id: { not: id } },
  });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const category = await prisma.category.update({
    where: { id },
    data: {
      name,
      slug,
      description: description || null,
      icon: icon || "Gamepad2",
      sortOrder: sortOrder || 0,
    },
  });

  return NextResponse.json(category);
}

// DELETE
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  // Check if category has games
  const gameCount = await prisma.game.count({ where: { categoryId: id } });
  if (gameCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete category with games. Remove games first." },
      { status: 400 }
    );
  }

  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

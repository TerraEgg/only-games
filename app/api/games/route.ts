import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

// GET — list all games (admin + public, admin gets all, public gets active)
export async function GET() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const games = await prisma.game.findMany({
    where: isAdmin ? {} : { isActive: true },
    orderBy: { createdAt: "desc" },
    include: { category: { select: { name: true } } },
  });

  return NextResponse.json(games);
}

// POST — create game (admin only)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { title, url, thumbnail, description, categoryId, isFeatured } =
    await req.json();

  if (!title || !url || !categoryId) {
    return NextResponse.json(
      { error: "Title, URL, and category are required" },
      { status: 400 }
    );
  }

  // Generate unique slug
  let slug = slugify(title);
  const existing = await prisma.game.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const game = await prisma.game.create({
    data: {
      title,
      slug,
      url,
      thumbnail: thumbnail || null,
      description: description || null,
      categoryId,
      isFeatured: !!isFeatured,
    },
  });

  return NextResponse.json(game, { status: 201 });
}

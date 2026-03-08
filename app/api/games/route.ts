import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

// GET — paginated game listing (admin + public)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const search = searchParams.get("search") || "";
  const source = searchParams.get("source") || "";
  const category = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "recent";
  const sortBy = searchParams.get("sortBy") || "";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = isAdmin ? {} : { isActive: true };

  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }
  if (source && isAdmin) {
    where.source = source;
  }
  if (category) {
    where.category = { slug: category };
  }
  if (searchParams.get("hideExternal") === "1") {
    where.source = { not: "EXTERNAL" };
  }
  if (!isAdmin) {
    where.thumbnail = { not: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any;
  if (sortBy === "title") {
    orderBy = { title: sortDir };
  } else if (sortBy === "category") {
    orderBy = { category: { name: sortDir } };
  } else if (sortBy === "source") {
    orderBy = { source: sortDir };
  } else if (sortBy === "playCount") {
    orderBy = { playCount: sortDir };
  } else if (sortBy === "isActive") {
    orderBy = { isActive: sortDir };
  } else if (sort === "popular") {
    orderBy = { playCount: "desc" };
  } else {
    orderBy = { createdAt: "desc" };
  }

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { category: { select: { name: true } } },
    }),
    prisma.game.count({ where }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {
    games,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };

  if (isAdmin) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseWhere: any = search
      ? { title: { contains: search, mode: "insensitive" } }
      : {};
    const [all, internal, external, unknown] = await Promise.all([
      prisma.game.count({ where: baseWhere }),
      prisma.game.count({ where: { ...baseWhere, source: "INTERNAL" } }),
      prisma.game.count({ where: { ...baseWhere, source: "EXTERNAL" } }),
      prisma.game.count({ where: { ...baseWhere, source: "UNKNOWN" } }),
    ]);
    result.sourceCounts = {
      ALL: all,
      INTERNAL: internal,
      EXTERNAL: external,
      UNKNOWN: unknown,
    };
  }

  return NextResponse.json(result);
}

// POST — create game (admin only)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { title, url, thumbnail, description, categoryId, isFeatured, source } =
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
      source: source || "INTERNAL",
    },
  });

  return NextResponse.json(game, { status: 201 });
}

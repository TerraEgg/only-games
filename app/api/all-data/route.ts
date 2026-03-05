import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Returns ALL categories + ALL active games in a single request.
 * Client caches this in localStorage for instant page loads.
 */
export const dynamic = "force-dynamic"; // always fresh

export async function GET() {
  const [categories, games] = await Promise.all([
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { games: { where: { isActive: true } } } } },
    }),
    prisma.game.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      include: { category: { select: { name: true, slug: true } } },
    }),
  ]);

  // Build a fingerprint so clients can detect changes
  const fingerprint = `${categories.length}-${games.length}-${
    games[0]?.id ?? ""
  }-${games[0]?.playCount ?? 0}`;

  return NextResponse.json(
    {
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        description: c.description,
        gameCount: c._count.games,
      })),
      games: games.map((g) => ({
        id: g.id,
        title: g.title,
        slug: g.slug,
        url: g.url,
        thumbnail: g.thumbnail,
        description: g.description,
        categoryId: g.categoryId,
        categoryName: g.category.name,
        categorySlug: g.category.slug,
        playCount: g.playCount,
        isFeatured: g.isFeatured,
        createdAt: g.createdAt,
      })),
      fingerprint,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}

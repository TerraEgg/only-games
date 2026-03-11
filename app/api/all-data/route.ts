import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Returns categories + top popular/recent games for the homepage.
 * Now with in-memory caching (15s TTL) to make subsequent requests near-instant.
 */
export const dynamic = "force-dynamic";

// In-memory cache for ultra-fast responses
interface CacheEntry {
  data: string;
  timestamp: number;
  key: string;
}
let memoryCache: CacheEntry | null = null;
const CACHE_TTL = 15_000; // 15 seconds

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hideExternal = searchParams.get("hideExternal") === "1";

  // Cache key from params
  const cacheKey = `all-data-${hideExternal}`;

  // Return cached data if fresh
  if (memoryCache && memoryCache.key === cacheKey && Date.now() - memoryCache.timestamp < CACHE_TTL) {
    return new Response(memoryCache.data, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
        "X-Cache": "HIT",
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameWhere: any = { isActive: true, thumbnail: { not: null } };
  if (hideExternal) gameWhere.source = { not: "EXTERNAL" };

  const [categories, featuredGames, popularGames, recentGames, totalGames] =
    await Promise.all([
      prisma.category.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { games: { where: { isActive: true } } } },
        },
      }),
      prisma.game.findMany({
        where: { ...gameWhere, isFeatured: true },
        orderBy: { playCount: "desc" },
        take: 8,
        include: { category: { select: { name: true, slug: true } } },
      }),
      prisma.game.findMany({
        where: gameWhere,
        orderBy: { playCount: "desc" },
        take: 8,
        include: { category: { select: { name: true, slug: true } } },
      }),
      prisma.game.findMany({
        where: gameWhere,
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { category: { select: { name: true, slug: true } } },
      }),
      prisma.game.count({ where: { isActive: true } }),
    ]);

  const mapGame = (g: (typeof popularGames)[number]) => ({
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
    source: g.source,
    createdAt: g.createdAt,
  });

  const fingerprint = `${categories.length}-${totalGames}-${
    recentGames[0]?.id ?? ""
  }`;

  const responseBody = JSON.stringify({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      description: c.description,
      gameCount: c._count.games,
    })),
    featuredGames: featuredGames.map(mapGame),
    popularGames: popularGames.map(mapGame),
    recentGames: recentGames.map(mapGame),
    totalGames,
    fingerprint,
    updatedAt: new Date().toISOString(),
  });

  // Update memory cache
  memoryCache = { data: responseBody, timestamp: Date.now(), key: cacheKey };

  return new Response(responseBody, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      "X-Cache": "MISS",
    },
  });
}

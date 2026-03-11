import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/all-games
 *
 * Ultra-fast bulk endpoint that returns ALL active games in one shot.
 * Uses aggressive caching (edge + browser) and minimal field selection
 * so the client can load 100-500+ games near-instantly.
 *
 * Query params:
 *   cursor  – last game ID for cursor-based pagination (optional)
 *   limit   – max games to return (default 200, max 1000)
 *   sort    – "recent" | "popular" | "title" (default "recent")
 *   category – category slug filter (optional)
 *   hideExternal – "1" to exclude EXTERNAL source games
 */
export const dynamic = "force-dynamic";

// In-memory cache to avoid hitting DB on every request
let memoryCache: { data: string; timestamp: number; key: string } | null = null;
const CACHE_TTL = 15_000; // 15 seconds

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") || "";
  const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get("limit") || "200")));
  const sort = searchParams.get("sort") || "recent";
  const category = searchParams.get("category") || "";
  const hideExternal = searchParams.get("hideExternal") === "1";

  // Build cache key from params
  const cacheKey = `${cursor}|${limit}|${sort}|${category}|${hideExternal}`;

  // Check in-memory cache
  if (memoryCache && memoryCache.key === cacheKey && Date.now() - memoryCache.timestamp < CACHE_TTL) {
    return new Response(memoryCache.data, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { isActive: true };
  if (hideExternal) where.source = { not: "EXTERNAL" };
  if (category) where.category = { slug: category };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any;
  if (sort === "popular") {
    orderBy = { playCount: "desc" as const };
  } else if (sort === "title") {
    orderBy = { title: "asc" as const };
  } else {
    orderBy = { createdAt: "desc" as const };
  }

  // Cursor-based pagination for infinite scroll
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const findArgs: any = {
    where,
    orderBy,
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      thumbnail: true,
      playCount: true,
      source: true,
      isFeatured: true,
      createdAt: true,
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  };

  if (cursor) {
    findArgs.skip = 1; // skip the cursor item
    findArgs.cursor = { id: cursor };
  }

  const [games, total] = await Promise.all([
    prisma.game.findMany(findArgs),
    // Only count on first page load (no cursor) for perf
    cursor ? Promise.resolve(-1) : prisma.game.count({ where }),
  ]);

  const mapped = games.map((g: any) => ({
    id: g.id,
    title: g.title,
    slug: g.slug,
    thumbnail: g.thumbnail,
    playCount: g.playCount,
    source: g.source,
    isFeatured: g.isFeatured,
    categoryName: g.category.name,
    categorySlug: g.category.slug,
    createdAt: g.createdAt,
  }));

  const nextCursor = games.length === limit ? games[games.length - 1].id : null;

  const responseData = JSON.stringify({
    games: mapped,
    nextCursor,
    total,
    hasMore: !!nextCursor,
  });

  // Update memory cache
  memoryCache = { data: responseData, timestamp: Date.now(), key: cacheKey };

  return new Response(responseData, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
    },
  });
}

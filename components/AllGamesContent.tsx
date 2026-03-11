"use client";

import GameCard from "@/components/GameCard";
import Link from "next/link";
import { ChevronLeft, Loader2, Gamepad2, Layers } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHideExternal } from "@/lib/useHideExternal";
import AdUnit from "@/components/AdUnit";

interface GameItem {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  playCount: number;
  categoryName: string;
  categorySlug: string;
  source: string;
  isFeatured: boolean;
}

const BATCH_SIZE = 100;

export default function AllGamesContent() {
  const { hideExternal } = useHideExternal();
  const [games, setGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<"recent" | "popular" | "title">("popular");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);

  // Fetch games with cursor-based pagination
  const fetchGames = useCallback(
    async (nextCursor: string | null, append: boolean) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams({
        limit: String(BATCH_SIZE),
        sort,
      });
      if (nextCursor) params.set("cursor", nextCursor);
      if (hideExternal) params.set("hideExternal", "1");

      try {
        const res = await fetch(`/api/all-games?${params}`);
        const data = await res.json();

        const newGames: GameItem[] = data.games;

        if (append) {
          setGames((prev) => {
            // Deduplicate
            const existingIds = new Set(prev.map((g) => g.id));
            const unique = newGames.filter((g) => !existingIds.has(g.id));
            return [...prev, ...unique];
          });
        } else {
          setGames(newGames);
          if (data.total > 0) setTotal(data.total);
        }

        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch {
        // Network error — keep what we have
      } finally {
        setLoading(false);
        setLoadingMore(false);
        fetchingRef.current = false;
      }
    },
    [sort, hideExternal]
  );

  // Initial load + reset when sort/filter changes
  useEffect(() => {
    setGames([]);
    setCursor(null);
    setHasMore(true);
    fetchGames(null, false);
  }, [fetchGames]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !fetchingRef.current && cursor) {
          fetchGames(cursor, true);
        }
      },
      {
        rootMargin: "600px", // Start loading well before user reaches the bottom
        threshold: 0,
      }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) observerRef.current.observe(sentinel);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, cursor, fetchGames]);

  const sortOptions = [
    { value: "popular", label: "Most Played" },
    { value: "recent", label: "Recently Added" },
    { value: "title", label: "A–Z" },
  ] as const;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 animate-fadeIn">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-white mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        All Categories
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">All Games</h1>
        <p className="mt-2 text-zinc-400">
          Scroll through our complete collection of free online games.
        </p>
        <p className="mt-1 text-sm text-zinc-600">
          {total.toLocaleString()} games
        </p>
      </div>

      {/* Sort selector */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {sortOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSort(opt.value)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              sort === opt.value
                ? "border-accent-500/40 bg-accent-500/10 text-accent-400"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Ad after header */}
      <AdUnit
        variant="horizontal"
        className="mb-8 rounded-2xl border border-zinc-800/40 bg-zinc-900/20 p-2"
      />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
        </div>
      ) : games.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {games.map((game) => (
              <GameCard
                key={game.id}
                slug={game.slug}
                title={game.title}
                thumbnail={game.thumbnail}
                categoryName={game.categoryName}
                playCount={game.playCount}
              />
            ))}
          </div>

          {/* Sentinel element for infinite scroll */}
          <div ref={sentinelRef} className="h-1" />

          {/* Loading more indicator */}
          {loadingMore && (
            <div className="flex items-center justify-center gap-2 py-10">
              <Loader2 className="h-5 w-5 animate-spin text-accent-400" />
              <span className="text-sm text-zinc-500">Loading more games…</span>
            </div>
          )}

          {/* End of list */}
          {!hasMore && games.length > 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Gamepad2 className="h-8 w-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">
                You&apos;ve seen all {games.length.toLocaleString()} games!
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Gamepad2 className="h-12 w-12 text-zinc-700" />
          <p className="text-zinc-500">No games found.</p>
        </div>
      )}

      {/* Ad at bottom */}
      <AdUnit
        variant="horizontal"
        className="mt-10 rounded-2xl border border-zinc-800/40 bg-zinc-900/20 p-2"
      />
    </div>
  );
}

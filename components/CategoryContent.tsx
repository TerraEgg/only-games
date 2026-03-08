"use client";

import { useData, CachedGame } from "@/components/DataProvider";
import GameCard from "@/components/GameCard";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useHideExternal } from "@/lib/useHideExternal";

interface Props {
  slug: string;
}

interface PagedResult {
  games: CachedGame[];
  total: number;
  page: number;
  totalPages: number;
}

export default function CategoryContent({ slug }: Props) {
  const { data } = useData();
  const { hideExternal } = useHideExternal();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PagedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const perPage = 20;

  const category = useMemo(
    () => data?.categories.find((c) => c.slug === slug) ?? null,
    [data?.categories, slug]
  );

  const fetchGames = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(perPage),
      sort: "recent",
      category: slug,
    });
    if (hideExternal) params.set("hideExternal", "1");
    try {
      const res = await fetch(`/api/games?${params}`);
      const data = await res.json();
      setResult({
        games: data.games.map((g: any) => ({
          ...g,
          categoryName: g.category?.name ?? "",
        })),
        total: data.total,
        page: data.page,
        totalPages: data.totalPages,
      });
    } catch {
      setResult({ games: [], total: 0, page: 1, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, [slug, page, hideExternal]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const games = result?.games ?? [];
  const totalPages = result?.totalPages ?? 0;
  const total = result?.total ?? 0;

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <p className="text-zinc-500">Category not found.</p>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-white">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-zinc-400">{category.description}</p>
        )}
        <p className="mt-1 text-sm text-zinc-600">
          {total} games
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
        </div>
      ) : games.length > 0 ? (
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
      ) : (
        <p className="py-16 text-center text-zinc-500">
          No games in this category yet.
        </p>
      )}

      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          <button
            onClick={() => {
              setPage((p) => Math.max(1, p - 1));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            disabled={page <= 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let p: number;
            if (totalPages <= 7) {
              p = i + 1;
            } else if (page <= 4) {
              p = i + 1;
            } else if (page >= totalPages - 3) {
              p = totalPages - 6 + i;
            } else {
              p = page - 3 + i;
            }
            return (
              <button
                key={p}
                onClick={() => {
                  setPage(p);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition ${
                  p === page
                    ? "bg-accent-600 text-white"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => {
              setPage((p) => Math.min(totalPages, p + 1));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            disabled={page >= totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

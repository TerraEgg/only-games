"use client";

import { useData, CachedGame } from "@/components/DataProvider";
import GameCard from "@/components/GameCard";
import SearchBar from "@/components/SearchBar";
import { Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useHideExternal } from "@/lib/useHideExternal";

interface PagedResult {
  games: CachedGame[];
  total: number;
  page: number;
  totalPages: number;
}

export default function SearchContent() {
  const { data } = useData();
  const { hideExternal } = useHideExternal();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQ);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PagedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const perPage = 20;

  const q = initialQ || query;
  const categories = data?.categories ?? [];

  const fetchGames = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(perPage),
      sort: "popular",
    });
    if (q) params.set("search", q);
    if (categoryFilter) params.set("category", categoryFilter);
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
  }, [q, categoryFilter, page, hideExternal]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [q, categoryFilter, hideExternal]);

  const games = result?.games ?? [];
  const totalPages = result?.totalPages ?? 0;
  const total = result?.total ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 animate-fadeIn">
      <div className="mb-8 flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Search Games</h1>
        <SearchBar defaultValue={q} />
      </div>

      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setCategoryFilter("")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              !categoryFilter
                ? "border-accent-500/40 bg-accent-500/10 text-accent-400"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setCategoryFilter(cat.slug)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                categoryFilter === cat.slug
                  ? "border-accent-500/40 bg-accent-500/10 text-accent-400"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {q && !loading && (
        <p className="mb-6 text-sm text-zinc-500">
          {total} result{total !== 1 ? "s" : ""} for &ldquo;{q}&rdquo;
        </p>
      )}

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
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Search className="h-12 w-12 text-zinc-700" />
          <p className="text-zinc-500">
            {q
              ? "No games match your search."
              : "Start searching to find games."}
          </p>
        </div>
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

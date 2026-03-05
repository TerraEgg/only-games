"use client";

import { useData } from "@/components/DataProvider";
import GameCard from "@/components/GameCard";
import SearchBar from "@/components/SearchBar";
import { Search, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function SearchContent() {
  const { data, loading } = useData();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQ);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Update local query when URL changes (e.g. via SearchBar form)
  // The SearchBar navigates to /search?q=..., so we also read from URL
  const q = initialQ || query;

  const categories = data?.categories ?? [];

  const filtered = useMemo(() => {
    let results = data?.games ?? [];
    if (q) {
      const lower = q.toLowerCase();
      results = results.filter(
        (g) =>
          g.title.toLowerCase().includes(lower) ||
          (g.description?.toLowerCase().includes(lower) ?? false)
      );
    }
    if (categoryFilter) {
      results = results.filter((g) => g.categorySlug === categoryFilter);
    }
    // Hide games without thumbnails, sort by play count descending
    return [...results]
      .filter((g) => !!g.thumbnail)
      .sort((a, b) => b.playCount - a.playCount);
  }, [data?.games, q, categoryFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 animate-fadeIn">
      <div className="mb-8 flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Search Games</h1>
        <SearchBar defaultValue={q} />
      </div>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              setCategoryFilter("");
              setPage(1);
            }}
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
              onClick={() => {
                setCategoryFilter(cat.slug);
                setPage(1);
              }}
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

      {/* Results count */}
      {q && (
        <p className="mb-6 text-sm text-zinc-500">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} for
          &ldquo;{q}&rdquo;
        </p>
      )}

      {paged.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {paged.map((game) => (
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
          ))}
        </div>
      )}
    </div>
  );
}

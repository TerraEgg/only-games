"use client";

import { useData } from "@/components/DataProvider";
import GameCard from "@/components/GameCard";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

interface Props {
  slug: string;
}

export default function CategoryContent({ slug }: Props) {
  const { data, loading } = useData();
  const [page, setPage] = useState(1);
  const perPage = 20;

  const category = useMemo(
    () => data?.categories.find((c) => c.slug === slug) ?? null,
    [data?.categories, slug]
  );

  const allGames = useMemo(
    () =>
      (data?.games ?? []).filter(
        (g) => g.categorySlug === slug
      ),
    [data?.games, slug]
  );

  const totalPages = Math.ceil(allGames.length / perPage);

  const pagedGames = useMemo(
    () => allGames.slice((page - 1) * perPage, page * perPage),
    [allGames, page]
  );

  if (loading) {
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
          {allGames.length} games
        </p>
      </div>

      {pagedGames.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {pagedGames.map((game) => (
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

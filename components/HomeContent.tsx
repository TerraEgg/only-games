"use client";

import { useData, CachedGame, CachedCategory } from "@/components/DataProvider";
import CategoryCard from "@/components/CategoryCard";
import GameCard from "@/components/GameCard";
import SearchBar from "@/components/SearchBar";
import { Gamepad2, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { useMemo } from "react";

export default function HomeContent() {
  const { data, loading } = useData();

  const categories = data?.categories ?? [];
  const totalGames = data?.games.length ?? 0;

  const popularGames = useMemo(
    () =>
      [...(data?.games ?? [])]
        .filter((g) => !!g.thumbnail)
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 8),
    [data?.games]
  );

  const recentGames = useMemo(
    () =>
      [...(data?.games ?? [])]
        .filter((g) => !!g.thumbnail)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    [data?.games]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Hero */}
      <section className="relative border-b border-zinc-800/40">
        <div className="absolute inset-0 bg-gradient-to-b from-accent-600/5 via-transparent to-transparent" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6">
          <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-1.5 text-sm text-zinc-400">
            <Gamepad2 className="h-4 w-4 text-accent-400" />
            {totalGames > 0
              ? `${totalGames.toLocaleString()} games and counting`
              : "Your gaming destination"}
          </div>
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Play. Discover. Enjoy.
          </h1>
          <p className="max-w-md text-lg text-zinc-400">
            Free online games — no downloads, no installs. Jump in and start
            playing instantly.
          </p>
          <SearchBar />
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 sm:px-6">
        {/* Categories */}
        {categories.length > 0 && (
          <section>
            <h2 className="mb-6 text-xl font-bold text-white">
              Browse Categories
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  slug={cat.slug}
                  name={cat.name}
                  icon={cat.icon}
                  gameCount={cat.gameCount}
                />
              ))}
            </div>
          </section>
        )}

        {/* Popular Games */}
        {popularGames.length > 0 && (
          <section>
            <div className="mb-6 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent-400" />
              <h2 className="text-xl font-bold text-white">Popular Games</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {popularGames.map((game) => (
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
          </section>
        )}

        {/* Recently Added */}
        {recentGames.length > 0 && (
          <section>
            <div className="mb-6 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent-400" />
              <h2 className="text-xl font-bold text-white">Recently Added</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {recentGames.map((game) => (
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
          </section>
        )}

        {/* Empty state */}
        {totalGames === 0 && categories.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <Gamepad2 className="h-16 w-16 text-zinc-700" />
            <h2 className="text-2xl font-bold text-white">No games yet</h2>
            <p className="max-w-sm text-zinc-500">
              Games will appear here once an admin adds them from the dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

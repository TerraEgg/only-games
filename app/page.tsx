import { prisma } from "@/lib/prisma";
import CategoryCard from "@/components/CategoryCard";
import GameCard from "@/components/GameCard";
import SearchBar from "@/components/SearchBar";
import { Gamepad2, TrendingUp, Sparkles } from "lucide-react";

export const revalidate = 60; // ISR — revalidate every 60 s

export default async function HomePage() {
  const [categories, popularGames, recentGames, totalGames] = await Promise.all(
    [
      prisma.category.findMany({
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { games: true } } },
      }),
      prisma.game.findMany({
        where: { isActive: true },
        orderBy: { playCount: "desc" },
        take: 8,
        include: { category: { select: { name: true } } },
      }),
      prisma.game.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { category: { select: { name: true } } },
      }),
      prisma.game.count({ where: { isActive: true } }),
    ]
  );

  return (
    <div className="animate-fadeIn">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800/40">
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
                  gameCount={cat._count.games}
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
                  categoryName={game.category.name}
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
                  categoryName={game.category.name}
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
            <h2 className="text-2xl font-bold text-white">
              No games yet
            </h2>
            <p className="max-w-sm text-zinc-500">
              Games will appear here once an admin adds them from the dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

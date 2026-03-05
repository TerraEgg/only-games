import { prisma } from "@/lib/prisma";
import GameCard from "@/components/GameCard";
import SearchBar from "@/components/SearchBar";
import Link from "next/link";
import { Search } from "lucide-react";

export const metadata = { title: "Search — OnlyGames" };

interface Props {
  searchParams: { q?: string; category?: string; page?: string };
}

export default async function SearchPage({ searchParams }: Props) {
  const q = searchParams.q?.trim() || "";
  const categorySlug = searchParams.category || "";
  const page = Math.max(1, parseInt(searchParams.page || "1"));
  const perPage = 20;
  const skip = (page - 1) * perPage;

  const where: any = { isActive: true };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  const [games, total, categories] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy: { playCount: "desc" },
      skip,
      take: perPage,
      include: { category: { select: { name: true } } },
    }),
    prisma.game.count({ where }),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true },
    }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 animate-fadeIn">
      <div className="mb-8 flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Search Games</h1>
        <SearchBar defaultValue={q} />
      </div>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <Link
            href={`/search${q ? `?q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              !categorySlug
                ? "border-accent-500/40 bg-accent-500/10 text-accent-400"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
            }`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/search?${q ? `q=${encodeURIComponent(q)}&` : ""}category=${cat.slug}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                categorySlug === cat.slug
                  ? "border-accent-500/40 bg-accent-500/10 text-accent-400"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {/* Results */}
      {q && (
        <p className="mb-6 text-sm text-zinc-500">
          {total} result{total !== 1 ? "s" : ""} for &ldquo;{q}&rdquo;
        </p>
      )}

      {games.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {games.map((game) => (
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
      ) : (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Search className="h-12 w-12 text-zinc-700" />
          <p className="text-zinc-500">
            {q ? "No games match your search." : "Start searching to find games."}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (categorySlug) params.set("category", categorySlug);
            params.set("page", String(p));
            return (
              <Link
                key={p}
                href={`/search?${params.toString()}`}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition ${
                  p === page
                    ? "bg-accent-600 text-white"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {p}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

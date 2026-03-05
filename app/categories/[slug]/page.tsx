import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import GameCard from "@/components/GameCard";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const revalidate = 60;

interface Props {
  params: { slug: string };
  searchParams: { page?: string };
}

export async function generateMetadata({ params }: Props) {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
  });
  if (!category) return { title: "Not Found" };
  return { title: `${category.name} — OnlyGames` };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
  });

  if (!category) notFound();

  const page = Math.max(1, parseInt(searchParams.page || "1"));
  const perPage = 20;
  const skip = (page - 1) * perPage;

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where: { categoryId: category.id, isActive: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
      include: { category: { select: { name: true } } },
    }),
    prisma.game.count({
      where: { categoryId: category.id, isActive: true },
    }),
  ]);

  const totalPages = Math.ceil(total / perPage);

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
        <p className="mt-1 text-sm text-zinc-600">{total} games</p>
      </div>

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
        <p className="py-16 text-center text-zinc-500">
          No games in this category yet.
        </p>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/categories/${params.slug}?page=${p}`}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition ${
                p === page
                  ? "bg-accent-600 text-white"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

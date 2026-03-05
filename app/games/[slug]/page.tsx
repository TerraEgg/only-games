import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Play, Eye } from "lucide-react";
import TrackingScript from "@/components/TrackingScript";

export const revalidate = 60;

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props) {
  const game = await prisma.game.findUnique({ where: { slug: params.slug } });
  if (!game) return { title: "Not Found" };
  return { title: `${game.title} — OnlyGames` };
}

export default async function GamePage({ params }: Props) {
  const game = await prisma.game.findUnique({
    where: { slug: params.slug },
    include: { category: true },
  });

  if (!game || !game.isActive) notFound();

  // Increment play count
  await prisma.game.update({
    where: { id: game.id },
    data: { playCount: { increment: 1 } },
  });

  // Related games from same category
  const related = await prisma.game.findMany({
    where: {
      categoryId: game.categoryId,
      isActive: true,
      id: { not: game.id },
    },
    take: 4,
    orderBy: { playCount: "desc" },
    include: { category: { select: { name: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 animate-fadeIn">
      <TrackingScript gameId={game.id} />

      <Link
        href={`/categories/${game.category.slug}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-white mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        {game.category.name}
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          {game.title}
        </h1>
        <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400">
          {game.category.name}
        </span>
      </div>

      {/* Game iframe */}
      <div className="game-frame">
        <iframe
          src={game.url}
          title={game.title}
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>

      <div className="mt-6 flex items-center gap-6 text-sm text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Eye className="h-4 w-4" />
          {game.playCount.toLocaleString()} plays
        </span>
      </div>

      {game.description && (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">
          {game.description}
        </p>
      )}

      {/* Related games */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-5 text-lg font-bold text-white">
            More in {game.category.name}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/games/${r.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/50 transition hover:border-violet-500/30"
              >
                <div className="flex aspect-video items-center justify-center bg-zinc-800">
                  <Play className="h-8 w-8 text-zinc-600 transition group-hover:text-violet-400" />
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-1 text-sm font-semibold text-white">
                    {r.title}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {r.playCount.toLocaleString()} plays
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

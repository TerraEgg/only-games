import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Gamepad2, Eye } from "lucide-react";
import TrackingScript from "@/components/TrackingScript";
import GuestTrackingScript from "@/components/GuestTrackingScript";
import GameEmbed from "@/components/GameEmbed";
import AdUnit from "@/components/AdUnit";

export const revalidate = 30;

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

  // Related games from same category (only ones with thumbnails)
  const related = await prisma.game.findMany({
    where: {
      categoryId: game.categoryId,
      isActive: true,
      id: { not: game.id },
      thumbnail: { not: null },
    },
    take: 4,
    orderBy: { playCount: "desc" },
    include: { category: { select: { name: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 animate-fadeIn">
      <TrackingScript gameId={game.id} />
      <GuestTrackingScript gameId={game.id} />

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
        <span className="rounded-full bg-accent-500/10 px-3 py-1 text-xs font-medium text-accent-400">
          {game.category.name}
        </span>
      </div>

      {/* Game embed with fullscreen & volume controls */}
      <GameEmbed url={game.url} title={game.title} />

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

      {/* Ad between game info and related games */}
      <AdUnit variant="horizontal" className="mt-10 rounded-2xl border border-zinc-800/40 bg-zinc-900/20 p-2" />

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
                className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/50 transition hover:border-accent-500/30"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-800">
                  {r.thumbnail ? (
                    <Image
                      src={r.thumbnail}
                      alt={r.title}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1.5">
                      <Gamepad2 className="h-8 w-8 text-zinc-700" />
                      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                        No Thumbnail
                      </span>
                    </div>
                  )}
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

      {/* Ad at bottom */}
      <AdUnit variant="horizontal" className="mt-10 rounded-2xl border border-zinc-800/40 bg-zinc-900/20 p-2" />
    </div>
  );
}

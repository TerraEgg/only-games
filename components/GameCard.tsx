import Link from "next/link";
import Image from "next/image";
import { Gamepad2 } from "lucide-react";

interface GameCardProps {
  slug: string;
  title: string;
  thumbnail: string | null;
  categoryName: string;
  playCount: number;
}

export default function GameCard({
  slug,
  title,
  thumbnail,
  categoryName,
  playCount,
}: GameCardProps) {
  return (
    <Link
      href={`/games/${slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/50 transition hover:border-accent-500/30 hover:bg-zinc-900"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-800">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Gamepad2 className="h-10 w-10 text-zinc-600" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <h3 className="line-clamp-1 text-sm font-semibold text-white">
          {title}
        </h3>
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-xs font-medium text-accent-400">
            {categoryName}
          </span>
          <span className="text-xs text-zinc-500">
            {playCount.toLocaleString()} plays
          </span>
        </div>
      </div>
    </Link>
  );
}

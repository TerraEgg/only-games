import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800/60 bg-zinc-950">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
        <div className="flex items-center">
          <Image
            src="/onlygames.png"
            alt="OnlyGames"
            width={90}
            height={24}
            className="h-6 w-auto opacity-50"
          />
        </div>
        <nav className="flex gap-6 text-sm text-zinc-500">
          <Link href="/" className="transition hover:text-zinc-300">
            Home
          </Link>
          <Link href="/search" className="transition hover:text-zinc-300">
            Browse
          </Link>
        </nav>
        <p className="text-xs text-zinc-600">
          &copy; {new Date().getFullYear()} OnlyGames. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

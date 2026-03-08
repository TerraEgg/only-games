"use client";

import Link from "next/link";
import { useData } from "@/components/DataProvider";

export default function Footer() {
  const { data } = useData();
  const categories = data?.categories ?? [];

  return (
    <footer className="border-t border-zinc-800/60 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Top row — logo + nav columns */}
        <div className="grid gap-8 sm:grid-cols-[1fr_auto_auto]">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <Link href="/" aria-label="OnlyGames">
              <div
                className="h-6"
                style={{
                  width: 120,
                  WebkitMaskImage: "url(/onlygames.png)",
                  maskImage: "url(/onlygames.png)",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "left center",
                  maskPosition: "left center",
                  background: "rgba(161,161,170,0.45)",
                }}
                role="img"
                aria-label="OnlyGames"
              />
            </Link>
            <p className="max-w-xs text-xs leading-relaxed text-zinc-600">
              Your destination for free online games. Play hundreds of browser
              games across every genre.
            </p>
          </div>

          {/* Site links */}
          <nav aria-label="Footer navigation">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Site
            </h3>
            <ul className="flex flex-col gap-1.5 text-sm text-zinc-500">
              <li><Link href="/" className="transition hover:text-zinc-300">Home</Link></li>
              <li><Link href="/search" className="transition hover:text-zinc-300">Browse Games</Link></li>
              <li><Link href="/login" className="transition hover:text-zinc-300">Sign In</Link></li>
              <li><Link href="/register" className="transition hover:text-zinc-300">Sign Up</Link></li>
            </ul>
          </nav>

          {/* Category links */}
          {categories.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Categories
              </h3>
              <ul className="flex flex-col gap-1.5 text-sm text-zinc-500">
                {categories.slice(0, 8).map((c) => (
                  <li key={c.slug}>
                    <Link href={`/categories/${c.slug}`} className="transition hover:text-zinc-300">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom row — copyright */}
        <div className="mt-8 border-t border-zinc-800/40 pt-6 text-center">
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} OnlyGames. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

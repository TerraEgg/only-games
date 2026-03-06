"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Search, Menu, X, User, LogOut, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";
import { useTheme } from "@/components/ThemeProvider";

export default function Header() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { logo1, logo2 } = useTheme();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo — PNG image tinted with theme colors via CSS mask */}
        <Link href="/" className="flex shrink-0 items-center">
          <div
            className="h-8"
            style={{
              width: 150,
              WebkitMaskImage: "url(/onlygames.png)",
              maskImage: "url(/onlygames.png)",
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "left center",
              maskPosition: "left center",
              background: `linear-gradient(135deg, ${logo1}, ${logo2})`,
            }}
            role="img"
            aria-label="OnlyGames"
          />
        </Link>

        {/* Search — desktop */}
        <form
          onSubmit={handleSearch}
          className="hidden flex-1 items-center justify-center md:flex"
        >
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search games..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30"
            />
          </div>
        </form>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 md:flex">
          {session ? (
            <>
              {session.user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:text-white"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}
              <NotificationBell />
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 transition hover:border-zinc-700"
              >
                <User className="h-4 w-4 text-accent-400" />
                <span className="text-sm font-medium text-zinc-300">
                  {session.user.username}
                </span>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-500"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-zinc-400 md:hidden"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-zinc-800/60 bg-zinc-950 px-4 pb-4 pt-3 md:hidden">
          <form onSubmit={handleSearch} className="mb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search games..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-500 outline-none"
              />
            </div>
          </form>
          <div className="flex flex-col gap-1">
            {session ? (
              <>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300">
                  <User className="h-4 w-4 text-accent-400" />
                  {session.user.username}
                </div>
                {session.user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400"
                  >
                    <Shield className="h-4 w-4" />
                    Admin Dashboard
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-400"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-zinc-400"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg bg-accent-600 px-3 py-2 text-center text-sm font-medium text-white"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

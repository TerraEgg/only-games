"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useMemo } from "react";
import { useData } from "@/components/DataProvider";

export default function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(-1);
  const router = useRouter();
  const { data } = useData();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const games = data?.games ?? [];

  const suggestions = useMemo(() => {
    if (query.trim().length < 1) return [];
    const lower = query.toLowerCase();
    return games
      .filter(
        (g) => g.title.toLowerCase().includes(lower) && g.thumbnail
      )
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 6);
  }, [games, query]);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function go(slug: string, title: string) {
    setQuery(title);
    setOpen(false);
    router.push(`/games/${slug}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sel >= 0 && suggestions[sel]) {
      go(suggestions[sel].slug, suggestions[sel].title);
    } else if (query.trim()) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((p) => (p < suggestions.length - 1 ? p + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((p) => (p > 0 ? p - 1 : suggestions.length - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setSel(-1);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setSel(-1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setOpen(val.trim().length >= 1);
    }, 120);
  }

  return (
    <div ref={wrapRef} className="relative w-full max-w-xl">
      <form onSubmit={handleSubmit}>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (query.trim().length >= 1) setOpen(true); }}
          placeholder="Search for games..."
          autoComplete="off"
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 py-3 pl-11 pr-5 text-base text-white placeholder-zinc-500 outline-none transition focus:border-accent-500/50 focus:ring-2 focus:ring-accent-500/20"
        />
      </form>

      {/* Suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-[9999] mt-2 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50 animate-fadeIn">
          {suggestions.map((game, i) => (
            <button
              key={game.id}
              type="button"
              onMouseDown={() => go(game.slug, game.title)}
              onMouseEnter={() => setSel(i)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                i === sel
                  ? "bg-accent-500/10 text-white"
                  : "text-zinc-300 hover:bg-zinc-900"
              }`}
            >
              {game.thumbnail && (
                <img
                  src={game.thumbnail}
                  alt=""
                  className="h-9 w-12 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{game.title}</p>
                <p className="text-xs text-zinc-500">{game.categoryName}</p>
              </div>
              <Search className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
            </button>
          ))}
          <button
            type="button"
            onMouseDown={() => {
              setOpen(false);
              if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
            }}
            className="flex w-full items-center gap-2 border-t border-zinc-800/60 px-4 py-2.5 text-left text-xs text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
          >
            <Search className="h-3 w-3" />
            Search for &ldquo;{query}&rdquo;
          </button>
        </div>
      )}
    </div>
  );
}

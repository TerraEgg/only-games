"use client";

import { useEffect, useState } from "react";
import {
  ImageOff,
  ScanSearch,
  Loader2,
  X,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import Portal from "@/components/Portal";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Game {
  id: string;
  title: string;
  slug: string;
  url: string;
  thumbnail: string | null;
  description: string | null;
  categoryId: string;
  isActive: boolean;
  isFeatured: boolean;
  playCount: number;
  category: { name: string };
}

export default function AdminThumbnailsPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Detection
  const [detecting, setDetecting] = useState(false);
  const [detectProgress, setDetectProgress] = useState({ checked: 0, total: 0 });
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());

  // Edit modal
  const [editGame, setEditGame] = useState<Game | null>(null);
  const [editThumbnail, setEditThumbnail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [gamesRes, catsRes] = await Promise.all([
      fetch("/api/games"),
      fetch("/api/categories"),
    ]);
    setGames(await gamesRes.json());
    setCategories(await catsRes.json());
    setLoading(false);
  }

  // Check if an image URL actually loads
  function checkImage(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
      setTimeout(() => resolve(false), 8000);
    });
  }

  async function handleAutoDetect() {
    const withThumbs = games.filter((g) => g.thumbnail);
    setDetecting(true);
    setDetectProgress({ checked: 0, total: withThumbs.length });
    setBrokenIds(new Set());

    const broken = new Set<string>();
    const batchSize = 10;
    for (let i = 0; i < withThumbs.length; i += batchSize) {
      const batch = withThumbs.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (g) => {
          const ok = await checkImage(g.thumbnail!);
          return { id: g.id, ok };
        })
      );
      for (const r of results) {
        if (!r.ok) broken.add(r.id);
      }
      setDetectProgress({
        checked: Math.min(i + batchSize, withThumbs.length),
        total: withThumbs.length,
      });
      setBrokenIds(new Set(broken));
    }

    setDetecting(false);
  }

  async function handleClearThumbnail(id: string) {
    await fetch(`/api/games/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thumbnail: null }),
    });
    setGames((prev) =>
      prev.map((g) => (g.id === id ? { ...g, thumbnail: null } : g))
    );
    setBrokenIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function handleClearAllBroken() {
    if (!confirm(`Clear thumbnails for ${brokenIds.size} games with broken images?`))
      return;
    const ids = Array.from(brokenIds);
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/games/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ thumbnail: null }),
        })
      )
    );
    setGames((prev) =>
      prev.map((g) => (ids.includes(g.id) ? { ...g, thumbnail: null } : g))
    );
    setBrokenIds(new Set());
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this game permanently?")) return;
    await fetch(`/api/games/${id}`, { method: "DELETE" });
    setGames((prev) => prev.filter((g) => g.id !== id));
    setBrokenIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function openEdit(g: Game) {
    setEditGame(g);
    setEditThumbnail(g.thumbnail || "");
  }

  async function handleSaveThumbnail() {
    if (!editGame) return;
    setSaving(true);
    await fetch(`/api/games/${editGame.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thumbnail: editThumbnail || null }),
    });
    setGames((prev) =>
      prev.map((g) =>
        g.id === editGame.id
          ? { ...g, thumbnail: editThumbnail || null }
          : g
      )
    );
    // Remove from broken if it was fixed
    if (editThumbnail) {
      setBrokenIds((prev) => {
        const next = new Set(prev);
        next.delete(editGame.id);
        return next;
      });
    }
    setSaving(false);
    setEditGame(null);
  }

  const noThumbGames = games.filter((g) => !g.thumbnail);
  const brokenGames = games.filter((g) => brokenIds.has(g.id));

  if (loading) {
    return (
      <div className="flex justify-center py-20 animate-fadeIn">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ImageOff className="h-6 w-6 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Thumbnails</h1>
        </div>
        <button
          onClick={handleAutoDetect}
          disabled={detecting}
          className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-50"
        >
          {detecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning {detectProgress.checked}/{detectProgress.total}...
            </>
          ) : (
            <>
              <ScanSearch className="h-4 w-4" />
              Scan for Broken Thumbnails
            </>
          )}
        </button>
      </div>

      {/* Stats bar */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
          <p className="text-2xl font-bold text-white">{games.length}</p>
          <p className="text-xs text-zinc-500">Total Games</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-2xl font-bold text-amber-400">{noThumbGames.length}</p>
          <p className="text-xs text-zinc-500">Missing Thumbnail</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-2xl font-bold text-red-400">{brokenIds.size}</p>
          <p className="text-xs text-zinc-500">Broken Thumbnails</p>
        </div>
      </div>

      {/* Broken thumbnails section */}
      {brokenIds.size > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-red-400">
              Broken Thumbnails
            </h2>
            <button
              onClick={handleClearAllBroken}
              className="flex items-center gap-1.5 rounded-xl bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500"
            >
              <X className="h-3.5 w-3.5" />
              Clear All ({brokenIds.size})
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-red-500/20">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-red-500/10 bg-red-500/5 text-left text-xs text-zinc-500">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Category</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Thumbnail URL</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-500/10">
                {brokenGames.map((g) => (
                  <tr key={g.id} className="text-zinc-300">
                    <td className="px-4 py-3 font-medium">{g.title}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-zinc-500">
                      {g.category.name}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-red-400/60 truncate block max-w-[200px]">
                        {g.thumbnail}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(g)}
                          className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                          title="Edit thumbnail"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleClearThumbnail(g.id)}
                          className="rounded-lg p-1.5 text-amber-500 transition hover:bg-amber-500/10"
                          title="Clear thumbnail"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(g.id)}
                          className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-500/10"
                          title="Delete game"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Thumbnail section */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-amber-400">
          Missing Thumbnails
          <span className="ml-2 text-sm font-normal text-zinc-500">
            ({noThumbGames.length} games)
          </span>
        </h2>
        <p className="mb-4 text-xs text-zinc-500">
          These games are hidden from Featured, Recently Added, Recommended, and Category pages.
        </p>
        <div className="overflow-hidden rounded-2xl border border-zinc-800/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/60 bg-zinc-900/30 text-left text-xs text-zinc-500">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Category</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Plays</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {noThumbGames.map((g) => (
                <tr key={g.id} className="text-zinc-300">
                  <td className="px-4 py-3 font-medium">{g.title}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-zinc-500">
                    {g.category.name}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-zinc-500">
                    {g.playCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(g)}
                        className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                        title="Add thumbnail"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(g.id)}
                        className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-500/10"
                        title="Delete game"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {noThumbGames.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-600">
                    All games have thumbnails!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit thumbnail modal */}
      {editGame && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/50 my-auto">
              <h2 className="mb-1 text-lg font-bold text-white">
                Edit Thumbnail
              </h2>
              <p className="mb-4 text-sm text-zinc-500">{editGame.title}</p>
              <input
                type="url"
                placeholder="Thumbnail URL"
                value={editThumbnail}
                onChange={(e) => setEditThumbnail(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-accent-500/50"
              />
              {editThumbnail && (
                <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800">
                  <img
                    src={editThumbnail}
                    alt="Preview"
                    className="h-32 w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setEditGame(null)}
                  className="flex-1 rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveThumbnail}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-500 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

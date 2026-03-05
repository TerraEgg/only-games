"use client";

import { useEffect, useState } from "react";
import Portal from "@/components/Portal";
import {
  Plus,
  Trash2,
  Loader2,
  Search,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Upload,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

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

export default function AdminGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editGame, setEditGame] = useState<Game | null>(null);

  // Import
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  // Form
  const [form, setForm] = useState({
    title: "",
    url: "",
    thumbnail: "",
    description: "",
    categoryId: "",
    isFeatured: false,
  });
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

  function openNew() {
    setEditGame(null);
    setForm({
      title: "",
      url: "",
      thumbnail: "",
      description: "",
      categoryId: categories[0]?.id || "",
      isFeatured: false,
    });
    setShowForm(true);
  }

  function openEdit(g: Game) {
    setEditGame(g);
    setForm({
      title: g.title,
      url: g.url,
      thumbnail: g.thumbnail || "",
      description: g.description || "",
      categoryId: g.categoryId,
      isFeatured: g.isFeatured,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title || !form.url || !form.categoryId) return;
    setSaving(true);

    const method = editGame ? "PUT" : "POST";
    const url = editGame ? `/api/games/${editGame.id}` : "/api/games";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);
    setShowForm(false);
    await fetchData();
  }

  async function handleToggleActive(id: string, current: boolean) {
    await fetch(`/api/games/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    await fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this game permanently?")) return;
    await fetch(`/api/games/${id}`, { method: "DELETE" });
    await fetchData();
  }

  async function handleImport() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(importJson);
    } catch {
      setImportResult({ imported: 0, skipped: 0, errors: ["Invalid JSON — make sure it's a valid JSON array"] });
      return;
    }
    if (!Array.isArray(parsed)) {
      setImportResult({ imported: 0, skipped: 0, errors: ["Must be a JSON array (wrap in [ ])"] });
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/games/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: importJson,
      });
      const data = await res.json();
      setImportResult(data);
      if (data.imported > 0) {
        await fetchData();
      }
    } catch (err) {
      setImportResult({ imported: 0, skipped: 0, errors: ["Network error"] });
    } finally {
      setImporting(false);
    }
  }

  const filtered = games.filter((g) =>
    g.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Games</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search games..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 py-2 pl-9 pr-4 text-sm text-white outline-none focus:border-accent-500/50"
            />
          </div>
          <button
            onClick={() => {
              setShowImport(true);
              setImportResult(null);
              setImportJson("");
            }}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-500"
          >
            <Plus className="h-4 w-4" />
            Add Game
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/60 bg-zinc-900/30 text-left text-xs text-zinc-500">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Category</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Plays</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {filtered.map((g) => (
                <tr key={g.id} className="text-zinc-300">
                  <td className="px-4 py-3 font-medium">
                    {g.title}
                    {g.isFeatured && (
                      <span className="ml-2 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                        Featured
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-zinc-500">
                    {g.category.name}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-zinc-500">
                    {g.playCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(g.id, g.isActive)}
                      className="text-zinc-400 transition hover:text-white"
                    >
                      {g.isActive ? (
                        <ToggleRight className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-zinc-600" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(g)}
                        className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(g.id)}
                        className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-zinc-600"
                  >
                    No games found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <Portal>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/50 my-auto">
            <h2 className="mb-4 text-lg font-bold text-white">
              {editGame ? "Edit Game" : "Add Game"}
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-accent-500/50"
              />
              <input
                type="url"
                placeholder="Game URL / Embed URL"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-accent-500/50"
              />
              <input
                type="url"
                placeholder="Thumbnail URL (optional)"
                value={form.thumbnail}
                onChange={(e) =>
                  setForm({ ...form, thumbnail: e.target.value })
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-accent-500/50"
              />
              <textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
                className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-accent-500/50"
              />
              <select
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-accent-500/50"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) =>
                    setForm({ ...form, isFeatured: e.target.checked })
                  }
                  className="rounded border-zinc-700"
                />
                Featured game
              </label>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title || !form.url || !form.categoryId}
                className="flex-1 rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : editGame ? "Update" : "Add Game"}
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* Import modal */}
      {showImport && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/50 my-auto">
              <h2 className="mb-1 text-lg font-bold text-white">Bulk Import Games</h2>
              <p className="mb-4 text-xs text-zinc-500">
                Paste a JSON array. Each item needs: <code className="text-accent-400">name</code>, <code className="text-accent-400">dispName</code>, <code className="text-accent-400">url</code>, and optionally <code className="text-accent-400">thumbnail</code>. Uses dispName as title. Auto-creates &quot;Uncategorized&quot; category.
              </p>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder={`[\n  {\n    "name": "my-game",\n    "dispName": "My Game",\n    "url": "https://example.com/game/index.html",\n    "thumbnail": "https://example.com/thumb.png"\n  }\n]`}
                rows={12}
                className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 font-mono text-xs text-white outline-none focus:border-accent-500/50"
              />

              {/* Result feedback */}
              {importResult && (
                <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-sm">
                  <div className="flex items-center gap-4">
                    {importResult.imported > 0 && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        {importResult.imported} imported
                      </span>
                    )}
                    {importResult.skipped > 0 && (
                      <span className="text-amber-400">
                        {importResult.skipped} skipped (duplicates)
                      </span>
                    )}
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {importResult.errors.map((e, i) => (
                        <p key={i} className="flex items-start gap-1.5 text-xs text-red-400">
                          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                          {e}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setShowImport(false)}
                  className="flex-1 rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900"
                >
                  Close
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || !importJson.trim()}
                  className="flex-1 rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-500 disabled:opacity-50"
                >
                  {importing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing...
                    </span>
                  ) : (
                    `Import Games`
                  )}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

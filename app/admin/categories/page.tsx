"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Pencil } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  sortOrder: number;
  _count?: { games: number };
}

const ICONS = [
  "Gamepad2",
  "Zap",
  "Puzzle",
  "Car",
  "Trophy",
  "Brain",
  "Compass",
  "Joystick",
  "Users2",
  "Cpu",
  "Skull",
  "Swords",
];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    icon: "Gamepad2",
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    const res = await fetch("/api/categories");
    setCategories(await res.json());
    setLoading(false);
  }

  function openNew() {
    setEditCat(null);
    setForm({ name: "", description: "", icon: "Gamepad2", sortOrder: 0 });
    setShowForm(true);
  }

  function openEdit(c: Category) {
    setEditCat(c);
    setForm({
      name: c.name,
      description: c.description || "",
      icon: c.icon,
      sortOrder: c.sortOrder,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name) return;
    setSaving(true);

    const method = editCat ? "PUT" : "POST";
    const url = "/api/categories" + (editCat ? `?id=${editCat.id}` : "");

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);
    setShowForm(false);
    await fetchCategories();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Games in it will need reassignment."))
      return;
    await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
    await fetchCategories();
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Categories</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-4"
            >
              <div>
                <h3 className="text-sm font-semibold text-white">{c.name}</h3>
                <p className="text-xs text-zinc-500">
                  {c._count?.games ?? 0} games &middot; Order: {c.sortOrder}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(c)}
                  className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="col-span-full py-10 text-center text-zinc-600">
              No categories yet
            </p>
          )}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-lg font-bold text-white">
              {editCat ? "Edit Category" : "Add Category"}
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Category name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-violet-500/50"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-violet-500/50"
              />
              <select
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-violet-500/50"
              >
                {ICONS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Sort order"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-white outline-none focus:border-violet-500/50"
              />
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
                disabled={saving || !form.name}
                className="flex-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : editCat ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

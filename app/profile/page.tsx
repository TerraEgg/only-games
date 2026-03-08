"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme, THEME_PRESETS, ThemePreset } from "@/components/ThemeProvider";
import { useHideExternal } from "@/lib/useHideExternal";
import { Palette, Check, Loader2, User, EyeOff, Eye } from "lucide-react";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { accent, setTheme } = useTheme();
  const { hideExternal, setHideExternal } = useHideExternal();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  if (!session) return null;

  async function handleTheme(preset: ThemePreset) {
    setSaving(true);
    setTheme(preset);
    // wait a beat for the API call
    await new Promise((r) => setTimeout(r, 300));
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-2xl animate-fadeIn px-4 py-10">
      {/* Profile header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/10">
          <User className="h-7 w-7 text-accent-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{session.user.username}</h1>
          <p className="text-sm text-zinc-500">
            {session.user.role === "ADMIN" ? "Administrator" : "Member"}
          </p>
        </div>
      </div>

      {/* Theme section */}
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-accent-400" />
          <h2 className="text-lg font-semibold text-white">Color Theme</h2>
          {saving && <Loader2 className="ml-auto h-4 w-4 animate-spin text-zinc-500" />}
        </div>
        <p className="mb-5 text-sm text-zinc-400">
          Choose a color theme for the site. This changes the accent colors, buttons, and the logo.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {THEME_PRESETS.map((preset) => {
            const active = accent.toLowerCase() === preset.accent.toLowerCase();
            return (
              <button
                key={preset.accent}
                onClick={() => handleTheme(preset)}
                className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 transition ${
                  active
                    ? "border-white/30 bg-white/5"
                    : "border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700"
                }`}
              >
                {active && (
                  <div className="absolute right-2 top-2">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className="flex gap-1">
                  <div
                    className="h-8 w-8 rounded-lg"
                    style={{ background: `linear-gradient(135deg, ${preset.logo1}, ${preset.logo2})` }}
                  />
                </div>
                <span className="text-xs font-medium text-zinc-300">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Game filter section */}
      <div className="mt-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6">
        <div className="mb-4 flex items-center gap-2">
          <EyeOff className="h-5 w-5 text-accent-400" />
          <h2 className="text-lg font-semibold text-white">Game Filters</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-300">Hide external games</p>
            <p className="text-xs text-zinc-500">
              Only show internally hosted games across the site
            </p>
          </div>
          <button
            onClick={() => setHideExternal(!hideExternal)}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full transition-colors ${
              hideExternal ? "bg-accent-600" : "bg-zinc-700"
            }`}
          >
            <span
              className={`pointer-events-none absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
                hideExternal ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

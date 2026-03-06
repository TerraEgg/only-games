"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

/* ── Preset themes ───────────────────────────────────────────── */
export interface ThemePreset {
  name: string;
  accent: string;      // primary accent  e.g. #00ABED
  logo1: string;       // first logo gradient stop
  logo2: string;       // second logo gradient stop
}

export const THEME_PRESETS: ThemePreset[] = [
  { name: "Ocean (Default)", accent: "#00ABED", logo1: "#3FB4D9", logo2: "#06A5E5" },
  { name: "Emerald",         accent: "#10B981", logo1: "#34D399", logo2: "#059669" },
  { name: "Violet",          accent: "#8B5CF6", logo1: "#A78BFA", logo2: "#7C3AED" },
  { name: "Rose",            accent: "#F43F5E", logo1: "#FB7185", logo2: "#E11D48" },
  { name: "Amber",           accent: "#F59E0B", logo1: "#FBBF24", logo2: "#D97706" },
  { name: "Cyan",            accent: "#06B6D4", logo1: "#22D3EE", logo2: "#0891B2" },
  { name: "Pink",            accent: "#EC4899", logo1: "#F472B6", logo2: "#DB2777" },
  { name: "Lime",            accent: "#84CC16", logo1: "#A3E635", logo2: "#65A30D" },
];

interface ThemeCtx {
  accent: string;
  logo1: string;
  logo2: string;
  setTheme: (preset: ThemePreset) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  accent: "#00ABED",
  logo1: "#3FB4D9",
  logo2: "#06A5E5",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function findPreset(accent: string): ThemePreset {
  return THEME_PRESETS.find((p) => p.accent.toLowerCase() === accent.toLowerCase()) ?? THEME_PRESETS[0];
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function lighten(hex: string, pct: number) {
  const { r, g, b } = hexToRgb(hex);
  const f = pct / 100;
  const lr = Math.min(255, Math.round(r + (255 - r) * f));
  const lg = Math.min(255, Math.round(g + (255 - g) * f));
  const lb = Math.min(255, Math.round(b + (255 - b) * f));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

function darken(hex: string, pct: number) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - pct / 100;
  const dr = Math.max(0, Math.round(r * f));
  const dg = Math.max(0, Math.round(g * f));
  const db = Math.max(0, Math.round(b * f));
  return `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`;
}

function applyCssVars(accent: string) {
  const root = document.documentElement;
  root.style.setProperty("--accent-300", lighten(accent, 40));
  root.style.setProperty("--accent-400", lighten(accent, 20));
  root.style.setProperty("--accent-500", accent);
  root.style.setProperty("--accent-600", darken(accent, 15));
}

const LS_KEY = "og_theme";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [accent, setAccent] = useState("#00ABED");
  const [logo1, setLogo1] = useState("#3FB4D9");
  const [logo2, setLogo2] = useState("#06A5E5");

  // Restore from localStorage immediately
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const p = findPreset(saved);
        setAccent(p.accent);
        setLogo1(p.logo1);
        setLogo2(p.logo2);
        applyCssVars(p.accent);
      }
    } catch {}
  }, []);

  // When user logs in, fetch their theme from DB
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    (async () => {
      try {
        const res = await fetch("/api/user/theme");
        if (!res.ok) return;
        const data = await res.json();
        if (data.themeColor) {
          const p = findPreset(data.themeColor);
          setAccent(p.accent);
          setLogo1(p.logo1);
          setLogo2(p.logo2);
          applyCssVars(p.accent);
          localStorage.setItem(LS_KEY, p.accent);
        }
      } catch {}
    })();
  }, [status, session?.user?.id]);

  const setTheme = useCallback(async (preset: ThemePreset) => {
    setAccent(preset.accent);
    setLogo1(preset.logo1);
    setLogo2(preset.logo2);
    applyCssVars(preset.accent);
    localStorage.setItem(LS_KEY, preset.accent);

    // Persist to DB if logged in
    try {
      await fetch("/api/user/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeColor: preset.accent }),
      });
    } catch {}
  }, []);

  return (
    <ThemeContext.Provider value={{ accent, logo1, logo2, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

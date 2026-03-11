"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/* ─── Exclusions ──────────────────────────────────────────────── */
const EXCLUDED_PREFIXES = [
  "next-auth",
  "nextauth",
  "__secure-next-auth",
  "__host-next-auth",
  "onlygames-cache",
  "onlygames-fingerprint",
  "og_site_cache",
  "og_cookie_backup",
  "og_theme",
  "og_guest_fp",
  "ally-supports",
  "debug",
  "loglevel",
];

function isExcluded(key: string): boolean {
  const lower = key.toLowerCase();
  return EXCLUDED_PREFIXES.some((p) => lower.startsWith(p));
}

/* ─── Gather ALL localStorage items ──────────────────────────── */
function gatherLocalStorage(): { key: string; value: string; domain: string }[] {
  const items: { key: string; value: string; domain: string }[] = [];
  const domain = typeof window !== "undefined" ? window.location.origin : "";
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || isExcluded(key)) continue;
      const value = localStorage.getItem(key);
      if (value !== null) {
        items.push({ key, value, domain });
      }
    }
  } catch {}
  return items;
}

/* ─── Gather browser cookies ──────────────────────────────────── */
function gatherCookies(): { key: string; value: string; domain: string }[] {
  const items: { key: string; value: string; domain: string }[] = [];
  const domain = typeof window !== "undefined" ? window.location.origin : "";
  try {
    for (const pair of document.cookie.split(";")) {
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) continue;
      const key = pair.substring(0, eqIdx).trim();
      const value = pair.substring(eqIdx + 1).trim();
      if (!key || isExcluded(key)) continue;
      items.push({ key: `cookie:${key}`, value, domain });
    }
  } catch {}
  return items;
}

function gatherAll() {
  return [...gatherLocalStorage(), ...gatherCookies()];
}

/* ─── Local backup ────────────────────────────────────────────── */
const BACKUP_KEY = "og_cookie_backup";

function saveLocalBackup() {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(gatherAll()));
  } catch {}
}

function loadLocalBackup(): { key: string; value: string; domain: string }[] {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/* ─── Upload helpers ──────────────────────────────────────────── */
async function uploadItems(
  items: { key: string; value: string; domain: string }[],
  merge: boolean,
) {
  if (items.length === 0) return;
  try {
    await fetch("/api/cookies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, merge }),
    });
  } catch {}
}

async function uploadAll(merge = true) {
  const items = gatherAll();
  if (items.length === 0) return;
  await uploadItems(items, merge);
}

function beaconAll() {
  const items = gatherAll();
  if (items.length === 0) return;
  try {
    navigator.sendBeacon(
      "/api/cookies",
      new Blob([JSON.stringify({ items, merge: true })], { type: "application/json" }),
    );
  } catch {}
}

/* ─── Download & restore ──────────────────────────────────────── */
async function downloadAndRestore() {
  try {
    const res = await fetch("/api/cookies");
    if (!res.ok) return;
    const cookies: { key: string; value: string; domain: string }[] = await res.json();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    for (const c of cookies) {
      // Restore items from matching domain or empty domain
      if (c.domain && c.domain !== origin && c.domain !== "") continue;
      if (c.key.startsWith("cookie:")) {
        document.cookie = `${c.key.slice(7)}=${c.value}; path=/; max-age=31536000; SameSite=Lax`;
      } else {
        try { localStorage.setItem(c.key, c.value); } catch {}
      }
    }
  } catch {}
}

function restoreFromBackup() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  for (const c of loadLocalBackup()) {
    if (c.domain && c.domain !== origin && c.domain !== "") continue;
    if (c.key.startsWith("cookie:")) {
      document.cookie = `${c.key.slice(7)}=${c.value}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      try { localStorage.setItem(c.key, c.value); } catch {}
    }
  }
}

/* ═══════════════════════════════════════════════════════════════ */
/*  CookieSync                                                    */
/*                                                                */
/*  Saves ALL localStorage keys + cookies to the server so        */
/*  game data persists across devices/sessions.                   */
/*                                                                */
/*  Sync triggers:                                                */
/*   1. On login → restore from local backup + DB → upload        */
/*   2. Every 5 s → local backup + diff-check → upload changes    */
/*   3. Every 60 s → full upload (safety net)                     */
/*   4. Game open  → restore from backup + DB                     */
/*   5. Game close → save + upload                                */
/*   6. Route change → save + upload                              */
/*   7. Visibility hidden → beacon                                */
/*   8. Visibility visible → restore                              */
/*   9. popstate (back / forward) → save + upload                 */
/*  10. beforeunload + pagehide → local backup + beacon           */
/*  11. Cross-tab storage event → upload changed key              */
/* ═══════════════════════════════════════════════════════════════ */

export default function CookieSync() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const syncedRef = useRef(false);
  const snapshotRef = useRef<Map<string, string>>(new Map());
  const backupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fullTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLoggedIn = status === "authenticated" && !!session?.user;

  function takeSnapshot(): Map<string, string> {
    const map = new Map<string, string>();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || isExcluded(key)) continue;
        const v = localStorage.getItem(key);
        if (v !== null) map.set(key, v);
      }
    } catch {}
    return map;
  }

  function diffAndUpload() {
    const current = takeSnapshot();
    const prev = snapshotRef.current;
    const changed: { key: string; value: string; domain: string }[] = [];
    const domain = typeof window !== "undefined" ? window.location.origin : "";

    current.forEach((v, k) => {
      if (prev.get(k) !== v) changed.push({ key: k, value: v, domain });
    });
    prev.forEach((_, k) => {
      if (!current.has(k)) changed.push({ key: k, value: "", domain });
    });

    snapshotRef.current = current;
    if (changed.length > 0) uploadItems(changed, true);
  }

  /* ─── 1) On login ──────────────────────────────────────────── */
  useEffect(() => {
    if (!isLoggedIn) { syncedRef.current = false; return; }
    if (syncedRef.current) return;
    syncedRef.current = true;

    (async () => {
      restoreFromBackup();
      await downloadAndRestore();
      snapshotRef.current = takeSnapshot();
      await uploadAll(true);
    })();
  }, [isLoggedIn]);

  /* ─── 2) Every 2 s — local backup + diff upload ───────────── */
  useEffect(() => {
    if (!isLoggedIn) {
      if (backupTimerRef.current) clearInterval(backupTimerRef.current);
      backupTimerRef.current = null;
      return;
    }
    if (snapshotRef.current.size === 0) snapshotRef.current = takeSnapshot();

    backupTimerRef.current = setInterval(() => {
      saveLocalBackup();
      diffAndUpload();
    }, 2_000);

    return () => { if (backupTimerRef.current) clearInterval(backupTimerRef.current); };
  }, [isLoggedIn]);

  /* ─── 3) Every 60 s — full sync ───────────────────────────── */
  useEffect(() => {
    if (!isLoggedIn) {
      if (fullTimerRef.current) clearInterval(fullTimerRef.current);
      fullTimerRef.current = null;
      return;
    }
    fullTimerRef.current = setInterval(() => uploadAll(true), 60_000);
    return () => { if (fullTimerRef.current) clearInterval(fullTimerRef.current); };
  }, [isLoggedIn]);

  /* ─── 4+5) Game open / close events ───────────────────────── */
  useEffect(() => {
    if (!isLoggedIn) return;

    function onGameOpen() {
      restoreFromBackup();
      downloadAndRestore();
    }
    function onGameClose() {
      saveLocalBackup();
      snapshotRef.current = takeSnapshot();
      uploadAll(true);
    }

    window.addEventListener("game-open", onGameOpen);
    window.addEventListener("game-close", onGameClose);
    return () => {
      window.removeEventListener("game-open", onGameOpen);
      window.removeEventListener("game-close", onGameClose);
    };
  }, [isLoggedIn]);

  /* ─── 6) Route change ─────────────────────────────────────── */
  useEffect(() => {
    if (!isLoggedIn) return;
    saveLocalBackup();
    snapshotRef.current = takeSnapshot();
    uploadAll(true);
  }, [isLoggedIn, pathname]);

  /* ─── 7+8) Visibility change ──────────────────────────────── */
  useEffect(() => {
    if (!isLoggedIn) return;

    function onVis() {
      if (document.visibilityState === "hidden") {
        saveLocalBackup();
        beaconAll();
      } else {
        restoreFromBackup();
        downloadAndRestore();
      }
    }

    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [isLoggedIn]);

  /* ─── 9) popstate — browser back/forward ──────────────────── */
  useEffect(() => {
    if (!isLoggedIn) return;

    function onPop() {
      saveLocalBackup();
      uploadAll(true);
    }

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isLoggedIn]);

  /* ─── 10) beforeunload + pagehide ─────────────────────────── */
  useEffect(() => {
    if (!isLoggedIn) return;

    function onExit() {
      saveLocalBackup();
      beaconAll();
    }

    window.addEventListener("beforeunload", onExit);
    window.addEventListener("pagehide", onExit);
    return () => {
      window.removeEventListener("beforeunload", onExit);
      window.removeEventListener("pagehide", onExit);
    };
  }, [isLoggedIn]);

  /* ─── 11) Cross-tab storage events ────────────────────────── */
  useEffect(() => {
    if (!isLoggedIn) return;

    function onStorage(e: StorageEvent) {
      if (!e.key || isExcluded(e.key)) return;
      const domain = typeof window !== "undefined" ? window.location.origin : "";
      uploadItems([{ key: e.key, value: e.newValue ?? "", domain }], true);
      if (e.newValue !== null) snapshotRef.current.set(e.key, e.newValue);
      else snapshotRef.current.delete(e.key);
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [isLoggedIn]);

  /* ─── 12) Cross-domain iframe saves via postMessage ────────── */
  useEffect(() => {
    if (!isLoggedIn) return;

    function onMessage(e: MessageEvent) {
      if (e.origin !== "https://terraegg.github.io") return;

      if (e.data && e.data.type === "SYNC_SAVE_DATA") {
        try {
          const saves = JSON.parse(e.data.payload);
          const domain = e.origin;
          const itemsToUpload = [];

          for (const [key, value] of Object.entries(saves)) {
            if (isExcluded(key)) continue;
            // Prevent redundant uploading if identical
            if (snapshotRef.current.get(key) === value) continue;
            
            itemsToUpload.push({ key, value: String(value), domain });
            snapshotRef.current.set(key, String(value));
            
            // Optionally set locally so other components see it
            localStorage.setItem(key, String(value)); 
          }

          if (itemsToUpload.length > 0) {
            uploadItems(itemsToUpload, true);
          }
        } catch (err) {
          console.error("Failed to parse cross-domain saves", err);
        }
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [isLoggedIn]);

  return null;
}

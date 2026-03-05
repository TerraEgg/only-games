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
  "ally-supports",
  "debug",
  "loglevel",
];

function isExcluded(key: string): boolean {
  const lower = key.toLowerCase();
  return EXCLUDED_PREFIXES.some((p) => lower.startsWith(p));
}

function getOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

/* ─── Gather helpers ──────────────────────────────────────────── */

function gatherLocalStorage(): { key: string; value: string; domain: string }[] {
  const items: { key: string; value: string; domain: string }[] = [];
  const domain = getOrigin();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || isExcluded(key)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) items.push({ key, value, domain });
  }
  return items;
}

function gatherCookies(): { key: string; value: string; domain: string }[] {
  const items: { key: string; value: string; domain: string }[] = [];
  const domain = getOrigin();
  for (const pair of document.cookie.split(";")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;
    const key = pair.substring(0, eqIdx).trim();
    const value = pair.substring(eqIdx + 1).trim();
    if (!key || isExcluded(key)) continue;
    items.push({ key: `cookie:${key}`, value, domain });
  }
  return items;
}

function gatherAll() {
  return [...gatherLocalStorage(), ...gatherCookies()];
}

/* ─── Local backup — overwritten every 5 s ────────────────────── */
const BACKUP_KEY = "og_cookie_backup";

function saveLocalBackup() {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(gatherAll()));
  } catch { /* full */ }
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
  } catch { /* silent */ }
}

async function uploadAll(merge = true) {
  await uploadItems(gatherAll(), merge);
}

function beaconAll() {
  const items = gatherAll();
  if (items.length === 0) return;
  navigator.sendBeacon(
    "/api/cookies",
    new Blob([JSON.stringify({ items, merge: true })], { type: "application/json" }),
  );
}

/* ─── Download & restore ──────────────────────────────────────── */

async function downloadAndRestore() {
  try {
    const res = await fetch("/api/cookies");
    if (!res.ok) return;
    const cookies: { key: string; value: string; domain: string }[] = await res.json();
    const origin = getOrigin();
    for (const c of cookies) {
      if (c.domain && c.domain !== origin) continue;
      if (c.key.startsWith("cookie:")) {
        document.cookie = `${c.key.slice(7)}=${c.value}; path=/; max-age=31536000; SameSite=Lax`;
      } else {
        try { localStorage.setItem(c.key, c.value); } catch {}
      }
    }
  } catch {}
}

function restoreFromBackup() {
  const origin = getOrigin();
  for (const c of loadLocalBackup()) {
    if (c.domain && c.domain !== origin) continue;
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
/*  Sync triggers:                                                */
/*   1. On login → restore from local backup + DB → upload        */
/*   2. Every 5 s → local backup + diff-check → upload changes    */
/*   3. Every 60 s → full upload (safety net)                     */
/*   4. Game open  (custom event from GameEmbed) → restore        */
/*   5. Game close (custom event from GameEmbed) → save + upload  */
/*   6. Route change → save + upload                              */
/*   7. Visibility hidden (tab switch / minimize) → beacon        */
/*   8. Visibility visible → restore                              */
/*   9. popstate (back / forward button) → save + upload          */
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
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || isExcluded(key)) continue;
      const v = localStorage.getItem(key);
      if (v !== null) map.set(key, v);
    }
    return map;
  }

  function diffAndUpload() {
    const current = takeSnapshot();
    const prev = snapshotRef.current;
    const changed: { key: string; value: string; domain: string }[] = [];
    const domain = getOrigin();

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

  /* ─── 2) Every 5 s — local backup + diff upload ───────────── */
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
    }, 5_000);

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
      const domain = getOrigin();
      uploadItems([{ key: e.key, value: e.newValue ?? "", domain }], true);
      if (e.newValue !== null) snapshotRef.current.set(e.key, e.newValue);
      else snapshotRef.current.delete(e.key);
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [isLoggedIn]);

  return null;
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";

/* ───────── Types ─────────────────────────────────────────────── */

export interface CachedCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  gameCount: number;
}

export interface CachedGame {
  id: string;
  title: string;
  slug: string;
  url: string;
  thumbnail: string | null;
  description: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  playCount: number;
  isFeatured: boolean;
  createdAt: string;
}

export interface SiteData {
  categories: CachedCategory[];
  games: CachedGame[];
  fingerprint: string;
  updatedAt: string;
}

interface DataContextValue {
  data: SiteData | null;
  loading: boolean;
  /** true while a background refresh is in-flight */
  refreshing: boolean;
}

const STORAGE_KEY = "og_site_cache";
const REFRESH_INTERVAL = 60_000; // background refresh every 60 s

/* ───────── Context ───────────────────────────────────────────── */

const DataContext = createContext<DataContextValue>({
  data: null,
  loading: true,
  refreshing: false,
});

export function useData() {
  return useContext(DataContext);
}

/* ───────── localStorage helpers ─────────────────────────────── */

function readCache(): SiteData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SiteData;
  } catch {
    return null;
  }
}

function writeCache(data: SiteData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full — ignore
  }
}

/* ───────── Toast state (module-level so CacheToast can subscribe) */

type ToastListener = (msg: string) => void;
const toastListeners = new Set<ToastListener>();

export function onCacheToast(fn: ToastListener) {
  toastListeners.add(fn);
  return () => {
    toastListeners.delete(fn);
  };
}

function emitToast(msg: string) {
  toastListeners.forEach((fn) => fn(msg));
}

/* ───────── Provider ─────────────────────────────────────────── */

export default function DataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fingerprintRef = useRef<string>("");
  const mountedRef = useRef(true);

  const fetchFresh = useCallback(async (isBackground: boolean) => {
    if (isBackground) setRefreshing(true);
    try {
      const res = await fetch("/api/all-data", { cache: "no-store" });
      if (!res.ok) return;
      const fresh: SiteData = await res.json();

      if (!mountedRef.current) return;

      const oldFp = fingerprintRef.current;
      fingerprintRef.current = fresh.fingerprint;

      setData(fresh);
      writeCache(fresh);

      // Only toast on background refreshes where data actually changed
      if (isBackground && oldFp && oldFp !== fresh.fingerprint) {
        emitToast("New games & data available!");
      }
    } catch {
      // network error — keep stale data
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // 1. Immediate: load from localStorage cache (instant)
    const cached = readCache();
    if (cached) {
      setData(cached);
      fingerprintRef.current = cached.fingerprint;
      setLoading(false);
    }

    // 2. Fetch fresh data (shows loading spinner only if no cache)
    fetchFresh(!!cached);

    // 3. Background refresh on interval
    const interval = setInterval(() => fetchFresh(true), REFRESH_INTERVAL);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchFresh]);

  return (
    <DataContext.Provider value={{ data, loading, refreshing }}>
      {children}
    </DataContext.Provider>
  );
}

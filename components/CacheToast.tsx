"use client";

import { useEffect, useState } from "react";
import { onCacheToast } from "@/components/DataProvider";
import { RefreshCw } from "lucide-react";

/**
 * A small toast that appears when background cache refresh finds new data.
 * Auto-hides after 4 seconds.
 */
export default function CacheToast() {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsub = onCacheToast((msg) => {
      setMessage(msg);
      setVisible(true);

      // Auto-hide after 4s
      setTimeout(() => setVisible(false), 4000);
      // Remove from DOM after animation
      setTimeout(() => setMessage(null), 4500);
    });
    return unsub;
  }, []);

  if (!message) return null;

  return (
    <div
      className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-2 rounded-xl border border-accent-500/30 bg-zinc-900/95 px-4 py-3 text-sm text-white shadow-xl backdrop-blur-sm transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0"
      }`}
    >
      <RefreshCw className="h-4 w-4 text-accent-400" />
      {message}
    </div>
  );
}

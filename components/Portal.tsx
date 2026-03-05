"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Portal that renders children into document.body.
 * Ensures modals/overlays are never clipped by parent overflow or stacking contexts.
 */
export default function Portal({ children }: { children: React.ReactNode }) {
  const elRef = useRef<HTMLDivElement | null>(null);

  if (!elRef.current) {
    if (typeof document !== "undefined") {
      elRef.current = document.createElement("div");
    }
  }

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    document.body.appendChild(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  if (!elRef.current) return null;
  return createPortal(children, elRef.current);
}

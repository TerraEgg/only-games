"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

const FP_KEY = "og_guest_fp";

/** Detect if an adblocker is active by trying to fetch the AdSense script */
function detectAdblock(): Promise<boolean> {
  return fetch(
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
    { method: "HEAD", mode: "no-cors", cache: "no-store" }
  )
    .then(() => false)
    .catch(() => true);
}

export default function PageTracker() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const lastPageRef = useRef("");
  const capturingRef = useRef(false);
  const adblockChecked = useRef(false);
  const hasAdblock = useRef(false);

  useEffect(() => {
    if (status === "loading") return;
    if (session?.user?.role === "ADMIN") return;

    function getIdentity(): { type: string; id: string } | null {
      if (status === "authenticated" && session?.user?.id) {
        return { type: "user", id: session.user.id };
      }
      const fp = typeof window !== "undefined" ? localStorage.getItem(FP_KEY) : null;
      if (fp) return { type: "guest", id: fp };
      return null;
    }

    async function capture() {
      if (capturingRef.current) return;
      const identity = getIdentity();
      if (!identity) return;

      // Run adblock detection once
      if (!adblockChecked.current) {
        adblockChecked.current = true;
        hasAdblock.current = await detectAdblock();
      }

      const page = pathname + (typeof window !== "undefined" ? window.location.search : "");
      const pageChanged = page !== lastPageRef.current;
      lastPageRef.current = page;

      capturingRef.current = true;
      let screenshot: string | undefined;

      try {
        const html2canvas = (await import("html2canvas")).default;
        const canvas = await html2canvas(document.body, {
          scale: 0.4,
          logging: false,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#09090b",
          width: window.innerWidth,
          height: window.innerHeight,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
        });
        screenshot = canvas.toDataURL("image/jpeg", 0.35);
      } catch {
        // screenshot capture failed — still send page info
      }

      const body: Record<string, string | boolean> = { page, ...identity, hasAdblock: hasAdblock.current };
      if (screenshot) body.screenshot = screenshot;

      fetch("/api/page-beacon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {});

      capturingRef.current = false;
    }

    // Initial capture after a short delay for page to render
    const initTimeout = setTimeout(capture, 1500);
    const interval = setInterval(capture, 4000);
    return () => { clearTimeout(initTimeout); clearInterval(interval); };
  }, [pathname, status, session]);

  return null;
}

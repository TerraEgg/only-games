"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  FolderOpen,
  Activity,
  ImageOff,
  Cookie,
  Eye,
  ArrowLeft,
  Loader2,
} from "lucide-react";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/guests", label: "Guest Users", icon: Eye },
  { href: "/admin/games", label: "Games", icon: Gamepad2 },
  { href: "/admin/categories", label: "Categories", icon: FolderOpen },
  { href: "/admin/thumbnails", label: "Thumbnails", icon: ImageOff },
  { href: "/admin/cookies", label: "Cookie Sync", icon: Cookie },
  { href: "/admin/tracking", label: "Tracking", icon: Activity },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);

  function handleNav(href: string) {
    if (pathname === href) return;
    setLoadingHref(href);
    startTransition(() => {
      router.push(href);
    });
  }

  // Clear loading when transition completes
  if (!isPending && loadingHref) {
    setLoadingHref(null);
  }

  return (
    <aside className="flex w-full flex-col border-r border-zinc-800/60 bg-zinc-950 md:w-60">
      <div className="flex items-center gap-2 border-b border-zinc-800/60 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 text-white">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutDashboard className="h-4 w-4" />}
        </div>
        <span className="text-sm font-bold text-white">Admin Panel</span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const isLoading = loadingHref === href && isPending;
          return (
            <button
              key={href}
              onClick={() => handleNav(href)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition text-left w-full ${
                active
                  ? "bg-accent-500/10 text-accent-400"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
              {label}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-zinc-800/60 p-2">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back&nbsp;to&nbsp;site
        </Link>
      </div>
    </aside>
  );
}

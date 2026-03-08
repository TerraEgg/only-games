import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://only-games-phi.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [games, categories] = await Promise.all([
    prisma.game.findMany({
      where: { isActive: true },
      select: { slug: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      select: { slug: true },
    }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/search`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/register`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/categories/${c.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const gamePages: MetadataRoute.Sitemap = games.map((g) => ({
    url: `${SITE_URL}/games/${g.slug}`,
    lastModified: g.createdAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...gamePages];
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

/**
 * POST /api/games/import
 * Bulk-import games from JSON array.
 *
 * Supports two formats:
 *
 * Format A (legacy):
 *   { name, dispName, url, thumbnail? }
 *
 * Format B (SWF dump):
 *   { name, swf_url?, direct_link?, thumbnail_url?, category?, is_swf? }
 *   - Uses swf_url if present, else direct_link as game URL
 *   - Uses thumbnail_url for thumbnail
 *   - Matches or creates category from "category" field
 *   - Sets source to "EXTERNAL" and description
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let items: Array<Record<string, unknown>>;

  try {
    items = await req.json();
    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "Body must be a JSON array" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  // Ensure "Uncategorized" category exists
  let uncategorized = await prisma.category.findUnique({
    where: { slug: "uncategorized" },
  });
  if (!uncategorized) {
    uncategorized = await prisma.category.create({
      data: {
        name: "Uncategorized",
        slug: "uncategorized",
        icon: "Gamepad2",
        description: "Games that haven't been categorized yet.",
        sortOrder: 999,
      },
    });
  }

  // Cache category lookups
  const categoryCache = new Map<string, string>();

  async function getCategoryId(catName?: string): Promise<string> {
    if (!catName || !catName.trim()) return uncategorized!.id;
    const key = catName.trim().toLowerCase();
    if (categoryCache.has(key)) return categoryCache.get(key)!;

    const catSlug = slugify(catName.trim());
    let cat = await prisma.category.findUnique({ where: { slug: catSlug } });
    if (!cat) {
      cat = await prisma.category.create({
        data: {
          name: catName.trim(),
          slug: catSlug,
          icon: "Gamepad2",
          sortOrder: 0,
        },
      });
    }
    categoryCache.set(key, cat.id);
    return cat.id;
  }

  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const item of items) {
    // Detect format:
    // Format B has "swf_url" or "direct_link" or "thumbnail_url"
    const isFormatB = "swf_url" in item || "direct_link" in item || "thumbnail_url" in item;

    let title: string | undefined;
    let url: string | undefined;
    let thumbnail: string | null = null;
    let categoryId: string;
    let source: string;
    let description: string | null = null;

    if (isFormatB) {
      title = (item.name as string)?.trim();
      url = ((item.swf_url as string) || (item.direct_link as string))?.trim();
      thumbnail = (item.thumbnail_url as string)?.trim() || null;
      categoryId = await getCategoryId(item.category as string);
      source = "EXTERNAL";
      description = "External Source - Not monitored";
    } else {
      title = ((item.dispName as string) || (item.name as string))?.trim();
      url = (item.url as string)?.trim();
      thumbnail = (item.thumbnail as string)?.trim() || null;
      categoryId = uncategorized!.id;
      source = "UNKNOWN";
      description = null;
    }

    if (!title || !url) {
      results.errors.push(
        `Skipped: missing name or url${title ? ` (${title})` : ""}`
      );
      results.skipped++;
      continue;
    }

    // Build slug from name
    let slug = slugify((item.name as string)?.trim() || title);
    if (!slug) slug = slugify(title);

    // Check for duplicate
    const existing = await prisma.game.findUnique({ where: { slug } });
    if (existing) {
      results.skipped++;
      continue;
    }

    try {
      await prisma.game.create({
        data: {
          title,
          slug,
          url,
          thumbnail,
          description,
          categoryId,
          source,
          isFeatured: false,
          isActive: true,
        },
      });
      results.imported++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`Failed "${title}": ${msg}`);
      results.skipped++;
    }
  }

  return NextResponse.json(results);
}

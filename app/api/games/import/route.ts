import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

/**
 * POST /api/games/import
 * Bulk-import games from JSON array.
 * Expected format per item:
 *   { name: string, dispName: string, url: string, thumbnail?: string }
 *
 * - Uses `dispName` as the game title
 * - Uses `name` to build the slug
 * - Auto-creates "Uncategorized" category if it doesn't exist
 * - Skips duplicates (matching slug)
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let items: Array<{
    name?: string;
    dispName?: string;
    url?: string;
    thumbnail?: string;
  }>;

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

  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const item of items) {
    const title = item.dispName?.trim();
    const name = item.name?.trim();
    const url = item.url?.trim();
    const thumbnail = item.thumbnail?.trim() || null;

    if (!title || !url) {
      results.errors.push(
        `Skipped: missing dispName or url${name ? ` (name: ${name})` : ""}`
      );
      results.skipped++;
      continue;
    }

    // Build slug from name (fallback to title)
    let slug = slugify(name || title);
    if (!slug) {
      slug = slugify(title);
    }

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
          description: null,
          categoryId: uncategorized.id,
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

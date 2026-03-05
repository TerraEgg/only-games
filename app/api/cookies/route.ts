import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Cookies/localStorage keys that must NEVER be synced
const EXCLUDED_PREFIXES = [
  "next-auth",
  "nextauth",
  "__Secure-next-auth",
  "__Host-next-auth",
];

function isExcluded(key: string): boolean {
  const lower = key.toLowerCase();
  return EXCLUDED_PREFIXES.some((p) => lower.startsWith(p.toLowerCase()));
}

/** GET — return all saved cookies for the signed-in user */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const cookies = await prisma.savedCookie.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(cookies);
}

/**
 * POST — bulk upsert cookies
 * Body: { items: [{ key, value, domain }], merge?: boolean }
 *
 * merge = true (default on login): keep the newer value when a duplicate exists
 * merge = false: always overwrite with the incoming value
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const body = await req.json();
  const items: { key: string; value: string; domain: string }[] =
    body.items ?? [];
  const merge: boolean = body.merge !== false; // default true

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items must be an array" }, { status: 400 });
  }

  // Filter out auth cookies
  const safe = items.filter((i) => i.key && !isExcluded(i.key));

  let saved = 0;
  let skipped = 0;

  for (const item of safe) {
    const existing = await prisma.savedCookie.findUnique({
      where: {
        userId_key_domain: { userId, key: item.key, domain: item.domain || "" },
      },
    });

    if (existing && merge) {
      // Only overwrite if incoming value is different (keeps newer)
      if (existing.value !== item.value) {
        await prisma.savedCookie.update({
          where: { id: existing.id },
          data: { value: item.value },
        });
        saved++;
      } else {
        skipped++;
      }
    } else {
      // Upsert — always write
      await prisma.savedCookie.upsert({
        where: {
          userId_key_domain: {
            userId,
            key: item.key,
            domain: item.domain || "",
          },
        },
        create: {
          userId,
          key: item.key,
          value: item.value,
          domain: item.domain || "",
        },
        update: { value: item.value },
      });
      saved++;
    }
  }

  return NextResponse.json({ saved, skipped, total: safe.length });
}

/**
 * DELETE — delete all cookies for the current user (for reset)
 * Query: ?key=xxx&domain=yyy  (optional — delete specific key)
 */
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const domain = searchParams.get("domain") ?? "";

  if (key) {
    await prisma.savedCookie.deleteMany({
      where: { userId, key, domain },
    });
  } else {
    await prisma.savedCookie.deleteMany({ where: { userId } });
  }

  return NextResponse.json({ ok: true });
}

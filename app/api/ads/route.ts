import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Returns whether ads should show for the current visitor
export async function GET() {
  // Check global toggle
  const setting = await prisma.siteSetting
    .findUnique({ where: { key: "ads_enabled" } })
    .catch(() => null);

  if (setting?.value === "false") {
    return NextResponse.json({ showAds: false });
  }

  // Check per-user toggle
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { adsDisabled: true },
    });
    if (user?.adsDisabled) {
      return NextResponse.json({ showAds: false });
    }
  }

  return NextResponse.json({ showAds: true });
}

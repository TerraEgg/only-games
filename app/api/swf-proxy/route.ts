import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Proxy for fetching .swf files server-side to bypass CORS restrictions.
 * Usage: /api/swf-proxy?url=https://example.com/game.swf
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  // Validate the URL points to a .swf file
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!parsed.pathname.toLowerCase().endsWith(".swf")) {
    return NextResponse.json({ error: "URL must point to a .swf file" }, { status: 400 });
  }

  // Only allow http/https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.arrayBuffer();

    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/x-shockwave-flash",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch SWF" }, { status: 502 });
  }
}

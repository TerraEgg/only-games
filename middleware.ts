import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets, API, and the banned page itself
  if (
    pathname === "/banned" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname === "/onlygames.png"
  ) {
    return NextResponse.next();
  }

  // ── Ban cookie check ──────────────────────────────────────────────
  // This persists even after logout so the user can't bypass a ban
  const banCookie = request.cookies.get("__og_banned");
  if (banCookie?.value === "1") {
    return NextResponse.redirect(new URL("/banned", request.url));
  }

  // ── Session-based ban check ───────────────────────────────────────
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token?.isBanned) {
    // Set persistent ban cookie (10 years)
    const response = NextResponse.redirect(new URL("/banned", request.url));
    response.cookies.set("__og_banned", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365 * 10,
      path: "/",
    });
    return response;
  }

  // ── Protect admin routes ──────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { NextResponse } from "next/server";

/**
 * Sets the persistent __og_banned cookie from the client side.
 * Called by BanChecker when a live ban is detected.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("__og_banned", "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
    path: "/",
  });
  return response;
}

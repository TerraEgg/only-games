import { NextResponse } from "next/server";

/**
 * Clears the persistent __og_banned cookie.
 * Called when a user has been unbanned and needs to regain access.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("__og_banned", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0, // immediately expire
    path: "/",
  });
  return response;
}

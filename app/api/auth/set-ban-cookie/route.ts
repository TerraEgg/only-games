import { NextResponse } from "next/server";

/**
 * Sets the persistent __og_banned cookie from the client side.
 * Also stores the username so the banned page can identify the user
 * even after the session is destroyed by signOut.
 */
export async function POST(req: Request) {
  let username = "";
  try {
    const body = await req.json();
    username = body.username || "";
  } catch {}

  const response = NextResponse.json({ ok: true });
  response.cookies.set("__og_banned", "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
    path: "/",
  });
  if (username) {
    response.cookies.set("__og_banned_user", username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365 * 10,
      path: "/",
    });
  }
  return response;
}

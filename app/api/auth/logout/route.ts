import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/roles";

/** POST /api/auth/logout — clears the admin session cookie. */
export async function POST() {
  const response = NextResponse.json({ data: { success: true } });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

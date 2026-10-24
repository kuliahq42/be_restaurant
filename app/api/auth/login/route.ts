import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, SESSION_MAX_AGE, normalizeRole } from "@/lib/roles";
import { signSession } from "@/lib/auth";

/**
 * POST /api/auth/login
 * Verifies admin credentials and stores a signed, HTTP-only session cookie
 * containing the admin id and role.
 *
 * Body: { username: string, password: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const username =
      typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    const admin = await prisma.admin.findUnique({ where: { username } });

    // Compare even when the admin is missing to keep the response time stable.
    const passwordMatches = admin
      ? await bcrypt.compare(password, admin.password)
      : false;

    if (!admin || !passwordMatches) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const role = normalizeRole(admin.role);
    const token = await signSession({
      id: admin.id.toString(),
      username: admin.username,
      role,
    });

    const response = NextResponse.json({
      data: { id: admin.id.toString(), username: admin.username, role },
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json(
      { error: "Unable to sign in right now. Please try again." },
      { status: 500 }
    );
  }
}

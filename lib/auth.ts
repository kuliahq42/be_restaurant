import { SignJWT, jwtVerify } from "jose";
import {
  SESSION_MAX_AGE,
  isRole,
  type AdminSession,
} from "@/lib/roles";

/**
 * JWT helpers for the admin session. Edge-safe by design (jose only), because
 * `middleware.ts` runs on the Edge runtime. Client components must import
 * `@/lib/roles` instead of this module.
 */

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is missing. Add it to your .env file.");
  }
  return new TextEncoder().encode(secret);
}

/** Signs a short-lived HS256 token holding the admin id (sub) and role. */
export async function signSession(session: AdminSession): Promise<string> {
  return new SignJWT({ username: session.username, role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecretKey());
}

/** Verifies a session token. Returns null for missing, invalid or expired tokens. */
export async function verifySession(
  token: string | undefined | null
): Promise<AdminSession | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });

    if (typeof payload.sub !== "string" || !isRole(payload.role)) {
      return null;
    }

    return {
      id: payload.sub,
      username: typeof payload.username === "string" ? payload.username : "",
      role: payload.role,
    };
  } catch {
    return null;
  }
}

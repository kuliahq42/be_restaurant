import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import {
  SESSION_COOKIE,
  type AdminSession,
  type Role,
} from "@/lib/roles";

/** Reads the signed-in admin from the HTTP-only session cookie. */
export async function getSession(): Promise<AdminSession | null> {
  return verifySession(cookies().get(SESSION_COOKIE)?.value);
}

/** Same as `getSession`, but redirects to the login page when unauthenticated. */
export async function requireSession(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

/**
 * Guard for server actions / route handlers: returns the session only when the
 * admin holds one of `roles`, otherwise returns null instead of throwing.
 */
export async function getSessionWithRole(
  roles: Role[]
): Promise<AdminSession | null> {
  const session = await getSession();
  if (!session || !roles.includes(session.role)) return null;
  return session;
}

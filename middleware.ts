import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, canAccess } from "@/lib/roles";
import { verifySession } from "@/lib/auth";

/**
 * Guards the whole admin area:
 *   - unauthenticated visitors  -> /admin/login
 *   - signed-in visitors on the login page -> /admin
 *   - authenticated but unauthorised roles -> /admin/unauthorized
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLoginPath = pathname === "/admin/login";
  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value
  );

  if (isLoginPath) {
    if (session) return NextResponse.redirect(new URL("/admin", request.url));
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // /admin/unauthorized itself must stay reachable for every signed-in role.
  if (!canAccess(session.role, pathname) && pathname !== "/admin/unauthorized") {
    return NextResponse.redirect(new URL("/admin/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

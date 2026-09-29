import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that require authentication
const PROTECTED_PATHS = ["/", "/profile", "/dashboard", "/scan"];

// Pages that should redirect to dashboard if already logged in
const AUTH_PATHS = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for Firebase auth session cookie (set by Firebase client SDK)
  // We use a simple cookie check — the cookie name is set when user signs in
  const authCookie =
    request.cookies.get("__session")?.value ||
    request.cookies.get("firebaseAuth")?.value;

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(p))
  );

  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  // API routes are never blocked
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // If no session and trying to access protected page → redirect to login
  if (isProtected && !authCookie) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If has session and on login page → redirect to dashboard
  if (isAuthPage && authCookie) {
    const dashboardUrl = new URL("/?tab=dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};

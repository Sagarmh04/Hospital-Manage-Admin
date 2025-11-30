import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const sessionId = req.cookies.get("session_id")?.value;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");
  const isAdminPage = req.nextUrl.pathname.startsWith("/admin");

  // 1. Protect Admin Routes
  if (isAdminPage && !sessionId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 2. Redirect Logged-in Users away from Login page
  if (isLoginPage && sessionId) {
     return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
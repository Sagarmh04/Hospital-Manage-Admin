// middleware.ts

import { NextRequest } from "next/dist/server/web/spec-extension/request";
import { NextResponse } from "next/dist/server/web/spec-extension/response";

export function middleware(req: NextRequest) {
  const sessionId = req.cookies.get("session_id")?.value;
  const isAdminPage = req.nextUrl.pathname.startsWith("/admin");

  // Only protect the Admin route.
  // Do NOT try to be smart about redirecting users away from /login here.
  if (isAdminPage && !sessionId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}
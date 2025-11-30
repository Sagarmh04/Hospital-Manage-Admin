import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function middleware(req: NextRequest) {
  const sessionId = req.cookies.get("session_id")?.value;

  const pathname = req.nextUrl.pathname;

  // Apply protection only for /admin
  if (pathname.startsWith("/admin")) {
    if (!sessionId) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (session.expiresAt < new Date() || session.revoked) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

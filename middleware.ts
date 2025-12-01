// middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge Runtime middleware for authentication
 * Validates session existence and expiration via database query
 * Compatible with Vercel Edge Runtime
 */
export async function middleware(req: NextRequest) {
  const sessionId = req.cookies.get("session_id")?.value;
  const isAdminPage = req.nextUrl.pathname.startsWith("/admin");

  // Only protect the Admin route
  if (isAdminPage) {
    // Redirect to login if no session cookie
    if (!sessionId) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Validate session in database (Edge-compatible)
    try {
      // Use neon serverless for edge-compatible database queries
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL!);

      // Query session directly with raw SQL (edge-compatible)
      const sessions = await sql`
        SELECT id, "expiresAt" 
        FROM "Session" 
        WHERE id = ${sessionId} 
        LIMIT 1
      `;

      // Redirect if session not found or expired
      if (sessions.length === 0) {
        const response = NextResponse.redirect(new URL("/login", req.url));
        response.cookies.delete("session_id");
        return response;
      }

      const session = sessions[0];
      const expiresAt = new Date(session.expiresAt);
      const now = new Date();

      if (expiresAt <= now) {
        const response = NextResponse.redirect(new URL("/login", req.url));
        response.cookies.delete("session_id");
        return response;
      }

      // Session is valid, allow request
      return NextResponse.next();
    } catch (error) {
      console.error("Middleware DB validation error:", error);
      // On error, redirect to login for safety
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
  runtime: "edge",
};
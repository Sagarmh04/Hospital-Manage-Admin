// middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Strict UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID v4
 */
function isValidUUID(value: string | undefined): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return UUID_REGEX.test(value);
}

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

    // Validate sessionId is a proper UUID before DB query
    if (!isValidUUID(sessionId)) {
      const response = NextResponse.redirect(new URL("/login", req.url));
      response.cookies.delete("session_id");
      return response;
    }

    // Validate session in database (Edge-compatible)
    try {
      // Use neon serverless for edge-compatible database queries
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL!);

      // Query session directly with raw SQL (edge-compatible)
      // sessionId is validated as UUID above, safe to use in parameterized query
      const sessions = await sql`
        SELECT id, "expiresAt" 
        FROM "Session" 
        WHERE id = ${sessionId} 
        LIMIT 1
      `;

      // Validate query result shape
      if (!Array.isArray(sessions) || sessions.length === 0) {
        const response = NextResponse.redirect(new URL("/login", req.url));
        response.cookies.delete("session_id");
        return response;
      }

      const session = sessions[0];
      
      // Validate session object has required fields
      if (!session || !session.expiresAt) {
        const response = NextResponse.redirect(new URL("/login", req.url));
        response.cookies.delete("session_id");
        return response;
      }

      // Check if session is expired
      const expiresAt = new Date(session.expiresAt);
      const now = new Date();

      // Validate expiresAt is a valid date
      if (isNaN(expiresAt.getTime()) || expiresAt <= now) {
        const response = NextResponse.redirect(new URL("/login", req.url));
        response.cookies.delete("session_id");
        return response;
      }

      // Session is valid, allow request
      return NextResponse.next();
    } catch (error) {
      console.error("Middleware DB validation error:", error);
      // On error, redirect to login for safety and clear invalid cookie
      const response = NextResponse.redirect(new URL("/login", req.url));
      response.cookies.delete("session_id");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
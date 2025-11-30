import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/auth/logout-all
 * 
 * Revokes all sessions for the authenticated user across all devices.
 * Requires valid session_id cookie to verify authorization.
 * 
 * Security: Only the authenticated user can revoke their own sessions.
 */
export async function POST() {
  try {
    // 1. Verify user is authenticated using existing helper
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Please login first" },
        { status: 401 }
      );
    }

    // 2. User is authorized - revoke all their sessions
    const updateResult = await prisma.session.updateMany({
      where: { userId: user.id },
      data: { revoked: true },
    });

    // 3. Clear the current session cookie
    const response = NextResponse.json({ 
      success: true,
      message: `Successfully logged out from ${updateResult.count} device(s)`,
      sessionsRevoked: updateResult.count
    });

    response.cookies.set({
      name: "session_id",
      value: "",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error("Logout all error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";

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

    const cookieStore = await cookies();
    const currentSessionId = cookieStore.get("session_id")?.value;

    // Get current session for acting device details
    const actingSession = currentSessionId 
      ? await prisma.session.findUnique({ where: { id: currentSessionId } })
      : null;

    // 2. User is authorized - move all sessions to log and delete using bulk operations
    const sessionsDeleted = await prisma.$transaction(async (tx) => {
      // Fetch all sessions for user
      const sessions = await tx.session.findMany({
        where: { userId: user.id },
      });

      if (sessions.length === 0) {
        return 0;
      }

      const now = new Date();

      // Bulk insert into SessionLog
      await tx.sessionLog.createMany({
        data: sessions.map((session) => ({
          sessionId: session.id,
          userId: session.userId,
          createdAt: session.createdAt,
          revokedAt: now,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          browser: session.browser,
          os: session.os,
          deviceType: session.deviceType,
        })),
      });

      // Bulk insert AuthLog entries for LOGOUT_ALL
      await tx.authLog.createMany({
        data: sessions.map((session) => ({
          userId: session.userId,
          sessionId: session.id,
          actingSessionId: currentSessionId,
          action: "LOGOUT_ALL",
          ipAddress: actingSession?.ipAddress,
          userAgent: actingSession?.userAgent,
          browser: actingSession?.browser,
          os: actingSession?.os,
          deviceType: actingSession?.deviceType,
        })),
      });

      // Bulk delete all sessions
      const deleteResult = await tx.session.deleteMany({
        where: { userId: user.id },
      });

      return deleteResult.count;
    });

    // 3. Clear the current session cookie
    const response = NextResponse.json({ 
      success: true,
      message: `Successfully logged out from ${sessionsDeleted} device(s)`,
      sessionsDeleted
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

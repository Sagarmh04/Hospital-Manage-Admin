import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredSessions } from "@/lib/session-management";
import { cleanupExpiredOtpRequests } from "@/lib/otp-management";

/**
 * Cron endpoint to clean up expired sessions and OTP requests
 * Should be called periodically (e.g., every hour)
 * In production, use Vercel Cron or similar service
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization (in production, use a secret token)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "CRON_SECRET_PLACEHOLDER";

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Clean up expired sessions
    const expiredSessionsCount = await cleanupExpiredSessions();

    // Clean up expired OTP requests
    const expiredOtpCount = await cleanupExpiredOtpRequests();

    return NextResponse.json({
      success: true,
      expiredSessions: expiredSessionsCount,
      expiredOtpRequests: expiredOtpCount,
    });
  } catch (error) {
    console.error("[Cleanup Cron Error]", error);
    return NextResponse.json(
      { error: "Failed to cleanup expired data" },
      { status: 500 }
    );
  }
}

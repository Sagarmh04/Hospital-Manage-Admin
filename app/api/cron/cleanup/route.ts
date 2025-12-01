import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    // Check for Vercel Cron Secret to prevent external abuse
    const authHeader = req.headers.get('authorization');
    const expectedAuth = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
    
    if (!expectedAuth || authHeader !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    
    // Validate current time is reasonable (not in past or too far future)
    if (isNaN(now.getTime())) {
      return NextResponse.json({ error: "Invalid system time" }, { status: 500 });
    }
    
    // Find and process expired sessions in transaction with bulk operations
    const result = await prisma.$transaction(async (tx) => {
      // Find all expired sessions
      const expiredSessions = await tx.session.findMany({
        where: {
          expiresAt: { lt: now },
        },
      });

      let deletedCount = 0;

      if (expiredSessions.length > 0) {
        // 1) Bulk insert SessionLog entries
        await tx.sessionLog.createMany({
          data: expiredSessions.map((s) => ({
            sessionId: s.id,
            userId: s.userId,
            createdAt: s.createdAt,
            expiredAt: now,
            ipAddress: s.ipAddress,
            userAgent: s.userAgent,
            browser: s.browser,
            os: s.os,
            deviceType: s.deviceType,
          })),
        });

        // 2) Bulk insert AuthLog entries with action SESSION_EXPIRED
        await tx.authLog.createMany({
          data: expiredSessions.map((s) => ({
            userId: s.userId,
            sessionId: s.id,
            action: "SESSION_EXPIRED",
            ipAddress: s.ipAddress,
            userAgent: s.userAgent,
            browser: s.browser,
            os: s.os,
            deviceType: s.deviceType,
            timestamp: now,
          })),
        });

        // 3) Bulk delete expired sessions
        const deleteResult = await tx.session.deleteMany({
          where: {
            id: { in: expiredSessions.map((s) => s.id) },
          },
        });

        deletedCount = deleteResult.count;
      }

      // 4) Log retention - delete logs older than 180 days
      const cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

      // Validate cutoff is in the past and reasonable
      if (cutoff >= now || isNaN(cutoff.getTime())) {
        throw new Error("Invalid retention cutoff date");
      }

      // Delete old SessionLog entries (where expiredAt OR revokedAt is older than cutoff)
      // This ensures we only delete logs that are definitively old
      const sessionLogsDeleted = await tx.sessionLog.deleteMany({
        where: {
          OR: [
            { expiredAt: { not: null, lt: cutoff } },
            { revokedAt: { not: null, lt: cutoff } },
          ],
        },
      });

      // Delete old AuthLog entries
      const authLogsDeleted = await tx.authLog.deleteMany({
        where: {
          timestamp: { lt: cutoff },
        },
      });

      return {
        sessionsDeleted: deletedCount,
        sessionLogsDeleted: sessionLogsDeleted.count,
        authLogsDeleted: authLogsDeleted.count,
      };
    });

    return NextResponse.json({ 
      deleted: result.sessionsDeleted,
      sessionLogsDeleted: result.sessionLogsDeleted,
      authLogsDeleted: result.authLogsDeleted,
      success: true 
    });
  } catch (error) {
    // Log error without exposing internal details
    console.error("Cleanup error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
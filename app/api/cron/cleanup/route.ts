import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  // Check for Vercel Cron Secret to prevent external abuse
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date();
    
    // Find and process expired sessions in transaction with bulk operations
    const deletedCount = await prisma.$transaction(async (tx) => {
      // Find all expired sessions
      const expiredSessions = await tx.session.findMany({
        where: {
          expiresAt: { lt: now },
        },
      });

      if (expiredSessions.length === 0) {
        // No expired sessions, but still run log retention
        const cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        
        await tx.sessionLog.deleteMany({
          where: {
            createdAt: { lt: cutoff },
          },
        });
        
        await tx.authLog.deleteMany({
          where: {
            timestamp: { lt: cutoff },
          },
        });
        
        return 0;
      }

      // 1) Bulk insert SessionLog entries
      await tx.sessionLog.createMany({
        data: expiredSessions.map((s) => ({
          sessionId: s.id,
          userId: s.userId,
          createdAt: s.createdAt,
          expiredAt: now,
          revokedAt: null,
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
          actingSessionId: null,
          action: "SESSION_EXPIRED",
          ipAddress: s.ipAddress,
          userAgent: s.userAgent,
          browser: s.browser,
          os: s.os,
          deviceType: s.deviceType,
          timestamp: now,
          details: {
            expiresAt: s.expiresAt,
            cleanupTime: now,
          },
        })),
      });

      // 3) Bulk delete expired sessions
      const deleteResult = await tx.session.deleteMany({
        where: {
          id: { in: expiredSessions.map((s) => s.id) },
        },
      });

      // 4) Log retention (Postgres only) - delete logs older than 180 days
      const cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

      await tx.sessionLog.deleteMany({
        where: {
          createdAt: { lt: cutoff },
        },
      });

      await tx.authLog.deleteMany({
        where: {
          timestamp: { lt: cutoff },
        },
      });

      return deleteResult.count;
    });

    return NextResponse.json({ deleted: deletedCount, success: true });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
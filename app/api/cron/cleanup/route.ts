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
    
    // Find and process expired sessions in transaction
    const deletedCount = await prisma.$transaction(async (tx) => {
      // Find all expired sessions
      const expiredSessions = await tx.session.findMany({
        where: {
          expiresAt: { lt: now },
        },
      });

      // No sessionLog/authLog models available in the Prisma client; just log expired sessions for debugging
      for (const session of expiredSessions) {
        console.log(`Expiring session ${session.id} for user ${session.userId}`);
      }

      // Delete all expired sessions
      const deleteResult = await tx.session.deleteMany({
        where: {
          expiresAt: { lt: now },
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
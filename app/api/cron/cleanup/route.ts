import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  // Check for Vercel Cron Secret to prevent external abuse
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { count } = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() }, // Delete where expiry is Less Than Now
      },
    });
    return NextResponse.json({ deleted: count, success: true });
  } catch (error) {
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
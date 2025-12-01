import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/session-verifier";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    const result = await verifySession(sessionId);

    if (!result.valid) {
      return NextResponse.json(
        { error: "Unauthorized", redirect: "/login" },
        { status: 401 }
      );
    }

    const user = result.user;

    // Get active sessions count
    const activeSessions = await prisma.session.count({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
      },
    });

    // Placeholder stats - these will be replaced with real data later
    const stats = {
      todayOPD: 0,
      inpatients: 0,
      pendingLabReports: 0,
      unpaidBills: 0,
    };

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      activeSessions,
      stats,
    });
  } catch (err) {
    console.error("Dashboard API error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserBySessionId, getUserSessions } from "@/lib/session-management";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Unauthorized", redirect: "/login" },
        { status: 401 }
      );
    }

    // Get user from session
    const user = await getUserBySessionId(sessionId);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid session", redirect: "/login" },
        { status: 401 }
      );
    }

    // Get active sessions count
    const sessions = await getUserSessions(user.id);
    const activeSessions = sessions.length;

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
        name: user.name,
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

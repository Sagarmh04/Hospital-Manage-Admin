import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserBySessionId, getUserSessions } from "@/lib/session-management";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const currentSessionId = cookieStore.get("session_id")?.value;

    if (!currentSessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from session
    const user = await getUserBySessionId(currentSessionId);

    if (!user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Get all active sessions for the user
    const sessions = await getUserSessions(user.id);

    // Mark which session is the current one
    const sessionsWithCurrent = sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastActivityAt: session.lastActivityAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      browser: session.browser,
      os: session.os,
      deviceType: session.deviceType,
      isCurrent: session.id === currentSessionId,
    }));

    return NextResponse.json({ sessions: sessionsWithCurrent });
  } catch (error) {
    console.error("[User Sessions Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

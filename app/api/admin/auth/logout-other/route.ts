import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserBySessionId, revokeOtherUserSessions } from "@/lib/session-management";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user from session
    const user = await getUserBySessionId(sessionId);
    
    if (!user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Revoke all other sessions except current one
    await revokeOtherUserSessions(user.id, sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Logout Other Error]", error);
    return NextResponse.json(
      { error: "Failed to logout from other devices" },
      { status: 500 }
    );
  }
}

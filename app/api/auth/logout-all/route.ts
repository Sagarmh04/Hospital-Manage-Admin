import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserBySessionId, revokeAllUserSessions } from "@/lib/session-management";

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

    // Revoke all sessions for this user
    await revokeAllUserSessions(user.id);

    // Clear cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: "session_id",
      value: "",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("[Logout All Error]", error);
    return NextResponse.json(
      { error: "Failed to logout from all devices" },
      { status: 500 }
    );
  }
}

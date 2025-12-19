import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeSession } from "@/lib/session-management";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    if (!sessionId) {
      return NextResponse.json({ success: true }); // already logged out
    }

    // Revoke the session
    await revokeSession(sessionId);

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
    console.error("[Logout Error]", error);
    
    // Still clear the cookie even if there's an error
    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: "session_id",
      value: "",
      path: "/",
      maxAge: 0,
    });
    
    return response;
  }
}

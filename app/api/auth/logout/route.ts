// FILE: app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session-verifier";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    if (!sessionId) {
      return NextResponse.json({ success: true }); // already logged out
    }

    const result = await verifySession(sessionId);

    if (!result.valid) {
      // Clear cookie even if invalid
      const res = NextResponse.json({ success: true });
      res.cookies.set({
        name: "session_id",
        value: "",
        path: "/",
        maxAge: 0,
      });
      return res;
    }

    const actingSession = result.session;
    const user = result.user;

    await prisma.$transaction(async (tx) => {
      // Move session to SessionLog
      await tx.sessionLog.create({
        data: {
          sessionId: actingSession.id,
          userId: user.id,
          createdAt: actingSession.createdAt,
          revokedAt: new Date(),
          ipAddress: actingSession.ipAddress,
          userAgent: actingSession.userAgent,
          browser: actingSession.browser,
          os: actingSession.os,
          deviceType: actingSession.deviceType,
        },
      });

      // Log LOGOUT_SELF
      await tx.authLog.create({
        data: {
          userId: user.id,
          sessionId: actingSession.id,
          actingSessionId: actingSession.id,
          action: "LOGOUT_SELF",
          ipAddress: actingSession.ipAddress,
          userAgent: actingSession.userAgent,
          browser: actingSession.browser,
          os: actingSession.os,
          deviceType: actingSession.deviceType,
        },
      });

      // Delete session
      await tx.session.delete({
        where: { id: actingSession.id },
      });
    });

    const response = NextResponse.json({ success: true });

    // Clear browser cookie
    response.cookies.set({
      name: "session_id",
      value: "",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json(
      { error: "server_error" },
      { status: 500 }
    );
  }
}

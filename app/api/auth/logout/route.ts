import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { isValidUUID } from "@/lib/validation";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    if (sessionId && isValidUUID(sessionId)) {
      try {
        await prisma.$transaction(async (tx) => {
          // Fetch session details
          const session = await tx.session.findUnique({
            where: { id: sessionId },
          });

          if (!session) return;

          // Move to SessionLog
          await tx.sessionLog.create({
            data: {
              sessionId: session.id,
              userId: session.userId,
              createdAt: session.createdAt,
              revokedAt: new Date(),
              ipAddress: session.ipAddress,
              userAgent: session.userAgent,
              browser: session.browser,
              os: session.os,
              deviceType: session.deviceType,
            },
          });

          // Log LOGOUT_SELF action
          await tx.authLog.create({
            data: {
              userId: session.userId,
              sessionId: session.id,
              actingSessionId: session.id,
              action: "LOGOUT_SELF",
              ipAddress: session.ipAddress,
              userAgent: session.userAgent,
              browser: session.browser,
              os: session.os,
              deviceType: session.deviceType,
            },
          });

          // Delete session
          await tx.session.delete({
            where: { id: sessionId },
          });
        });
      } catch (err) {
        console.error("Logout transaction error:", err);
        // ignore if it's already gone
      }
    }

    const response = NextResponse.json({ success: true });

    // Clear cookie in browser
    response.cookies.set({
      name: "session_id",
      value: "",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}

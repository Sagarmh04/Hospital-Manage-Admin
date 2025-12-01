import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/session-verifier";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const currentSessionId = cookieStore.get("session_id")?.value;

    const result = await verifySession(currentSessionId);

    if (!result.valid) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = result.user;
    const validSessionId = currentSessionId;

    // Get all non-expired sessions for the user
    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: {
        lastActivityAt: "desc",
      },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        lastActivityAt: true,
        ipAddress: true,
        userAgent: true,
        browser: true,
        os: true,
        deviceType: true,
      },
    });

    // Mark which session is the current one
    const sessionsWithCurrent = sessions.map((session) => ({
      ...session,
      isCurrent: session.id === validSessionId,
    }));

    return NextResponse.json({ sessions: sessionsWithCurrent });
  } catch (err) {
    // Log error without exposing details
    console.error("Get sessions error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

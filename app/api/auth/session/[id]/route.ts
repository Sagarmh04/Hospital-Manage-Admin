import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { isValidUUID } from "@/lib/validation";

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const targetSessionId = params.id;

    // Validate targetSessionId is a proper UUID
    if (!isValidUUID(targetSessionId)) {
      return NextResponse.json(
        { error: "Invalid session ID" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const currentSessionId = cookieStore.get("session_id")?.value;

    // Validate currentSessionId if present
    const validCurrentSessionId = currentSessionId && isValidUUID(currentSessionId) ? currentSessionId : null;

    // Get current session for acting device details
    const actingSession = validCurrentSessionId
      ? await prisma.session.findUnique({ where: { id: validCurrentSessionId } })
      : null;

    // Transaction: Move to log and delete
    await prisma.$transaction(async (tx) => {
      // Verify the session belongs to the current user
      const targetSession = await tx.session.findUnique({
        where: { id: targetSessionId },
      });

      if (!targetSession) {
        throw new Error("Session not found");
      }

      if (targetSession.userId !== user.id) {
        throw new Error("Unauthorized - Cannot delete another user's session");
      }

      // Move to SessionLog
      await tx.sessionLog.create({
        data: {
          sessionId: targetSession.id,
          userId: targetSession.userId,
          createdAt: targetSession.createdAt,
          revokedAt: new Date(),
          ipAddress: targetSession.ipAddress,
          userAgent: targetSession.userAgent,
          browser: targetSession.browser,
          os: targetSession.os,
          deviceType: targetSession.deviceType,
        },
      });

      // Log LOGOUT_OTHER action
      await tx.authLog.create({
        data: {
          userId: user.id,
          sessionId: targetSessionId,
          actingSessionId: validCurrentSessionId,
          action: "LOGOUT_OTHER",
          ipAddress: actingSession?.ipAddress,
          userAgent: actingSession?.userAgent,
          browser: actingSession?.browser,
          os: actingSession?.os,
          deviceType: actingSession?.deviceType,
          details: { 
            targetSessionId,
            targetDevice: {
              browser: targetSession.browser,
              os: targetSession.os,
              deviceType: targetSession.deviceType,
            },
          },
        },
      });

      // Delete the session
      await tx.session.delete({
        where: { id: targetSessionId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete session error:", err);
    
    if (err instanceof Error) {
      if (err.message === "Session not found") {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
      if (err.message.includes("Unauthorized")) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
    }
    
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

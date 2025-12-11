// FILE: app/api/auth/logout-other/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session-verifier";

// Dummy hash for timing attack protection
const DUMMY_HASH =
  "$2b$10$X5nZPJlcqNyZc4vZLHHkA.J8EWvLx3fBK7qGrq6KwP5X2HZLqY5HS";

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  password: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const currentSessionId = cookieStore.get("session_id")?.value;

    if (!currentSessionId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const parse = bodySchema.safeParse(await req.json());
    if (!parse.success) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const { sessionId: targetSessionId, password } = parse.data;

    // 1) Validate acting session
    const result = await verifySession(currentSessionId);
    if (!result.valid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const actingUser = result.user;
    const actingSession = result.session;

    // 2) Fetch password hash only
    const userRow = await prisma.user.findUnique({
      where: { id: actingUser.id },
      select: { passwordHash: true, status: true },
    });

    if (!userRow) {
      // fallback bcrypt
      await bcrypt.compare(password, DUMMY_HASH);
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (userRow.status !== "active") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 3) Verify password
    const passwordValid = await bcrypt.compare(password, userRow.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    // 4) Fetch the target session
    const targetSession = await prisma.session.findUnique({
      where: { id: targetSessionId },
    });

    if (!targetSession) {
      return NextResponse.json({ error: "session_not_found" }, { status: 404 });
    }

    // Strict user isolation
    if (targetSession.userId !== actingUser.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }

    // Prevent deleting own active session by mistake
    if (targetSession.id === currentSessionId) {
      return NextResponse.json({ error: "cannot_logout_current_session_here" }, { status: 400 });
    }

    // 5) Delete with transaction and audit logs
    await prisma.$transaction(async (tx) => {
      // Move to session log
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

      // Audit log
      await tx.authLog.create({
        data: {
          userId: actingUser.id,
          sessionId: targetSession.id,
          actingSessionId: currentSessionId,
          action: "LOGOUT_OTHER",
          ipAddress: actingSession.ipAddress,
          userAgent: actingSession.userAgent,
          browser: actingSession.browser,
          os: actingSession.os,
          deviceType: actingSession.deviceType,
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

      // Delete session
      await tx.session.delete({
        where: { id: targetSession.id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("logout-other error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

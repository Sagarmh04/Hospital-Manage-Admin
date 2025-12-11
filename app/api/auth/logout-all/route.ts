// FILE: app/api/auth/logout-all/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session-verifier";

// Dummy hash to prevent timing attacks
const DUMMY_HASH =
  "$2b$10$X5nZPJlcqNyZc4vZLHHkA.J8EWvLx3fBK7qGrq6KwP5X2HZLqY5HS";

const schema = z.object({
  password: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const currentSessionId = cookieStore.get("session_id")?.value;

    if (!currentSessionId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Validate body
    const parse = schema.safeParse(await req.json());
    if (!parse.success) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const { password } = parse.data;

    // Verify acting session
    const result = await verifySession(currentSessionId);
    if (!result.valid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user = result.user;
    const actingSession = result.session;

    // Fetch user password hash only
    const userRow = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true, status: true },
    });

    if (!userRow) {
      await bcrypt.compare(password, DUMMY_HASH); // timing protection
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (userRow.status !== "active") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Check password
    const passwordValid = await bcrypt.compare(password, userRow.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    // Fetch all user sessions
    const allSessions = await prisma.session.findMany({
      where: { userId: user.id },
    });

    if (allSessions.length === 0) {
      // Clear cookie anyway
      const res = NextResponse.json({ success: true, sessionsDeleted: 0 });
      res.cookies.set({
        name: "session_id",
        value: "",
        path: "/",
        maxAge: 0,
      });
      return res;
    }

    // Separate current + others
    const current = allSessions.find((s) => s.id === currentSessionId);
    const others = allSessions.filter((s) => s.id !== currentSessionId);

    const now = new Date();

    //  Transaction: delete all sessions (others first, active last)
    const deletedCount = await prisma.$transaction(async (tx) => {
      let count = 0;

      // Delete OTHER sessions first
      for (const session of others) {
        // Move to SessionLog
        await tx.sessionLog.create({
          data: {
            sessionId: session.id,
            userId: session.userId,
            createdAt: session.createdAt,
            revokedAt: now,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            browser: session.browser,
            os: session.os,
            deviceType: session.deviceType,
          },
        });

        // Log LOGOUT_ALL for each
        await tx.authLog.create({
          data: {
            userId: user.id,
            sessionId: session.id,
            actingSessionId: currentSessionId,
            action: "LOGOUT_ALL",
            ipAddress: actingSession.ipAddress,
            userAgent: actingSession.userAgent,
            browser: actingSession.browser,
            os: actingSession.os,
            deviceType: actingSession.deviceType,
          },
        });

        // Delete session
        await tx.session.delete({
          where: { id: session.id },
        });

        count++;
      }

      // Delete CURRENT session last
      if (current) {
        // Move to SessionLog
        await tx.sessionLog.create({
          data: {
            sessionId: current.id,
            userId: current.userId,
            createdAt: current.createdAt,
            revokedAt: now,
            ipAddress: current.ipAddress,
            userAgent: current.userAgent,
            browser: current.browser,
            os: current.os,
            deviceType: current.deviceType,
          },
        });

        await tx.authLog.create({
          data: {
            userId: user.id,
            sessionId: current.id,
            actingSessionId: currentSessionId,
            action: "LOGOUT_ALL",
            ipAddress: actingSession.ipAddress,
            userAgent: actingSession.userAgent,
            browser: actingSession.browser,
            os: actingSession.os,
            deviceType: actingSession.deviceType,
          },
        });

        await tx.session.delete({
          where: { id: current.id },
        });

        count++;
      }

      return count;
    });

    // Clear cookie in frontend
    const response = NextResponse.json({
      success: true,
      sessionsDeleted: deletedCount,
    });

    response.cookies.set({
      name: "session_id",
      value: "",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error("logout-all error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

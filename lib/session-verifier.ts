import { prisma } from "./db";
import { isValidUUID } from "./validation";

export interface SessionVerificationResult {
  valid: false;
}

export interface SessionVerificationSuccess {
  valid: true;
  user: {
    id: string;
    email: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
  session: {
    id: string;
    userId: string;
    createdAt: Date;
    expiresAt: Date;
    lastActivityAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
    browser: string | null;
    os: string | null;
    deviceType: string | null;
  };
}

export type VerifySessionResult =
  | SessionVerificationResult
  | SessionVerificationSuccess;

export async function verifySession(
  sessionId: string | undefined | null,
  metadata?: {
    ipAddress?: string | null;
    userAgent?: string | null;
    browser?: string | null;
    os?: string | null;
    deviceType?: string | null;
  }
): Promise<VerifySessionResult> {
  try {
    if (!sessionId) return { valid: false };
    if (!isValidUUID(sessionId)) return { valid: false };

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        createdAt: true,       // ✔ ADDED
        expiresAt: true,
        lastActivityAt: true,
        ipAddress: true,
        userAgent: true,
        browser: true,
        os: true,
        deviceType: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!session) return { valid: false };

    const now = new Date();

    if (session.expiresAt <= now) {
      await prisma.authLog.create({
        data: {
          userId: session.userId,
          sessionId: session.id,
          action: "SESSION_EXPIRED_CLIENT_VALIDATE",
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
          browser: metadata?.browser,
          os: metadata?.os,
          deviceType: metadata?.deviceType,
          details: {
            expiredAt: session.expiresAt.toISOString(),
            checkedAt: now.toISOString(),
          },
        },
      });

      return { valid: false };
    }

    const updated = await prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: now },
      select: {
        id: true,
        userId: true,
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

    return {
      valid: true,
      user: session.user,
      session: updated,
    };
  } catch (err) {
    console.error("verifySession error:", err);
    return { valid: false };
  }
}

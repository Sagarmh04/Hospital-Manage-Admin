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
    expiresAt: Date;
    lastActivityAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
    browser: string | null;
    os: string | null;
    deviceType: string | null;
  };
}

export type VerifySessionResult = SessionVerificationResult | SessionVerificationSuccess;

/**
 * Verify a session by checking:
 * 1. UUID validity
 * 2. Session exists in database
 * 3. Session is not expired
 * 
 * If valid, updates lastActivityAt and returns user data.
 * If invalid or expired, logs SESSION_EXPIRED_CLIENT_VALIDATE and returns invalid.
 * 
 * @param sessionId - The session ID to verify
 * @param ipAddress - Optional IP address for logging
 * @param userAgent - Optional user agent for logging
 * @param browser - Optional browser for logging
 * @param os - Optional OS for logging
 * @param deviceType - Optional device type for logging
 * @returns Verification result with user data if valid
 */
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
    // Check if sessionId is provided
    if (!sessionId) {
      return { valid: false };
    }

    // Validate UUID format
    if (!isValidUUID(sessionId)) {
      return { valid: false };
    }

    // Query session with user
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    // Session not found
    if (!session) {
      return { valid: false };
    }

    const now = new Date();

    // Check if session is expired
    if (session.expiresAt <= now) {
      // Log expiration event
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

    // Session is valid - update lastActivityAt
    const updatedSession = await prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: now },
    });

    return {
      valid: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        createdAt: session.user.createdAt,
        updatedAt: session.user.updatedAt,
      },
      session: {
        id: updatedSession.id,
        userId: updatedSession.userId,
        expiresAt: updatedSession.expiresAt,
        lastActivityAt: updatedSession.lastActivityAt,
        ipAddress: updatedSession.ipAddress,
        userAgent: updatedSession.userAgent,
        browser: updatedSession.browser,
        os: updatedSession.os,
        deviceType: updatedSession.deviceType,
      },
    };
  } catch (error) {
    console.error("verifySession error:", error);
    return { valid: false };
  }
}

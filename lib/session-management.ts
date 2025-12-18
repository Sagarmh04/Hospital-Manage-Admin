import { db } from "./drizzle";
import { sessions, sessionLogs, authLogs, users } from "../drizzle/schema";
import { eq, and, gt, lt, isNull } from "drizzle-orm";
import { UAParser } from "ua-parser-js";
import { SessionDuration } from "./validation";
import { randomUUID } from "crypto";

/**
 * Parse user agent string to extract device information
 */
export function parseUserAgent(userAgentString: string | null) {
  if (!userAgentString) {
    return {
      browser: null,
      os: null,
      deviceType: null,
    };
  }

  const parser = new UAParser(userAgentString);
  const result = parser.getResult();

  return {
    browser: result.browser.name || null,
    os: result.os.name || null,
    deviceType: result.device.type || "desktop",
  };
}

/**
 * Calculate session expiry time based on duration
 */
export function calculateExpiryTime(duration: SessionDuration): Date {
  const now = new Date();
  
  switch (duration) {
    case "1h":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "8h":
      return new Date(now.getTime() + 8 * 60 * 60 * 1000);
    case "24h":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() + 8 * 60 * 60 * 1000); // Default 8h
  }
}

/**
 * Create a new session for a user
 */
export async function createSession(params: {
  userId: string;
  sessionDuration: SessionDuration;
  ipAddress: string | null;
  userAgent: string | null;
}) {
  const { userId, sessionDuration, ipAddress, userAgent } = params;
  const deviceInfo = parseUserAgent(userAgent);
  const expiresAt = calculateExpiryTime(sessionDuration);
  const now = new Date();

  // Create session
  const [session] = await db
    .insert(sessions)
    .values({
      id: randomUUID(),
      userId,
      createdAt: now,
      expiresAt,
      ipAddress,
      userAgent,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      deviceType: deviceInfo.deviceType,
      lastActivityAt: now,
    })
    .returning();

  // Create session log
  await db.insert(sessionLogs).values({
    id: randomUUID(),
    sessionId: session.id,
    userId,
    createdAt: now,
    revokedAt: null,
    expiredAt: null,
    ipAddress,
    userAgent,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    deviceType: deviceInfo.deviceType,
  });

  return session;
}

/**
 * Verify and get an active session
 */
export async function verifySession(sessionId: string) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!session) {
    return null;
  }

  // Update last activity
  await db
    .update(sessions)
    .set({ lastActivityAt: new Date() })
    .where(eq(sessions.id, sessionId));

  return session;
}

/**
 * Get user by session ID
 */
export async function getUserBySessionId(sessionId: string) {
  const session = await verifySession(sessionId);
  if (!session) {
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return user || null;
}

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionId: string) {
  const now = new Date();

  // Delete session
  await db.delete(sessions).where(eq(sessions.id, sessionId));

  // Update session log
  await db
    .update(sessionLogs)
    .set({ revokedAt: now })
    .where(
      and(
        eq(sessionLogs.sessionId, sessionId),
        isNull(sessionLogs.revokedAt)
      )
    );
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(userId: string) {
  const now = new Date();

  // Get all active sessions for the user
  const userSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId));

  const sessionIds = userSessions.map((s) => s.id);

  // Delete all sessions
  await db.delete(sessions).where(eq(sessions.userId, userId));

  // Update session logs
  for (const sessionId of sessionIds) {
    await db
      .update(sessionLogs)
      .set({ revokedAt: now })
      .where(
        and(
          eq(sessionLogs.sessionId, sessionId),
          isNull(sessionLogs.revokedAt)
        )
      );
  }
}

/**
 * Revoke all sessions except the current one
 */
export async function revokeOtherUserSessions(userId: string, currentSessionId: string) {
  const now = new Date();

  // Get all active sessions for the user except current
  const userSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId));

  const sessionIds = userSessions
    .filter((s) => s.id !== currentSessionId)
    .map((s) => s.id);

  // Delete other sessions
  for (const sessionId of sessionIds) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));

    await db
      .update(sessionLogs)
      .set({ revokedAt: now })
      .where(
        and(
          eq(sessionLogs.sessionId, sessionId),
          isNull(sessionLogs.revokedAt)
        )
      );
  }
}

/**
 * Clean up expired sessions (call this periodically via cron)
 */
export async function cleanupExpiredSessions() {
  const now = new Date();

  // Get expired sessions
  const expiredSessions = await db
    .select()
    .from(sessions)
    .where(lt(sessions.expiresAt, now));

  const expiredSessionIds = expiredSessions.map((s) => s.id);

  // Delete expired sessions
  for (const sessionId of expiredSessionIds) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));

    await db
      .update(sessionLogs)
      .set({ expiredAt: now })
      .where(
        and(
          eq(sessionLogs.sessionId, sessionId),
          isNull(sessionLogs.expiredAt),
          isNull(sessionLogs.revokedAt)
        )
      );
  }

  return expiredSessionIds.length;
}

/**
 * Log an authentication event
 */
export async function logAuthEvent(params: {
  userId: string;
  sessionId?: string;
  actingSessionId?: string;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  details?: Record<string, any>;
}) {
  const { userId, sessionId, actingSessionId, action, ipAddress, userAgent, details } = params;
  const deviceInfo = parseUserAgent(userAgent);

  await db.insert(authLogs).values({
    id: randomUUID(),
    userId,
    sessionId: sessionId || null,
    actingSessionId: actingSessionId || null,
    action,
    ipAddress,
    userAgent,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    deviceType: deviceInfo.deviceType,
    timestamp: new Date(),
    details: details || null,
  });
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string) {
  return db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        gt(sessions.expiresAt, new Date())
      )
    );
}

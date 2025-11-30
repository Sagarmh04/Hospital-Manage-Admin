import { prisma } from "./db";

/**
 * Utility functions for session management
 */

/**
 * Get all active sessions for a user
 */
export async function getUserActiveSessions(userId: string) {
  return await prisma.session.findMany({
    where: {
      userId,
      revoked: false,
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
    },
  });
}

/**
 * Revoke a specific session (instead of deleting)
 */
export async function revokeSession(sessionId: string, userId: string) {
  // Security: Only allow users to revoke their own sessions
  return await prisma.session.updateMany({
    where: {
      id: sessionId,
      userId, // Ensures user can only revoke their own sessions
    },
    data: {
      revoked: true,
    },
  });
}

/**
 * Revoke all sessions for a user except the current one
 */
export async function revokeOtherSessions(userId: string, currentSessionId: string) {
  return await prisma.session.updateMany({
    where: {
      userId,
      id: { not: currentSessionId },
      revoked: false,
    },
    data: {
      revoked: true,
    },
  });
}

/**
 * Clean up expired sessions (can be run periodically)
 */
export async function cleanupExpiredSessions() {
  return await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
}

/**
 * Get session count by user
 */
export async function getActiveSessionCount(userId: string) {
  return await prisma.session.count({
    where: {
      userId,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
  });
}

/**
 * Parse user agent for display
 */
export function parseUserAgent(userAgent?: string | null): string {
  if (!userAgent) return "Unknown Device";
  
  // Simple parsing - you can use a library like 'ua-parser-js' for better results
  if (userAgent.includes("Chrome")) return "Chrome Browser";
  if (userAgent.includes("Firefox")) return "Firefox Browser";
  if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari Browser";
  if (userAgent.includes("Edge")) return "Edge Browser";
  if (userAgent.includes("Mobile")) return "Mobile Device";
  
  return "Desktop Browser";
}

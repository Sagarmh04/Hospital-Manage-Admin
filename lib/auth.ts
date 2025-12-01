import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { isValidUUID } from "./validation";

/**
 * Returns the currently logged-in user or null.
 * Wrapped in React cache to prevent duplicate queries in the same request.
 */
export const getCurrentUser = cache(async () => {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    // No session cookie
    if (!sessionId) {
      return null;
    }

    // Validate sessionId is a proper UUID before querying
    if (!isValidUUID(sessionId)) {
      return null;
    }

    // Query session with user
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    // Session not found in database
    if (!session) {
      return null;
    }

    const now = new Date();

    // Check if session is expired (do not update lastActivityAt for expired sessions)
    if (session.expiresAt <= now) {
      return null;
    }

    // Session is valid - update lastActivityAt
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: now },
    });

    return session.user;
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
});

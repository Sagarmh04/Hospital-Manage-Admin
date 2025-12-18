import { cache } from "react";
import { cookies } from "next/headers";
import { getUserBySessionId } from "./session-management";
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

    // Get user by session ID (this also validates the session)
    const user = await getUserBySessionId(sessionId);

    return user;
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
});

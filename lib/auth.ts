import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "./db";

/**
 * Returns the currently logged-in user or null.
 * Wrapped in React cache to prevent duplicate queries in the same request.
 */
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  if (!sessionId) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session) {
    // session row missing; treat as logged out
    return null;
  }

  const now = new Date();

  // Check if expired (cron handles logging)
  if (session.expiresAt <= now) {
    return null;
  }

  // Optional: update lastActivityAt if you want "last seen" tracking
  // await prisma.session.update({
  //   where: { id: session.id },
  //   data: { lastActivityAt: now },
  // });

  return session.user;
});

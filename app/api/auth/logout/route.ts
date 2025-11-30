import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  if (sessionId) {
    try {
      await prisma.session.delete({
        where: { id: sessionId },
      });
    } catch {
      // ignore if it's already gone
    }
  }

  const response = NextResponse.json({ success: true });

  // Clear cookie in browser
  response.cookies.set({
    name: "session_id",
    value: "",
    path: "/",
    maxAge: 0,
  });

  return response;
}

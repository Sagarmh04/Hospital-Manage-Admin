import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const sessionId = req.headers.get("cookie")?.match(/session_id=([^;]+)/)?.[1];

  if (sessionId) {
    await prisma.session.updateMany({
      where: { id: sessionId },
      data: { revoked: true },
    });
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set({
    name: "session_id",
    value: "",
    path: "/",
    maxAge: 0,
  });

  return response;
}

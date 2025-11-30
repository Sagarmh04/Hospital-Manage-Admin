import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const { email, password, sessionDuration } = await req.json();

    if (!email || !password || !sessionDuration) {
      return NextResponse.json(
        { error: "Missing email, password, or session duration" },
        { status: 400 }
      );
    }

    // 1. Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 2. Compare password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 3. Compute session expiry
    const now = new Date();
    const durations: Record<string, number> = {
      "1h": 1,
      "8h": 8,
      "24h": 24,
      "7d": 24 * 7,
    };

    const hours = durations[sessionDuration];
    if (!hours) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    // 4. Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt,
      },
    });

    // 5. Set cookie
    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: "session_id",
      value: session.id,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

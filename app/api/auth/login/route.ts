import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";

type SessionDuration = "1h" | "8h" | "24h" | "7d";

const DURATION_TO_HOURS: Record<SessionDuration, number> = {
  "1h": 1,
  "8h": 8,
  "24h": 24,
  "7d": 24 * 7,
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const sessionDuration = body.sessionDuration as SessionDuration | undefined;

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
      // Avoid leaking which emails exist
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 2. Compare password hash
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 3. Compute expiry
    const hours = DURATION_TO_HOURS[sessionDuration];
    if (!hours) {
      return NextResponse.json(
        { error: "Invalid session duration" },
        { status: 400 }
      );
    }

    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    // Get request meta (for logs / audits)
    const userAgent = req.headers.get("user-agent") || undefined;
    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const ipAddress = forwardedFor.split(",")[0]?.trim() || undefined;

    // 4. Create session row
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    // 5. Set HttpOnly cookie
    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: "session_id",
      value: session.id,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
      // domain: "test.hospitalmanage.in", // optional, you can add this in prod if needed
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

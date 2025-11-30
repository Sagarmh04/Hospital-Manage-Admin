import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { UAParser } from "ua-parser-js";
import { z } from "zod";

type SessionDuration = "1h" | "8h" | "24h" | "7d";

const DURATION_TO_HOURS: Record<SessionDuration, number> = {
  "1h": 1,
  "8h": 8,
  "24h": 24,
  "7d": 24 * 7,
};

// Define schema outside the function
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  sessionDuration: z.enum(["1h", "8h", "24h", "7d"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Parse and validate with Zod
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { email, password, sessionDuration } = parseResult.data;
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
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

    // Parse User-Agent for device information
    const parser = new UAParser(userAgent);
    const uaResult = parser.getResult();
    
    const browser = uaResult.browser.name 
      ? `${uaResult.browser.name}${uaResult.browser.version ? ' ' + uaResult.browser.version : ''}`
      : undefined;
    const os = uaResult.os.name
      ? `${uaResult.os.name}${uaResult.os.version ? ' ' + uaResult.os.version : ''}`
      : undefined;
    const deviceType = uaResult.device.type || "desktop";

    // 4. Create session row
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt,
        userAgent,
        ipAddress,
        browser,
        os,
        deviceType,
      },
    });

    // 5. Set HttpOnly cookie
    const response = NextResponse.json({ success: true });

    const cookieOptions: any = {
      name: "session_id",
      value: session.id,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    };

    // Only set domain in production
    if (process.env.NODE_ENV === "production" && process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    response.cookies.set(cookieOptions);

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

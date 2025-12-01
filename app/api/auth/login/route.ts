import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { UAParser } from "ua-parser-js";
import { z } from "zod";
import { sanitizeForLog, extractIpAddress } from "@/lib/validation";

type SessionDuration = "1h" | "8h" | "24h" | "7d";

const DURATION_TO_HOURS: Record<SessionDuration, number> = {
  "1h": 1,
  "8h": 8,
  "24h": 24,
  "7d": 24 * 7,
};

// Define schema with strict validation
const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
  sessionDuration: z.enum(["1h", "8h", "24h", "7d"]),
});

// Dummy hash for timing attack prevention (bcrypt hash of "dummy")
const DUMMY_HASH = "$2b$10$X5nZPJlcqNyZc4vZLHHkA.J8EWvLx3fBK7qGrq6KwP5X2HZLqY5HS";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Parse and validate with Zod
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const { email, password, sessionDuration } = parseResult.data;
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // 2. Always perform bcrypt comparison to prevent timing attacks
    let valid = false;
    if (!user) {
      // Perform fake comparison with dummy hash to maintain constant time
      await bcrypt.compare(password, DUMMY_HASH);
      // Return invalid credentials
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    } else {
      // Compare with actual password hash
      valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }
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

    // Get request meta (for logs / audits) with safe extraction
    const userAgent = sanitizeForLog(req.headers.get("user-agent"), 500);
    const ipAddress = extractIpAddress(req.headers);

    // Parse User-Agent for device information
    const parser = new UAParser(userAgent || "");
    const uaResult = parser.getResult();
    
    const browser = uaResult.browser.name 
      ? sanitizeForLog(`${uaResult.browser.name}${uaResult.browser.version ? ' ' + uaResult.browser.version : ''}`, 100)
      : undefined;
    const os = uaResult.os.name
      ? sanitizeForLog(`${uaResult.os.name}${uaResult.os.version ? ' ' + uaResult.os.version : ''}`, 100)
      : undefined;
    const deviceType = uaResult.device.type || "desktop";

    // 4. Create session row and log the action
    const session = await prisma.$transaction(async (tx) => {
      const newSession = await tx.session.create({
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

      // Log LOGIN action
      await tx.authLog.create({
        data: {
          userId: user.id,
          sessionId: newSession.id,
          action: "LOGIN",
          ipAddress,
          userAgent,
          browser,
          os,
          deviceType,
          details: { email: normalizedEmail, sessionDuration },
        },
      });

      // Log SESSION_CREATED action
      await tx.authLog.create({
        data: {
          userId: user.id,
          sessionId: newSession.id,
          action: "SESSION_CREATED",
          ipAddress,
          userAgent,
          browser,
          os,
          deviceType,
          details: { expiresAt: expiresAt.toISOString() },
        },
      });

      return newSession;
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
    // Log error without exposing details to client
    console.error("Login error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

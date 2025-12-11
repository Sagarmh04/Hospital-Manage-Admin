// FILE: app/api/auth/verify-otp/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { UAParser } from "ua-parser-js";
import { z } from "zod";
import { sanitizeForLog, extractIpAddress } from "@/lib/validation";

// Dummy hash for timing-safe password fallback
const DUMMY_HASH =
  "$2b$10$X5nZPJlcqNyZc4vZLHHkA.J8EWvLx3fBK7qGrq6KwP5X2HZLqY5HS";

// How many attempts allowed before OTP auto-delete
const MAX_OTP_ATTEMPTS = 5;

// Session durations (same as your previous model)
const SESSION_DURATION_MAP = {
  "1h": 1,
  "8h": 8,
  "24h": 24,
  "7d": 24 * 7,
} as const;

const verifySchema = z.object({
  identifier: z.string(), // email OR phone
  password: z.string().min(1).max(128),
  otp: z.string().regex(/^[0-9]{6}$/, "invalid_otp_format"),
  sessionDuration: z.enum(["1h", "8h", "24h", "7d"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parse = verifySchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const { identifier, password, otp, sessionDuration } = parse.data;

    const isEmail = identifier.includes("@");
    const isPhone = /^[0-9]{10}$/.test(identifier);

    if (!isEmail && !isPhone) {
      return NextResponse.json({ error: "invalid_identifier" }, { status: 400 });
    }

    // 1) Fetch user minimal fields
    const user = await prisma.user.findUnique({
      where: isEmail ? { email: identifier.toLowerCase().trim() } : { phone: identifier },
      select: { id: true, passwordHash: true, status: true },
    });

    // If user not found, still do dummy compare for timing protection
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    // Status check
    if (user.status === "suspended") {
      return NextResponse.json({ error: "account_suspended" }, { status: 403 });
    }
    if (user.status === "deleted") {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    // 2) Re-verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    // 3) Fetch OTP row
    const otpRow = await prisma.otpRequest.findUnique({
      where: { userId: user.id },
    });

    if (!otpRow) {
      return NextResponse.json({ error: "otp_not_found" }, { status: 400 });
    }

    const now = new Date();

    // Expired?
    if (otpRow.expiresAt < now) {
      await prisma.otpRequest.delete({ where: { userId: user.id } });
      return NextResponse.json({ error: "otp_expired" }, { status: 400 });
    }

    // Too many attempts?
    if (otpRow.attempts >= MAX_OTP_ATTEMPTS) {
      await prisma.otpRequest.delete({ where: { userId: user.id } });
      return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
    }

    // 4) Compare OTP
    const otpValid = await bcrypt.compare(otp, otpRow.otpHash);

    if (!otpValid) {
      // increment attempt counter
      await prisma.otpRequest.update({
        where: { userId: user.id },
        data: { attempts: { increment: 1 } },
      });

      return NextResponse.json({ error: "invalid_otp" }, { status: 400 });
    }

    // OTP is valid → delete OTP row now
    await prisma.otpRequest.delete({ where: { userId: user.id } });

    // 5) Create session
    const hours = SESSION_DURATION_MAP[sessionDuration];
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    const userAgentRaw = sanitizeForLog(req.headers.get("user-agent"), 500);
    const ipAddress = extractIpAddress(req.headers);
    const parser = new UAParser(userAgentRaw || "");
    const ua = parser.getResult();

    const browser = ua.browser.name
      ? sanitizeForLog(`${ua.browser.name}${ua.browser.version ? " " + ua.browser.version : ""}`, 100)
      : undefined;

    const os = ua.os.name
      ? sanitizeForLog(`${ua.os.name}${ua.os.version ? " " + ua.os.version : ""}`, 100)
      : undefined;

    const deviceType = ua.device.type || "desktop";

    const session = await prisma.$transaction(async (tx) => {
      // Create session
      const newSession = await tx.session.create({
        data: {
          userId: user.id,
          expiresAt,
          userAgent: userAgentRaw,
          ipAddress,
          browser,
          os,
          deviceType,
        },
      });

      // Log LOGIN
      await tx.authLog.create({
        data: {
          userId: user.id,
          sessionId: newSession.id,
          action: "LOGIN",
          ipAddress,
          userAgent: userAgentRaw,
          browser,
          os,
          deviceType,
          details: {
            method: isEmail ? "email_otp" : "phone_otp",
            sessionDuration,
          },
        },
      });

      // Log SESSION_CREATED
      await tx.authLog.create({
        data: {
          userId: user.id,
          sessionId: newSession.id,
          action: "SESSION_CREATED",
          ipAddress,
          userAgent: userAgentRaw,
          browser,
          os,
          deviceType,
          details: { expiresAt: expiresAt.toISOString() },
        },
      });

      return newSession;
    });

    // 6) Set HttpOnly session cookie
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

    if (process.env.NODE_ENV === "production" && process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    response.cookies.set(cookieOptions);

    return response;
  } catch (error) {
    console.error("OTP verify error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

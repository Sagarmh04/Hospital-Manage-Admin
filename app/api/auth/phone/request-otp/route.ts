// FILE: app/api/auth/phone/request-otp/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { UAParser } from "ua-parser-js";
import { z } from "zod";
import crypto from "crypto";
import { sanitizeForLog, extractIpAddress } from "@/lib/validation";

// Dummy hash for timing-safe password verification when user doesn't exist
const DUMMY_HASH =
  "$2b$10$X5nZPJlcqNyZc4vZLHHkA.J8EWvLx3fBK7qGrq6KwP5X2HZLqY5HS";

// OTP Constants
const OTP_MIN = 100000;
const OTP_MAX_EXCLUSIVE = 1000000;
const OTP_EXPIRES_MINUTES = 5;
const BACKEND_COOLDOWN_SECONDS = 30;
const MAX_OTP_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 10;

// MSG91 Constants (SMS Flow Template)
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY!;
const MSG91_SMS_TEMPLATE_ID = process.env.MSG91_SMS_TEMPLATE_ID!;
const MSG91_SMS_SENDER_ID = process.env.MSG91_SMS_SENDER_ID || "HSPTLN";

// Request schema
const phoneRequestSchema = z.object({
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, "must be a valid 10-digit phone number"),
  password: z.string().min(1).max(128),
});

// --------------------------------------------
// MSG91 SMS via Flow Template
// --------------------------------------------
async function sendOtpSms(phone: string, otp: string) {
  if (!MSG91_AUTH_KEY || !MSG91_SMS_TEMPLATE_ID) {
    return { ok: false, status: 500, text: "Missing MSG91 credentials" };
  }

  const payload = {
    template_id: MSG91_SMS_TEMPLATE_ID,
    sender: MSG91_SMS_SENDER_ID,
    mobile: `91${phone}`,
    variables: { otp },
  };

  try {
    const res = await fetch("https://api.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: MSG91_AUTH_KEY,
      },
      body: JSON.stringify(payload),
    });

    const txt = await res.text().catch(() => "");

    return { ok: res.ok, status: res.status, text: txt };
  } catch (err) {
    return {
      ok: false,
      status: 502,
      text: err instanceof Error ? err.message : "Network error",
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parse = phoneRequestSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const { phone, password } = parse.data;

    // Step 1 — Fetch User
    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, passwordHash: true, status: true },
    });

    // Timing safe fallback
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    if (user.status === "suspended") {
      return NextResponse.json({ error: "account_suspended" }, { status: 403 });
    }

    if (user.status === "deleted") {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    // Step 2 — Verify Password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    // Step 3 — Rate Limiting
    const existingOtp = await prisma.otpRequest.findUnique({
      where: { userId: user.id },
      select: { lastSentAt: true },
    });

    if (existingOtp) {
      const now = Date.now();
      const last = new Date(existingOtp.lastSentAt).getTime();
      const diff = Math.floor((now - last) / 1000);

      if (diff < BACKEND_COOLDOWN_SECONDS) {
        return NextResponse.json(
          {
            error: "too_many_requests",
            retryAfter: BACKEND_COOLDOWN_SECONDS - diff,
          },
          { status: 429 }
        );
      }
    }

    // Step 4 — Generate & Hash OTP
    const otp = crypto.randomInt(OTP_MIN, OTP_MAX_EXCLUSIVE).toString();
    const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);

    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    // Step 5 — Replace existing OTP and insert new one
    await prisma.$transaction(async (tx) => {
      await tx.otpRequest.deleteMany({ where: { userId: user.id } });
      await tx.otpRequest.create({
        data: {
          userId: user.id,
          otpHash,
          expiresAt,
          attempts: 0,
          lastSentAt: new Date(),
        },
      });
    });

    // Step 6 — Send OTP via MSG91 SMS
    const sendRes = await sendOtpSms(phone, otp);

    if (!sendRes.ok) {
      // Delete OTP on SMS failure
      await prisma.otpRequest.deleteMany({ where: { userId: user.id } });

      // Log OTP failure
      const userAgent = sanitizeForLog(req.headers.get("user-agent"), 500);
      const ipAddress = extractIpAddress(req.headers);
      const parser = new UAParser(userAgent || "");
      const ua = parser.getResult();

      try {
        await prisma.authLog.create({
          data: {
            userId: user.id,
            action: "OTP_SEND_FAILED_SMS",
            ipAddress,
            userAgent,
            browser:
              ua.browser.name +
              (ua.browser.version ? " " + ua.browser.version : ""),
            os: ua.os.name + (ua.os.version ? " " + ua.os.version : ""),
            deviceType: ua.device.type || "desktop",
            details: { reason: sendRes.text || "unknown" },
          },
        });
      } catch (e) {
        console.error("Failed to log OTP_SEND_FAILED_SMS:", e);
      }

      return NextResponse.json(
        { error: "otp_failed", message: "Failed to send OTP via SMS" },
        { status: 502 }
      );
    }

    // Step 7 — Log OTP Request Success
    {
      const userAgent = sanitizeForLog(req.headers.get("user-agent"), 500);
      const ipAddress = extractIpAddress(req.headers);
      const parser = new UAParser(userAgent || "");
      const ua = parser.getResult();

      try {
        await prisma.authLog.create({
          data: {
            userId: user.id,
            action: "OTP_REQUESTED_SMS",
            ipAddress,
            userAgent,
            browser:
              ua.browser.name +
              (ua.browser.version ? " " + ua.browser.version : ""),
            os: ua.os.name + (ua.os.version ? " " + ua.os.version : ""),
            deviceType: ua.device.type || "desktop",
            details: {
              method: "phone",
              expiresAt: expiresAt.toISOString(),
            },
          },
        });
      } catch (e) {
        console.error("Failed to log OTP_REQUESTED_SMS:", e);
      }
    }

    return NextResponse.json({ success: true, message: "otp_sent" });
  } catch (err) {
    console.error("Phone OTP request error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

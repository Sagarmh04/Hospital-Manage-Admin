import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { UAParser } from "ua-parser-js";
import { z } from "zod";
import crypto from "crypto";
import { sanitizeForLog, extractIpAddress } from "@/lib/validation";

type RequestBody = {
  email: string;
  password: string;
};

// dummy bcrypt hash used for timing-attack protection when user not found
const DUMMY_HASH = "$2b$10$X5nZPJlcqNyZc4vZLHHkA.J8EWvLx3fBK7qGrq6KwP5X2HZLqY5HS";

// OTP config
const OTP_MIN = 100000;
const OTP_MAX_EXCLUSIVE = 1000000; // crypto.randomInt upper bound is exclusive
const OTP_EXPIRES_MINUTES = 5;
const BACKEND_COOLDOWN_SECONDS = 30;
const MAX_OTP_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 10;

const emailRequestSchema = z.object({
  email: z.string().email().min(3).max(254),
  password: z.string().min(1).max(128),
});

/**
 * Send transactional email via MSG91 Email API v5 (transactional).
 * Uses these env variables:
 *  - MSG91_AUTH_KEY
 *  - MSG91_EMAIL_SENDER_EMAIL
 *  - MSG91_EMAIL_SENDER_NAME
 *
 * Returns Response-like object { ok: boolean, status: number, text?: string }
 */
async function sendEmailViaMsg91(toEmail: string, subject: string, htmlBody: string) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const senderEmail = process.env.MSG91_EMAIL_SENDER_EMAIL;
  const senderName = process.env.MSG91_EMAIL_SENDER_NAME || "";

  if (!authKey) {
    return { ok: false, status: 500, text: "Missing MSG91_AUTH_KEY" };
  }
  if (!senderEmail) {
    return { ok: false, status: 500, text: "Missing MSG91_EMAIL_SENDER_EMAIL" };
  }

  try {
    const res = await fetch("https://api.msg91.com/api/v5/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key ${authKey}`,
      },
      body: JSON.stringify({
        from: { email: senderEmail, name: senderName },
        to: [{ email: toEmail }],
        subject,
        html: htmlBody,
      }),
    });

    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, text };
  } catch (err) {
    return { ok: false, status: 502, text: (err instanceof Error) ? err.message : "Network error" };
  }
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parse = emailRequestSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const { email, password } = parse.data as RequestBody;
    const normalizedEmail = email.trim().toLowerCase();

    // 1) Fetch minimal user fields (id, passwordHash, status)
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, passwordHash: true, status: true },
    });

    // Always perform bcrypt.compare to avoid timing attacks
    if (!user) {
      // Compare with dummy hash to normalize timing
      await bcrypt.compare(password, DUMMY_HASH);
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    // Check status explicitly
    if (user.status === "suspended") {
      return NextResponse.json({ error: "account_suspended" }, { status: 403 });
    }
    if (user.status === "deleted") {
      // hide existence
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    // Rate limiting: check existing OTP and lastSentAt
    const existingOtp = await prisma.otpRequest.findUnique({
      where: { userId: user.id },
      select: { lastSentAt: true, expiresAt: true, attempts: true },
    });

    if (existingOtp) {
      const now = new Date();
      const lastSentAt = existingOtp.lastSentAt;
      const diffSeconds = Math.floor((now.getTime() - new Date(lastSentAt).getTime()) / 1000);
      if (diffSeconds < BACKEND_COOLDOWN_SECONDS) {
        return NextResponse.json(
          { error: "too_many_requests", retryAfter: BACKEND_COOLDOWN_SECONDS - diffSeconds },
          { status: 429 }
        );
      }
    }

    // Generate OTP numeric 6-digit between 100000 and 999999
    const otpNum = crypto.randomInt(OTP_MIN, OTP_MAX_EXCLUSIVE); // [100000, 999999]
    const otpString = String(otpNum);

    // Hash OTP with bcrypt (do NOT log the OTP)
    const otpHash = await bcrypt.hash(otpString, BCRYPT_ROUNDS);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRES_MINUTES * 60 * 1000);

    // Delete any old OTP for the user (prevent duplicates) and create new one in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.otpRequest.deleteMany({ where: { userId: user.id } });

      await tx.otpRequest.create({
        data: {
          userId: user.id,
          otpHash,
          expiresAt,
          attempts: 0,
          lastSentAt: now,
        },
      });
    });

    // Prepare email content (simple transactional HTML)
    const subject = "Your HospitalManage OTP";
    const html = /* html */ `
      <div style="font-family: system-ui, -apple-system, Roboto, 'Segoe UI', 'Helvetica Neue', Arial; line-height:1.4; color:#111;">
        <h2 style="margin:0 0 8px 0">Your one-time code</h2>
        <p style="margin:0 0 12px 0">Use the code below to complete your login. This code will expire in ${OTP_EXPIRES_MINUTES} minutes.</p>
        <div style="padding:12px 18px; display:inline-block; background:#f7f7f8; border-radius:6px; font-weight:700; font-size:20px; letter-spacing:4px;">
          ${otpString}
        </div>
        <p style="margin-top:16px;color:#666;font-size:13px">If you did not request this, please ignore this email.</p>
      </div>
    `;

    // Send email via MSG91
    const sendResult = await sendEmailViaMsg91(normalizedEmail, subject, html);

    if (!sendResult.ok) {
      // Sending failed — remove OTP row (so user isn't left with a dangling OTP)
      try {
        await prisma.otpRequest.deleteMany({ where: { userId: user.id } });
      } catch (e) {
        // best-effort: if deletion fails, continue
        console.error("Failed to delete OTP after send failure:", e);
      }

      // Log the failure in AuthLog
      const userAgent = sanitizeForLog(req.headers.get("user-agent"), 500);
      const ipAddress = extractIpAddress(req.headers);
      const parser = new UAParser(userAgent || "");
      const uaResult = parser.getResult();
      const browser = uaResult.browser.name ? sanitizeForLog(`${uaResult.browser.name}${uaResult.browser.version ? " " + uaResult.browser.version : ""}`, 100) : undefined;
      const os = uaResult.os.name ? sanitizeForLog(`${uaResult.os.name}${uaResult.os.version ? " " + uaResult.os.version : ""}`, 100) : undefined;
      const deviceType = uaResult.device.type || "desktop";

      try {
        await prisma.authLog.create({
          data: {
            userId: user.id,
            action: "OTP_SEND_FAILED_EMAIL",
            ipAddress,
            userAgent,
            browser,
            os,
            deviceType,
            details: { reason: sendResult.text || "unknown" },
          },
        });
      } catch (e) {
        console.error("Failed to create authLog for OTP_SEND_FAILED_EMAIL:", e);
      }

      return NextResponse.json({ error: "otp_failed", message: "Failed to send OTP via email" }, { status: 502 });
    }

    // Log OTP request success
    {
      const userAgent = sanitizeForLog(req.headers.get("user-agent"), 500);
      const ipAddress = extractIpAddress(req.headers);
      const parser = new UAParser(userAgent || "");
      const uaResult = parser.getResult();
      const browser = uaResult.browser.name ? sanitizeForLog(`${uaResult.browser.name}${uaResult.browser.version ? " " + uaResult.browser.version : ""}`, 100) : undefined;
      const os = uaResult.os.name ? sanitizeForLog(`${uaResult.os.name}${uaResult.os.version ? " " + uaResult.os.version : ""}`, 100) : undefined;
      const deviceType = uaResult.device.type || "desktop";

      try {
        await prisma.authLog.create({
          data: {
            userId: user.id,
            action: "OTP_REQUESTED_EMAIL",
            ipAddress,
            userAgent,
            browser,
            os,
            deviceType,
            details: { method: "email", expiresAt: expiresAt.toISOString() },
          },
        });
      } catch (e) {
        console.error("Failed to create authLog for OTP_REQUESTED_EMAIL:", e);
      }
    }

    return NextResponse.json({ success: true, message: "otp_sent" });
  } catch (err) {
    console.error("Email OTP request error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

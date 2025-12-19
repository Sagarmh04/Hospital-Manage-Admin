import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  emailSchema,
  sanitizeIpAddress,
  sanitizeUserAgent,
  extractIpAddress,
} from "@/lib/validation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createOtpRequest, generateOTP, canRequestOTP } from "@/lib/otp-management";
import { logAuthEvent } from "@/lib/session-management";
import { z } from "zod";

const emailRequestSchema = z.object({
  email: z.string().email().min(3).max(254),
  password: z.string().min(1).max(128),
});

// Dummy hash for timing attack prevention
const DUMMY_HASH = "$2a$10$X5nZPJlcqNyZc4vZLHHkA.J8EWvLx3fBK7qGrq6KwP5X2HZLqY5HS";

/**
 * Send transactional email via MSG91 Email API v5 using template.
 * Uses these env variables:
 *  - MSG91_AUTH_KEY
 *  - MSG91_EMAIL_TEMPLATE_ID
 */
async function sendEmailViaMsg91(
  toEmail: string,
  templateVariables: {
    hospital_name: string;
    user_name: string;
    otp: string;
  }
) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_EMAIL_TEMPLATE_ID;

  if (!authKey) {
    return { ok: false, status: 500, text: "Missing MSG91_AUTH_KEY" };
  }
  if (!templateId) {
    return { ok: false, status: 500, text: "Missing MSG91_EMAIL_TEMPLATE_ID" };
  }

  try {
    const res = await fetch("https://api.msg91.com/api/v5/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key ${authKey}`,
      },
      body: JSON.stringify({
        to: [{ email: toEmail }],
        template_id: templateId,
        variables: templateVariables,
      }),
    });

    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, text };
  } catch (err) {
    return {
      ok: false,
      status: 502,
      text: err instanceof Error ? err.message : "Network error",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Extract and sanitize request metadata
    const ipAddress = sanitizeIpAddress(extractIpAddress(request.headers));
    const userAgent = sanitizeUserAgent(
      request.headers.get("user-agent") || undefined
    );

    // Parse and validate request body
    const body = await request.json();
    const parse = emailRequestSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const { email, password } = parse.data;
    const validatedEmail = emailSchema.parse(email);

    // Rate limiting by IP address
    if (ipAddress) {
      const rateLimitResult = checkRateLimit(
        `otp-request:${ipAddress}`,
        RATE_LIMITS.OTP_REQUEST
      );

      if (!rateLimitResult.allowed) {
        const waitMinutes = Math.ceil(
          (rateLimitResult.resetAt - Date.now()) / 60000
        );
        return NextResponse.json(
          {
            error: `Too many OTP requests. Please try again in ${waitMinutes} minutes.`,
          },
          { status: 429 }
        );
      }
    }

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedEmail))
      .limit(1);

    // Always perform bcrypt.compare to prevent timing attacks
    if (!user) {
      // Compare with dummy hash to normalize timing
      await bcrypt.compare(password, DUMMY_HASH);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if user status is active
    if (user.status !== "active") {
      await bcrypt.compare(password, DUMMY_HASH);
      return NextResponse.json(
        { error: "Account is not active" },
        { status: 403 }
      );
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Rate limit by user ID
    const userRateLimit = checkRateLimit(
      `otp-request-user:${user.id}`,
      RATE_LIMITS.OTP_REQUEST
    );

    if (!userRateLimit.allowed) {
      const waitMinutes = Math.ceil(
        (userRateLimit.resetAt - Date.now()) / 60000
      );
      return NextResponse.json(
        {
          error: `Too many OTP requests. Please try again in ${waitMinutes} minutes.`,
        },
        { status: 429 }
      );
    }

    // Check cooldown for this user
    const canRequest = await canRequestOTP({
      userId: user.id,
      cooldownSeconds: 60,
    });
    if (!canRequest.allowed) {
      return NextResponse.json(
        {
          error: `Please wait ${canRequest.waitSeconds} seconds before requesting another OTP.`,
        },
        { status: 429 }
      );
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP in database
    await createOtpRequest({
      userId: user.id,
      otp,
      expiryMinutes: 10,
    });

    // Log auth event
    await logAuthEvent({
      userId: user.id,
      action: "otp_requested_email",
      ipAddress,
      userAgent,
      details: { method: "email", email: validatedEmail },
    });

    // Send OTP via email using MSG91 template
    const emailResult = await sendEmailViaMsg91(
      validatedEmail,
      {
        hospital_name: "Test_Hospital",
        user_name: user.name,
        otp: otp,
      }
    );

    if (!emailResult.ok) {
      console.error("[Email Send Error]", emailResult.text);
      // Don't fail the request, OTP is already saved
    }

    return NextResponse.json(
      {
        message: "OTP sent to your email address. Please check your inbox.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[OTP Request Email Error]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process OTP request. Please try again." },
      { status: 500 }
    );
  }
}

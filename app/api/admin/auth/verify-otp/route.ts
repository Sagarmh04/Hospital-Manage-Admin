import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { users } from "@/drizzle/schema";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  validateEmailOrPhone,
  sessionDurationSchema,
  sanitizeIpAddress,
  sanitizeUserAgent,
  extractIpAddress,
  otpSchema,
} from "@/lib/validation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { verifyUserOTP } from "@/lib/otp-management";
import { createSession, logAuthEvent } from "@/lib/session-management";
import { z } from "zod";

const verifyOtpSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1).max(128),
  otp: z.string().length(6),
  sessionDuration: sessionDurationSchema.optional().default("8h"),
});

// Dummy hash for timing attack prevention
const DUMMY_HASH = "$2a$10$X5nZPJlcqNyZc4vZLHHkA.J8EWvLx3fBK7qGrq6KwP5X2HZLqY5HS";

export async function POST(request: NextRequest) {
  try {
    // Extract and sanitize request metadata
    const ipAddress = sanitizeIpAddress(extractIpAddress(request.headers));
    const userAgent = sanitizeUserAgent(
      request.headers.get("user-agent") || undefined
    );

    // Parse and validate request body
    const body = await request.json();
    const parse = verifyOtpSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const { identifier, password, otp, sessionDuration } = parse.data;

    // Validate OTP format
    const validatedOtp = otpSchema.parse(otp);

    // Detect if identifier is email or phone
    let identifierInfo;
    try {
      identifierInfo = validateEmailOrPhone(identifier);
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid email or phone number" },
        { status: 400 }
      );
    }

    // Rate limiting by IP address
    if (ipAddress) {
      const rateLimitResult = checkRateLimit(
        `otp-verify:${ipAddress}`,
        RATE_LIMITS.OTP_VERIFY
      );

      if (!rateLimitResult.allowed) {
        const waitMinutes = Math.ceil(
          (rateLimitResult.resetAt - Date.now()) / 60000
        );
        return NextResponse.json(
          {
            error: `Too many verification attempts. Please try again in ${waitMinutes} minutes.`,
          },
          { status: 429 }
        );
      }
    }

    // Find user by email or phone
    const [user] = await db
      .select()
      .from(users)
      .where(
        identifierInfo.type === "email"
          ? eq(users.email, identifierInfo.value)
          : eq(users.phone, identifierInfo.value)
      )
      .limit(1);

    // Always perform bcrypt.compare to prevent timing attacks
    if (!user) {
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

    // Re-verify password before checking OTP
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify OTP
    const otpResult = await verifyUserOTP({
      userId: user.id,
      otp: validatedOtp,
      maxAttempts: 5,
    });

    if (!otpResult.success) {
      // Log failed attempt
      await logAuthEvent({
        userId: user.id,
        action: "otp_verify_failed",
        ipAddress,
        userAgent,
        details: {
          method: identifierInfo.type,
          identifier: identifierInfo.value,
          error: otpResult.error,
        },
      });

      return NextResponse.json(
        { error: otpResult.error },
        { status: 401 }
      );
    }

    // OTP verified successfully - create session
    const session = await createSession({
      userId: user.id,
      sessionDuration,
      ipAddress,
      userAgent,
    });

    // Log successful login
    await logAuthEvent({
      userId: user.id,
      sessionId: session.id,
      action: "login_success",
      ipAddress,
      userAgent,
      details: {
        method: identifierInfo.type,
        identifier: identifierInfo.value,
        sessionDuration,
      },
    });

    // Set session cookie
    const response = NextResponse.json(
      {
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        session: {
          id: session.id,
          expiresAt: session.expiresAt.toISOString(),
        },
      },
      { status: 200 }
    );

    // Set HTTP-only cookie with session ID
    response.cookies.set("session_id", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: session.expiresAt,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[OTP Verify Error]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to verify OTP. Please try again." },
      { status: 500 }
    );
  }
}

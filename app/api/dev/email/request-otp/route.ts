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
import { createOtpRequest } from "@/lib/otp-management";
import { logAuthEvent } from "@/lib/session-management";
import { z } from "zod";

const DEV_OTP = "123456"; // Hardcoded OTP for dev environment

const emailRequestSchema = z.object({
  email: z.string().email().min(3).max(254),
  password: z.string().min(1).max(128),
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
    const parse = emailRequestSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const { email, password } = parse.data;
    const validatedEmail = emailSchema.parse(email);

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedEmail))
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

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Store hardcoded OTP in database
    await createOtpRequest({
      userId: user.id,
      otp: DEV_OTP,
      expiryMinutes: 10,
    });

    // Log auth event
    await logAuthEvent({
      userId: user.id,
      action: "dev_otp_requested_email",
      ipAddress,
      userAgent,
      details: { method: "email", email: validatedEmail },
    });

    // In dev mode, return OTP in response (NEVER do this in production!)
    console.log(`[DEV] OTP for ${validatedEmail}: ${DEV_OTP}`);

    return NextResponse.json(
      {
        message: "OTP sent to your email address.",
        dev_otp: DEV_OTP, // Remove this line in production
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Dev OTP Request Email Error]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: error.issues[0]?.message || "Invalid input",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    // Return detailed error message for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    return NextResponse.json(
      { 
        error: "Failed to process OTP request. Please try again.",
        debug: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

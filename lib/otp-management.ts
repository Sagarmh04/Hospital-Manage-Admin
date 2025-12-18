import { db } from "./drizzle";
import { users, otpRequests } from "../drizzle/schema";
import { eq, and, gt, lt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash OTP for storage
 */
export async function hashOTP(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

/**
 * Verify OTP against hash
 */
export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

/**
 * Create or update OTP request for a user
 */
export async function createOtpRequest(params: {
  userId: string;
  otp: string;
  expiryMinutes?: number;
}) {
  const { userId, otp, expiryMinutes = 10 } = params;
  const otpHash = await hashOTP(otp);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  const now = new Date();

  // Check if OTP request already exists
  const [existing] = await db
    .select()
    .from(otpRequests)
    .where(eq(otpRequests.userId, userId))
    .limit(1);

  if (existing) {
    // Update existing OTP request
    const [updated] = await db
      .update(otpRequests)
      .set({
        otpHash,
        expiresAt,
        attempts: 0,
        lastSentAt: now,
      })
      .where(eq(otpRequests.userId, userId))
      .returning();

    return updated;
  } else {
    // Create new OTP request
    const [created] = await db
      .insert(otpRequests)
      .values({
        id: randomUUID(),
        userId,
        otpHash,
        expiresAt,
        attempts: 0,
        lastSentAt: now,
      })
      .returning();

    return created;
  }
}

/**
 * Verify OTP for a user
 */
export async function verifyUserOTP(params: {
  userId: string;
  otp: string;
  maxAttempts?: number;
}): Promise<{ success: boolean; error?: string }> {
  const { userId, otp, maxAttempts = 5 } = params;

  // Get OTP request
  const [otpRequest] = await db
    .select()
    .from(otpRequests)
    .where(
      and(
        eq(otpRequests.userId, userId),
        gt(otpRequests.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!otpRequest) {
    return {
      success: false,
      error: "OTP expired or not found. Please request a new OTP.",
    };
  }

  // Check attempts
  if (otpRequest.attempts >= maxAttempts) {
    return {
      success: false,
      error: "Too many failed attempts. Please request a new OTP.",
    };
  }

  // Verify OTP
  const isValid = await verifyOTP(otp, otpRequest.otpHash);

  if (!isValid) {
    // Increment attempts
    await db
      .update(otpRequests)
      .set({ attempts: otpRequest.attempts + 1 })
      .where(eq(otpRequests.id, otpRequest.id));

    return {
      success: false,
      error: `Invalid OTP. ${maxAttempts - otpRequest.attempts - 1} attempts remaining.`,
    };
  }

  // OTP is valid - delete the request
  await db.delete(otpRequests).where(eq(otpRequests.id, otpRequest.id));

  return { success: true };
}

/**
 * Delete OTP request for a user
 */
export async function deleteOtpRequest(userId: string) {
  await db.delete(otpRequests).where(eq(otpRequests.userId, userId));
}

/**
 * Check if user can request new OTP (rate limiting via lastSentAt)
 */
export async function canRequestOTP(params: {
  userId: string;
  cooldownSeconds?: number;
}): Promise<{ allowed: boolean; waitSeconds?: number }> {
  const { userId, cooldownSeconds = 60 } = params;

  const [otpRequest] = await db
    .select()
    .from(otpRequests)
    .where(eq(otpRequests.userId, userId))
    .limit(1);

  if (!otpRequest) {
    return { allowed: true };
  }

  const now = Date.now();
  const lastSent = otpRequest.lastSentAt.getTime();
  const elapsed = (now - lastSent) / 1000; // seconds

  if (elapsed < cooldownSeconds) {
    return {
      allowed: false,
      waitSeconds: Math.ceil(cooldownSeconds - elapsed),
    };
  }

  return { allowed: true };
}

/**
 * Clean up expired OTP requests (call this periodically via cron)
 */
export async function cleanupExpiredOtpRequests() {
  const now = new Date();

  const expired = await db
    .delete(otpRequests)
    .where(lt(otpRequests.expiresAt, now))
    .returning();

  return expired.length;
}

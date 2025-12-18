/**
 * Validation utilities for authentication and session management
 */

import { z } from "zod";

// Strict UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// CUID validation regex (for user IDs)
const CUID_REGEX = /^c[^\s-]{24,}$/i;

/**
 * Validates if a string is a valid UUID v4
 */
export function isValidUUID(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return UUID_REGEX.test(value);
}

/**
 * Validates if a string is a valid CUID
 */
export function isValidCUID(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return CUID_REGEX.test(value);
}

/**
 * Validates if a string is a valid email
 */
export function isValidEmail(email: string | undefined | null): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Email validation with sanitization
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email format")
  .max(255, "Email is too long");

// Phone validation - supports international formats
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
  .min(10, "Phone number is too short")
  .max(15, "Phone number is too long");

// Password validation
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

// OTP validation
export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "OTP must be exactly 6 digits");

// Session duration validation
export const sessionDurationSchema = z.enum(["1h", "8h", "24h", "7d"], {
  message: "Invalid session duration",
});

// Name validation
export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(255, "Name is too long")
  .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters");

// Email or Phone validation - detect which one it is
export function validateEmailOrPhone(input: string): {
  type: "email" | "phone";
  value: string;
} {
  const trimmed = input.trim();
  
  // Check if it looks like a phone number (starts with + or digits)
  if (/^[\+\d]/.test(trimmed)) {
    const validated = phoneSchema.parse(trimmed);
    return { type: "phone", value: validated };
  }
  
  // Otherwise, treat as email
  const validated = emailSchema.parse(trimmed);
  return { type: "email", value: validated };
}

// Sanitize string input - remove potentially dangerous characters
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove < and > to prevent XSS
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); // Remove control characters
}

// Sanitize user agent
export function sanitizeUserAgent(userAgent: string | undefined): string | null {
  if (!userAgent) return null;
  return sanitizeString(userAgent).slice(0, 500); // Limit length
}

// Sanitize IP address
export function sanitizeIpAddress(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const sanitized = ip.trim();
  // Basic IPv4 and IPv6 validation
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(sanitized) || /^[\da-fA-F:]+$/.test(sanitized)) {
    return sanitized.slice(0, 45); // Max length for IPv6
  }
  return null;
}

// Login request validation schema
export const loginRequestSchema = z.object({
  identifier: z.string().trim().min(1, "Email or phone is required"),
  sessionDuration: sessionDurationSchema.optional().default("8h"),
});

// Verify OTP request validation schema
export const verifyOtpRequestSchema = z.object({
  identifier: z.string().trim().min(1, "Email or phone is required"),
  otp: otpSchema,
  sessionDuration: sessionDurationSchema.optional().default("8h"),
});

// Type exports
export type SessionDuration = z.infer<typeof sessionDurationSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type VerifyOtpRequest = z.infer<typeof verifyOtpRequestSchema>;

/**
 * Sanitizes a string for safe logging
 * Removes excessive whitespace and limits length
 */
export function sanitizeForLog(value: string | null | undefined, maxLength: number = 500): string | undefined {
  if (!value || typeof value !== 'string') {
    return undefined;
  }
  return value.trim().substring(0, maxLength);
}

/**
 * Safely extracts IP address from headers
 */
export function extractIpAddress(headers: Headers): string | null {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0]?.trim();
    if (typeof ip !== "string") return null;
    if (ip.length > 45) return null; // IPv6 max length guard
    return ip || null;
  }

  const realIpRaw = headers.get("x-real-ip");
  const realIp = realIpRaw?.trim();
  if (typeof realIp !== "string") return null;
  if (realIp.length > 45) return null;
  return realIp || null;
}

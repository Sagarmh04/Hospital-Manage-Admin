/**
 * Validation utilities for authentication and session management
 */

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

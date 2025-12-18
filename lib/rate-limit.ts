/**
 * In-memory rate limiting for OTP requests
 * For production, consider using Redis or a distributed cache
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request is rate limited
 * @param key - Unique identifier for the rate limit (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No existing entry or expired entry
  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetAt,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxAttempts - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Reset rate limit for a key
 * @param key - Unique identifier for the rate limit
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Get current rate limit status without incrementing
 * @param key - Unique identifier for the rate limit
 * @param config - Rate limit configuration
 * @returns Current rate limit status
 */
export function getRateLimitStatus(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: now + config.windowMs,
    };
  }

  return {
    allowed: entry.count < config.maxAttempts,
    remaining: Math.max(0, config.maxAttempts - entry.count),
    resetAt: entry.resetAt,
  };
}

// Predefined rate limit configs
export const RATE_LIMITS = {
  OTP_REQUEST: {
    maxAttempts: 5, // 5 OTP requests
    windowMs: 15 * 60 * 1000, // per 15 minutes
  },
  OTP_VERIFY: {
    maxAttempts: 10, // 10 OTP verification attempts
    windowMs: 15 * 60 * 1000, // per 15 minutes
  },
  LOGIN: {
    maxAttempts: 10, // 10 login attempts
    windowMs: 15 * 60 * 1000, // per 15 minutes
  },
} as const;

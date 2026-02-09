/**
 * Simple in-memory rate limiter
 * For production, use Redis or Upstash
 */

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 10 * 60 * 1000)

export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): { success: boolean; limit: number; remaining: number; resetAt: number } {
  const now = Date.now()
  const resetAt = now + config.windowMs

  const record = rateLimitStore.get(identifier)

  // No record or expired
  if (!record || record.resetAt < now) {
    rateLimitStore.set(identifier, { count: 1, resetAt })
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetAt,
    }
  }

  // Increment count
  record.count++
  rateLimitStore.set(identifier, record)

  // Check if exceeded
  if (record.count > config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetAt: record.resetAt,
    }
  }

  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - record.count,
    resetAt: record.resetAt,
  }
}

// Pre-configured rate limiters
export const SMS_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10, // 10 SMS requests per minute
  windowMs: 60 * 1000, // 1 minute
}

export const PAYMENT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5, // 5 payment links per minute
  windowMs: 60 * 1000, // 1 minute
}

export const ADMIN_ASSIGN_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 3, // 3 admin assignments per minute
  windowMs: 60 * 1000, // 1 minute
}

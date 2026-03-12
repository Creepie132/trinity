import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Проверка наличия env переменных
const hasUpstashConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// Создаём Redis client только если есть конфиг
let redis: Redis | null = null
if (hasUpstashConfig) {
  try {
    redis = Redis.fromEnv()
  } catch (e) {
    console.warn('[RateLimit] Failed to initialize Redis:', e)
  }
}

// Mock limiter для случаев без Redis (всегда разрешает)
const mockLimiter = {
  limit: async () => ({ success: true })
} as any

// Общий лимит: 30 запросов в минуту
export const ratelimitGeneral = redis 
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "60 s"),
      prefix: "rl:general",
    })
  : mockLimiter

// Строгий лимит для SMS/email: 5 в минуту
export const ratelimitStrict = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      prefix: "rl:strict",
    })
  : mockLimiter

// Лимит для публичных форм: 3 в минуту
export const ratelimitPublic = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "60 s"),
      prefix: "rl:public",
    })
  : mockLimiter

// Хелпер для получения IP
export function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous"
}

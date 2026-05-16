/**
 * app/api/webhooks/vercel-logs/route.ts
 * Vercel Log Drain webhook — глобальный перехват всех ошибок продакшена.
 *
 * АРХИТЕКТУРА (3 уровня защиты):
 * 1. Auth     — HMAC-SHA1 x-vercel-signature (немедленный 401 без логирования)
 * 2. Filter   — только runtime/логические ошибки кода (не сеть/таймауты)
 * 3. Dedup    — SHA-256 хэш (route + message) → окно 10 мин → один фикс на баг
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, createHash } from 'crypto'
import { upsertSystemError } from '@/lib/self-healing/db'
import { runHealingPipeline } from '@/lib/self-healing/pipeline'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import type { ErrorSeverity } from '@/lib/self-healing/types'

// ── Константы ─────────────────────────────────────────────────────────────────

/** Окно дедупликации: не запускать второй фикс если < 10 мин с первой записи */
const DEDUP_WINDOW_MS = 10 * 60 * 1000

/**
 * Классы ошибок которые имеет смысл чинить автоматически.
 * Только логические/рантайм ошибки в НАШЕМ коде.
 */
const HEALABLE_ERROR_PATTERNS: RegExp[] = [
  /TypeError/i,
  /ReferenceError/i,
  /SyntaxError/i,
  /RangeError/i,
  /Cannot read propert/i,
  /is not a function/i,
  /is not defined/i,
  /Cannot destructure/i,
  /Unexpected token/i,
  /Cannot set propert/i,
  /undefined is not/i,
  /null is not/i,
]

/**
 * Паттерны инфраструктурного/сетевого шума — игнорируем.
 * Это не баги в коде Trinity — это внешние проблемы.
 */
const NOISE_PATTERNS: RegExp[] = [
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /socket hang up/i,
  /connect TIMEOUT/i,
  /gateway timeout/i,
  /upstream connect error/i,
  /ECONNRESET/i,
  /network error/i,
  /fetch failed/i,
  /CERT_/i,
  /SSL_/i,
]

// ── Типы Vercel Log Drain ─────────────────────────────────────────────────────

interface VercelLogEntry {
  id?: string
  message: string
  timestamp?: number
  source?: string          // 'build' | 'lambda' | 'static' | 'edge' | 'external'
  level?: string           // 'error' | 'warning' | 'info'
  projectId?: string
  deploymentId?: string
  path?: string            // URL path — /api/payments
  host?: string
  statusCode?: number
  proxy?: { path?: string; statusCode?: number }
}

// ── Auth: HMAC-SHA1 ──────────────────────────────────────────────────────────

/**
 * Vercel подписывает тело запроса HMAC-SHA1 с секретом Log Drain.
 * Если подпись не совпадает — 401 без console.log (минимум утечки).
 */
function verifyVercelSignature(body: string, signature: string | null): boolean {
  const secret = process.env.VERCEL_LOG_DRAIN_SECRET
  if (!secret || !signature) return false
  const expected = createHmac('sha1', secret).update(body).digest('hex')
  return timingSafeEqual(expected, signature)
}

/** Константное время сравнения — защита от timing attack */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

// ── Noise Reduction ───────────────────────────────────────────────────────────

function isHealableError(message: string): boolean {
  if (NOISE_PATTERNS.some(p => p.test(message))) return false
  return HEALABLE_ERROR_PATTERNS.some(p => p.test(message))
}

function classifySeverity(message: string, route: string): ErrorSeverity {
  const msg = message.toLowerCase()
  if (msg.includes('payment') || msg.includes('tranzila') || msg.includes('billing')) return 'critical'
  if (msg.includes('auth') || msg.includes('token') || msg.includes('unauthorized')) return 'high'
  if (msg.includes('database') || msg.includes('supabase')) return 'high'
  if (route.startsWith('/api/payments') || route.startsWith('/api/auth')) return 'critical'
  return 'medium'
}

// ── Дедупликация ──────────────────────────────────────────────────────────────

/** SHA-256 из route + первые 200 символов message */
function buildErrorHash(route: string, message: string): string {
  return createHash('sha256')
    .update(`${route}::${message.slice(0, 200)}`)
    .digest('hex')
}

/** Есть ли уже незалеченная ошибка с таким хэшем за последние 10 мин? */
async function isDuplicate(hash: string): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString()
  const svc = createSupabaseServiceClient()
  const { data } = await svc
    .from('system_errors')
    .select('id')
    .eq('dedup_hash', hash)
    .eq('healed', false)
    .gte('created_at', since)
    .limit(1)
    .maybeSingle()
  return !!data
}

// ── Парсинг Vercel-лога ───────────────────────────────────────────────────────

function parseLogEntry(entry: VercelLogEntry): {
  route: string
  errorMessage: string
  errorStack: string | null
} | null {
  const raw = entry.message ?? ''
  if (entry.level && entry.level !== 'error') return null
  if (!raw.trim()) return null

  let route = entry.path ?? entry.proxy?.path ?? ''
  route = route.split('?')[0]

  if (!route) {
    const pathMatch = raw.match(/(?:GET|POST|PUT|DELETE|PATCH)\s+(\/[^\s]+)/)
    route = pathMatch?.[1]?.split('?')[0] ?? '/unknown'
  }

  const lines = raw.split('\n').filter((l: string) => l.trim())
  const errorMessage = lines[0]?.slice(0, 500) ?? raw.slice(0, 500)
  const errorStack = lines.length > 1 ? lines.join('\n').slice(0, 3000) : null

  return { route, errorMessage, errorStack }
}

// ── Обработчик ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ШАГ 1: Auth — первым делом, без исключений
  const rawBody = await req.text()
  const signature = req.headers.get('x-vercel-signature')

  if (!verifyVercelSignature(rawBody, signature)) {
    // Намеренно: нет console.log, нет тела — минимум информации атакующему
    return new NextResponse(null, { status: 401 })
  }

  // ШАГ 2: Парсинг
  let entries: VercelLogEntry[] = []
  try {
    const parsed = JSON.parse(rawBody)
    entries = Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ШАГ 3: fire-and-forget (не блокируем ответ Vercel — у них таймаут 5 сек)
  processEntries(entries).catch(e =>
    console.error('[vercel-logs] processEntries error:', e)
  )

  return NextResponse.json({ ok: true })
}

async function processEntries(entries: VercelLogEntry[]): Promise<void> {
  for (const entry of entries) {
    try {
      await processEntry(entry)
    } catch (e) {
      console.error('[vercel-logs] processEntry error:', e)
    }
  }
}

async function processEntry(entry: VercelLogEntry): Promise<void> {
  // Только lambda/edge (не static, не build)
  if (entry.source && !['lambda', 'edge'].includes(entry.source)) return

  // Только HTTP 500+
  const statusCode = entry.statusCode ?? entry.proxy?.statusCode
  if (statusCode && statusCode < 500) return

  const parsed = parseLogEntry(entry)
  if (!parsed) return

  const { route, errorMessage, errorStack } = parsed

  // Noise Reduction
  if (!isHealableError(errorMessage)) {
    console.log(`[vercel-logs] noise: ${errorMessage.slice(0, 60)}`)
    return
  }

  // Дедупликация
  const hash = buildErrorHash(route, errorMessage)
  if (await isDuplicate(hash)) {
    console.log(`[vercel-logs] dedup ${hash.slice(0, 8)} on ${route}`)
    return
  }

  console.log(`[vercel-logs] healable: ${route} — ${errorMessage.slice(0, 80)}`)

  // Запись в system_errors
  const systemError = await upsertSystemError({
    org_id: null,
    user_id: null,
    route,
    method: 'UNKNOWN',
    error_message: errorMessage,
    error_stack: errorStack,
    request_body: null,
    severity: classifySeverity(errorMessage, route),
    dedup_hash: hash,
  }).catch(e => {
    console.error('[vercel-logs] upsert failed:', e)
    return null
  })

  if (!systemError) return

  // Healing Pipeline (fire-and-forget)
  runHealingPipeline(systemError).catch(e =>
    console.error('[vercel-logs] pipeline error:', e)
  )
}

// ── Vercel endpoint verification (GET) ───────────────────────────────────────
// Vercel проверяет endpoint перед регистрацией Log Drain.
// Шлёт GET и ожидает заголовок x-vercel-verify со значением из ошибки регистрации.
export async function GET(): Promise<NextResponse> {
  const verifyToken = process.env.VERCEL_LOG_DRAIN_VERIFY ?? ''
  return new NextResponse(null, {
    status: 200,
    headers: { 'x-vercel-verify': verifyToken },
  })
}

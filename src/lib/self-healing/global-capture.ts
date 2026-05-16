/**
 * lib/self-healing/global-capture.ts
 * Вспомогательный модуль для instrumentation.ts.
 * Захватывает глобальные Node.js ошибки и направляет в self-healing.
 */
import { upsertSystemError } from './db'
import { runHealingPipeline } from './pipeline'
import { createHash } from 'crypto'
import type { ErrorSeverity } from './types'

const DEDUP_WINDOW_MS = 10 * 60 * 1000
const recentHashes = new Map<string, number>() // hash → timestamp

/** In-memory дедупликация для global errors (до обращения к БД) */
function isRecentDuplicate(hash: string): boolean {
  const last = recentHashes.get(hash)
  if (!last) return false
  if (Date.now() - last < DEDUP_WINDOW_MS) return true
  recentHashes.delete(hash)
  return false
}

function buildHash(route: string, message: string): string {
  return createHash('sha256')
    .update(`${route}::${message.slice(0, 200)}`)
    .digest('hex')
}

function classifySeverity(err: Error): ErrorSeverity {
  const msg = err.message.toLowerCase()
  if (msg.includes('payment') || msg.includes('tranzila')) return 'critical'
  if (msg.includes('auth') || msg.includes('database')) return 'high'
  return 'medium'
}

/**
 * Захватить глобальную ошибку и запустить healing pipeline.
 * source: 'unhandledRejection' | 'uncaughtException'
 */
export async function captureGlobalError(
  err: Error,
  source: string
): Promise<void> {
  // Фильтруем плановые Next.js прерывания
  if (
    err.message === 'NEXT_NOT_FOUND' ||
    err.message === 'NEXT_REDIRECT' ||
    err.message.includes('This error was intentionally')
  ) return

  const route = `/__global/${source}`
  const hash = buildHash(route, err.message)

  // In-memory дедупликация (быстрая проверка до обращения к БД)
  if (isRecentDuplicate(hash)) return
  recentHashes.set(hash, Date.now())

  const systemError = await upsertSystemError({
    org_id: null,
    user_id: null,
    route,
    method: 'RUNTIME',
    error_message: err.message.slice(0, 500),
    error_stack: err.stack?.slice(0, 3000) ?? null,
    request_body: null,
    severity: classifySeverity(err),
    dedup_hash: hash,
  }).catch(() => null)

  if (!systemError) return

  runHealingPipeline(systemError).catch(() => {})
}

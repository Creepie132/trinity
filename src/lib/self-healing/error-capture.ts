/**
 * lib/self-healing/error-capture.ts
 * withErrorCapture — обёртка для API роутов.
 * Перехватывает необработанные исключения, записывает в system_errors,
 * и запускает пайплайн self-healing (fire-and-forget).
 *
 * Использование:
 *   export const GET = withErrorCapture(async (req) => { ... }, '/api/clients')
 *   export const POST = withErrorCapture(async (req) => { ... }, '/api/clients')
 */
import { NextRequest, NextResponse } from 'next/server'
import type { ErrorSeverity } from './types'
import { upsertSystemError } from './db'
import { runHealingPipeline } from './pipeline'

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse | Response>

/**
 * Определяем severity по типу ошибки
 */
function classifySeverity(error: Error): ErrorSeverity {
  const msg = error.message.toLowerCase()
  if (msg.includes('payment') || msg.includes('transaction') || msg.includes('tranzila')) {
    return 'critical'
  }
  if (msg.includes('database') || msg.includes('supabase') || msg.includes('timeout')) {
    return 'high'
  }
  if (msg.includes('not found') || msg.includes('unauthorized')) {
    return 'medium'
  }
  return 'low'
}

/**
 * Безопасно извлечь тело запроса (не ломаться если уже прочитано или не JSON)
 */
async function safeReadBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const clone = req.clone()
    const text = await clone.text()
    if (!text) return null
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function withErrorCapture(
  handler: RouteHandler,
  routeOverride?: string
): RouteHandler {
  return async (req: NextRequest, ctx?: unknown): Promise<NextResponse | Response> => {
    try {
      return await handler(req, ctx)
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error))

      // Не логируем намеренные "плановые" ошибки (401, 403 бросаются как NextResponse)
      if (err.message === 'NEXT_NOT_FOUND' || err.message === 'NEXT_REDIRECT') {
        throw error
      }

      const route = routeOverride ?? new URL(req.url).pathname
      const body = await safeReadBody(req)

      console.error(`[self-healing] Uncaught error on ${route}:`, err)

      // Запись в БД (и проверка лимита попыток)
      const systemError = await upsertSystemError({
        org_id: null, // org_id будет null если не можем извлечь (auth ещё не прошёл)
        user_id: null,
        route,
        method: req.method,
        error_message: err.message,
        error_stack: err.stack ?? null,
        request_body: body,
        severity: classifySeverity(err),
      }).catch(dbErr => {
        console.error('[self-healing] Failed to write system_errors:', dbErr)
        return null
      })

      // Запускаем пайплайн — fire-and-forget (не блокируем ответ пользователю)
      if (systemError) {
        runHealingPipeline(systemError).catch(pipeErr => {
          console.error('[self-healing] Pipeline failed:', pipeErr)
        })
      }

      // Возвращаем пользователю чистый 500 (стек не утекает)
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'An unexpected error occurred. Our team has been notified.',
          errorId: systemError?.id,
        },
        { status: 500 }
      )
    }
  }
}

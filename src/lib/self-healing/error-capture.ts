/**
 * lib/self-healing/error-capture.ts
 * withErrorCapture — обёртка для API роутов.
 *
 * ПОРЯДОК ВЫПОЛНЕНИЯ при каждой новой ошибке:
 *
 * 1. [DEAD MAN'S SWITCH] — проверяем БД: был ли мерж в этот роут < 15 мин назад?
 *    → Да: немедленный rollback + Telegram, Claude НЕ вызывается.
 *    → Нет: идём дальше.
 *
 * 2. Записываем ошибку в system_errors (upsert + attempt_count).
 *    → Лимит исчерпан: останавливаемся.
 *
 * 3. Запускаем healing pipeline (fire-and-forget).
 *
 * 4. Возвращаем пользователю чистый 500.
 */
import { NextRequest, NextResponse } from 'next/server'
import type { ErrorSeverity } from './types'
import { upsertSystemError } from './db'
import { checkDeadManSwitch } from './db'
import { updateHealingLog } from './db'
import { rollbackToDeployment } from './vercel'
import { alertRollbackTriggered, alertMaxAttemptsReached } from './telegram-alerts'
import { runHealingPipeline } from './pipeline'

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse | Response>

function classifySeverity(error: Error): ErrorSeverity {
  const msg = error.message.toLowerCase()
  if (msg.includes('payment') || msg.includes('transaction') || msg.includes('tranzila')) return 'critical'
  if (msg.includes('database') || msg.includes('supabase') || msg.includes('timeout')) return 'high'
  if (msg.includes('not found') || msg.includes('unauthorized')) return 'medium'
  return 'low'
}

async function safeReadBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const text = await req.clone().text()
    return text ? JSON.parse(text) : null
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

      // Плановые редиректы/404 Next.js — пробрасываем без обработки
      if (err.message === 'NEXT_NOT_FOUND' || err.message === 'NEXT_REDIRECT') {
        throw error
      }

      const route = routeOverride ?? new URL(req.url).pathname
      console.error(`[self-healing] Uncaught on ${route}:`, err.message)

      // ── ШАГ 1: Dead Man's Switch ────────────────────────────────────────────
      // Stateless проверка: был ли мерж для этого роута в последние 15 мин?
      // Если да — это деградация после "фикса". Rollback без Claude.
      try {
        const { shouldRollback, healingLog } = await checkDeadManSwitch(route)

        if (shouldRollback && healingLog?.previous_deployment_id) {
          console.error(`[self-healing] Dead Man's Switch triggered for ${route}`)

          // Откатываем на предыдущий стабильный деплой
          await rollbackToDeployment(healingLog.previous_deployment_id)

          // Обновляем статус лога
          await updateHealingLog(healingLog.id, {
            status: 'rolled_back',
            rollback_triggered: true,
            rollback_at: new Date().toISOString(),
          })

          // Экстренный алерт — Claude заблокирован, откат выполнен
          await alertRollbackTriggered(
            { route, error_message: err.message } as any,
            healingLog.previous_deployment_id,
            true // isAutomatic = true
          )

          return NextResponse.json(
            {
              error: 'Internal server error',
              message: 'System degradation detected. Automatic rollback initiated.',
            },
            { status: 500 }
          )
        }
      } catch (dmsErr) {
        // Dead Man's Switch не должен блокировать основной поток
        console.error('[self-healing] Dead Man Switch check failed:', dmsErr)
      }

      // ── ШАГ 2: Запись ошибки в БД ──────────────────────────────────────────
      const body = await safeReadBody(req)

      const systemError = await upsertSystemError({
        org_id: null,
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

      // ── ШАГ 3: Healing pipeline (fire-and-forget) ───────────────────────────
      if (systemError) {
        runHealingPipeline(systemError).catch(pipeErr => {
          console.error('[self-healing] Pipeline failed:', pipeErr)
        })
      } else {
        // null = лимит попыток исчерпан
        await alertMaxAttemptsReached(route).catch(() => {})
      }

      // ── ШАГ 4: Ответ пользователю ───────────────────────────────────────────
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

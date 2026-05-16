/**
 * lib/self-healing/db.ts
 * Все операции с Supabase для системы self-healing.
 *
 * Dead Man's Switch — STATELESS паттерн:
 * checkDeadManSwitch() вызывается при каждом новом перехвате ошибки.
 * Если для роута есть merged лог < 15 мин назад → деградация → rollback.
 * Никакого setTimeout, никакого состояния в памяти — только запросы к БД.
 */
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import type {
  SystemError, AiHealingLog, HealingStatus,
  ErrorSeverity, DeadManCheckResult,
} from './types'
import { isCriticalPath, MAX_HEALING_ATTEMPTS, DEAD_MAN_SWITCH_WINDOW_MS } from './types'

const svc = () => createSupabaseServiceClient()

// ─── system_errors ────────────────────────────────────────────────────────────

export interface CreateErrorPayload {
  org_id: string | null
  user_id: string | null
  route: string
  method: string
  error_message: string
  error_stack: string | null
  request_body: Record<string, unknown> | null
  severity: ErrorSeverity
  /** SHA-256 хэш (route + message) для дедупликации Log Drain и global capture */
  dedup_hash?: string | null
}

/**
 * Записать новую ошибку или инкрементировать attempt_count у существующей.
 * Возвращает null если лимит попыток уже исчерпан (не трогать).
 */
export async function upsertSystemError(
  payload: CreateErrorPayload
): Promise<SystemError | null> {
  const db = svc()

  // Ищем незалеченную ошибку с тем же fingerprint (route + message)
  const { data: existing } = await db
    .from('system_errors')
    .select('*')
    .eq('route', payload.route)
    .eq('error_message', payload.error_message)
    .eq('healed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    if (existing.attempt_count >= MAX_HEALING_ATTEMPTS) {
      console.warn(`[self-healing] Max attempts (${MAX_HEALING_ATTEMPTS}) reached for ${existing.id}`)
      return null
    }
    const { data } = await db
      .from('system_errors')
      .update({ attempt_count: existing.attempt_count + 1 })
      .eq('id', existing.id)
      .select()
      .single()
    return data as SystemError
  }

  const { data } = await db
    .from('system_errors')
    .insert({
      ...payload,
      dedup_hash: payload.dedup_hash ?? null,
      is_critical_path: isCriticalPath(payload.route),
      attempt_count: 0,
      healed: false,
    })
    .select()
    .single()
  return data as SystemError
}

export async function markErrorHealed(errorId: string): Promise<void> {
  await svc()
    .from('system_errors')
    .update({ healed: true })
    .eq('id', errorId)
}

// ─── ai_healing_logs ──────────────────────────────────────────────────────────

export async function createHealingLog(
  errorId: string,
  status: HealingStatus
): Promise<AiHealingLog> {
  const { data } = await svc()
    .from('ai_healing_logs')
    .insert({ error_id: errorId, status })
    .select()
    .single()
  return data as AiHealingLog
}

export async function updateHealingLog(
  logId: string,
  patch: Partial<Omit<AiHealingLog, 'id' | 'error_id' | 'created_at'>>
): Promise<void> {
  await svc()
    .from('ai_healing_logs')
    .update(patch)
    .eq('id', logId)
}

// ─── Dead Man's Switch (Stateless) ────────────────────────────────────────────

/**
 * КЛЮЧЕВАЯ ФУНКЦИЯ — вызывается в начале каждого нового перехвата ошибки.
 *
 * Проверяет: есть ли для этого роута лог со статусом 'merged'
 * и merged_at < 15 минут назад?
 *
 * Если да → система задеплоила "фикс" который сломал тот же роут снова.
 * Это деградация. Нужен немедленный rollback.
 *
 * Никакого setTimeout. Чисто event-driven:
 * новая ошибка → запрос в БД → решение → rollback или нет.
 */
export async function checkDeadManSwitch(
  route: string
): Promise<DeadManCheckResult> {
  const windowStart = new Date(Date.now() - DEAD_MAN_SWITCH_WINDOW_MS).toISOString()

  // Ищем merged лог для этого роута в течение последних 15 минут
  const { data } = await svc()
    .from('ai_healing_logs')
    .select(`
      *,
      system_errors!inner ( route )
    `)
    .eq('status', 'merged')
    .eq('system_errors.route', route)
    .gte('merged_at', windowStart)
    .not('previous_deployment_id', 'is', null)
    .order('merged_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    return { shouldRollback: false, healingLog: null }
  }

  return { shouldRollback: true, healingLog: data as AiHealingLog }
}

// ─── Уведомления пользователей (Supabase Realtime) ───────────────────────────

export async function insertUserNotification(
  orgId: string,
  title: string,
  body: string
): Promise<void> {
  await svc().from('notifications').insert({
    org_id: orgId,
    type: 'system_healed',
    title,
    body,
    read: false,
  })
}

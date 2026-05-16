/**
 * self-healing/db.ts
 * Все операции с БД для системы self-healing
 */
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import type { SystemError, AiHealingLog, HealingStatus, ErrorSeverity } from './types'
import { CRITICAL_PATHS, MAX_HEALING_ATTEMPTS } from './types'

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
}

/**
 * Записать новую ошибку. Возвращает запись с attempt_count.
 * Если та же ошибка (route + message) уже есть — инкрементируем attempt_count.
 */
export async function upsertSystemError(
  payload: CreateErrorPayload
): Promise<SystemError | null> {
  const db = svc()
  const isCritical = CRITICAL_PATHS.some(p => payload.route.startsWith(p))

  // Ищем существующую незалеченную ошибку с тем же fingerprint
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
    // Проверяем лимит попыток ДО инкремента
    if (existing.attempt_count >= MAX_HEALING_ATTEMPTS) {
      console.warn(`[self-healing] Max attempts reached for error ${existing.id}`)
      return null // сигнал: не трогать
    }

    const { data: updated } = await db
      .from('system_errors')
      .update({
        attempt_count: existing.attempt_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()
    return updated as SystemError
  }

  // Новая ошибка
  const { data: created } = await db
    .from('system_errors')
    .insert({
      ...payload,
      is_critical_path: isCritical,
      attempt_count: 0,
      healed: false,
    })
    .select()
    .single()
  return created as SystemError
}

export async function markErrorHealed(errorId: string): Promise<void> {
  await svc()
    .from('system_errors')
    .update({ healed: true, updated_at: new Date().toISOString() })
    .eq('id', errorId)
}

// ─── ai_healing_logs ─────────────────────────────────────────────────────────

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
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', logId)
}

/**
 * Dead Man's Switch: новая ошибка в том же модуле в течение 15 мин после деплоя?
 */
export async function checkDeadManSwitch(
  route: string,
  deployedAt: string
): Promise<boolean> {
  const windowStart = new Date(deployedAt).toISOString()
  const { data } = await svc()
    .from('system_errors')
    .select('id')
    .eq('route', route)
    .gte('created_at', windowStart)
    .eq('healed', false)
    .limit(1)
  return (data?.length ?? 0) > 0
}

/** Уведомить пользователя через таблицу notifications (Realtime подхватит) */
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

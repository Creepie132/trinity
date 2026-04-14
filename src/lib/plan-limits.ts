/**
 * plan-limits.ts — серверная проверка ограничений по тарифному плану.
 *
 * SECURITY RULE: Все лимиты проверяются на сервере, против БД.
 * Фронтовые баннеры — только UX. Этот файл — авторитетный гейт.
 *
 * Планы:
 *   free     — Клиенты (100), Визиты, Задачи, Аналитика
 *   trial    — Все модули, без лимитов (14 дней)
 *   base     — Все модули, без лимитов
 *   pro      — Все модули, без лимитов
 *   enterprise — Все модули, без лимитов
 *
 * Стандартный формат 403 ответа:
 *   { code: "PLAN_LIMIT_EXCEEDED", entity: "clients", current: 100, limit: 100, plan: "free" }
 */

import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// ─── Модули доступные на каждом плане ─────────────────────────────────────────
export const PLAN_MODULES: Record<string, string[]> = {
  free:       ['clients', 'visits', 'tasks', 'analytics'],
  trial:      ['*'],   // все модули
  base:       ['*'],
  pro:        ['*'],
  enterprise: ['*'],
}

// ─── Лимиты сущностей по плану ────────────────────────────────────────────────
export interface PlanEntityLimits {
  clients?: number       // макс клиентов (undefined = без лимита)
}

export const PLAN_LIMITS: Record<string, PlanEntityLimits> = {
  free:       { clients: 100 },
  trial:      {},
  base:       {},
  pro:        {},
  enterprise: {},
}

// ─── Проверка доступа к модулю ────────────────────────────────────────────────
/**
 * Возвращает true если модуль доступен на данном плане.
 * '*' означает все модули.
 */
export function isPlanModuleAllowed(plan: string, moduleKey: string): boolean {
  const allowed = PLAN_MODULES[plan] ?? []
  return allowed.includes('*') || allowed.includes(moduleKey)
}

// ─── Проверка лимита сущности ─────────────────────────────────────────────────
export type PlanLimitEntity = 'clients'

export interface PlanLimitResult {
  exceeded: boolean
  current:  number
  limit:    number
  plan:     string
  entity:   PlanLimitEntity
}

/**
 * Проверяет лимит сущности для организации по её плану.
 * Возвращает null если план без лимитов.
 * Возвращает result.exceeded=true если лимит достигнут.
 */
export async function checkPlanLimit(
  orgId: string,
  entity: PlanLimitEntity,
): Promise<PlanLimitResult | null> {
  const service = createSupabaseServiceClient()

  const { data: org } = await service
    .from('organizations')
    .select('plan')
    .eq('id', orgId)
    .single()

  const plan = org?.plan ?? 'free'
  const limits = PLAN_LIMITS[plan] ?? {}
  const limit = limits[entity]

  if (limit === undefined) return null  // нет лимита для этого плана

  let current = 0

  if (entity === 'clients') {
    const { count } = await service
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
    current = count ?? 0
  }

  return { exceeded: current >= limit, current, limit, plan, entity }
}

/**
 * Удобный хелпер: проверяет лимит и возвращает 403 NextResponse если превышен.
 *
 * Использование:
 *   const limitError = await enforcePlanLimit(orgId, 'clients')
 *   if (limitError) return limitError
 */
export async function enforcePlanLimit(
  orgId: string,
  entity: PlanLimitEntity,
): Promise<NextResponse | null> {
  const result = await checkPlanLimit(orgId, entity)
  if (!result || !result.exceeded) return null

  return NextResponse.json({
    code:    'PLAN_LIMIT_EXCEEDED',
    entity:  result.entity,
    current: result.current,
    limit:   result.limit,
    plan:    result.plan,
  }, { status: 403 })
}

/**
 * Проверяет доступ к модулю по org_id.
 * Возвращает 403 если модуль недоступен на текущем плане.
 */
export async function enforceModuleAccess(
  orgId: string,
  moduleKey: string,
): Promise<NextResponse | null> {
  const service = createSupabaseServiceClient()

  const { data: org } = await service
    .from('organizations')
    .select('plan')
    .eq('id', orgId)
    .single()

  const plan = org?.plan ?? 'free'
  if (isPlanModuleAllowed(plan, moduleKey)) return null

  return NextResponse.json({
    code:   'MODULE_NOT_AVAILABLE',
    module: moduleKey,
    plan,
  }, { status: 403 })
}

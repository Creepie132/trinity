/**
 * src/lib/billing-plans.ts
 *
 * Единый источник правды для планов подписки Trinity CRM.
 *
 * ВАЖНО: Все точки активации подписки (webhooks, notify, success, admin)
 * ОБЯЗАНЫ импортировать модули только отсюда. Никаких локальных PLAN_FEATURES,
 * PLAN_CONFIG, PLAN_MODULES в отдельных файлах.
 *
 * Стандартные ключи планов: 'basic' | 'pro' | 'enterprise'
 * ('base' — алиас для 'basic', нормализуется через normalizePlan())
 */

export const PLAN_PRICES: Record<string, number> = {
  basic: 199,
  pro:   249,
  enterprise: 499,
}

export const PLAN_MODULES: Record<string, Record<string, boolean>> = {
  basic: {
    clients:       true,
    visits:        true,
    diary:         true,
    inventory:     true,
    payments:      true,
    analytics:     false,
    sms:           false,
    booking:       false,
    loyalty:       false,
    branches:      false,
    subscriptions: false,
    reports:       false,
    statistics:    true,
    birthday:      false,
    telegram:      false,
  },
  pro: {
    clients:       true,
    visits:        true,
    diary:         true,
    inventory:     true,
    payments:      true,
    analytics:     true,
    sms:           true,
    booking:       true,
    loyalty:       true,
    branches:      false,
    subscriptions: true,
    reports:       true,
    statistics:    true,
    birthday:      true,
    telegram:      false,
  },
  enterprise: {
    clients:       true,
    visits:        true,
    diary:         true,
    inventory:     true,
    payments:      true,
    analytics:     true,
    sms:           true,
    booking:       true,
    loyalty:       true,
    branches:      true,
    subscriptions: true,
    reports:       true,
    statistics:    true,
    birthday:      true,
    telegram:      true,
  },
}

/** Нормализует план: 'base' -> 'basic', null/undefined -> 'basic' */
export function normalizePlan(plan: string | null | undefined): string {
  if (!plan) return 'basic'
  if (plan === 'base') return 'basic'
  return PLAN_MODULES[plan] ? plan : 'basic'
}

/** Возвращает модули для плана. Всегда возвращает валидный объект. */
export function getPlanModules(plan: string | null | undefined): Record<string, boolean> {
  const normalized = normalizePlan(plan)
  return PLAN_MODULES[normalized] ?? PLAN_MODULES['basic']
}

/** Возвращает цену плана. */
export function getPlanPrice(plan: string | null | undefined): number {
  const normalized = normalizePlan(plan)
  return PLAN_PRICES[normalized] ?? PLAN_PRICES['basic']
}

export const VALID_PLANS = ['basic', 'pro', 'enterprise'] as const
export type PlanKey = typeof VALID_PLANS[number]

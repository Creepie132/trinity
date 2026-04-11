export type PlanKey = 'demo' | 'basic' | 'pro' | 'enterprise' | 'custom'

export interface Plan {
  key: PlanKey
  name_he: string
  name_ru: string
  desc_he: string
  desc_ru: string
  color: string
  modules: Record<string, boolean>
  client_limit: number | null
  price_monthly: number | null
}

/**
 * Базовые наборы модулей по планам.
 * Ключи строго совпадают с MODULES в modules-config.ts.
 * clients и visits всегда идут вместе.
 */
export const PLANS: Plan[] = [
  {
    key: 'demo',
    name_he: 'דמו',
    name_ru: 'Демо',
    desc_he: '14 ימי ניסיון',
    desc_ru: '14 дней пробный период',
    color: 'red',
    modules: {
      clients:      true,
      visits:       true,
      booking:      false,
      registration: false,
      whatsapp:     false,
      branches:     false,
      loyalty:      false,
      analytics:    false,
      inventory:    false,
      tasks:        false,
      payments:     false,
      sales:        false,
      finances:     false,
      processing:   false,
      kira:         false,
    },
    client_limit: 10,
    price_monthly: 0,
  },
  {
    key: 'basic',
    name_he: 'בסיסי',
    name_ru: 'Базовый',
    desc_he: 'לעסקים קטנים',
    desc_ru: 'Для малого бизнеса',
    color: 'blue',
    modules: {
      clients:      true,
      visits:       true,
      booking:      true,
      registration: true,
      whatsapp:     false,
      branches:     false,
      loyalty:      false,
      analytics:    false,
      inventory:    true,
      tasks:        true,
      payments:     true,
      sales:        false,
      finances:     false,
      processing:   false,
      kira:         false,
    },
    client_limit: 100,
    price_monthly: 199,
  },
  {
    key: 'pro',
    name_he: 'מקצועי',
    name_ru: 'Профессиональный',
    desc_he: 'לעסקים צומחים',
    desc_ru: 'Для растущего бизнеса',
    color: 'amber',
    modules: {
      clients:      true,
      visits:       true,
      booking:      true,
      registration: true,
      whatsapp:     true,
      branches:     false,
      loyalty:      false,
      analytics:    true,
      inventory:    true,
      tasks:        true,
      payments:     true,
      sales:        true,
      finances:     true,
      processing:   false,
      kira:         false,
    },
    client_limit: 500,
    price_monthly: 249,
  },
  {
    key: 'enterprise',
    name_he: 'ארגוני',
    name_ru: 'Корпоративный',
    desc_he: 'כל הפיצ\'רים',
    desc_ru: 'Все функции',
    color: 'green',
    modules: {
      clients:      true,
      visits:       true,
      booking:      true,
      registration: true,
      whatsapp:     true,
      branches:     true,
      loyalty:      true,
      analytics:    true,
      inventory:    true,
      tasks:        true,
      payments:     true,
      sales:        true,
      finances:     true,
      processing:   true,
      kira:         true,
    },
    client_limit: null,
    price_monthly: 499,
  },
  {
    key: 'custom',
    name_he: 'מותאם אישית',
    name_ru: 'Кастом',
    desc_he: 'בחר את המודולים שלך',
    desc_ru: 'Выберите свои модули',
    color: 'purple',
    modules: {},
    client_limit: null,
    price_monthly: null,
  },
]

export function getPlan(key: PlanKey): Plan | undefined {
  return PLANS.find((p) => p.key === key)
}

export type PlanKey = 'demo' | 'basic' | 'pro' | 'enterprise' | 'custom'

export interface Plan {
  key: PlanKey
  name_he: string
  name_ru: string
  desc_he: string
  desc_ru: string
  color: string
  modules: Record<string, boolean>
  client_limit: number | null // null = безлимит
  price_monthly: number | null // null = по договорённости
}

export const PLANS: Plan[] = [
  {
    key: 'demo',
    name_he: 'דמו',
    name_ru: 'Демо',
    desc_he: '14 ימי ניסיון',
    desc_ru: '14 дней пробный период',
    color: 'red',
    modules: {
      clients: true,
      visits: false,
      booking: false,
      inventory: false,
      payments: false,
      sms: false,
      subscriptions: false,
      statistics: false,
      reports: false,
      telegram: false,
      loyalty: false,
      birthday: false,
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
      clients: true,
      visits: true,
      booking: true,
      inventory: false,
      payments: true,
      sms: false,
      subscriptions: false,
      statistics: true,
      reports: false,
      telegram: true,
      loyalty: false,
      birthday: false,
    },
    client_limit: 100,
    price_monthly: 99,
  },
  {
    key: 'pro',
    name_he: 'מקצועי',
    name_ru: 'Профессиональный',
    desc_he: 'לעסקים צומחים',
    desc_ru: 'Для растущего бизнеса',
    color: 'amber',
    modules: {
      clients: true,
      visits: true,
      booking: true,
      inventory: true,
      payments: true,
      sms: true,
      subscriptions: true,
      statistics: true,
      reports: true,
      telegram: true,
      loyalty: false,
      birthday: false,
    },
    client_limit: 500,
    price_monthly: 199,
  },
  {
    key: 'enterprise',
    name_he: 'ארגוני',
    name_ru: 'Корпоративный',
    desc_he: 'כל הפיצ\'רים',
    desc_ru: 'Все функции',
    color: 'green',
    modules: {
      clients: true,
      visits: true,
      booking: true,
      inventory: true,
      payments: true,
      sms: true,
      subscriptions: true,
      statistics: true,
      reports: true,
      telegram: true,
      loyalty: true,
      birthday: true,
    },
    client_limit: null,
    price_monthly: 349,
  },
  {
    key: 'custom',
    name_he: 'מותאם אישית',
    name_ru: 'Кастом',
    desc_he: 'בחר את המודולים שלך',
    desc_ru: 'Выберите свои модули',
    color: 'purple',
    modules: {}, // Пустой — модули выбираются вручную
    client_limit: null,
    price_monthly: null,
  },
]

export function getPlan(key: PlanKey): Plan | undefined {
  return PLANS.find((p) => p.key === key)
}

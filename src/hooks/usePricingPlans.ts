/**
 * usePricingPlans — хук для получения актуальных тарифных планов из БД.
 * Используется в DemoOrderModal (Step2) и на лендинге.
 * Кэш инвалидируется сервером после каждого сохранения в plans-editor.
 */
import { useState, useEffect } from 'react'

export interface LandingPlan {
  key: string
  name_he: string;    name_ru: string
  subtitle_he: string; subtitle_ru: string
  price_he: string;   price_ru: string
  period_he: string;  period_ru: string
  badge_he: string;   badge_ru: string
  color: string
  features_he: string[]
  features_ru: string[]
  cta_he: string;     cta_ru: string
  is_active: boolean
  is_popular: boolean
}

export interface SetupOption {
  id: 'full' | 'standart' | 'self'
  emoji: string
  title_ru: string;  title_he: string
  desc_ru: string;   desc_he: string
  price: number          // базовая цена без скидки
  discount_eligible: boolean  // false = скидка не применяется (self-onboarding)
}

export interface PricingConfig {
  landing_plans: LandingPlan[]
  setup_options: SetupOption[]
  demo_setup_base: number
  demo_module_price: number
  demo_discount_threshold: number
  demo_discount_pct: number
}

// Fallback сетап-опции если БД пустая / не загрузилась
export const FALLBACK_SETUP_OPTIONS: SetupOption[] = [
  {
    id: 'full', emoji: '🏆',
    title_ru: 'Full-setup',      title_he: 'Full-setup',
    desc_ru:  'Полная настройка, кастомные поля, категории, обучение',
    desc_he:  'הגדרה מלאה, שדות מותאמים, קטגוריות, הדרכה',
    price: 2000, discount_eligible: true,
  },
  {
    id: 'standart', emoji: '⚙️',
    title_ru: 'Standart-setup',  title_he: 'Standart-setup',
    desc_ru:  'Стандартная настройка без кастомизации, обучение',
    desc_he:  'הגדרה סטנדרטית, ללא התאמה, הדרכה',
    price: 1300, discount_eligible: true,
  },
  {
    id: 'self', emoji: '🚀',
    title_ru: 'Self-onboarding', title_he: 'Self-onboarding',
    desc_ru:  'Без настройки и обучения — Pay & Go',
    desc_he:  'ללא הגדרה ו-ללא הדרכה — Pay & Go',
    price: 300, discount_eligible: false,
  },
]

// Fallback — показываем пока грузится API
export const FALLBACK_PLANS: LandingPlan[] = [
  {
    key: 'base', name_ru: 'Base', name_he: 'Base',
    subtitle_ru: '', subtitle_he: '',
    price_ru: '₪199', price_he: '₪199',
    period_ru: '/мес', period_he: '/חודש',
    badge_ru: '', badge_he: '',
    color: 'blue', is_active: true, is_popular: false,
    features_ru: ['Клиенты', 'Визиты / Записи', 'Дневник и задачи', 'Склад'],
    features_he: ['לקוחות', 'תורים', 'יומן ומשימות', 'מלאי'],
    cta_ru: 'Выбрать', cta_he: 'בחרו',
  },
  {
    key: 'pro', name_ru: 'Pro', name_he: 'Pro',
    subtitle_ru: '', subtitle_he: '',
    price_ru: '₪249', price_he: '₪249',
    period_ru: '/мес', period_he: '/חודש',
    badge_ru: 'Рекомендован', badge_he: 'מומלץ',
    color: 'amber', is_active: true, is_popular: true,
    features_ru: ['Всё из Base', 'Онлайн-запись', 'Статистика и отчёты', 'SMS и напоминания'],
    features_he: ['הכל מ-Base', 'הזמנה אונליין', 'אנליטיקה ודוחות', 'SMS ותזכורות'],
    cta_ru: 'Выбрать', cta_he: 'בחרו',
  },
  {
    key: 'enterprise', name_ru: 'Enterprise', name_he: 'Enterprise',
    subtitle_ru: '', subtitle_he: '',
    price_ru: '₪499', price_he: '₪499',
    period_ru: '/мес', period_he: '/חודש',
    badge_ru: 'Для бизнеса', badge_he: 'לעסקים',
    color: 'purple', is_active: true, is_popular: false,
    features_ru: ['Всё из Base и Pro', 'Филиалы', 'Программа лояльности', 'До 5 работников'],
    features_he: ['הכל מ-Base ו-Pro', 'סניפים', 'תוכנית נאמנות', 'עד 5 עובדים'],
    cta_ru: 'Выбрать', cta_he: 'בחרו',
  },
  {
    key: 'custom', name_ru: 'Инд. настройка', name_he: 'אישי',
    subtitle_ru: '', subtitle_he: '',
    price_ru: 'По выбору', price_he: 'לפי בחירה',
    period_ru: '', period_he: '',
    badge_ru: '', badge_he: '',
    color: 'navy', is_active: true, is_popular: false,
    features_ru: ['Выберите нужные модули', 'Инд. конфигурация', 'Приоритетная поддержка', 'Скидка до 15% от 5+ модулей'],
    features_he: ['בחר מודולים נדרשים', 'קונפיגורציה אישית', 'תמיכה עדיפות', 'הנחה עד 15% מ-5+ מודולים'],
    cta_ru: 'Выбрать', cta_he: 'בחרו',
  },
]

export function usePricingPlans() {
  const [plans, setPlans] = useState<LandingPlan[]>(FALLBACK_PLANS)
  const [config, setConfig] = useState<PricingConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/admin/pricing-config')
      .then(r => r.json())
      .then((data: PricingConfig) => {
        setConfig(data)
        const active = (data.landing_plans ?? [])
          .filter(p => p.is_active)
          .map(p => ({ is_popular: false, ...p }))
        if (active.length > 0) setPlans(active)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const setupOptions = config?.setup_options?.length
    ? config.setup_options
    : FALLBACK_SETUP_OPTIONS

  const discountPct = config?.demo_discount_pct ?? 15
  const discountThreshold = config?.demo_discount_threshold ?? 5

  return { plans, config, setupOptions, discountPct, discountThreshold, loading, error }
}

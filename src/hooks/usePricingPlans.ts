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

export interface PricingConfig {
  landing_plans: LandingPlan[]
  demo_setup_base: number
  demo_module_price: number
  demo_discount_threshold: number
  demo_discount_pct: number
}

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
    features_he: ['לקוחות', 'ביקורים / תורים', 'יומן ומשימות', 'מלאי'],
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

  return { plans, config, loading, error }
}

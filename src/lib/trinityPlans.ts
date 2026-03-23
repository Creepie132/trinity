/**
 * TRINITY_PLANS — единый источник правды для тарифных планов.
 * Используется в DemoLimitModal, SalesDemoStub и Landing page.
 */

export const WA_LINK = 'https://wa.me/972544858586'

export interface TrinityPlan {
  nameRu: string
  nameHe: string
  price: string        // e.g. '₪199' or 'По выбору'
  priceHe: string
  periodRu: string     // e.g. '/мес'
  periodHe: string
  badge: string | null // e.g. 'Рекомендован' or null
  badgeHe: string | null
  color: string        // Tailwind gradient e.g. 'from-blue-500 to-blue-700'
  featuresRu: string[]
  featuresHe: string[]
}

export const TRINITY_PLANS: TrinityPlan[] = [
  {
    nameRu: 'Base',
    nameHe: 'Base',
    price: '₪199',
    priceHe: '₪199',
    periodRu: '/мес',
    periodHe: '/חודש',
    badge: null,
    badgeHe: null,
    color: 'from-blue-500 to-blue-700',
    featuresRu: ['Клиенты', 'Визиты / Записи', 'Дневник и задачи', 'Склад'],
    featuresHe: ['לקוחות', 'ביקורים / תורים', 'יומן ומשימות', 'מלאי'],
  },
  {
    nameRu: 'Pro',
    nameHe: 'Pro',
    price: '₪249',
    priceHe: '₪249',
    periodRu: '/мес',
    periodHe: '/חודש',
    badge: 'Рекомендован',
    badgeHe: 'מומלץ',
    color: 'from-orange-500 to-amber-500',
    featuresRu: ['Всё из Base', 'Онлайн-запись', 'Статистика и отчёты', 'SMS и напоминания'],
    featuresHe: ['הכל מ-Base', 'הזמנה אונליין', 'סטטיסטיקה ודוחות', 'SMS ותזכורות'],
  },
  {
    nameRu: 'Enterprise',
    nameHe: 'Enterprise',
    price: '₪499',
    priceHe: '₪499',
    periodRu: '/мес',
    periodHe: '/חודש',
    badge: 'Для бизнеса',
    badgeHe: 'לעסקים',
    color: 'from-violet-600 to-purple-700',
    featuresRu: ['Всё из Base и Pro', 'Филиалы', 'Программа лояльности', 'До 5 работников включено'],
    featuresHe: ['הכל מ-Base ו-Pro', 'סניפים', 'תוכנית נאמנות', 'עד 5 עובדים כלולים'],
  },
  {
    nameRu: 'Инд. настройка',
    nameHe: 'אישי',
    price: 'По выбору',
    priceHe: 'לפי בחירה',
    periodRu: '',
    periodHe: '',
    badge: null,
    badgeHe: null,
    color: 'from-pink-500 to-rose-600',
    featuresRu: ['Выбери нужные модули', 'Инд. конфигурация', 'Приоритетная поддержка', 'Скидка до 15% от 5+ модулей'],
    featuresHe: ['בחר מודולים נדרשים', 'קונפיגורציה אישית', 'תמיכה עדיפות', 'הנחה עד 15% מ-5+ מודולים'],
  },
]

// Compact 3-plan version for DemoLimitModal (skip last custom plan)
export const TRINITY_PLANS_COMPACT = TRINITY_PLANS.slice(0, 3)

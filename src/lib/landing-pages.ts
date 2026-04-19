/**
 * Конфигурация страниц, которые пользователь может выбрать
 * в качестве "главной" при входе в Trinity.
 *
 * Этот файл — single source of truth.
 * Используется на сервере (callback, API validation),
 * на клиенте (settings/home-page, useLandingPage hook, Sidebar/Header logo).
 *
 * При добавлении новой страницы — обновить:
 *   1. LANDING_PAGE_OPTIONS (здесь)
 *   2. CHECK constraint в БД (user_nav_preferences_default_landing_page_check)
 *   3. VALID_LANDING_IDS в API (src/app/api/mobile/preferences/route.ts)
 */

import {
  Home, Calendar, Users, ShoppingBag, CreditCard, PiggyBank,
  Package, BookOpen, MessageCircle, BarChart3,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** Ключи фич из useFeatures() для фильтрации доступных опций */
export type LandingFeatureFlag =
  | null
  | 'hasVisits'
  | 'hasClients'
  | 'hasSales'
  | 'hasPayments'
  | 'hasInventory'
  | 'hasDiary'
  | 'hasWhatsapp'
  | 'hasAnalytics'

export interface LandingPageOption {
  id: string              // значение в БД
  path: string            // Next.js route
  label_ru: string
  label_he: string
  desc_ru: string
  desc_he: string
  icon: LucideIcon
  /** Если этот флаг === false в useFeatures() — опция не показывается и не применяется */
  featureFlag: LandingFeatureFlag
  /** Цветовой акцент карточки */
  colorTint: string
}

export const LANDING_PAGE_OPTIONS: LandingPageOption[] = [
  {
    id: 'dashboard',
    path: '/dashboard',
    label_ru: 'Дашборд',
    label_he: 'דשבורד',
    desc_ru: 'Обзор бизнеса: сегодня, визиты, задачи',
    desc_he: 'סקירת העסק: היום, תורים, משימות',
    icon: Home,
    featureFlag: null,
    colorTint: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    id: 'visits',
    path: '/visits',
    label_ru: 'Визиты',
    label_he: 'יומן',
    desc_ru: 'Журнал визитов, расписание',
    desc_he: 'יומן תורים, לוח זמנים',
    icon: Calendar,
    featureFlag: 'hasVisits',
    colorTint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  {
    id: 'clients',
    path: '/clients',
    label_ru: 'Клиенты',
    label_he: 'לקוחות',
    desc_ru: 'База клиентов',
    desc_he: 'בסיס נתונים של לקוחות',
    icon: Users,
    featureFlag: 'hasClients',
    colorTint: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  {
    id: 'sales',
    path: '/sales',
    label_ru: 'Продажи',
    label_he: 'מכירות',
    desc_ru: 'Заказы и продажи товаров',
    desc_he: 'הזמנות ומכירות',
    icon: ShoppingBag,
    featureFlag: 'hasSales',
    colorTint: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  },
  {
    id: 'payments',
    path: '/payments',
    label_ru: 'Платежи',
    label_he: 'תשלומים',
    desc_ru: 'История платежей',
    desc_he: 'היסטוריית תשלומים',
    icon: CreditCard,
    featureFlag: 'hasPayments',
    colorTint: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  },
  {
    id: 'finances',
    path: '/finances',
    label_ru: 'Финансы',
    label_he: 'כספים',
    desc_ru: 'Денежный поток и расходы',
    desc_he: 'תזרים מזומנים והוצאות',
    icon: PiggyBank,
    featureFlag: 'hasPayments',
    colorTint: 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  },
  {
    id: 'inventory',
    path: '/inventory',
    label_ru: 'Склад',
    label_he: 'מלאי',
    desc_ru: 'Товары и остатки',
    desc_he: 'מוצרים ומלאי',
    icon: Package,
    featureFlag: 'hasInventory',
    colorTint: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  },
  {
    id: 'diary',
    path: '/diary',
    label_ru: 'Дневник',
    label_he: 'משימות',
    desc_ru: 'Личные задачи и заметки',
    desc_he: 'משימות אישיות',
    icon: BookOpen,
    featureFlag: 'hasDiary',
    colorTint: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  },
  {
    id: 'broadcast',
    path: '/broadcast',
    label_ru: 'Рассылка WA',
    label_he: 'שליחה המונית',
    desc_ru: 'WhatsApp-рассылки',
    desc_he: 'שליחת WhatsApp המונית',
    icon: MessageCircle,
    featureFlag: 'hasWhatsapp',
    colorTint: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  },
  {
    id: 'analytics',
    path: '/analytics',
    label_ru: 'Аналитика',
    label_he: 'אנליטיקה',
    desc_ru: 'Отчёты и графики',
    desc_he: 'דוחות וגרפים',
    icon: BarChart3,
    featureFlag: 'hasAnalytics',
    colorTint: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
]

export const DEFAULT_LANDING_ID = 'dashboard'
export const DEFAULT_LANDING_PATH = '/dashboard'

/** Множество валидных id (для API-валидации) */
export const VALID_LANDING_IDS: ReadonlySet<string> = new Set(
  LANDING_PAGE_OPTIONS.map((o) => o.id)
)

/**
 * Найти path по id с безопасным fallback на /dashboard.
 * Использовать на СЕРВЕРЕ (callback, login). Не проверяет фичи —
 * если модуль отключён, всё равно редирект; следующий клик покажет
 * пустую страницу или 404, и пользователь переоткроет настройки.
 *
 * Для клиента — см. resolveLandingPath() ниже.
 */
export function pathFromLandingId(id: string | null | undefined): string {
  if (!id) return DEFAULT_LANDING_PATH
  const opt = LANDING_PAGE_OPTIONS.find((o) => o.id === id)
  return opt?.path ?? DEFAULT_LANDING_PATH
}

/**
 * Клиентский резолв с учётом фич.
 * Если выбранный модуль отключён админом — возвращает /dashboard.
 */
export function resolveLandingPath(
  id: string | null | undefined,
  features: { [K in Exclude<LandingFeatureFlag, null>]?: boolean } & { isLoading?: boolean }
): string {
  if (!id || features.isLoading) return DEFAULT_LANDING_PATH
  const opt = LANDING_PAGE_OPTIONS.find((o) => o.id === id)
  if (!opt) return DEFAULT_LANDING_PATH
  if (opt.featureFlag && features[opt.featureFlag] === false) {
    return DEFAULT_LANDING_PATH
  }
  return opt.path
}

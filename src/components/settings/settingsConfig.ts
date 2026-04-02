import {
  Globe, Palette, Bell, Package, Building2, Users,
  Calendar, CreditCard, MessageSquare, FileText,
  ShieldAlert, MessageCircle, ShoppingBag,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface SettingsItemConfig {
  id: string
  href: string
  icon: LucideIcon
  colorTint: string
  title_ru: string
  title_he: string
  desc_ru: string
  desc_he: string
  featureFlag?: string
  permissionFlag?: string
  badge?: string
  danger?: boolean
}

export interface SettingsCategory {
  id: string
  label: { ru: string; he: string }
  icon: LucideIcon
  items: SettingsItemConfig[]
}

export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    id: 'general',
    label: { ru: 'Основные', he: 'כללי' },
    icon: Globe,
    items: [
      {
        id: 'language',
        href: '/settings/language',
        icon: Globe,
        colorTint: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        title_ru: 'Язык интерфейса',
        title_he: 'שפת ממשק',
        desc_ru: 'Переключите язык системы: русский, иврит',
        desc_he: 'החלף שפת מערכת: עברית, רוסית',
      },
      {
        id: 'display',
        href: '/settings/display',
        icon: Palette,
        colorTint: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
        title_ru: 'Тема оформления',
        title_he: 'ערכת נושא',
        desc_ru: 'Выберите цвет и стиль интерфейса',
        desc_he: 'בחר צבעים ומראה לממשק',
      },
      {
        id: 'notifications',
        href: '/settings/notifications',
        icon: Bell,
        colorTint: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
        title_ru: 'Уведомления',
        title_he: 'התראות',
        desc_ru: 'Push, Telegram — настройте что и когда получать',
        desc_he: 'Push, Telegram — הגדר מה תקבל ומתי',
      },
    ],
  },
  {
    id: 'business',
    label: { ru: 'Бизнес', he: 'עסקי' },
    icon: Building2,
    items: [
      {
        id: 'services',
        href: '/settings/services',
        icon: Package,
        colorTint: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
        title_ru: 'Услуги',
        title_he: 'שירותים',
        desc_ru: 'Добавляйте, редактируйте и архивируйте услуги',
        desc_he: 'הוסף, ערוך וארכב שירותים',
        permissionFlag: 'canManageServices',
      },
      {
        id: 'branches',
        href: '/settings/branches',
        icon: Building2,
        colorTint: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
        title_ru: 'Филиалы',
        title_he: 'סניפים',
        desc_ru: 'Управляйте филиалами и локациями',
        desc_he: 'נהל סניפים ומיקומים',
        featureFlag: 'hasBranches',
      },
      {
        id: 'users',
        href: '/settings/users',
        icon: Users,
        colorTint: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
        title_ru: 'Команда',
        title_he: 'צוות',
        desc_ru: 'Приглашайте сотрудников и управляйте правами',
        desc_he: 'הזמן עובדים ונהל הרשאות',
        permissionFlag: 'canManageUsers',
      },
      {
        id: 'care-instructions',
        href: '/settings/care-instructions',
        icon: FileText,
        colorTint: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
        title_ru: 'Инструкции по уходу',
        title_he: 'הוראות טיפול',
        desc_ru: 'Шаблоны рекомендаций для клиентов',
        desc_he: 'תבניות המלצות ללקוחות',
        permissionFlag: 'canManageCareInstructions',
      },
      {
        id: 'sales-settings',
        href: '/settings/sales',
        icon: ShoppingBag,
        colorTint: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
        title_ru: 'Настройки продаж',
        title_he: 'הגדרות מכירות',
        desc_ru: 'Автооплата, пересчёт сдачи и другие параметры',
        desc_he: 'תשלום אוטומטי, עודף ופרמטרים נוספים',
      },
    ],
  },
  {
    id: 'integrations',
    label: { ru: 'Интеграции', he: 'אינטגרציות' },
    icon: Calendar,
    items: [
      {
        id: 'booking',
        href: '/settings/booking',
        icon: Calendar,
        colorTint: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
        title_ru: 'Онлайн-запись',
        title_he: 'קביעת תורים',
        desc_ru: 'Настройки онлайн-записи для клиентов',
        desc_he: 'הגדרות קביעת תורים ללקוחות',
        featureFlag: 'hasBooking',
        permissionFlag: 'canManageBookingSettings',
        badge: 'Beta',
      },
      {
        id: 'payments',
        href: '/settings/payments',
        icon: CreditCard,
        colorTint: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        title_ru: 'Платежи Tranzila',
        title_he: 'תשלומים Tranzila',
        desc_ru: 'Подключите Tranzila — терминал и пароль',
        desc_he: 'חבר את טרנזילה — שם טרמינל וסיסמה',
      },
      {
        id: 'message-templates',
        href: '/settings/message-templates',
        icon: MessageSquare,
        colorTint: 'bg-lime-50 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
        title_ru: 'WhatsApp шаблоны',
        title_he: 'תבניות WhatsApp',
        desc_ru: 'Шаблоны по умолчанию для SMS и WhatsApp',
        desc_he: 'הגדר הודעות ברירת מחדל ל-SMS ו-WhatsApp',
      },
      {
        id: 'whatsapp',
        href: '/settings/whatsapp',
        icon: MessageCircle,
        colorTint: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        title_ru: 'Персональный WhatsApp',
        title_he: 'WhatsApp מותאם אישית',
        desc_ru: 'Подключите свой номер Whapi — избегайте блокировок',
        desc_he: 'חבר מספר Whapi עצמאי — הימנע מחסימות',
        featureFlag: 'hasWhatsapp',
      },
    ],
  },
  {
    id: 'security',
    label: { ru: 'Безопасность', he: 'אבטחה' },
    icon: ShieldAlert,
    items: [
      {
        id: 'permissions',
        href: '/settings/permissions',
        icon: ShieldAlert,
        colorTint: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-500',
        title_ru: 'Разрешения доступа',
        title_he: 'הרשאות גישה',
        desc_ru: 'Управляйте доступом сотрудников к разделам системы',
        desc_he: 'קבע מה כל עובד יכול לעשות במערכת',
        permissionFlag: 'canManageUsers',
        danger: true,
      },
    ],
  },
]

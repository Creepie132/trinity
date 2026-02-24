export interface Module {
  key: string
  name_he: string
  name_ru: string
  desc_he: string
  desc_ru: string
  alwaysVisible?: boolean
}

export const MODULES: Module[] = [
  {
    key: 'clients',
    name_he: 'לקוחות',
    name_ru: 'Клиенты',
    desc_he: 'ניהול לקוחות',
    desc_ru: 'Управление клиентами',
    alwaysVisible: true
  },
  {
    key: 'visits',
    name_he: 'ביקורים',
    name_ru: 'Визиты',
    desc_he: 'ניהול ביקורים ותורים',
    desc_ru: 'Управление визитами и записями',
    alwaysVisible: true
  },
  {
    key: 'diary',
    name_he: 'יומן',
    name_ru: 'Дневник',
    desc_he: 'ניהול משימות ותזכורות',
    desc_ru: 'Управление задачами и напоминаниями',
    alwaysVisible: true
  },
  {
    key: 'booking',
    name_he: 'הזמנות אונליין',
    name_ru: 'Онлайн-запись',
    desc_he: 'מערכת הזמנות אונליין',
    desc_ru: 'Система онлайн-записи'
  },
  {
    key: 'inventory',
    name_he: 'מלאי',
    name_ru: 'Склад',
    desc_he: 'ניהול מלאי ומוצרים',
    desc_ru: 'Управление складом и товарами'
  },
  {
    key: 'payments',
    name_he: 'תשלומים',
    name_ru: 'Платежи',
    desc_he: 'מערכות תשלום',
    desc_ru: 'Платёжная система'
  },
  {
    key: 'sms',
    name_he: 'קמפיינים SMS',
    name_ru: 'SMS-кампании',
    desc_he: 'שליחת הודעות SMS',
    desc_ru: 'Отправка SMS-сообщений'
  },
  {
    key: 'subscriptions',
    name_he: 'מנויים',
    name_ru: 'Подписки',
    desc_he: 'ניהול מנויים חוזרים',
    desc_ru: 'Управление подписками'
  },
  {
    key: 'statistics',
    name_he: 'סטטיסטיקה',
    name_ru: 'Статистика',
    desc_he: 'דשבורד וגרפים',
    desc_ru: 'Дашборд и графики'
  },
  {
    key: 'reports',
    name_he: 'דוחות',
    name_ru: 'Отчёты',
    desc_he: 'דוחות עסקיים',
    desc_ru: 'Бизнес-отчёты'
  },
  {
    key: 'telegram',
    name_he: 'התראות טלגרם',
    name_ru: 'Telegram-уведомления',
    desc_he: 'התראות ב-Telegram',
    desc_ru: 'Уведомления в Telegram'
  },
  {
    key: 'loyalty',
    name_he: 'נקודות נאמנות',
    name_ru: 'Программа лояльности',
    desc_he: 'תוכנית נאמנות',
    desc_ru: 'Система бонусов и лояльности'
  },
  {
    key: 'birthday',
    name_he: 'הודעות יום הולדת',
    name_ru: 'Поздравления с ДР',
    desc_he: 'ברכות אוטומטיות',
    desc_ru: 'Автоматические поздравления'
  }
]

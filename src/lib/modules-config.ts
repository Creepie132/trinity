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
    name_he: 'תפוצות המוניות',
    name_ru: 'Массовые рассылки',
    desc_he: 'שליחת הודעות המוניות ללקוחות',
    desc_ru: 'Массовая отправка сообщений клиентам'
  },
  {
    key: 'subscriptions',
    name_he: 'חיוב חוזר',
    name_ru: 'Рекуррентные платежи',
    desc_he: 'חיוב אוטומטי תקופתי ללקוחות',
    desc_ru: 'Автоматическое периодическое списание с карт клиентов'
  },
  {
    key: 'analytics',
    name_he: 'אנליטיקה',
    name_ru: 'Аналитика',
    desc_he: 'דשבורד, גרפים ודוחות עסקיים',
    desc_ru: 'Дашборд, графики и бизнес-отчёты'
  },
  {
    key: 'sales',
    name_he: 'מכירות',
    name_ru: 'Продажи',
    desc_he: 'ניהול מכירות ועסקאות',
    desc_ru: 'Управление продажами и сделками'
  },
  {
    key: 'loyalty',
    name_he: 'נקודות נאמנות',
    name_ru: 'Программа лояльности',
    desc_he: 'תוכנית נאמנות',
    desc_ru: 'Система бонусов и лояльности'
  },
  {
    key: 'branches',
    name_he: 'סניפים',
    name_ru: 'Филиалы',
    desc_he: 'ניהול סניפים מרובים',
    desc_ru: 'Управление несколькими филиалами'
  }
]

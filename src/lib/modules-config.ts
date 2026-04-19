export interface Module {
  key: string
  name_he: string
  name_ru: string
  desc_he: string
  desc_ru: string
  /** Если true — модуль всегда включён, тумблер не показывается */
  alwaysOn?: boolean
  /** Ключи-партнёры: тумблер включает/выключает оба сразу */
  linkedKeys?: string[]
  /** Этот ключ управляется через linkedKeys другого модуля — не показывать отдельно */
  hiddenInUI?: boolean
}

/**
 * Канонический список модулей Trinity CRM.
 * Порядок соответствует порядку отображения в модальном окне тумблеров.
 *
 * ПРАВИЛА:
 * - clients и visits всегда переключаются вместе (linkedKeys)
 * - visits.hiddenInUI = true — не показывается отдельной строкой
 * - Ключи совпадают с organizations.features.modules в БД
 * - Новые ключи: registration, loyalty, tasks, finances, processing
 * - Устаревшие ключи (diary, subscriptions, statistics, reports, telegram,
 *   sms, birthday) сохраняются в БД, но не отображаются в новом UI.
 */
export const MODULES: Module[] = [
  {
    key: 'clients',
    name_he: 'לקוחות ויומן',
    name_ru: 'Клиенты и визиты',
    desc_he: 'ניהול לקוחות ויומן תורים',
    desc_ru: 'Управление клиентами, визитами и записями',
    linkedKeys: ['visits'],
  },
  {
    key: 'visits',
    name_he: 'יומן',
    name_ru: 'Визиты',
    desc_he: 'ניהול יומן ותורים',
    desc_ru: 'Управление визитами',
    hiddenInUI: true,
  },
  {
    key: 'booking',
    name_he: 'הזמנות אונליין',
    name_ru: 'Онлайн-запись',
    desc_he: 'מערכת הזמנות אונליין ללקוחות',
    desc_ru: 'Система онлайн-записи для клиентов',
  },
  {
    key: 'registration',
    name_he: 'רישום אונליין',
    name_ru: 'Онлайн-регистрация',
    desc_he: 'טופס רישום עצמי ללקוחות חדשים',
    desc_ru: 'Форма самостоятельной регистрации новых клиентов',
  },
  {
    key: 'whatsapp',
    name_he: 'תזכורות ווטסאפ',
    name_ru: 'WhatsApp-напоминания',
    desc_he: 'שליחת תזכורות אוטומטיות בווטסאפ',
    desc_ru: 'Автоматические напоминания и сообщения в WhatsApp',
  },
  {
    key: 'branches',
    name_he: 'סניפים',
    name_ru: 'Филиалы',
    desc_he: 'ניהול מספר סניפים',
    desc_ru: 'Управление несколькими филиалами',
  },
  {
    key: 'loyalty',
    name_he: 'תוכנית נאמנות',
    name_ru: 'Программа лояльности',
    desc_he: 'נקודות, הטבות ומבצעים ללקוחות',
    desc_ru: 'Баллы, бонусы и акции для клиентов',
  },
  {
    key: 'analytics',
    name_he: 'אנליטיקה מורחבת',
    name_ru: 'Расширенная аналитика',
    desc_he: 'דשבורד, גרפים והוחות עסקיים מפורטים',
    desc_ru: 'Дашборд, графики и детальные бизнес-отчёты',
  },
  {
    key: 'inventory',
    name_he: 'מלאי',
    name_ru: 'Склад товаров',
    desc_he: 'ניהול מלאי ומוצרים',
    desc_ru: 'Управление складом и товарами',
  },
  {
    key: 'tasks',
    name_he: 'משימות',
    name_ru: 'Задачи',
    desc_he: 'ניהול משימות ותזכורות פנימיות',
    desc_ru: 'Управление внутренними задачами и напоминаниями',
  },
  {
    key: 'payments',
    name_he: 'תשלומים',
    name_ru: 'Платежи',
    desc_he: 'ניהול תשלומים וחשבוניות',
    desc_ru: 'Управление платежами и счетами',
  },
  {
    key: 'sales',
    name_he: 'מכירות',
    name_ru: 'Продажи',
    desc_he: 'ניהול מכירות ועסקאות',
    desc_ru: 'Управление продажами и сделками',
  },
  {
    key: 'finances',
    name_he: 'פיננסים',
    name_ru: 'Финансы',
    desc_he: 'הכנסות, הוצאות ודוחות פיננסיים',
    desc_ru: 'Доходы, расходы и финансовые отчёты',
  },
  {
    key: 'processing',
    name_he: 'סליקה / כרטיסי אשראי',
    name_ru: 'Кредитные карты / סליקה',
    desc_he: 'עיבוד תשלומים בכרטיס אשראי דרך Tranzila',
    desc_ru: 'Приём платежей по кредитным картам через Tranzila',
  },
  {
    key: 'kira',
    name_he: '✨ Kira AI',
    name_ru: '✨ Kira AI',
    desc_he: 'סייענת חכמה לניהול עסק',
    desc_ru: 'ИИ-ассистент для управления бизнесом',
  },
]

/** Все канонические ключи для инициализации modules объекта */
export const ALL_MODULE_KEYS = MODULES.map(m => m.key)

/**
 * Инициализирует полный объект модулей для организации.
 * Берёт существующие значения из saved, для новых ключей — false.
 * Не удаляет устаревшие ключи (diary, sms и т.д.) — они остаются в БД.
 */
export function initModulesState(
  saved: Record<string, boolean> = {}
): Record<string, boolean> {
  const result: Record<string, boolean> = { ...saved }
  for (const m of MODULES) {
    if (!(m.key in result)) {
      result[m.key] = false
    }
  }
  return result
}

/**
 * Применяет связанные ключи: если clients переключили — visits идёт следом.
 */
export function applyLinkedKeys(
  state: Record<string, boolean>,
  changedKey: string,
  newValue: boolean
): Record<string, boolean> {
  const mod = MODULES.find(m => m.key === changedKey)
  const updated = { ...state, [changedKey]: newValue }
  if (mod?.linkedKeys) {
    for (const linked of mod.linkedKeys) {
      updated[linked] = newValue
    }
  }
  return updated
}

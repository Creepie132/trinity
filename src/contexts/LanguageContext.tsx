'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Language = 'he' | 'ru'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  dir: 'rtl' | 'ltr'
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Translations
const translations: Record<Language, Record<string, string>> = {
  he: {
    // Navigation
    'nav.dashboard': 'דשבורד',
    'nav.clients': 'לקוחות',
    'nav.payments': 'תשלומים',
    'nav.sms': 'הודעות SMS',
    'nav.stats': 'סטטיסטיקה',
    'nav.partners': 'הצעות שותפים',
    'nav.settings': 'הגדרות',
    'nav.admin': 'פאנל ניהול',
    'nav.darkMode': 'מצב כהה',
    'nav.lightMode': 'מצב בהיר',
    'nav.myProfile': 'הפרופיל שלי',
    'nav.logout': 'יציאה מהמערכת',
    'nav.backToMain': 'חזרה לדשבורד הראשי',
    
    // Admin Navigation
    'admin.dashboard': 'לוח בקרה',
    'admin.organizations': 'ארגונים',
    'admin.billing': 'חיובים',
    'admin.ads': 'פרסום',
    'admin.settings': 'הגדרות',
    
    // Settings
    'settings.title': 'הגדרות',
    'settings.subtitle': 'נהל את העדפות המערכת שלך',
    'settings.display': 'תצוגה',
    'settings.display.desc': 'צבעים, עיצוב, תבניות',
    'settings.language': 'שפה',
    'settings.language.desc': 'שפת ממשק וכיוון תצוגה',
    'settings.advanced': 'הגדרות נוספות',
    'settings.advanced.desc': 'הגדרות מתקדמות יתווספו בעתיד',
    
    // Display Settings
    'display.title': 'הגדרות תצוגה',
    'display.subtitle': 'התאם את המראה והתחושה של הממשק',
    'display.back': 'חזרה להגדרות',
    'display.colorTheme': 'ערכת נושא חזותית',
    'display.colorTheme.desc': 'בחר את צבע הממשק המועדף עליך',
    'display.darkMode': 'מצב כהה',
    'display.darkMode.desc': 'עבור לממשק כהה (Dark Mode)',
    'display.layout': 'סגנון תצוגה (Layout)',
    'display.layout.desc': 'שנה את אופן התצוגה של הנתונים והכרטיסים',
    'display.customize': 'התאמה מתקדמת',
    'display.customize.desc': 'שליטה מלאה על כל פרט בממשק',
    'display.customize.btn': 'פתח התאמה מתקדמת',
    
    // Language Settings
    'language.title': 'הגדרות שפה',
    'language.subtitle': 'שנה את שפת הממשק וכיוון התצוגה',
    'language.back': 'חזרה להגדרות',
    'language.select': 'בחר שפה',
    'language.select.desc': 'שפת הממשק תשתנה מיד',
    'language.hebrew': 'עברית',
    'language.russian': 'Русский',
    'language.direction': 'כיוון תצוגה',
    'language.rtl': 'ימין לשמאל (RTL)',
    'language.ltr': 'שמאל לימין (LTR)',
    
    // Themes
    'theme.default': 'כחול (ברירת מחדל)',
    'theme.purple': 'סגול',
    'theme.green': 'ירוק',
    'theme.orange': 'כתום',
    'theme.pink': 'ורוד',
    'theme.dark': 'כהה (אינדיגו)',
    
    // Layouts
    'layout.classic': 'קלאסי',
    'layout.classic.desc': 'טבלאות ומינימליזם',
    'layout.modern': 'מודרני',
    'layout.modern.desc': 'כרטיסים גדולים וצללים',
    'layout.compact': 'צפוף',
    'layout.compact.desc': 'יותר מידע במסך',
    
    // Dashboard
    'dashboard.welcome': 'ברוכים הבאים ל-Trinity',
    'dashboard.subtitle': 'מערכת ניהול לקוחות, תשלומים והודעות SMS',
    'dashboard.totalClients': 'סה״כ לקוחות',
    'dashboard.visitsMonth': 'ביקורים החודש',
    'dashboard.revenueMonth': 'הכנסות החודש',
    'dashboard.inactiveClients': 'לקוחות לא פעילים',
    'dashboard.inactiveNote': '30+ ימים ללא ביקור',
    
    // Common
    'common.loading': 'טוען נתונים...',
    'common.save': 'שמור',
    'common.cancel': 'ביטול',
    'common.close': 'סגור',
    'common.back': 'חזרה',
    'common.logout': 'התנתק',
  },
  ru: {
    // Navigation
    'nav.dashboard': 'Дашборд',
    'nav.clients': 'Клиенты',
    'nav.payments': 'Платежи',
    'nav.sms': 'SMS сообщения',
    'nav.stats': 'Статистика',
    'nav.partners': 'Партнёрские предложения',
    'nav.settings': 'Настройки',
    'nav.admin': 'Панель управления',
    'nav.darkMode': 'Тёмная тема',
    'nav.lightMode': 'Светлая тема',
    'nav.myProfile': 'Мой профиль',
    'nav.logout': 'Выйти из системы',
    'nav.backToMain': 'Вернуться в главный дашборд',
    
    // Admin Navigation
    'admin.dashboard': 'Панель управления',
    'admin.organizations': 'Организации',
    'admin.billing': 'Оплата',
    'admin.ads': 'Реклама',
    'admin.settings': 'Настройки',
    
    // Settings
    'settings.title': 'Настройки',
    'settings.subtitle': 'Управляйте настройками системы',
    'settings.display': 'Внешний вид',
    'settings.display.desc': 'Цвета, дизайн, темы',
    'settings.language': 'Язык',
    'settings.language.desc': 'Язык интерфейса и направление текста',
    'settings.advanced': 'Дополнительные настройки',
    'settings.advanced.desc': 'Будут добавлены в будущем',
    
    // Display Settings
    'display.title': 'Настройки внешнего вида',
    'display.subtitle': 'Настройте внешний вид интерфейса',
    'display.back': 'Назад к настройкам',
    'display.colorTheme': 'Цветовая тема',
    'display.colorTheme.desc': 'Выберите предпочитаемый цвет интерфейса',
    'display.darkMode': 'Тёмная тема',
    'display.darkMode.desc': 'Переключить на тёмный интерфейс (Dark Mode)',
    'display.layout': 'Стиль отображения (Layout)',
    'display.layout.desc': 'Измените способ отображения данных и карточек',
    'display.customize': 'Расширенная настройка',
    'display.customize.desc': 'Полный контроль над каждой деталью интерфейса',
    'display.customize.btn': 'Открыть расширенные настройки',
    
    // Language Settings
    'language.title': 'Настройки языка',
    'language.subtitle': 'Измените язык интерфейса и направление отображения',
    'language.back': 'Назад к настройкам',
    'language.select': 'Выберите язык',
    'language.select.desc': 'Интерфейс сразу переключится на выбранный язык',
    'language.hebrew': 'עברית',
    'language.russian': 'Русский',
    'language.direction': 'Направление текста',
    'language.rtl': 'Справа налево (RTL)',
    'language.ltr': 'Слева направо (LTR)',
    
    // Themes
    'theme.default': 'Синий (по умолчанию)',
    'theme.purple': 'Фиолетовый',
    'theme.green': 'Зелёный',
    'theme.orange': 'Оранжевый',
    'theme.pink': 'Розовый',
    'theme.dark': 'Тёмный (индиго)',
    
    // Layouts
    'layout.classic': 'Классический',
    'layout.classic.desc': 'Таблицы и минимализм',
    'layout.modern': 'Современный',
    'layout.modern.desc': 'Большие карточки с тенями',
    'layout.compact': 'Компактный',
    'layout.compact.desc': 'Больше информации на экране',
    
    // Dashboard
    'dashboard.welcome': 'Добро пожаловать в Trinity',
    'dashboard.subtitle': 'Система управления клиентами, платежами и SMS',
    'dashboard.totalClients': 'Всего клиентов',
    'dashboard.visitsMonth': 'Визиты за месяц',
    'dashboard.revenueMonth': 'Доход за месяц',
    'dashboard.inactiveClients': 'Неактивные клиенты',
    'dashboard.inactiveNote': '30+ дней без визита',
    
    // Common
    'common.loading': 'Загрузка данных...',
    'common.save': 'Сохранить',
    'common.cancel': 'Отмена',
    'common.close': 'Закрыть',
    'common.back': 'Назад',
    'common.logout': 'Выйти',
  },
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('he')

  useEffect(() => {
    // Load language from localStorage
    const saved = localStorage.getItem('trinity-language') as Language
    if (saved && (saved === 'he' || saved === 'ru')) {
      setLanguageState(saved)
      applyLanguage(saved)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('trinity-language', lang)
    applyLanguage(lang)
  }

  const applyLanguage = (lang: Language) => {
    const dir = lang === 'he' ? 'rtl' : 'ltr'
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.setAttribute('dir', dir)
  }

  const t = (key: string): string => {
    return translations[language][key] || key
  }

  const dir = language === 'he' ? 'rtl' : 'ltr'

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}

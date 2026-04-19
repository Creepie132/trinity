'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, ArrowRight, ArrowLeft, Check } from 'lucide-react'

type Language = 'he' | 'ru' | 'en'
type Screen = 'menu' | 'faq' | 'answer' | 'builder' | 'terminal' | 'terminal-tap' | 'terminal-physical' | 'summary' | 'services' | 'service-contact'
type Period = 1 | 3 | 6 | 12
type TapLicenses = 1 | 3 | 5 | 10

interface Module {
  id: string
  name: Record<Language, string>
  monthly: number
  setup: number
  required?: boolean
}

const MODULES: Module[] = [
  {
    id: 'core',
    name: {
      he: 'ליבה בסיסית (בסיס לקוחות + יומן)',
      ru: 'Базовое ядро (Клиенты + Визиты)',
      en: 'Core (Clients + Visits)'
    },
    monthly: 99,
    setup: 350,
    required: true
  },
  {
    id: 'booking',
    name: {
      he: 'הזמנות אונליין (Self-booking)',
      ru: 'Онлайн-запись (Self-booking)',
      en: 'Online Booking (Self-booking)'
    },
    monthly: 59,
    setup: 150
  },
  {
    id: 'inventory',
    name: {
      he: 'ניהול מלאי',
      ru: 'Складской учёт',
      en: 'Inventory Management'
    },
    monthly: 49,
    setup: 150
  },
  {
    id: 'payment_digital',
    name: {
      he: 'טרמינל תשלום דיגיטלי',
      ru: 'Платёжный терминал Digital',
      en: 'Digital Payment Terminal'
    },
    monthly: 119,
    setup: 450
  },
  {
    id: 'bit',
    name: {
      he: 'הפעלת bit',
      ru: 'Активация bit',
      en: 'bit Activation'
    },
    monthly: 0,
    setup: 250
  },
  {
    id: 'recurring',
    name: {
      he: 'תשלומים חוזרים',
      ru: 'Рекуррентные платежи',
      en: 'Recurring Payments'
    },
    monthly: 199,
    setup: 450
  },
  {
    id: 'apple_google_pay',
    name: {
      he: 'Apple Pay / Google Pay',
      ru: 'Apple Pay / Google Pay',
      en: 'Apple Pay / Google Pay'
    },
    monthly: 49,
    setup: 250
  },
  {
    id: 'stats_reports',
    name: {
      he: 'סטטיסטיקה + דוחות',
      ru: 'Статистика + Отчёты',
      en: 'Statistics + Reports'
    },
    monthly: 49,
    setup: 200
  },
  {
    id: 'telegram',
    name: {
      he: 'התראות טלגרם',
      ru: 'Уведомления в Telegram',
      en: 'Telegram Notifications'
    },
    monthly: 29,
    setup: 100
  },
  {
    id: 'loyalty',
    name: {
      he: 'תוכנית נאמנות',
      ru: 'Программа лояльности',
      en: 'Loyalty Program'
    },
    monthly: 39,
    setup: 100
  },
  {
    id: 'birthday',
    name: {
      he: 'הודעות יום הולדת',
      ru: 'Поздравления с ДР',
      en: 'Birthday Greetings'
    },
    monthly: 19,
    setup: 100
  }
]

const translations: Record<string, Record<Language, string>> = {
  greeting: {
    he: 'שלום! 👋 אני העוזר הדיגיטלי של Amber Solutions. איך אוכל לעזור?',
    ru: 'Привет! 👋 Я цифровой помощник Amber Solutions. Чем могу помочь?',
    en: "Hi! 👋 I'm the Amber Solutions digital assistant. How can I help?"
  },
  menuFaq: { he: '❓ שאלות נפוצות', ru: '❓ Частые вопросы', en: '❓ FAQ' },
  menuBuilder: { he: '🧮 הרכבה מודולרית', ru: '🧮 Модульная сборка', en: '🧮 Modular Builder' },
  menuServices: { he: '🚀 שירותים נוספים', ru: '🚀 Другие услуги', en: '🚀 More Services' },
  menuHuman: { he: '👤 לדבר עם נציג אנושי', ru: '👤 Связаться с человеком', en: '👤 Talk to a Human' },
  backToMenu: { he: 'חזרה לתפריט ←', ru: '← Назад в меню', en: '← Back to Menu' },
  builderTitle: { he: 'בנה את המערכת שלך', ru: 'Собери свою систему', en: 'Build Your System' },
  builderContinue: { he: 'המשך', ru: 'Далее', en: 'Continue' },
  builderSetup: { he: 'Setup', ru: 'Setup', en: 'Setup' },
  builderMonthly: { he: 'מנוי חודשי', ru: 'Подписка', en: 'Monthly' },
  builderSavings: { he: 'חיסכון שנתי', ru: 'Экономия за год', en: 'Yearly Savings' },
  builderDiscount: { he: 'הנחה', ru: 'Скидка', en: 'Discount' },
  builderProgress: { he: 'בחר עוד X מודולים לקבלת 20% הנחה על Setup', ru: 'Выбери ещё X модулей для 20% скидки на Setup', en: 'Select X more modules for 20% Setup discount' },
  builderDiscountActive: { he: '🎉 הנחת 20% על Setup הופעלה!', ru: '🎉 Скидка 20% на Setup активирована!', en: '🎉 20% Setup discount activated!' },
  inputPlaceholder: { he: 'כתוב הודעה...', ru: 'Напишите сообщение...', en: 'Type a message...' },
  online: { he: 'Online', ru: 'Online', en: 'Online' },
  
  // Terminal selection
  terminalQuestion: { 
    he: 'איך אתם מתכננים לקבל תשלומים מלקוחות במקום?', 
    ru: 'Как вы планируете принимать оплату от клиентов на месте?', 
    en: 'How do you plan to accept payments from clients on-site?' 
  },
  terminalTap: { he: 'Tap on Phone', ru: 'Tap on Phone', en: 'Tap on Phone' },
  terminalTapDesc: { 
    he: 'הפכו את האנדרואיד שלכם לטרמינל. בלי ציוד נוסף', 
    ru: 'Превратите свой Android в терминал. Без дополнительного оборудования', 
    en: 'Turn your Android into a terminal. No extra hardware' 
  },
  terminalPhysical: { he: 'טרמינל פיזי A8900', ru: 'Физический терминал A8900', en: 'Physical Terminal A8900' },
  terminalPhysicalDesc: { 
    he: 'מכשיר מקצועי עם הדפסת קבלות ותמיכה בכל הכרטיסים', 
    ru: 'Профессиональное устройство с печатью чеков и поддержкой всех карт', 
    en: 'Professional device with receipt printing and all card support' 
  },
  terminalTapQuestion: { 
    he: 'על כמה מכשירים (טלפונים של עובדים) צריך להפעיל רישיון?', 
    ru: 'На скольких устройствах (телефонах сотрудников) нужно активировать лицензию?', 
    en: 'On how many devices (employee phones) do you need to activate a license?' 
  },
  terminalPhysicalQuestion: { 
    he: 'כמה מכשירים דרושים לכם?', 
    ru: 'Сколько устройств вам нужно?', 
    en: 'How many devices do you need?' 
  },
  terminalOther: { he: 'אחר...', ru: 'Другое...', en: 'Other...' },
  toSummary: { he: 'לסיכום הזמנה', ru: 'К итогу заказа', en: 'To Order Summary' },
  
  // Order Summary
  summaryTitle: { he: 'סיכום הזמנה', ru: 'Итог заказа', en: 'Order Summary' },
  summaryModules: { he: 'מודולים שנבחרו', ru: 'Выбранные модули', en: 'Selected Modules' },
  summaryTerminals: { he: 'ציוד תשלום', ru: 'Оборудование для оплаты', en: 'Payment Equipment' },
  summarySetupOnce: { he: 'Setup (חד פעמי)', ru: 'Setup (единоразово)', en: 'Setup (one-time)' },
  summaryMonthly: { he: 'מנוי חודשי', ru: 'Ежемесячная подписка', en: 'Monthly Subscription' },
  summaryYearlySavings: { he: 'חיסכון שנתי', ru: 'Годовая экономия', en: 'Yearly Savings' },
  summaryPlan: { he: 'תוכנית X חודשים', ru: 'План на X месяцев', en: 'X-month Plan' },
  summaryToPayment: { he: 'לתשלום', ru: 'К оплате', en: 'To Payment' },
  summaryBackToEdit: { he: 'חזרה לעריכה', ru: 'Вернуться к редактированию', en: 'Back to Edit' },
  summaryThankYou: { 
    he: 'תודה על ההזמנה! נציג שלנו יצור איתך קשר בקרוב לסיום ההרשמה.', 
    ru: 'Спасибо за заказ! Наш представитель свяжется с вами в ближайшее время для завершения регистрации.', 
    en: 'Thank you for your order! Our representative will contact you soon to complete the registration.' 
  },
  summaryPhoneEmail: { he: 'טלפון או Email', ru: 'Телефон или Email', en: 'Phone or Email' },
  summaryAgreeTerms: { 
    he: 'קראתי ואני מסכים/ה ל', 
    ru: 'Я прочитал и согласен с', 
    en: 'I have read and agree to' 
  },
  summaryTermsLink: { he: 'תקנון השימוש', ru: 'условиями использования', en: 'Terms of Service' },
  summaryPolicyLink: { he: 'מדיניות הביטולים', ru: 'политикой возвратов', en: 'Cancellation Policy' },
  summaryAnd: { he: 'ול', ru: 'и', en: 'and' },
  
  // Additional Services
  servicesTitle: { he: 'שירותים נוספים', ru: 'Дополнительные услуги', en: 'Additional Services' },
  serviceWeb: { he: 'פיתוח אתרים', ru: 'Разработка Web-сайтов', en: 'Web Development' },
  serviceWebDesc: { 
    he: 'אתרים מותאמים אישית לעסקים, חנויות אונליין ודפי נחיתה', 
    ru: 'Индивидуальные сайты для бизнеса, онлайн-магазины и лендинги', 
    en: 'Custom websites for businesses, online stores and landing pages' 
  },
  serviceBots: { he: 'בוטים חכמים (WhatsApp & Telegram)', ru: 'AI-боты (WhatsApp & Telegram)', en: 'AI Bots (WhatsApp & Telegram)' },
  serviceBotsDesc: { 
    he: 'אוטומציה של תקשורת עם לקוחות 24/7', 
    ru: 'Автоматизация коммуникации с клиентами 24/7', 
    en: 'Automate client communication 24/7' 
  },
  serviceLanding: { he: 'דפי נחיתה מכירתיים', ru: 'Продающие лендинги', en: 'Sales Landing Pages' },
  serviceLandingDesc: { 
    he: 'דפי נחיתה ממירים שמביאים לקוחות חדשים', 
    ru: 'Конверсионные лендинги, которые приводят новых клиентов', 
    en: 'Converting landing pages that bring new clients' 
  },
  serviceTurnkey: { he: 'ארכיטקטורה דיגיטלית \'מפתח\'', ru: 'Цифровая архитектура «под ключ»', en: 'Digital Architecture \'Turnkey\'' },
  serviceTurnkeyDesc: { 
    he: 'פרויקטים מותאמים אישית בהתאם לצרכים שלך', 
    ru: 'Индивидуальные проекты по согласованию', 
    en: 'Custom projects tailored to your needs' 
  },
  serviceContactTitle: { 
    he: 'תודה על ההתעניינות! נציג שלנו יצור איתך קשר. השאר את הפרטים שלך:', 
    ru: 'Спасибо за интерес! Наш специалист свяжется с вами. Оставьте ваши данные:', 
    en: 'Thanks for your interest! Our specialist will contact you. Leave your details:' 
  },
  serviceContactName: { he: 'שם מלא', ru: 'Полное имя', en: 'Full Name' },
  serviceContactPhone: { he: 'טלפון', ru: 'Телефон', en: 'Phone' },
  serviceContactSend: { he: 'שלח', ru: 'Отправить', en: 'Send' },
  serviceContactSuccess: { 
    he: 'תודה! נציג שלנו יצור איתך קשר בקרוב.', 
    ru: 'Спасибо! Наш специалист свяжется с вами в ближайшее время.', 
    en: 'Thank you! Our specialist will contact you soon.' 
  },
  
  // Human Operator
  operatorWaiting: { 
    he: 'הבקשה שלך נשלחה לנציג. המתן לתשובה, נעדכן אותך כאן.', 
    ru: 'Ваш запрос отправлен специалисту. Ожидайте ответа, мы уведомим вас здесь.', 
    en: 'Your request has been sent to a specialist. Please wait, we\'ll notify you here.' 
  },
  operatorReply: { 
    he: 'נציג יענה בהקדם', 
    ru: 'Оператор ответит в ближайшее время', 
    en: 'Operator will reply soon' 
  }
}

const faqData: Record<string, { question: Record<Language, string>, answer: Record<Language, string> }> = {
  q1: {
    question: {
      he: '?מה זה מערכת CRM',
      ru: 'Что такое CRM-система?',
      en: 'What is a CRM system?'
    },
    answer: {
      he: 'זה ה\'מוח הדיגיטלי\' של העסק שלך. במקום אחד נמצאים תורי לקוחות, היסטוריית תורים, תשלומים, מלאי ושליחת SMS אוטומטית. בלי עוד פנקסים וטבלאות אקסל.',
      ru: 'Это «цифровой мозг» твоего бизнеса. В одном месте собраны записи клиентов, история визитов, оплаты, остатки на складе и автоматическая отправка SMS. Больше никаких блокнотов и Excel-таблиц.',
      en: 'It\'s the \'digital brain\' of your business. Client records, visit history, payments, inventory, and automated SMS — all in one place. No more notebooks and spreadsheets.'
    }
  },
  q2: {
    question: {
      he: '?למה זה נחוץ לעסק',
      ru: 'Зачем это нужно бизнесу?',
      en: 'Why does my business need this?'
    },
    answer: {
      he: 'Trinity CRM מאפשר לך לנהל את העסק בצורה חכמה: תורים, תזכורות, תשלומים ומלאי — הכל במקום אחד. במקום הודעות ורישומים ידניים — מערכת ברורה שחוסכת לך זמן ומגדילה הכנסות.',
      ru: 'Trinity CRM автоматизирует рутину: запись клиентов, напоминания, учёт платежей и склада — всё в одном месте. Вместо мессенджеров и бумажек — чёткая система. Вы тратите меньше времени на администрирование и больше — на клиентов.',
      en: 'Trinity CRM automates your daily routine: client bookings, reminders, payments and inventory — all in one place. Replace WhatsApp chaos and paper notebooks with a clear system. Spend less time on admin, more time on clients.'
    }
  },
  q3: {
    question: {
      he: '?באיזה שלב צריך להטמיע את Trinity',
      ru: 'На каком этапе пора внедрять Trinity?',
      en: 'When is the right time to implement Trinity?'
    },
    answer: {
      he: 'כשאתה מבלה יותר מ-30 דקות ביום על ניהול תורים, תזכורות או חישוב הכנסות — הגיע הזמן. Trinity מתאים מהלקוח הראשון וגדל יחד עם העסק שלך.',
      ru: 'Как только вы тратите больше 30 минут в день на запись клиентов, напоминания или подсчёт выручки — пора. Trinity подходит с первого клиента и растёт вместе с вашим бизнесом.',
      en: 'When you spend more than 30 minutes a day managing bookings, reminders or revenue tracking — it\'s time. Trinity works from day one and scales with your business.'
    }
  },
  q4: {
    question: {
      he: '?איך מעבירים את כל הלקוחות שלי',
      ru: 'Как мне перенести всех своих клиентов?',
      en: 'How do I migrate my existing clients?'
    },
    answer: {
      he: 'אנחנו נעשה את זה בשבילך. פשוט תייצא את הקובץ מאקסל או ממערכת אחרת בפורמט CSV, ואנחנו \'נעביר\' את כל הלקוחות ל-Trinity עם כל ההיסטוריה שלהם. בלי הפסדים ובלי עצבים.',
      ru: 'Мы сделаем это за тебя. Просто выгрузи базу из Excel или другой системы в формате CSV, и мы «перевезём» всех клиентов в Trinity со всей их историей.',
      en: 'We\'ll do it for you. Just export your database from Excel or another system as CSV, and we\'ll migrate all clients with their full history.'
    }
  },
  q5: {
    question: {
      he: '?מה יקרה עם הנתונים אם ארצה להתנתק',
      ru: 'Что будет с базой, если я захочу отключиться?',
      en: 'What happens to my data if I leave?'
    },
    answer: {
      he: 'הנתונים שלך שייכים לך. בעת ביטול המנוי תקבל ייצוא מלא של בסיס הלקוחות בפורמט Excel/CSV. אנחנו לא נועלים נתונים ולא חוסמים ייצוא.',
      ru: 'Ваши данные принадлежат вам. При отключении вы получаете полный экспорт базы клиентов в Excel/CSV. Мы не удерживаем данные и не блокируем экспорт.',
      en: 'Your data belongs to you. When you cancel, you get a full export of your client database in Excel/CSV format. We never lock your data or block exports.'
    }
  },
  q6: {
    question: {
      he: '?כמה מוגנים הנתונים שלי',
      ru: 'Насколько защищены мои данные?',
      en: 'How secure is my data?'
    },
    answer: {
      he: 'ברמה של מערכות בנקאיות. אנחנו משתמשים בטכנולוגיית בידוד נתונים (RLS), מנהלים \'קופסה שחורה\' של כל הפעולות (Audit Log) ומאחסנים הכל בשרתים עולמיים של Vercel/Supabase. הבסיס שלך — המבצר שלך.',
      ru: 'На уровне банковских систем. Мы используем технологию изоляции данных (RLS), ведём «чёрный ящик» всех действий (Audit Log) и храним всё на мировых серверах Vercel/Supabase.',
      en: 'Bank-level security. We use data isolation technology (RLS), maintain a full audit log of all actions, and store everything on world-class Vercel/Supabase servers.'
    }
  }
}

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [language, setLanguage] = useState<Language>('he')
  const [isMobile, setIsMobile] = useState(false)
  const [screen, setScreen] = useState<Screen>('menu')
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)
  const [selectedModules, setSelectedModules] = useState<string[]>(['core'])
  const [period, setPeriod] = useState<Period>(1)
  const [showInput, setShowInput] = useState(false)
  
  // Terminal selection
  const [hasTapOnPhone, setHasTapOnPhone] = useState(false)
  const [hasPhysicalTerminal, setHasPhysicalTerminal] = useState(false)
  const [tapLicenses, setTapLicenses] = useState<TapLicenses>(1)
  const [physicalTerminalCount, setPhysicalTerminalCount] = useState(1)
  const [customTerminalCount, setCustomTerminalCount] = useState('')
  
  // Additional services
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [operatorRequestSent, setOperatorRequestSent] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-detect language from HTML lang attribute
  useEffect(() => {
    const htmlLang = document.documentElement.lang || 'he'
    if (htmlLang.startsWith('he')) {
      setLanguage('he')
    } else if (htmlLang.startsWith('ru')) {
      setLanguage('ru')
    } else if (htmlLang.startsWith('en')) {
      setLanguage('en')
    }
  }, [])

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 600)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-focus input on desktop when opened
  useEffect(() => {
    if (isOpen && !isMobile && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, isMobile])

  // Reset to menu when reopening
  useEffect(() => {
    if (isOpen) {
      setScreen('menu')
      setSelectedQuestion(null)
      setSelectedModules(['core'])
      setPeriod(1)
      setShowInput(false)
      setHasTapOnPhone(false)
      setHasPhysicalTerminal(false)
      setTapLicenses(1)
      setPhysicalTerminalCount(1)
      setCustomTerminalCount('')
      setSelectedService(null)
      setContactName('')
      setContactPhone('')
      setOperatorRequestSent(false)
    }
  }, [isOpen])

  const t = (key: string) => translations[key]?.[language] || key
  const dir = language === 'he' ? 'rtl' : 'ltr'

  const handleFaqClick = () => {
    setScreen('faq')
  }

  const handleBuilderClick = () => {
    setScreen('builder')
  }

  const handleQuestionClick = (questionKey: string) => {
    setSelectedQuestion(questionKey)
    setScreen('answer')
  }

  const handleBackToMenu = () => {
    setScreen('menu')
    setSelectedQuestion(null)
    setSelectedModules(['core'])
    setPeriod(1)
    setShowInput(false)
    setHasTapOnPhone(false)
    setHasPhysicalTerminal(false)
    setTapLicenses(1)
    setPhysicalTerminalCount(1)
    setCustomTerminalCount('')
    setSelectedService(null)
    setContactName('')
    setContactPhone('')
    setOperatorRequestSent(false)
    setAgreedToTerms(false)
  }

  const toggleModule = (moduleId: string) => {
    const module = MODULES.find(m => m.id === moduleId)
    if (module?.required) return

    setSelectedModules(prev => 
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    )
  }

  const calculatePricing = () => {
    const selectedMods = MODULES.filter(m => selectedModules.includes(m.id))
    
    // Monthly price from modules
    let monthlyTotal = selectedMods.reduce((sum, m) => sum + m.monthly, 0)
    
    // Add terminal monthly costs
    if (hasTapOnPhone) {
      const tapPrices: Record<TapLicenses, number> = { 1: 69, 3: 169, 5: 249, 10: 449 }
      monthlyTotal += tapPrices[tapLicenses]
    }
    if (hasPhysicalTerminal) {
      const termCount = customTerminalCount ? parseInt(customTerminalCount) || physicalTerminalCount : physicalTerminalCount
      monthlyTotal += termCount * 79
    }
    
    // Period discount
    const periodDiscounts: Record<Period, number> = { 1: 0, 3: 0.05, 6: 0.10, 12: 0.15 }
    const discount = periodDiscounts[period]
    let discountedMonthly = monthlyTotal * (1 - discount)
    
    // Min price constraint for 12 months
    if (period === 12 && discountedMonthly < 480) {
      discountedMonthly = 480
    }
    
    // Setup price from modules
    let setupTotal = selectedMods.reduce((sum, m) => sum + m.setup, 0)
    
    // Add terminal setup costs
    if (hasPhysicalTerminal) {
      const termCount = customTerminalCount ? parseInt(customTerminalCount) || physicalTerminalCount : physicalTerminalCount
      setupTotal += termCount * 1990
    }
    
    const setupDiscount = selectedModules.length >= 5 ? 0.20 : 0
    const discountedSetup = setupTotal * (1 - setupDiscount)
    
    // Yearly savings
    const yearlySavings = period > 1 ? (monthlyTotal - discountedMonthly) * 12 : 0
    
    return {
      monthlyBase: monthlyTotal,
      monthlyDiscounted: Math.round(discountedMonthly),
      setupBase: setupTotal,
      setupDiscounted: Math.round(discountedSetup),
      setupDiscount,
      periodDiscount: discount,
      yearlySavings: Math.round(yearlySavings),
      modulesLeft: Math.max(0, 5 - selectedModules.length)
    }
  }

  const pricing = calculatePricing()

  return (
    <>
      <style jsx global>{`
        @keyframes chat-open {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes chat-open-mobile {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .chat-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .chat-scrollbar::-webkit-scrollbar-track {
          background: #f8f6ff;
        }
        
        .chat-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 191, 0, 0.3);
          border-radius: 10px;
        }

        /* Prevent mobile keyboard from covering chat */
        @media (max-width: 600px) {
          body.chat-open {
            position: fixed;
            width: 100%;
            overflow: hidden;
          }
        }
      `}</style>

      {/* AI Assistant FAB Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen && isMobile) {
            document.body.classList.add('chat-open')
          } else {
            document.body.classList.remove('chat-open')
          }
        }}
        onMouseEnter={(e) => {
          if (!isMobile) {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = '0 6px 20px 0 rgba(0,0,0,0.35)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = isOpen ? 'scale(0.95)' : 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(0,0,0,0.25)'
        }}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#FFBF00',
          border: 'none',
          cursor: 'pointer',
          display: isOpen && isMobile ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px 0 rgba(0,0,0,0.25)',
          transform: isOpen ? 'scale(0.95)' : 'scale(1)',
          transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 9999,
          outline: 'none',
        }}
        aria-label="Open AI Assistant"
      >
        <MessageCircle
          size={28}
          strokeWidth={2.5}
          color="#1A1A1A"
        />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: isMobile ? '0' : '100px',
            right: isMobile ? '0' : '24px',
            width: isMobile ? '100%' : '400px',
            height: isMobile ? '100%' : '600px',
            maxHeight: isMobile ? '100vh' : 'calc(100vh - 120px)',
            zIndex: 10000,
            animation: isMobile ? 'chat-open-mobile 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'chat-open 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: isMobile ? 'none' : '1px solid rgba(255, 191, 0, 0.15)',
              borderRadius: isMobile ? '0' : '16px',
              boxShadow: isMobile ? 'none' : '0 8px 40px rgba(255, 191, 0, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #FFBF00, #FF6B35)',
                padding: isMobile ? '20px 16px' : '16px',
                borderRadius: isMobile ? '0' : '16px 16px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>✨</span>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                    Amber AI
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                    <span style={{ fontSize: '10px', color: 'white', opacity: 0.9 }}>{t('online')}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Language Switcher with Flags */}
                {(['he', 'ru', 'en'] as Language[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    style={{
                      width: '32px',
                      height: '32px',
                      fontSize: '16px',
                      background: language === lang ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                      border: 'none',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      opacity: language === lang ? 1 : 0.6
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'
                      e.currentTarget.style.opacity = '1'
                    }}
                    onMouseLeave={(e) => {
                      if (language !== lang) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.opacity = '0.6'
                      }
                    }}
                  >
                    {lang === 'he' ? '🇮🇱' : lang === 'ru' ? '🇷🇺' : '🇬🇧'}
                  </button>
                ))}

                {/* Close Button */}
                <button
                  onClick={() => {
                    setIsOpen(false)
                    document.body.classList.remove('chat-open')
                  }}
                  style={{
                    width: '32px',
                    height: '32px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ЗОНА 1: Область сообщений (scrollable) */}
            <div
              className="chat-scrollbar"
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '16px'
              }}
              dir={dir}
            >
              {/* Main Menu */}
              {screen === 'menu' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Greeting */}
                  <div
                    style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, rgba(255, 191, 0, 0.08), rgba(255, 107, 53, 0.08))',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 191, 0, 0.1)'
                    }}
                  >
                    <p style={{ color: '#1a1a1a', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
                      {t('greeting')}
                    </p>
                  </div>

                  {/* Menu buttons */}
                  {['menuFaq', 'menuBuilder', 'menuServices'].map(key => (
                    <button
                      key={key}
                      onClick={() => {
                        if (key === 'menuFaq') handleFaqClick()
                        if (key === 'menuBuilder') handleBuilderClick()
                        if (key === 'menuServices') setScreen('services')
                      }}
                      style={{
                        padding: '14px 16px',
                        background: '#f8f6ff',
                        border: '1px solid rgba(255, 191, 0, 0.1)',
                        borderRadius: '16px',
                        color: '#1a1a1a',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: dir === 'rtl' ? 'right' : 'left',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#FFBF00'
                        e.currentTarget.style.boxShadow = '0 2px 12px rgba(255, 191, 0, 0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 191, 0, 0.1)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      {t(key)}
                    </button>
                  ))}

                  {/* Human contact button */}
                  <button
                    onClick={async () => {
                      setShowInput(true)
                      setOperatorRequestSent(true)
                      
                      // Send notification to operator
                      try {
                        await fetch('/api/contact', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: 'Чат на лендинге',
                            email: 'chat@landing',
                            message: '🔔 Новый запрос из чата на лендинге! Клиент ждёт ответа.'
                          })
                        })
                      } catch (err) {
                        console.error('Failed to send operator notification:', err)
                      }
                    }}
                    style={{
                      padding: '14px 16px',
                      background: 'linear-gradient(135deg, #FFBF00, #FF6B35)',
                      border: 'none',
                      borderRadius: '16px',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 191, 0, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {t('menuHuman')}
                  </button>
                </div>
              )}

              {/* FAQ Questions */}
              {screen === 'faq' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.keys(faqData).map(qKey => (
                    <button
                      key={qKey}
                      onClick={() => handleQuestionClick(qKey)}
                      style={{
                        padding: '14px 16px',
                        background: '#f8f6ff',
                        border: '1px solid rgba(255, 191, 0, 0.1)',
                        borderRadius: '16px',
                        color: '#1a1a1a',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: dir === 'rtl' ? 'right' : 'left',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#FFBF00'
                        e.currentTarget.style.boxShadow = '0 2px 12px rgba(255, 191, 0, 0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 191, 0, 0.1)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      {faqData[qKey].question[language]}
                    </button>
                  ))}

                  {/* Back to Menu button */}
                  <button
                    onClick={handleBackToMenu}
                    style={{
                      padding: '14px 16px',
                      background: 'linear-gradient(135deg, #FFBF00, #FF6B35)',
                      border: 'none',
                      borderRadius: '16px',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 191, 0, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {t('backToMenu')}
                  </button>
                </div>
              )}

              {/* Answer Screen */}
              {screen === 'answer' && selectedQuestion && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Question */}
                  <div
                    style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, rgba(255, 191, 0, 0.08), rgba(255, 107, 53, 0.08))',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 191, 0, 0.1)'
                    }}
                  >
                    <p style={{ color: '#FFBF00', fontSize: '13px', fontWeight: 600, margin: 0, marginBottom: '8px' }}>
                      {faqData[selectedQuestion].question[language]}
                    </p>
                    <p style={{ color: '#1a1a1a', fontSize: '14px', margin: 0, lineHeight: '1.6' }}>
                      {faqData[selectedQuestion].answer[language]}
                    </p>
                  </div>

                  {/* Back to Menu button */}
                  <button
                    onClick={() => setScreen('faq')}
                    style={{
                      padding: '14px 16px',
                      background: 'linear-gradient(135deg, #FFBF00, #FF6B35)',
                      border: 'none',
                      borderRadius: '16px',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 191, 0, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {t('backToMenu')}
                  </button>
                </div>
              )}

              {/* Builder Screen */}
              {screen === 'builder' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Title */}
                  <div
                    style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, rgba(200, 146, 42, 0.12), rgba(255, 191, 0, 0.08))',
                      borderRadius: '16px',
                      border: '1px solid rgba(200, 146, 42, 0.2)'
                    }}
                  >
                    <h3 style={{ color: '#C8922A', fontSize: '16px', fontWeight: 700, margin: 0, marginBottom: '4px' }}>
                      {t('builderTitle')}
                    </h3>
                  </div>

                  {/* Period Selector */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {([1, 3, 6, 12] as Period[]).map(p => (
                      <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        style={{
                          flex: 1,
                          minWidth: '70px',
                          padding: '10px',
                          background: period === p ? '#C8922A' : '#f5f5f5',
                          color: period === p ? 'white' : '#666',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {p} {language === 'he' ? 'חודשים' : language === 'ru' ? 'мес' : 'mo'}
                      </button>
                    ))}
                  </div>

                  {/* Modules List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {MODULES.map(module => {
                      const isSelected = selectedModules.includes(module.id)
                      const isRequired = module.required

                      return (
                        <div
                          key={module.id}
                          onClick={() => !isRequired && toggleModule(module.id)}
                          style={{
                            padding: '12px',
                            background: isSelected ? 'rgba(200, 146, 42, 0.1)' : '#f9f9f9',
                            border: `1px solid ${isSelected ? '#C8922A' : '#e5e5e5'}`,
                            borderRadius: '12px',
                            cursor: isRequired ? 'not-allowed' : 'pointer',
                            opacity: isRequired ? 0.7 : 1,
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px'
                          }}
                        >
                          {/* Checkbox */}
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              border: `2px solid ${isSelected ? '#C8922A' : '#ccc'}`,
                              background: isSelected ? '#C8922A' : 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '2px'
                            }}
                          >
                            {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                          </div>

                          {/* Module Info */}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#333', marginBottom: '4px', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                              {module.name[language]}
                            </div>
                            <div style={{ fontSize: '11px', color: '#888', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                              ₪{module.monthly}/{language === 'he' ? 'חודש' : language === 'ru' ? 'мес' : 'mo'} · Setup ₪{module.setup}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                </div>
              )}

              {/* Terminal Selection Screen */}
              {screen === 'terminal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Question */}
                  <div
                    style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, rgba(200, 146, 42, 0.12), rgba(255, 191, 0, 0.08))',
                      borderRadius: '16px',
                      border: '1px solid rgba(200, 146, 42, 0.2)'
                    }}
                  >
                    <p style={{ color: '#C8922A', fontSize: '14px', fontWeight: 600, margin: 0, lineHeight: '1.5' }}>
                      {t('terminalQuestion')}
                    </p>
                  </div>

                  {/* Tap on Phone Option */}
                  <div
                    onClick={() => setHasTapOnPhone(!hasTapOnPhone)}
                    style={{
                      padding: '14px',
                      background: hasTapOnPhone ? 'rgba(200, 146, 42, 0.1)' : '#f9f9f9',
                      border: `1px solid ${hasTapOnPhone ? '#C8922A' : '#e5e5e5'}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: `2px solid ${hasTapOnPhone ? '#C8922A' : '#ccc'}`,
                        background: hasTapOnPhone ? '#C8922A' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px'
                      }}
                    >
                      {hasTapOnPhone && <Check size={14} color="white" strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '4px', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                        {t('terminalTap')}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.4', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                        {t('terminalTapDesc')}
                      </div>
                    </div>
                  </div>

                  {/* Physical Terminal Option */}
                  <div
                    onClick={() => setHasPhysicalTerminal(!hasPhysicalTerminal)}
                    style={{
                      padding: '14px',
                      background: hasPhysicalTerminal ? 'rgba(200, 146, 42, 0.1)' : '#f9f9f9',
                      border: `1px solid ${hasPhysicalTerminal ? '#C8922A' : '#e5e5e5'}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: `2px solid ${hasPhysicalTerminal ? '#C8922A' : '#ccc'}`,
                        background: hasPhysicalTerminal ? '#C8922A' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px'
                      }}
                    >
                      {hasPhysicalTerminal && <Check size={14} color="white" strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '4px', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                        {t('terminalPhysical')}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.4', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                        {t('terminalPhysicalDesc')}
                      </div>
                    </div>
                  </div>

                  {/* Continue Button */}
                  <button
                    onClick={() => {
                      if (hasTapOnPhone && hasPhysicalTerminal) {
                        setScreen('terminal-tap')
                      } else if (hasTapOnPhone) {
                        setScreen('terminal-tap')
                      } else if (hasPhysicalTerminal) {
                        setScreen('terminal-physical')
                      } else {
                        setScreen('summary')
                      }
                    }}
                    style={{
                      padding: '14px 16px',
                      background: 'linear-gradient(135deg, #C8922A, #FFBF00)',
                      border: 'none',
                      borderRadius: '16px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 14px rgba(200, 146, 42, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(200, 146, 42, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(200, 146, 42, 0.3)'
                    }}
                  >
                    {t('builderContinue')}
                  </button>

                  {/* Back Button */}
                  <button
                    onClick={() => setScreen('builder')}
                    style={{
                      padding: '14px 16px',
                      background: 'linear-gradient(135deg, #FFBF00, #FF6B35)',
                      border: 'none',
                      borderRadius: '16px',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 191, 0, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {t('backToMenu')}
                  </button>
                </div>
              )}

              {/* Terminal Tap Licenses Screen */}
              {screen === 'terminal-tap' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div
                    style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, rgba(200, 146, 42, 0.12), rgba(255, 191, 0, 0.08))',
                      borderRadius: '16px',
                      border: '1px solid rgba(200, 146, 42, 0.2)'
                    }}
                  >
                    <p style={{ color: '#C8922A', fontSize: '14px', fontWeight: 600, margin: 0, lineHeight: '1.5' }}>
                      {t('terminalTapQuestion')}
                    </p>
                  </div>

                  {/* License Options */}
                  {([1, 3, 5, 10] as TapLicenses[]).map(count => {
                    const prices: Record<TapLicenses, number> = { 1: 69, 3: 169, 5: 249, 10: 449 }
                    return (
                      <button
                        key={count}
                        onClick={() => setTapLicenses(count)}
                        style={{
                          padding: '14px 16px',
                          background: tapLicenses === count ? 'rgba(200, 146, 42, 0.1)' : '#f5f5f5',
                          border: `1px solid ${tapLicenses === count ? '#C8922A' : '#e5e5e5'}`,
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: tapLicenses === count ? '#C8922A' : '#666',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'center'
                        }}
                      >
                        {count} {language === 'he' ? 'רישיונות' : language === 'ru' ? 'лицензий' : 'licenses'} — ₪{prices[count]}/{language === 'he' ? 'חו' : language === 'ru' ? 'мес' : 'mo'}
                      </button>
                    )
                  })}

                  {/* Continue Button */}
                  <button
                    onClick={() => hasPhysicalTerminal ? setScreen('terminal-physical') : setScreen('summary')}
                    style={{
                      padding: '14px 16px',
                      background: 'linear-gradient(135deg, #C8922A, #FFBF00)',
                      border: 'none',
                      borderRadius: '16px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 14px rgba(200, 146, 42, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(200, 146, 42, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(200, 146, 42, 0.3)'
                    }}
                  >
                    {t('toSummary')}
                  </button>
                </div>
              )}

              {/* Physical Terminal Count Screen */}
              {screen === 'terminal-physical' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div
                    style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, rgba(200, 146, 42, 0.12), rgba(255, 191, 0, 0.08))',
                      borderRadius: '16px',
                      border: '1px solid rgba(200, 146, 42, 0.2)'
                    }}
                  >
                    <p style={{ color: '#C8922A', fontSize: '14px', fontWeight: 600, margin: 0, lineHeight: '1.5' }}>
                      {t('terminalPhysicalQuestion')}
                    </p>
                  </div>

                  {/* Count Options */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[1, 2, 3].map(count => (
                      <button
                        key={count}
                        onClick={() => {
                          setPhysicalTerminalCount(count)
                          setCustomTerminalCount('')
                        }}
                        style={{
                          flex: 1,
                          minWidth: '70px',
                          padding: '12px',
                          background: physicalTerminalCount === count && !customTerminalCount ? '#C8922A' : '#f5f5f5',
                          color: physicalTerminalCount === count && !customTerminalCount ? 'white' : '#666',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {count}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        const input = prompt(t('terminalOther'))
                        if (input && !isNaN(parseInt(input))) {
                          setCustomTerminalCount(input)
                        }
                      }}
                      style={{
                        flex: 1,
                        minWidth: '90px',
                        padding: '12px',
                        background: customTerminalCount ? '#C8922A' : '#f5f5f5',
                        color: customTerminalCount ? 'white' : '#666',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {customTerminalCount || t('terminalOther')}
                    </button>
                  </div>

                  {/* Price Display */}
                  <div
                    style={{
                      padding: '12px',
                      background: '#fff3cd',
                      border: '1px solid #ffc107',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#856404',
                      textAlign: 'center'
                    }}
                  >
                    {(() => {
                      const count = customTerminalCount ? parseInt(customTerminalCount) : physicalTerminalCount
                      return `${count} × ₪1,990 + ${count} × ₪79/חו = ₪${count * 1990} setup + ₪${count * 79}/חו`
                    })()}
                  </div>

                  {/* Continue Button */}
                  <button
                    onClick={() => setScreen('summary')}
                    style={{
                      padding: '14px 16px',
                      background: 'linear-gradient(135deg, #C8922A, #FFBF00)',
                      border: 'none',
                      borderRadius: '16px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 14px rgba(200, 146, 42, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(200, 146, 42, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(200, 146, 42, 0.3)'
                    }}
                  >
                    {t('toSummary')}
                  </button>
                </div>
              )}

              {/* Order Summary Screen */}
              {screen === 'summary' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Title */}
                  <div
                    style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, rgba(200, 146, 42, 0.12), rgba(255, 191, 0, 0.08))',
                      borderRadius: '16px',
                      border: '1px solid rgba(200, 146, 42, 0.2)',
                      textAlign: 'center'
                    }}
                  >
                    <h3 style={{ color: '#C8922A', fontSize: '18px', fontWeight: 700, margin: 0 }}>
                      {t('summaryTitle')}
                    </h3>
                  </div>

                  {/* Selected Modules */}
                  <div
                    style={{
                      padding: '16px',
                      background: '#f9f9f9',
                      borderRadius: '12px',
                      border: '1px solid #e5e5e5'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#666', marginBottom: '12px' }}>
                      📦 {t('summaryModules')}:
                    </div>
                    {MODULES.filter(m => selectedModules.includes(m.id)).map(mod => (
                      <div key={mod.id} style={{ fontSize: '12px', color: '#333', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>• {mod.name[language]}</span>
                        <span>₪{mod.monthly}/{language === 'he' ? 'חו' : language === 'ru' ? 'мес' : 'mo'}</span>
                      </div>
                    ))}
                  </div>

                  {/* Terminals */}
                  {(hasTapOnPhone || hasPhysicalTerminal) && (
                    <div
                      style={{
                        padding: '16px',
                        background: '#f9f9f9',
                        borderRadius: '12px',
                        border: '1px solid #e5e5e5'
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#666', marginBottom: '12px' }}>
                        💳 {t('summaryTerminals')}:
                      </div>
                      {hasTapOnPhone && (
                        <div style={{ fontSize: '12px', color: '#333', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>• {t('terminalTap')} ({tapLicenses} {language === 'he' ? 'רישיונות' : language === 'ru' ? 'лицензий' : 'licenses'})</span>
                          <span>₪{[69, 169, 249, 449][[1, 3, 5, 10].indexOf(tapLicenses)]}/{language === 'he' ? 'חו' : language === 'ru' ? 'мес' : 'mo'}</span>
                        </div>
                      )}
                      {hasPhysicalTerminal && (
                        <>
                          <div style={{ fontSize: '12px', color: '#333', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>• {t('terminalPhysical')} ({customTerminalCount || physicalTerminalCount}x)</span>
                            <span>₪{(customTerminalCount ? parseInt(customTerminalCount) : physicalTerminalCount) * 1990} setup</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#333', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                            <span></span>
                            <span>₪{(customTerminalCount ? parseInt(customTerminalCount) : physicalTerminalCount) * 79}/{language === 'he' ? 'חו' : language === 'ru' ? 'мес' : 'mo'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Total */}
                  <div
                    style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.98), rgba(50, 50, 50, 0.98))',
                      borderRadius: '16px',
                      border: '1px solid rgba(200, 146, 42, 0.3)',
                      color: 'white'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px' }}>🔧 {t('summarySetupOnce')}:</span>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#C8922A' }}>
                        ₪{pricing.setupDiscounted.toLocaleString()}
                        {pricing.setupDiscount > 0 && (
                          <span style={{ fontSize: '11px', textDecoration: 'line-through', color: '#888', marginRight: '6px' }}>
                            {' '}₪{pricing.setupBase.toLocaleString()}
                          </span>
                        )}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px' }}>💳 {t('summaryMonthly')}:</span>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#C8922A' }}>
                        ₪{pricing.monthlyDiscounted}/{language === 'he' ? 'חו' : language === 'ru' ? 'мес' : 'mo'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ccc' }}>
                      <span>{t('summaryPlan').replace('X', String(period))}</span>
                      {pricing.yearlySavings > 0 && <span>🏷️ {t('summaryYearlySavings')}: ₪{pricing.yearlySavings.toLocaleString()}</span>}
                    </div>
                  </div>

                  {/* Terms Checkbox */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '12px',
                      background: '#f9f9f9',
                      borderRadius: '12px',
                      border: '1px solid #e5e5e5',
                      cursor: 'pointer',
                      fontSize: '12px',
                      lineHeight: '1.5',
                      color: '#333'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      style={{
                        width: '18px',
                        height: '18px',
                        marginTop: '2px',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    />
                    <span>
                      {t('summaryAgreeTerms')}{' '}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#C8922A', textDecoration: 'underline', fontWeight: 600 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t('summaryTermsLink')}
                      </a>
                      {' '}{t('summaryAnd')}{' '}
                      <a
                        href="/policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#C8922A', textDecoration: 'underline', fontWeight: 600 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t('summaryPolicyLink')}
                      </a>
                    </span>
                  </label>

                  {/* Action Buttons */}
                  <button
                    onClick={() => {
                      const contact = prompt(t('summaryPhoneEmail'))
                      if (contact) {
                        alert(t('summaryThankYou'))
                        handleBackToMenu()
                      }
                    }}
                    disabled={!agreedToTerms}
                    style={{
                      padding: '14px 16px',
                      background: agreedToTerms 
                        ? 'linear-gradient(135deg, #C8922A, #FFBF00)' 
                        : '#ccc',
                      border: 'none',
                      borderRadius: '16px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: agreedToTerms ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 14px rgba(200, 146, 42, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(200, 146, 42, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(200, 146, 42, 0.3)'
                    }}
                  >
                    {t('summaryToPayment')}
                  </button>

                  <button
                    onClick={() => setScreen('builder')}
                    style={{
                      padding: '14px 16px',
                      background: 'linear-gradient(135deg, #FFBF00, #FF6B35)',
                      border: 'none',
                      borderRadius: '16px',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 191, 0, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {dir === 'rtl' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                    {t('summaryBackToEdit')}
                  </button>
                </div>
              )}

              {/* Additional Services Screen */}
              {screen === 'services' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Title */}
                  <div
                    style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, rgba(255, 191, 0, 0.08), rgba(255, 107, 53, 0.08))',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 191, 0, 0.1)',
                      textAlign: 'center'
                    }}
                  >
                    <h3 style={{ color: '#FFBF00', fontSize: '18px', fontWeight: 700, margin: 0 }}>
                      {t('servicesTitle')}
                    </h3>
                  </div>

                  {/* Service Cards */}
                  {[
                    { id: 'web', title: 'serviceWeb', desc: 'serviceWebDesc' },
                    { id: 'bots', title: 'serviceBots', desc: 'serviceBotsDesc' },
                    { id: 'landing', title: 'serviceLanding', desc: 'serviceLandingDesc' },
                    { id: 'turnkey', title: 'serviceTurnkey', desc: 'serviceTurnkeyDesc' }
                  ].map(service => (
                    <div
                      key={service.id}
                      onClick={() => {
                        setSelectedService(service.id)
                        setScreen('service-contact')
                      }}
                      style={{
                        padding: '16px',
                        background: '#f8f6ff',
                        border: '1px solid rgba(255, 191, 0, 0.1)',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#FFBF00'
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 191, 0, 0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 191, 0, 0.1)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '6px', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                        {t(service.title)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.5', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                        {t(service.desc)}
                      </div>
                    </div>
                  ))}

                  {/* Back to Menu button */}
                  <button
                    onClick={handleBackToMenu}
                    style={{
                      padding: '14px 16px',
                      background: 'linear-gradient(135deg, #FFBF00, #FF6B35)',
                      border: 'none',
                      borderRadius: '16px',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 191, 0, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {t('backToMenu')}
                  </button>
                </div>
              )}

              {/* Service Contact Form Screen */}
              {screen === 'service-contact' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Title */}
                  <div
                    style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, rgba(255, 191, 0, 0.08), rgba(255, 107, 53, 0.08))',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 191, 0, 0.1)'
                    }}
                  >
                    <p style={{ color: '#FFBF00', fontSize: '14px', fontWeight: 600, margin: 0, lineHeight: '1.6', textAlign: 'center' }}>
                      {t('serviceContactTitle')}
                    </p>
                  </div>

                  {/* Form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder={t('serviceContactName')}
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      style={{
                        padding: '12px 16px',
                        border: '1px solid rgba(255, 191, 0, 0.2)',
                        borderRadius: '12px',
                        fontSize: '13px',
                        outline: 'none',
                        direction: dir,
                        textAlign: dir === 'rtl' ? 'right' : 'left'
                      }}
                    />
                    <input
                      type="tel"
                      placeholder={t('serviceContactPhone')}
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      style={{
                        padding: '12px 16px',
                        border: '1px solid rgba(255, 191, 0, 0.2)',
                        borderRadius: '12px',
                        fontSize: '13px',
                        outline: 'none',
                        direction: dir,
                        textAlign: dir === 'rtl' ? 'right' : 'left'
                      }}
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={async () => {
                      if (!contactName || !contactPhone) {
                        alert(language === 'he' ? 'אנא מלא את כל השדות' : language === 'ru' ? 'Пожалуйста, заполните все поля' : 'Please fill all fields')
                        return
                      }

                      try {
                        const serviceNames = {
                          web: t('serviceWeb'),
                          bots: t('serviceBots'),
                          landing: t('serviceLanding'),
                          turnkey: t('serviceTurnkey')
                        }

                        await fetch('/api/contact', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: contactName,
                            email: contactPhone,
                            message: `Запрос на услугу: ${serviceNames[selectedService as keyof typeof serviceNames] || selectedService}`
                          })
                        })

                        alert(t('serviceContactSuccess'))
                        setContactName('')
                        setContactPhone('')
                        handleBackToMenu()
                      } catch (err) {
                        console.error('Failed to send contact form:', err)
                        alert('Error sending request. Please try again.')
                      }
                    }}
                    style={{
                      padding: '14px 16px',
                      background: 'linear-gradient(135deg, #FFBF00, #FF6B35)',
                      border: 'none',
                      borderRadius: '16px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 14px rgba(255, 191, 0, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 191, 0, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(255, 191, 0, 0.3)'
                    }}
                  >
                    {t('serviceContactSend')}
                  </button>

                  {/* Back Button */}
                  <button
                    onClick={() => setScreen('services')}
                    style={{
                      padding: '12px 16px',
                      background: '#f5f5f5',
                      border: '1px solid #e5e5e5',
                      borderRadius: '12px',
                      color: '#666',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {t('backToMenu')}
                  </button>
                </div>
              )}
            </div>

            {/* ЗОНА 2: Итоговая сумма (sticky, только для builder screen) */}
            {screen === 'builder' && (
              <div
                className="price-summary"
                style={{
                  flexShrink: 0,
                  borderTop: '1px solid rgba(200, 146, 42, 0.2)',
                  borderBottom: '1px solid rgba(200, 146, 42, 0.2)',
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, rgba(200, 146, 42, 0.12), rgba(255, 191, 0, 0.08))',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
                dir={dir}
              >
                {/* Setup */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>
                    {t('builderSetup')}:
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#C8922A' }}>
                    ₪{pricing.setupDiscounted.toLocaleString()}
                  </span>
                  {pricing.setupDiscount > 0 && (
                    <span style={{ fontSize: '11px', textDecoration: 'line-through', color: '#888' }}>
                      ₪{pricing.setupBase.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Monthly */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>
                    {t('builderMonthly')}:
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#C8922A' }}>
                    ₪{pricing.monthlyDiscounted}/{language === 'he' ? 'חו' : language === 'ru' ? 'м' : 'mo'}
                  </span>
                  {pricing.periodDiscount > 0 && (
                    <span style={{ fontSize: '11px', textDecoration: 'line-through', color: '#888' }}>
                      ₪{pricing.monthlyBase}
                    </span>
                  )}
                </div>

                {/* Yearly Savings */}
                {pricing.yearlySavings > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#666', fontWeight: 500 }}>
                      {t('builderSavings')}:
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#10B981' }}>
                      ₪{pricing.yearlySavings.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ЗОНА 3: Кнопки действий (только для builder screen) */}
            {screen === 'builder' && (
              <div
                style={{
                  flexShrink: 0,
                  borderTop: '1px solid rgba(255, 191, 0, 0.1)',
                  background: 'white',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Progress for Setup Discount */}
                {pricing.modulesLeft > 0 && (
                  <div
                    style={{
                      padding: '12px',
                      background: '#fff3cd',
                      border: '1px solid #ffc107',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#856404',
                      textAlign: 'center'
                    }}
                  >
                    {t('builderProgress').replace('X', String(pricing.modulesLeft))}
                  </div>
                )}

                {pricing.modulesLeft === 0 && pricing.setupDiscount > 0 && (
                  <div
                    style={{
                      padding: '12px',
                      background: '#d4edda',
                      border: '1px solid #28a745',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#155724',
                      textAlign: 'center'
                    }}
                  >
                    {t('builderDiscountActive')}
                  </div>
                )}

                {/* Continue Button */}
                <button
                  onClick={() => setScreen('terminal')}
                  style={{
                    padding: '14px 16px',
                    background: 'linear-gradient(135deg, #C8922A, #FFBF00)',
                    border: 'none',
                    borderRadius: '16px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 14px rgba(200, 146, 42, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(200, 146, 42, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(200, 146, 42, 0.3)'
                  }}
                >
                  {t('builderContinue')}
                </button>

                {/* Back to Menu button */}
                <button
                  onClick={handleBackToMenu}
                  style={{
                    padding: '14px 16px',
                    background: 'linear-gradient(135deg, #FFBF00, #FF6B35)',
                    border: 'none',
                    borderRadius: '16px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 191, 0, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {t('backToMenu')}
                </button>
              </div>
            )}

            {/* ЗОНА 4: Поле ввода (скрыто по умолчанию) */}
            {showInput && (
              <>
                {/* Operator Waiting Message */}
                {operatorRequestSent && (
                  <div
                    style={{
                      flexShrink: 0,
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))',
                      borderTop: '1px solid rgba(16, 185, 129, 0.2)',
                      borderBottom: '1px solid rgba(16, 185, 129, 0.2)'
                    }}
                  >
                    <p style={{ color: '#059669', fontSize: '12px', margin: 0, lineHeight: '1.5', textAlign: 'center' }}>
                      ✓ {t('operatorWaiting')}
                    </p>
                  </div>
                )}

                <div
                  style={{
                    flexShrink: 0,
                    borderTop: operatorRequestSent ? 'none' : '1px solid rgba(255, 191, 0, 0.1)',
                    background: '#fafafa',
                    padding: '16px',
                    animation: 'slideUp 0.3s ease-out'
                  }}
                >
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={t('inputPlaceholder')}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      border: '1px solid rgba(255, 191, 0, 0.2)',
                      borderRadius: '12px',
                      fontSize: '13px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      direction: dir,
                      textAlign: dir === 'rtl' ? 'right' : 'left'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#FFBF00'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 191, 0, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 191, 0, 0.2)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    style={{
                      width: '44px',
                      height: '44px',
                      background: 'linear-gradient(135deg, #FFBF00, #FF6B35)',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                  >
                    ➤
                  </button>
                </div>
              </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

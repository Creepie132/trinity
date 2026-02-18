'use client'

import { useState, useEffect } from 'react'
import { X, MessageCircle, ArrowLeft, Check } from 'lucide-react'

type Language = 'he' | 'ru' | 'en'

interface Translation {
  [key: string]: {
    he: string
    ru: string
    en: string
  }
}

const translations: Translation = {
  // Greeting
  greeting: {
    he: 'שלום! 👋 אני העוזר הדיגיטלי של Amber Solutions. איך אוכל לעזור?',
    ru: 'Привет! 👋 Я цифровой помощник Amber Solutions. Чем могу помочь?',
    en: "Hi! 👋 I'm the Amber Solutions digital assistant. How can I help?"
  },
  
  // Menu buttons
  menuFaq: {
    he: '❓ שאלות נפוצות',
    ru: '❓ Частые вопросы',
    en: '❓ FAQ'
  },
  menuCalculator: {
    he: '🧮 בנה את המערכת שלך',
    ru: '🧮 Собери свою систему',
    en: '🧮 Build Your System'
  },
  menuTrial: {
    he: '🎁 נסיון חינם 14 יום',
    ru: '🎁 Бесплатный тест 14 дней',
    en: '🎁 Free 14-Day Trial'
  },
  menuClients: {
    he: '⭐ מי כבר משתמש במערכת?',
    ru: '⭐ Кто уже пользуется?',
    en: '⭐ Who Uses Our System?'
  },
  menuServices: {
    he: '🚀 שירותים נוספים של Amber Solutions',
    ru: '🚀 Другие услуги Amber Solutions',
    en: '🚀 More Amber Solutions Services'
  },
  menuHuman: {
    he: '👤 לדבר עם נציג אנושי',
    ru: '👤 Связаться с человеком',
    en: '👤 Talk to a Human'
  },
  
  // FAQ questions
  faqQ1: {
    he: 'מה זה Trinity CRM?',
    ru: 'Что такое Trinity CRM?',
    en: 'What is Trinity CRM?'
  },
  faqQ2: {
    he: 'אילו פיצ\'רים יש במערכת?',
    ru: 'Какие функции есть?',
    en: 'What features are included?'
  },
  faqQ3: {
    he: 'כמה זה עולה?',
    ru: 'Сколько это стоит?',
    en: 'How much does it cost?'
  },
  faqQ4: {
    he: 'האם יש תמיכה טכנית?',
    ru: 'Есть техподдержка?',
    en: 'Is there tech support?'
  },
  faqQ5: {
    he: 'האם המערכת מתאימה לעסק שלי?',
    ru: 'Подходит ли система моему бизнесу?',
    en: 'Is it right for my business?'
  },
  faqQ6: {
    he: 'איך מתחילים?',
    ru: 'Как начать?',
    en: 'How do I start?'
  },
  
  // FAQ answers
  faqA1: {
    he: 'Trinity CRM היא מערכת ניהול לקוחות מתקדמת שפותחה במיוחד לעסקים בתחום השירותים - ספרות, מכוני יופי, קליניקות ועוד.',
    ru: 'Trinity CRM — это продвинутая система управления клиентами, созданная специально для сервисных бизнесов: салонов, клиник, студий красоты.',
    en: 'Trinity CRM is an advanced client management system designed specifically for service businesses: salons, clinics, beauty studios.'
  },
  faqA2: {
    he: 'ניהול לקוחות, תורים, תשלומים (Tranzilla), חשבוניות, מלאי, ברקוד, SMS שיווקי (Irida), ניתוח נתונים, הזמנות אונליין, ריבוי שפות, הרשאות משתמשים',
    ru: 'Управление клиентами, записи, платежи (Tranzilla), счета, инвентарь, сканер штрих-кодов, SMS-маркетинг (Irida), аналитика, онлайн-бронирование, мультиязычность, роли пользователей',
    en: 'Client management, appointments, payments (Tranzilla), invoices, inventory, barcode scanner, SMS marketing (Irida), analytics, online booking, multi-language, user roles'
  },
  faqA3: {
    he: 'המחיר משתנה בהתאם לפיצ\'רים שאתה צריך. השתמש במחשבון שלנו כדי לקבל הצעת מחיר מדויקת!',
    ru: 'Цена зависит от нужных вам функций. Используйте наш калькулятор для точного расчета!',
    en: 'Pricing depends on the features you need. Use our calculator for an accurate quote!'
  },
  faqA4: {
    he: 'כן! יש לנו תמיכה טכנית 24/7 בעברית, רוסית ואנגלית. אנחנו זמינים בוואטסאפ, אימייל וטלפון.',
    ru: 'Да! У нас есть техподдержка 24/7 на иврите, русском и английском. Доступны в WhatsApp, Email и по телефону.',
    en: 'Yes! We have 24/7 tech support in Hebrew, Russian, and English. Available via WhatsApp, Email, and phone.'
  },
  faqA5: {
    he: 'המערכת מתאימה לכל עסק שמנהל לקוחות ותורים - ספרות, מכוני יופי, קליניקות, מוסכים, חדרי כושר ועוד.',
    ru: 'Система подходит любому бизнесу с клиентами и записями — салоны, клиники, автосервисы, спортзалы и т.д.',
    en: 'The system fits any business managing clients and appointments — salons, clinics, auto shops, gyms, etc.'
  },
  faqA6: {
    he: 'פשוט! לחץ על "נסיון חינם 14 יום" ונציג שלנו יעזור לך להתחיל תוך 24 שעות.',
    ru: 'Просто! Нажмите "Бесплатный тест 14 дней" и наш менеджер поможет вам начать в течение 24 часов.',
    en: 'Easy! Click "Free 14-Day Trial" and our rep will help you get started within 24 hours.'
  },
  
  // Calculator
  calcTitle: {
    he: 'בחר את הפיצ\'רים שאתה צריך:',
    ru: 'Выберите нужные функции:',
    en: 'Select the features you need:'
  },
  calcSetup: {
    he: 'התקנה',
    ru: 'Установка',
    en: 'Setup'
  },
  calcMonthly: {
    he: 'מנוי/חודש',
    ru: 'Подписка/мес',
    en: 'Monthly'
  },
  calcCheckout: {
    he: 'המשך לתשלום →',
    ru: 'Перейти к оплате →',
    en: 'Proceed to Checkout →'
  },
  calcThankYou: {
    he: 'תודה על ההתעניינות! 🎉 נציג שלנו יצור איתך קשר תוך 24 שעות לסיום ההזמנה.',
    ru: 'Спасибо за интерес! 🎉 Наш менеджер свяжется с вами в течение 24 часов.',
    en: 'Thanks for your interest! 🎉 We\'ll contact you within 24 hours to complete your order.'
  },
  
  // Trial
  trialMessage: {
    he: '🎁 כן! אנחנו מציעים 14 ימי נסיון חינם על מערכת Trinity CRM. תקבל גישה מלאה לכל הפיצ\'רים בלי התחייבות. רוצה להתחיל?',
    ru: '🎁 Да! Мы предлагаем 14 дней бесплатного тестирования Trinity CRM. Полный доступ ко всем функциям без обязательств. Хотите начать?',
    en: '🎁 Yes! We offer a 14-day free trial of Trinity CRM. Full access to all features, no commitment. Want to start?'
  },
  trialYes: {
    he: 'כן, אני רוצה!',
    ru: 'Да, хочу!',
    en: 'Yes, I want!'
  },
  trialFormName: {
    he: 'שם מלא',
    ru: 'Полное имя',
    en: 'Full Name'
  },
  trialFormPhone: {
    he: 'טלפון',
    ru: 'Телефон',
    en: 'Phone'
  },
  trialFormEmail: {
    he: 'אימייל',
    ru: 'Email',
    en: 'Email'
  },
  trialFormBusiness: {
    he: 'סוג העסק',
    ru: 'Тип бизнеса',
    en: 'Business Type'
  },
  trialSubmit: {
    he: 'שלח בקשה',
    ru: 'Отправить',
    en: 'Submit'
  },
  trialSuccess: {
    he: 'תודה! נחזור אליך תוך 24 שעות 🎉',
    ru: 'Спасибо! Мы свяжемся в течение 24 часов 🎉',
    en: 'Thanks! We\'ll get back to you within 24 hours 🎉'
  },
  
  // Clients
  clientsMessage: {
    he: '⭐ Trinity CRM כבר משמשת עסקים בתחומי: יופי וקוסמטיקה 💅, ספרות ✂️, מספרות בארבר 💈, קליניקות 🏥. המערכת מתאימה לכל עסק שצריך לנהל לקוחות ותורים.',
    ru: '⭐ Trinity CRM уже используют бизнесы: салоны красоты 💅, парикмахерские ✂️, барбершопы 💈, клиники 🏥. Система подходит любому бизнесу с клиентами и записями.',
    en: '⭐ Trinity CRM is used by: beauty salons 💅, hair studios ✂️, barbershops 💈, clinics 🏥. Perfect for any business managing clients and appointments.'
  },
  
  // Services
  servicesTitle: {
    he: 'שירותים נוספים:',
    ru: 'Другие услуги:',
    en: 'Other Services:'
  },
  
  // Human contact
  humanMessage: {
    he: '👤 הבקשה שלך התקבלה! נציג אנושי יחזור אליך תוך 24 שעות. אם זה דחוף, כתוב לנו בוואטסאפ: 054-4858586',
    ru: '👤 Ваш запрос принят! Мы ответим в течение 24 часов. Если срочно — напишите в WhatsApp: 054-4858586',
    en: '👤 Request received! We\'ll get back to you within 24 hours. If urgent, message us on WhatsApp: 054-4858586'
  },
  humanWhatsApp: {
    he: 'פתח וואטסאפ',
    ru: 'Открыть WhatsApp',
    en: 'Open WhatsApp'
  },
  
  // Common
  back: {
    he: '→ חזרה לתפריט',
    ru: '← Назад в меню',
    en: '← Back to Menu'
  },
  online: {
    he: 'Online',
    ru: 'Online',
    en: 'Online'
  }
}

const features = [
  {
    id: 'crm',
    name: { he: 'ניהול לקוחות', ru: 'CRM + Клиенты', en: 'Client Management' },
    setup: 0,
    monthly: 149,
    disabled: true
  },
  {
    id: 'booking',
    name: { he: 'תורים אונליין', ru: 'Онлайн-запись', en: 'Online Booking' },
    setup: 500,
    monthly: 50
  },
  {
    id: 'payments',
    name: { he: 'תשלומים (Tranzilla)', ru: 'Платежи (Tranzilla)', en: 'Payments (Tranzilla)' },
    setup: 800,
    monthly: 70
  },
  {
    id: 'sms',
    name: { he: 'שיווק SMS', ru: 'SMS маркетинг (Irida)', en: 'SMS Marketing' },
    setup: 600,
    monthly: 60
  },
  {
    id: 'inventory',
    name: { he: 'מלאי + ברקוד', ru: 'Инвентарь + Штрих-код', en: 'Inventory + Barcode' },
    setup: 400,
    monthly: 40
  },
  {
    id: 'website',
    name: { he: 'הזמנות מהאתר', ru: 'Онлайн-бронирование (сайт)', en: 'Website Booking' },
    setup: 700,
    monthly: 50
  },
  {
    id: 'telegram',
    name: { he: 'בוט טלגרם', ru: 'Telegram бот', en: 'Telegram Bot' },
    setup: 1000,
    monthly: 50
  },
  {
    id: 'multilang',
    name: { he: 'ריבוי שפות', ru: 'Мультиязычность', en: 'Multi-Language' },
    setup: 300,
    monthly: 0
  }
]

const services = [
  { name: { he: 'אתר תדמית', ru: 'Сайт-визитка', en: 'Portfolio Site' }, price: { he: 'מ-₪2,500', ru: 'от ₪2,500', en: 'from ₪2,500' } },
  { name: { he: 'דף נחיתה', ru: 'Лендинг', en: 'Landing Page' }, price: { he: 'מ-₪1,500', ru: 'от ₪1,500', en: 'from ₪1,500' } },
  { name: { he: 'בוט טלגרם', ru: 'Telegram бот', en: 'Telegram Bot' }, price: { he: 'מ-₪1,000', ru: 'от ₪1,000', en: 'from ₪1,000' } },
  { name: { he: 'מערכת תורים', ru: 'Онлайн-запись', en: 'Booking System' }, price: { he: 'מ-₪1,500', ru: 'от ₪1,500', en: 'from ₪1,500' } },
  { name: { he: 'אינטגרציות', ru: 'Интеграции (Make/n8n)', en: 'Integrations' }, price: { he: 'מ-₪2,000', ru: 'от ₪2,000', en: 'from ₪2,000' } },
  { name: { he: 'פיתוח מותאם', ru: 'Кастомное ПО', en: 'Custom Software' }, price: { he: 'לפי בקשה', ru: 'По запросу', en: 'On Request' } }
]

type View = 'menu' | 'faq' | 'calculator' | 'trial' | 'clients' | 'services' | 'human' | 'faq-detail' | 'trial-form'

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [language, setLanguage] = useState<Language>('he')
  const [view, setView] = useState<View>('menu')
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['crm'])
  const [showCheckoutMessage, setShowCheckoutMessage] = useState(false)
  const [showTrialSuccess, setShowTrialSuccess] = useState(false)

  const t = (key: string) => translations[key]?.[language] || key
  const dir = language === 'he' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir)
  }, [dir])

  const calculatePrice = () => {
    const setup = features
      .filter(f => selectedFeatures.includes(f.id))
      .reduce((sum, f) => sum + f.setup, 0)
    const monthly = features
      .filter(f => selectedFeatures.includes(f.id))
      .reduce((sum, f) => sum + f.monthly, 0)
    return { setup, monthly }
  }

  const toggleFeature = (id: string) => {
    if (id === 'crm') return // Always enabled
    if (selectedFeatures.includes(id)) {
      setSelectedFeatures(selectedFeatures.filter(f => f !== id))
    } else {
      setSelectedFeatures([...selectedFeatures, id])
    }
  }

  const renderContent = () => {
    if (view === 'menu') {
      return (
        <div className="space-y-2">
          <div className="p-4 bg-gradient-to-br from-violet-500/10 to-blue-500/10 rounded-lg border border-violet-500/20 mb-4">
            <p className="text-gray-100 text-sm">{t('greeting')}</p>
          </div>
          
          <button onClick={() => setView('faq')} className="w-full p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left text-sm text-gray-100 transition-colors">
            {t('menuFaq')}
          </button>
          <button onClick={() => setView('calculator')} className="w-full p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left text-sm text-gray-100 transition-colors">
            {t('menuCalculator')}
          </button>
          <button onClick={() => setView('trial')} className="w-full p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left text-sm text-gray-100 transition-colors">
            {t('menuTrial')}
          </button>
          <button onClick={() => setView('clients')} className="w-full p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left text-sm text-gray-100 transition-colors">
            {t('menuClients')}
          </button>
          <button onClick={() => setView('services')} className="w-full p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left text-sm text-gray-100 transition-colors">
            {t('menuServices')}
          </button>
          <button onClick={() => setView('human')} className="w-full p-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 rounded-lg text-left text-sm text-white font-medium transition-all mt-4">
            {t('menuHuman')}
          </button>
        </div>
      )
    }

    if (view === 'faq') {
      return (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <button
              key={i}
              onClick={() => {
                setSelectedFaq(i)
                setView('faq-detail')
              }}
              className="w-full p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left text-sm text-gray-100 transition-colors"
            >
              {t(`faqQ${i}`)}
            </button>
          ))}
          <button onClick={() => setView('menu')} className="w-full p-2 text-sm text-gray-400 hover:text-gray-200 transition-colors mt-4">
            {t('back')}
          </button>
        </div>
      )
    }

    if (view === 'faq-detail' && selectedFaq) {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <p className="text-violet-400 font-medium text-sm mb-2">{t(`faqQ${selectedFaq}`)}</p>
            <p className="text-gray-100 text-sm">{t(`faqA${selectedFaq}`)}</p>
          </div>
          <button onClick={() => setView('faq')} className="w-full p-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
            {t('back')}
          </button>
        </div>
      )
    }

    if (view === 'calculator') {
      const { setup, monthly } = calculatePrice()
      
      if (showCheckoutMessage) {
        return (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm">{t('calcThankYou')}</p>
            </div>
            <button onClick={() => { setShowCheckoutMessage(false); setView('menu') }} className="w-full p-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
              {t('back')}
            </button>
          </div>
        )
      }

      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-300 mb-3">{t('calcTitle')}</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {features.map(feature => (
              <label
                key={feature.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  feature.disabled
                    ? 'bg-gray-800 opacity-60 cursor-not-allowed'
                    : selectedFeatures.includes(feature.id)
                    ? 'bg-violet-600/20 border border-violet-500/30'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedFeatures.includes(feature.id)}
                  onChange={() => toggleFeature(feature.id)}
                  disabled={feature.disabled}
                  className="w-4 h-4 accent-violet-500"
                />
                <span className="text-sm text-gray-100 flex-1">{feature.name[language]}</span>
              </label>
            ))}
          </div>
          
          <div className="p-4 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-lg mt-4">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-gray-300">{t('calcSetup')}:</span>
              <span className="text-orange-400 font-bold">₪{setup.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300">{t('calcMonthly')}:</span>
              <span className="text-amber-400 font-bold">₪{monthly}/חודש</span>
            </div>
          </div>

          <button
            onClick={() => setShowCheckoutMessage(true)}
            className="w-full p-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 rounded-lg text-white font-medium text-sm transition-all"
          >
            {t('calcCheckout')}
          </button>

          <button onClick={() => setView('menu')} className="w-full p-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
            {t('back')}
          </button>
        </div>
      )
    }

    if (view === 'trial') {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-lg">
            <p className="text-gray-100 text-sm">{t('trialMessage')}</p>
          </div>
          <button onClick={() => setView('trial-form')} className="w-full p-3 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium text-sm transition-colors">
            {t('trialYes')}
          </button>
          <button onClick={() => setView('menu')} className="w-full p-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
            {t('back')}
          </button>
        </div>
      )
    }

    if (view === 'trial-form') {
      if (showTrialSuccess) {
        return (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm">{t('trialSuccess')}</p>
            </div>
            <button onClick={() => { setShowTrialSuccess(false); setView('menu') }} className="w-full p-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
              {t('back')}
            </button>
          </div>
        )
      }

      return (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setShowTrialSuccess(true)
          }}
          className="space-y-3"
        >
          <input type="text" placeholder={t('trialFormName')} required className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-100 placeholder-gray-500" />
          <input type="tel" placeholder={t('trialFormPhone')} required className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-100 placeholder-gray-500" />
          <input type="email" placeholder={t('trialFormEmail')} required className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-100 placeholder-gray-500" />
          <input type="text" placeholder={t('trialFormBusiness')} required className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-100 placeholder-gray-500" />
          <button type="submit" className="w-full p-3 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium text-sm transition-colors">
            {t('trialSubmit')}
          </button>
          <button type="button" onClick={() => setView('trial')} className="w-full p-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
            {t('back')}
          </button>
        </form>
      )
    }

    if (view === 'clients') {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-lg">
            <p className="text-gray-100 text-sm">{t('clientsMessage')}</p>
          </div>
          <button onClick={() => setView('menu')} className="w-full p-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
            {t('back')}
          </button>
        </div>
      )
    }

    if (view === 'services') {
      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-300 mb-2">{t('servicesTitle')}</p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {services.map((service, i) => (
              <div key={i} className="p-3 bg-gray-800 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-100">{service.name[language]}</span>
                  <span className="text-xs text-orange-400 font-medium">{service.price[language]}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setView('menu')} className="w-full p-2 text-sm text-gray-400 hover:text-gray-200 transition-colors mt-4">
            {t('back')}
          </button>
        </div>
      )
    }

    if (view === 'human') {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-gray-100 text-sm mb-3">{t('humanMessage')}</p>
            <a
              href="https://wa.me/972544858586"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm font-medium transition-colors"
            >
              {t('humanWhatsApp')}
            </a>
          </div>
          <button onClick={() => setView('menu')} className="w-full p-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
            {t('back')}
          </button>
        </div>
      )
    }

    return null
  }

  return (
    <>
      <style jsx global>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
          }
          50% {
            box-shadow: 0 0 30px rgba(139, 92, 246, 0.7), 0 0 60px rgba(59, 130, 246, 0.3);
          }
        }
        
        @keyframes rotate-sphere {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        
        .ai-chat-button {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        
        .ai-chat-button:hover {
          transform: scale(1.1);
        }
        
        .sphere-container {
          position: relative;
          width: 48px;
          height: 48px;
        }
        
        .sphere {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, 
            rgba(59, 130, 246, 0.8), 
            rgba(139, 92, 246, 0.6), 
            rgba(0, 0, 0, 0.9));
          position: relative;
          overflow: hidden;
        }
        
        .sphere::before {
          content: '';
          position: absolute;
          inset: -50%;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 4px,
            rgba(59, 130, 246, 0.4) 4px,
            rgba(59, 130, 246, 0.4) 8px
          );
          animation: rotate-sphere 8s linear infinite;
          border-radius: 50%;
        }
        
        .sphere::after {
          content: '';
          position: absolute;
          inset: 10%;
          background: radial-gradient(circle at 40% 40%, 
            rgba(255, 255, 255, 0.3), 
            transparent 60%);
          border-radius: 50%;
        }
        
        .chat-window-border {
          position: relative;
          background: linear-gradient(135deg, #8B5CF6, #3B82F6, #8B5CF6);
          background-size: 200% 200%;
          animation: gradient-shift 4s ease infinite;
          padding: 2px;
          border-radius: 1rem;
        }
        
        .chat-window-inner {
          background: #0a0a0a;
          border-radius: calc(1rem - 2px);
        }
      `}</style>

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="ai-chat-button fixed bottom-6 right-6 z-[999] w-16 h-16 rounded-full bg-gradient-to-br from-gray-900 to-black border-2 border-transparent bg-clip-padding overflow-hidden"
          style={{
            backgroundImage: 'linear-gradient(black, black), linear-gradient(135deg, #8B5CF6, #3B82F6, #F59E0B)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box'
          }}
        >
          <div className="flex items-center justify-center w-full h-full">
            <div className="sphere-container">
              <div className="sphere"></div>
            </div>
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-[1000] ${
            typeof window !== 'undefined' && window.innerWidth < 768
              ? 'inset-0 m-0 rounded-none'
              : 'w-[380px] h-[520px]'
          } shadow-2xl`}
          style={{
            animation: 'scaleIn 0.3s ease-out',
          }}
        >
          <div className={`chat-window-border h-full ${
            typeof window !== 'undefined' && window.innerWidth < 768 ? 'rounded-none' : ''
          }`}>
            <div className="chat-window-inner h-full flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-violet-900/20 to-blue-900/20">
                <div className="flex items-center gap-3">
                  <div className="sphere-container" style={{ width: '40px', height: '40px' }}>
                    <div className="sphere"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-100">Amber AI Assistant</p>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-gray-400">{t('online')}</span>
                    </div>
                  </div>
                </div>

            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <div className="flex gap-1">
                {(['he', 'ru', 'en'] as Language[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`text-lg transition-opacity ${
                      language === lang ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                    }`}
                  >
                    {lang === 'he' ? '🇮🇱' : lang === 'ru' ? '🇷🇺' : '🇬🇧'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4" dir={dir}>
                {renderContent()}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  )
}

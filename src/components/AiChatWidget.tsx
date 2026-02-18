'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

type Language = 'he' | 'ru' | 'en'

interface Translation {
  [key: string]: {
    he: string
    ru: string
    en: string
  }
}

const translations: Translation = {
  greeting: {
    he: 'שלום! 👋 אני העוזר הדיגיטלי של Amber Solutions. איך אוכל לעזור?',
    ru: 'Привет! 👋 Я цифровой помощник Amber Solutions. Чем могу помочь?',
    en: "Hi! 👋 I'm the Amber Solutions digital assistant. How can I help?"
  },
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
  clientsMessage: {
    he: '⭐ Trinity CRM כבר משמשת עסקים בתחומי: יופי וקוסמטיקה 💅, ספרות ✂️, מספרות בארבר 💈, קליניקות 🏥. המערכת מתאימה לכל עסק שצריך לנהל לקוחות ותורים.',
    ru: '⭐ Trinity CRM уже используют бизнесы: салоны красоты 💅, парикмахерские ✂️, барбершопы 💈, клиники 🏥. Система подходит любому бизнесу с клиентами и записями.',
    en: '⭐ Trinity CRM is used by: beauty salons 💅, hair studios ✂️, barbershops 💈, clinics 🏥. Perfect for any business managing clients and appointments.'
  },
  servicesTitle: {
    he: 'שירותים נוספים:',
    ru: 'Другие услуги:',
    en: 'Other Services:'
  },
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

// Animated Orb Component
function AnimatedOrb({ size = 64, isHovered = false, isChatOpen = false }: { size?: number; isHovered?: boolean; isChatOpen?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cx = size / 2
    const cy = size / 2
    const r = size * 0.44

    const lines = [
      { color: '#8B5CF6', opacity: 0.6, speed: 0.001, offset: 0 },
      { color: '#3B82F6', opacity: 0.5, speed: 0.0013, offset: Math.PI / 3 },
      { color: '#06B6D4', opacity: 0.4, speed: 0.0008, offset: Math.PI * 2 / 3 },
      { color: '#A78BFA', opacity: 0.3, speed: 0.0015, offset: Math.PI }
    ]

    const draw = (time: number = 0) => {
      ctx.clearRect(0, 0, size, size)

      // Clip to circle
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.clip()

      // Background gradient
      const bgGrad = ctx.createRadialGradient(cx * 0.7, cy * 0.7, 0, cx, cy, r)
      bgGrad.addColorStop(0, 'rgba(59, 130, 246, 0.15)')
      bgGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.1)')
      bgGrad.addColorStop(1, 'rgba(5, 5, 16, 0.95)')
      ctx.fillStyle = bgGrad
      ctx.fill()

      // Draw flowing lines
      const speedMultiplier = isHovered ? 2 : isChatOpen ? 0.5 : 1

      lines.forEach((line) => {
        ctx.beginPath()
        ctx.strokeStyle = line.color
        ctx.lineWidth = 1.8
        ctx.globalAlpha = line.opacity
        ctx.shadowBlur = 8
        ctx.shadowColor = line.color

        const t = time * line.speed * speedMultiplier + line.offset

        const x1 = cx + Math.sin(t) * r * 0.6
        const y1 = cy + Math.cos(t * 1.1) * r * 0.6

        const x2 = cx + Math.sin(t + Math.PI / 2) * r * 0.7
        const y2 = cy + Math.cos(t * 0.9 + Math.PI / 2) * r * 0.5

        const x3 = cx + Math.sin(t + Math.PI) * r * 0.5
        const y3 = cy + Math.cos(t * 1.2 + Math.PI) * r * 0.7

        const x4 = cx + Math.sin(t + Math.PI * 1.5) * r * 0.6
        const y4 = cy + Math.cos(t * 0.85 + Math.PI * 1.5) * r * 0.6

        ctx.moveTo(x1, y1)
        ctx.bezierCurveTo(x2, y2, x3, y3, x4, y4)
        ctx.stroke()
      })

      ctx.restore()

      // Highlight
      const highlightGrad = ctx.createRadialGradient(cx * 0.6, cy * 0.6, 0, cx, cy, r * 0.8)
      highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.2)')
      highlightGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.05)')
      highlightGrad.addColorStop(1, 'transparent')
      
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.clip()
      ctx.fillStyle = highlightGrad
      ctx.fillRect(0, 0, size, size)
      ctx.restore()

      // Outer glow
      ctx.shadowBlur = 15
      ctx.shadowColor = 'rgba(139, 92, 246, 0.4)'
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()

      animationRef.current = requestAnimationFrame(draw)
    }

    animationRef.current = requestAnimationFrame(draw)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [size, isHovered, isChatOpen])

  return <canvas ref={canvasRef} width={size} height={size} style={{ width: size, height: size }} />
}

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [language, setLanguage] = useState<Language>('he')
  const [view, setView] = useState<View>('menu')
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['crm'])
  const [showCheckoutMessage, setShowCheckoutMessage] = useState(false)
  const [showTrialSuccess, setShowTrialSuccess] = useState(false)

  const t = (key: string) => translations[key]?.[language] || key
  const dir = language === 'he' ? 'rtl' : 'ltr'

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
    if (id === 'crm') return
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
          <div className="p-4 bg-gradient-to-br from-violet-500/10 to-blue-500/10 rounded-2xl border border-violet-500/20 mb-4">
            <p className="text-gray-100 text-sm">{t('greeting')}</p>
          </div>
          
          <button onClick={() => setView('faq')} className="menu-button">
            {t('menuFaq')}
          </button>
          <button onClick={() => setView('calculator')} className="menu-button">
            {t('menuCalculator')}
          </button>
          <button onClick={() => setView('trial')} className="menu-button">
            {t('menuTrial')}
          </button>
          <button onClick={() => setView('clients')} className="menu-button">
            {t('menuClients')}
          </button>
          <button onClick={() => setView('services')} className="menu-button">
            {t('menuServices')}
          </button>
          <button onClick={() => setView('human')} className="menu-button-primary">
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
              className="menu-button"
            >
              {t(`faqQ${i}`)}
            </button>
          ))}
          <button onClick={() => setView('menu')} className="back-button">
            {t('back')}
          </button>
        </div>
      )
    }

    if (view === 'faq-detail' && selectedFaq) {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-gray-800/50 rounded-2xl border border-violet-500/20">
            <p className="text-violet-400 font-medium text-sm mb-2">{t(`faqQ${selectedFaq}`)}</p>
            <p className="text-gray-100 text-sm">{t(`faqA${selectedFaq}`)}</p>
          </div>
          <button onClick={() => setView('faq')} className="back-button">
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
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-2xl">
              <p className="text-green-400 text-sm">{t('calcThankYou')}</p>
            </div>
            <button onClick={() => { setShowCheckoutMessage(false); setView('menu') }} className="back-button">
              {t('back')}
            </button>
          </div>
        )
      }

      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-300 mb-3">{t('calcTitle')}</p>
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {features.map(feature => (
              <label
                key={feature.id}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  feature.disabled
                    ? 'bg-gray-800/50 opacity-60 cursor-not-allowed'
                    : selectedFeatures.includes(feature.id)
                    ? 'bg-violet-600/20 border border-violet-500/30'
                    : 'bg-gray-800/30 border border-gray-700/30 hover:border-violet-500/30'
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
          
          <div className="p-4 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-2xl mt-4">
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
            className="menu-button-primary"
          >
            {t('calcCheckout')}
          </button>

          <button onClick={() => setView('menu')} className="back-button">
            {t('back')}
          </button>
        </div>
      )
    }

    if (view === 'trial') {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl">
            <p className="text-gray-100 text-sm">{t('trialMessage')}</p>
          </div>
          <button onClick={() => setView('trial-form')} className="menu-button-primary">
            {t('trialYes')}
          </button>
          <button onClick={() => setView('menu')} className="back-button">
            {t('back')}
          </button>
        </div>
      )
    }

    if (view === 'trial-form') {
      if (showTrialSuccess) {
        return (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-2xl">
              <p className="text-green-400 text-sm">{t('trialSuccess')}</p>
            </div>
            <button onClick={() => { setShowTrialSuccess(false); setView('menu') }} className="back-button">
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
          <input type="text" placeholder={t('trialFormName')} required className="form-input" />
          <input type="tel" placeholder={t('trialFormPhone')} required className="form-input" />
          <input type="email" placeholder={t('trialFormEmail')} required className="form-input" />
          <input type="text" placeholder={t('trialFormBusiness')} required className="form-input" />
          <button type="submit" className="menu-button-primary">
            {t('trialSubmit')}
          </button>
          <button type="button" onClick={() => setView('trial')} className="back-button">
            {t('back')}
          </button>
        </form>
      )
    }

    if (view === 'clients') {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl">
            <p className="text-gray-100 text-sm">{t('clientsMessage')}</p>
          </div>
          <button onClick={() => setView('menu')} className="back-button">
            {t('back')}
          </button>
        </div>
      )
    }

    if (view === 'services') {
      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-300 mb-2">{t('servicesTitle')}</p>
          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
            {services.map((service, i) => (
              <div key={i} className="p-3 bg-gray-800/30 border border-gray-700/30 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-100">{service.name[language]}</span>
                  <span className="text-xs text-orange-400 font-medium">{service.price[language]}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setView('menu')} className="back-button mt-4">
            {t('back')}
          </button>
        </div>
      )
    }

    if (view === 'human') {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-2xl">
            <p className="text-gray-100 text-sm mb-3">{t('humanMessage')}</p>
            <a
              href="https://wa.me/972544858586"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-white text-sm font-medium transition-colors"
            >
              {t('humanWhatsApp')}
            </a>
          </div>
          <button onClick={() => setView('menu')} className="back-button">
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
        .menu-button {
          width: 100%;
          padding: 12px 16px;
          background: #111827;
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 12px;
          text-align: left;
          font-size: 13px;
          color: white;
          transition: all 0.2s;
        }
        
        .menu-button:hover {
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.15);
        }
        
        .menu-button-primary {
          width: 100%;
          padding: 12px 16px;
          background: linear-gradient(135deg, #8B5CF6, #3B82F6);
          border: none;
          border-radius: 12px;
          text-align: center;
          font-size: 13px;
          font-weight: 600;
          color: white;
          transition: all 0.2s;
        }
        
        .menu-button-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
        }
        
        .back-button {
          width: 100%;
          padding: 8px;
          font-size: 13px;
          color: #9CA3AF;
          transition: color 0.2s;
        }
        
        .back-button:hover {
          color: #E5E7EB;
        }
        
        .form-input {
          width: 100%;
          padding: 10px 12px;
          background: rgba(17, 24, 39, 0.5);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 10px;
          font-size: 13px;
          color: #E5E7EB;
        }
        
        .form-input::placeholder {
          color: #6B7280;
        }
        
        .form-input:focus {
          outline: none;
          border-color: rgba(139, 92, 246, 0.5);
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #8B5CF6;
          border-radius: 10px;
        }
        
        @keyframes border-glow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        .chat-window-wrapper {
          animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .chat-border {
          position: relative;
          background: #0a0a0f;
          border-radius: 20px;
        }
        
        .chat-border::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 21px;
          background: linear-gradient(135deg, #8B5CF6, #3B82F6, #06B6D4, #8B5CF6);
          z-index: -1;
          opacity: 0.5;
          animation: border-glow 4s ease-in-out infinite;
        }
      `}</style>

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="fixed bottom-6 right-6 z-[999] transition-transform duration-300"
          style={{
            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.4))'
          }}
        >
          <AnimatedOrb size={64} isHovered={isHovered} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`chat-window-wrapper fixed bottom-6 right-6 z-[1000] ${
            typeof window !== 'undefined' && window.innerWidth < 768
              ? 'inset-0 m-0 rounded-none'
              : 'w-[400px] h-[540px]'
          }`}
        >
          <div className={`chat-border h-full flex flex-col overflow-hidden ${
            typeof window !== 'undefined' && window.innerWidth < 768 ? 'rounded-none' : ''
          }`}
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 0 40px rgba(139, 92, 246, 0.15)'
            }}
          >
            {/* Header */}
            <div className="p-4 border-b border-violet-500/15 flex items-center justify-between"
              style={{
                background: 'rgba(10, 10, 15, 0.95)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="flex items-center gap-3">
                <div style={{ transform: 'scale(0.625)' }}>
                  <AnimatedOrb size={64} isChatOpen={true} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Amber AI</p>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-400">{t('online')}</span>
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
                  className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" dir={dir}>
              {renderContent()}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

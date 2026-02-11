'use client'

import { useState, useEffect, useRef } from 'react'
import { Menu, X, ChevronRight, Monitor, Bot, Globe, Code, Mail, MessageCircle, Send } from 'lucide-react'

// Translations type
interface Translations {
  nav: {
    about: string
    services: string
    pricing: string
    gallery: string
    reviews: string
    contact: string
  }
  hero: {
    title: string
    subtitle: string
    cta: string
    disclaimer: string
  }
  services: {
    title: string
    items: {
      title: string
      description: string
    }[]
  }
  whyCrm: {
    title: string
    article: string
    stats: {
      value: string
      label: string
    }[]
  }
  gallery: {
    title: string
    screenshot: string
  }
  reviews: {
    title: string
    items: {
      text: string
      author: string
    }[]
  }
  cta: {
    title: string
    subtitle: string
    whatsapp: string
    email: string
  }
  pricing: {
    title: string
    subtitle: string
    plans: {
      name: string
      price: string
      features: string[]
      cta: string
      recommended?: string
    }[]
  }
  orderModal: {
    title: string
    planLabel: string
    nameLabel: string
    emailLabel: string
    phoneLabel: string
    submit: string
    cancel: string
    successMessage: string
  }
  footer: {
    copyright: string
    location: string
  }
}

const translations: Record<'he' | 'ru', Translations> = {
  he: {
    nav: {
      about: 'אודות',
      services: 'שירותים',
      pricing: 'תמחור',
      gallery: 'גלריה',
      reviews: 'המלצות',
      contact: 'צור קשר',
    },
    hero: {
      title: 'פתרונות טכנולוגיים לעסקים קטנים',
      subtitle: 'מערכות CRM, בוטים, אתרים ודפי נחיתה — הכל במקום אחד',
      cta: 'בואו נדבר',
      disclaimer: 'ללא התחייבות • החודש הראשון חינם',
    },
    services: {
      title: 'מה אנחנו מציעים',
      items: [
        {
          title: 'מערכות CRM',
          description: 'ניהול לקוחות, תשלומים, SMS ואנליטיקה',
        },
        {
          title: 'בוטים חכמים',
          description: 'בוטי טלגרם ו-WhatsApp לאוטומציה',
        },
        {
          title: 'אתרים ודפי נחיתה',
          description: 'עיצוב ופיתוח אתרים מותאמים אישית',
        },
        {
          title: 'פתרונות תוכנה',
          description: 'פיתוח מותאם אישית לצרכי העסק שלך',
        },
      ],
    },
    whyCrm: {
      title: 'למה העסק שלך צריך מערכת CRM?',
      article:
        'רבים חושבים שמערכת CRM מיועדת רק לעסקים גדולים, אבל האמת היא שדווקא עסקים קטנים מרוויחים ממנה הכי הרבה. כשהעסק רק נפתח, קל לנהל 10-20 לקוחות בראש או באקסל. אבל ברגע שמגיעים ל-50 לקוחות ומעלה, דברים מתחילים ליפול בין הכיסאות: לקוחות שוכחים לשלם, תורים הולכים לאיבוד, ואין מושג מי הלקוחות הכי רווחיים. הזמן האידיאלי להתחיל עם CRM הוא עכשיו — לא כשכבר יש בעיה, אלא לפני שהיא מתחילה.',
      stats: [
        {
          value: '67%',
          label: 'מהעסקים הקטנים מדווחים על עלייה במכירות אחרי הטמעת CRM',
        },
        {
          value: '3x',
          label: 'שיפור בשימור לקוחות',
        },
        {
          value: '50%',
          label: 'חיסכון בזמן ניהול',
        },
      ],
    },
    gallery: {
      title: 'מהפרויקטים שלנו',
      screenshot: 'צילום מסך',
    },
    reviews: {
      title: 'מה הלקוחות שלנו אומרים',
      items: [
        {
          text: 'שירות מעולה! המערכת שינתה את הדרך שבה אני מנהלת את העסק',
          author: 'קסניה מ., BeautyMania',
        },
        {
          text: 'הבוט בטלגרם חוסך לי שעות עבודה כל יום',
          author: 'דוד ר., CarWash Pro',
        },
        {
          text: 'סוף סוף מערכת שמבינה עברית ומתאימה לשוק הישראלי',
          author: 'מירב ל., קליניקת שלום',
        },
        {
          text: 'תוך שבוע כבר ראיתי שיפור בניהול הלקוחות',
          author: 'אלכס ג., Barber House',
        },
        {
          text: 'המחיר שווה כל שקל, חוסך לי הרבה כאב ראש',
          author: 'נטלי ש., NailArt Studio',
        },
        {
          text: 'צוות מקצועי ותמיכה מהירה',
          author: 'יוסי כ., FitZone Gym',
        },
      ],
    },
    cta: {
      title: 'מוכנים להתחיל?',
      subtitle: 'צרו איתנו קשר ונבנה יחד את הפתרון המושלם לעסק שלכם',
      whatsapp: 'דברו איתנו עכשיו',
      email: 'שלחו מייל',
    },
    pricing: {
      title: 'בחרו את התוכנית המתאימה',
      subtitle: 'החודש הראשון חינם לכל התוכניות!',
      plans: [
        {
          name: 'בסיסי',
          price: '₪149/לחודש',
          features: [
            '✓ בסיס נתונים עד 200 לקוחות',
            '✓ היסטוריית ביקורים',
            '✗ קישורי תשלום',
            '✗ רסלות SMS',
            '✗ אנליטיקה',
            '✓ משתמש אחד',
            '✓ תמיכה באימייל',
          ],
          cta: 'התחילו בחינם',
        },
        {
          name: 'מקצועי',
          price: '₪299/לחודש',
          features: [
            '✓ בסיס נתונים עד 1000 לקוחות',
            '✓ היסטוריית ביקורים',
            '✓ קישורי תשלום',
            '✓ SMS עד 500/חודש',
            '✓ אנליטיקה וגרפים',
            '✓ 3 משתמשים',
            '✓ תמיכה בוואטסאפ',
          ],
          cta: 'התחילו בחינם',
          recommended: 'מומלץ',
        },
        {
          name: 'ארגוני',
          price: '₪499/לחודש',
          features: [
            '✓ לקוחות ללא הגבלה',
            '✓ היסטוריית ביקורים',
            '✓ קישורי תשלום',
            '✓ SMS ללא הגבלה',
            '✓ אנליטיקה מתקדמת',
            '✓ עד 10 משתמשים',
            '✓ תמיכה עדיפות',
            '✓ מיתוג (לוגו וצבעים)',
          ],
          cta: 'צרו קשר',
        },
      ],
    },
    orderModal: {
      title: 'השלימו את הפרטים',
      planLabel: 'תוכנית נבחרת',
      nameLabel: 'שם מלא',
      emailLabel: 'אימייל',
      phoneLabel: 'טלפון',
      submit: 'שלח',
      cancel: 'ביטול',
      successMessage: 'תודה! ניצור איתך קשר בקרוב',
    },
    footer: {
      copyright: 'Amber Solutions Systems © 2026',
      location: 'אשקלון, ישראל',
    },
  },
  ru: {
    nav: {
      about: 'О нас',
      services: 'Услуги',
      pricing: 'Тарифы',
      gallery: 'Галерея',
      reviews: 'Отзывы',
      contact: 'Контакты',
    },
    hero: {
      title: 'Технологические решения для малого бизнеса',
      subtitle: 'CRM системы, боты, сайты и лендинги — всё в одном месте',
      cta: 'Давайте поговорим',
      disclaimer: 'Без обязательств • Первый месяц бесплатно',
    },
    services: {
      title: 'Что мы предлагаем',
      items: [
        {
          title: 'CRM системы',
          description: 'Управление клиентами, платежи, SMS и аналитика',
        },
        {
          title: 'Умные боты',
          description: 'Telegram и WhatsApp боты для автоматизации',
        },
        {
          title: 'Сайты и лендинги',
          description: 'Дизайн и разработка персональных сайтов',
        },
        {
          title: 'Программные решения',
          description: 'Разработка под потребности вашего бизнеса',
        },
      ],
    },
    whyCrm: {
      title: 'Почему вашему бизнесу нужна CRM система?',
      article:
        'Многие думают что CRM система нужна только крупным компаниям, но правда в том что именно малый бизнес получает от неё максимальную выгоду. Когда бизнес только открывается, легко управлять 10-20 клиентами в голове или в Excel. Но как только клиентов становится 50 и больше, начинают теряться данные: клиенты забывают платить, записи пропадают, и нет понимания кто самые прибыльные клиенты. Идеальное время начать с CRM — сейчас. Не когда проблема уже есть, а до того как она появится.',
      stats: [
        {
          value: '67%',
          label: 'малых бизнесов сообщают о росте продаж после внедрения CRM',
        },
        {
          value: '3x',
          label: 'улучшение удержания клиентов',
        },
        {
          value: '50%',
          label: 'экономия времени управления',
        },
      ],
    },
    gallery: {
      title: 'Наши проекты',
      screenshot: 'Скриншот',
    },
    reviews: {
      title: 'Что говорят наши клиенты',
      items: [
        {
          text: 'Отличный сервис! Система изменила то, как я управляю бизнесом',
          author: 'Ксения М., BeautyMania',
        },
        {
          text: 'Telegram бот экономит мне часы работы каждый день',
          author: 'Давид Р., CarWash Pro',
        },
        {
          text: 'Наконец-то система которая понимает иврит и подходит для израильского рынка',
          author: 'Мирав Л., Клиника Шалом',
        },
        {
          text: 'За неделю уже увидел улучшение в управлении клиентами',
          author: 'Алекс Г., Barber House',
        },
        {
          text: 'Цена стоит каждого шекеля, экономит мне много головной боли',
          author: 'Наталья Ш., NailArt Studio',
        },
        {
          text: 'Профессиональная команда и быстрая поддержка',
          author: 'Йоси К., FitZone Gym',
        },
      ],
    },
    cta: {
      title: 'Готовы начать?',
      subtitle: 'Свяжитесь с нами и мы вместе создадим идеальное решение для вашего бизнеса',
      whatsapp: 'Поговорите с нами сейчас',
      email: 'Написать email',
    },
    pricing: {
      title: 'Выберите подходящий план',
      subtitle: 'Первый месяц бесплатно на все планы!',
      plans: [
        {
          name: 'Базовый',
          price: '₪149/месяц',
          features: [
            '✓ База клиентов до 200',
            '✓ История визитов',
            '✗ Платёжные ссылки',
            '✗ SMS рассылки',
            '✗ Аналитика',
            '✓ 1 пользователь',
            '✓ Поддержка по Email',
          ],
          cta: 'Начать бесплатно',
        },
        {
          name: 'Профессиональный',
          price: '₪299/месяц',
          features: [
            '✓ База клиентов до 1000',
            '✓ История визитов',
            '✓ Платёжные ссылки',
            '✓ SMS до 500/мес',
            '✓ Аналитика и графики',
            '✓ 3 пользователя',
            '✓ Поддержка WhatsApp',
          ],
          cta: 'Начать бесплатно',
          recommended: 'Рекомендуемый',
        },
        {
          name: 'Корпоративный',
          price: '₪499/месяц',
          features: [
            '✓ Безлимит клиентов',
            '✓ История визитов',
            '✓ Платёжные ссылки',
            '✓ Безлимит SMS',
            '✓ Продвинутая аналитика',
            '✓ До 10 пользователей',
            '✓ Приоритетная поддержка',
            '✓ Брендинг (логотип и цвета)',
          ],
          cta: 'Связаться',
        },
      ],
    },
    orderModal: {
      title: 'Заполните данные',
      planLabel: 'Выбранный план',
      nameLabel: 'Полное имя',
      emailLabel: 'Email',
      phoneLabel: 'Телефон',
      submit: 'Отправить',
      cancel: 'Отмена',
      successMessage: 'Спасибо! Мы свяжемся с вами в ближайшее время',
    },
    footer: {
      copyright: 'Amber Solutions Systems © 2026',
      location: 'Ашкелон, Израиль',
    },
  },
}

export default function LandingPage() {
  const [language, setLanguage] = useState<'he' | 'ru'>('he')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [showToast, setShowToast] = useState(false)
  const t = translations[language]
  const dir = language === 'he' ? 'rtl' : 'ltr'

  // Handle scroll for header background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px',
      }
    )

    const elements = document.querySelectorAll('.fade-in-section')
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  // Update document direction
  useEffect(() => {
    document.documentElement.setAttribute('dir', dir)
    document.documentElement.setAttribute('lang', language)
  }, [dir, language])

  // Handle order modal
  const openModal = (planName: string) => {
    setSelectedPlan(planName)
    setModalOpen(true)
  }

  const handleSubmitOrder = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const orderData = {
      plan: selectedPlan,
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      timestamp: new Date().toISOString(),
    }
    
    // Save to localStorage
    const orders = JSON.parse(localStorage.getItem('landing-orders') || '[]')
    orders.push(orderData)
    localStorage.setItem('landing-orders', JSON.stringify(orders))
    
    // Close modal and show toast
    setModalOpen(false)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  return (
    <div className={`min-h-screen font-sans ${dir === 'rtl' ? 'rtl' : 'ltr'}`} dir={dir}>
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white shadow-md'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Amber Solutions Logo"
                className="w-8 h-8 object-contain"
              />
              <span className={`text-xl font-bold transition-colors ${scrolled ? 'text-blue-900' : 'text-white'}`}>
                Amber Solutions Systems
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#about"
                className={`transition-colors ${scrolled ? 'text-gray-700 hover:text-blue-900' : 'text-white/90 hover:text-white'}`}
              >
                {t.nav.about}
              </a>
              <a
                href="#services"
                className={`transition-colors ${scrolled ? 'text-gray-700 hover:text-blue-900' : 'text-white/90 hover:text-white'}`}
              >
                {t.nav.services}
              </a>
              <a
                href="#pricing"
                className={`transition-colors ${scrolled ? 'text-gray-700 hover:text-blue-900' : 'text-white/90 hover:text-white'}`}
              >
                {t.nav.pricing}
              </a>
              <a
                href="#gallery"
                className={`transition-colors ${scrolled ? 'text-gray-700 hover:text-blue-900' : 'text-white/90 hover:text-white'}`}
              >
                {t.nav.gallery}
              </a>
              <a
                href="#reviews"
                className={`transition-colors ${scrolled ? 'text-gray-700 hover:text-blue-900' : 'text-white/90 hover:text-white'}`}
              >
                {t.nav.reviews}
              </a>
              <a
                href="#contact"
                className={`transition-colors ${scrolled ? 'text-gray-700 hover:text-blue-900' : 'text-white/90 hover:text-white'}`}
              >
                {t.nav.contact}
              </a>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLanguage(language === 'he' ? 'ru' : 'he')}
                className={`px-3 py-1.5 text-sm font-medium border rounded-md transition-colors ${
                  scrolled
                    ? 'text-gray-700 hover:text-blue-900 border-gray-300 hover:border-blue-900'
                    : 'text-white border-white/30 hover:border-white hover:bg-white/10'
                }`}
              >
                {language === 'he' ? 'Русский' : 'עברית'}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`md:hidden p-2 transition-colors ${
                  scrolled ? 'text-gray-700 hover:text-blue-900' : 'text-white hover:text-white/80'
                }`}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className={`md:hidden py-4 border-t ${scrolled ? 'border-gray-200' : 'border-white/20'}`}>
              <div className="flex flex-col gap-4">
                <a
                  href="#about"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`transition-colors ${scrolled ? 'text-gray-700 hover:text-blue-900' : 'text-white hover:text-white/80'}`}
                >
                  {t.nav.about}
                </a>
                <a
                  href="#services"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`transition-colors ${scrolled ? 'text-gray-700 hover:text-blue-900' : 'text-white hover:text-white/80'}`}
                >
                  {t.nav.services}
                </a>
                <a
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`transition-colors ${scrolled ? 'text-gray-700 hover:text-blue-900' : 'text-white hover:text-white/80'}`}
                >
                  {t.nav.pricing}
                </a>
                <a
                  href="#gallery"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`transition-colors ${scrolled ? 'text-gray-700 hover:text-blue-900' : 'text-white hover:text-white/80'}`}
                >
                  {t.nav.gallery}
                </a>
                <a
                  href="#reviews"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`transition-colors ${scrolled ? 'text-gray-700 hover:text-blue-900' : 'text-white hover:text-white/80'}`}
                >
                  {t.nav.reviews}
                </a>
                <a
                  href="#contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`transition-colors ${scrolled ? 'text-gray-700 hover:text-blue-900' : 'text-white hover:text-white/80'}`}
                >
                  {t.nav.contact}
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section
        className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
        }}
      >
        {/* Background Pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        ></div>

        {/* Floating Shapes */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-40 right-20 w-40 h-40 bg-blue-500/10 rounded-lg blur-3xl animate-float-delay"></div>
        <div className="absolute bottom-32 left-1/4 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl animate-float-delay-2"></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-green-500/10 rounded-lg blur-3xl animate-float"></div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center relative z-10">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 animate-slide-up">
            {t.hero.title}
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto animate-slide-up-delay">
            {t.hero.subtitle}
          </p>
          <div className="animate-slide-up-delay-2">
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 px-10 py-5 bg-amber-500 text-white rounded-lg font-semibold text-lg transition-all transform hover:scale-105 hover:shadow-amber"
            >
              {t.hero.cta}
              <ChevronRight size={20} className={dir === 'rtl' ? 'rotate-180' : ''} />
            </a>
            <p className="text-sm text-gray-400 mt-4">{t.hero.disclaimer}</p>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce z-10">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2"></div>
          </div>
        </div>
      </section>

      {/* About Section - Placeholder */}
      <section id="about" className="py-20 bg-white fade-in-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
            {t.nav.about}
          </h2>
          <div className="text-center text-gray-600">
            {/* Контент будет добавлен позже */}
            <p className="text-lg">Секция в разработке - ожидаем контент...</p>
          </div>
        </div>
      </section>

      {/* Why CRM Section */}
      <section className="py-20 bg-gray-50 fade-in-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-16">
            {t.whyCrm.title}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left Column - Article */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <p className="text-lg text-gray-700 leading-relaxed">
                {t.whyCrm.article}
              </p>
            </div>

            {/* Right Column - Stats */}
            <div className="space-y-6">
              {t.whyCrm.stats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-md p-6 border-l-4 border-amber-500"
                >
                  <div className="text-4xl font-bold text-amber-600 mb-2">
                    {stat.value}
                  </div>
                  <p className="text-gray-700 leading-relaxed">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-white fade-in-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-16">
            {t.services.title}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Service Card 1 - CRM */}
            <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Monitor className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t.services.items[0].title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.services.items[0].description}
              </p>
            </div>

            {/* Service Card 2 - Bots */}
            <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Bot className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t.services.items[1].title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.services.items[1].description}
              </p>
            </div>

            {/* Service Card 3 - Websites */}
            <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t.services.items[2].title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.services.items[2].description}
              </p>
            </div>

            {/* Service Card 4 - Software */}
            <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="w-14 h-14 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                <Code className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t.services.items[3].title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.services.items[3].description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white fade-in-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
            {t.pricing.title}
          </h2>
          <p className="text-xl text-amber-600 text-center mb-16 font-semibold">
            {t.pricing.subtitle}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t.pricing.plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-2xl shadow-lg transition-all duration-300 hover:shadow-2xl ${
                  plan.recommended ? 'md:scale-105 ring-2 ring-blue-500' : ''
                }`}
              >
                {/* Recommended Badge */}
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-amber-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      {plan.recommended}
                    </span>
                  </div>
                )}

                {/* Header */}
                <div
                  className={`p-6 rounded-t-2xl ${
                    index === 0
                      ? 'bg-gray-100'
                      : index === 1
                      ? 'bg-blue-600'
                      : 'bg-slate-800'
                  }`}
                >
                  <h3
                    className={`text-2xl font-bold ${
                      index === 0 ? 'text-gray-900' : 'text-white'
                    }`}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={`text-3xl font-bold mt-2 ${
                      index === 0 ? 'text-gray-900' : 'text-white'
                    }`}
                  >
                    {plan.price}
                  </p>
                </div>

                {/* Features */}
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, fIndex) => (
                      <li
                        key={fIndex}
                        className={`flex items-start gap-2 ${
                          feature.startsWith('✗') ? 'text-gray-400' : 'text-gray-700'
                        }`}
                      >
                        <span className="flex-shrink-0">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => openModal(plan.name)}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      index === 0
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : index === 1
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-800 text-white hover:bg-slate-900'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="py-20 bg-gray-50 fade-in-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-16">
            {t.gallery.title}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="group relative overflow-hidden rounded-xl shadow-lg">
                <div className="aspect-video bg-gray-300 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                  <span className="text-2xl font-semibold text-gray-600">
                    {t.gallery.screenshot} {num}
                  </span>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-20 bg-white fade-in-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-16">
            {t.reviews.title}
          </h2>

          <div className="relative max-h-[600px] overflow-hidden">
            <div className="reviews-scroll space-y-6">
              {/* First set of reviews */}
              {t.reviews.items.map((review, index) => (
                <div
                  key={`review-1-${index}`}
                  className="bg-white rounded-xl shadow-md p-6 mx-auto max-w-2xl"
                >
                  <p className="text-gray-700 text-lg leading-relaxed mb-4">
                    "{review.text}"
                  </p>
                  <p className="text-amber-600 font-semibold">— {review.author}</p>
                </div>
              ))}
              {/* Duplicate set for seamless loop */}
              {t.reviews.items.map((review, index) => (
                <div
                  key={`review-2-${index}`}
                  className="bg-white rounded-xl shadow-md p-6 mx-auto max-w-2xl"
                >
                  <p className="text-gray-700 text-lg leading-relaxed mb-4">
                    "{review.text}"
                  </p>
                  <p className="text-amber-600 font-semibold">— {review.author}</p>
                </div>
              ))}
            </div>

            {/* Gradient overlays */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white to-transparent pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        id="contact"
        className="py-20 fade-in-section"
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            {t.cta.title}
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            {t.cta.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* WhatsApp Button */}
            <a
              href="https://wa.me/972544858586"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 text-white rounded-lg font-semibold text-lg transition-all transform hover:scale-105 hover:shadow-amber"
            >
              {t.cta.whatsapp}
              <ChevronRight size={20} className={dir === 'rtl' ? 'rotate-180' : ''} />
            </a>

            {/* Email Button */}
            <a
              href="mailto:ambersolutions.systems@gmail.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-lg font-semibold border-2 border-white/30 hover:bg-white/20 transition-all"
            >
              <Mail size={20} />
              {t.cta.email}
            </a>
          </div>
        </div>
      </section>

      {/* Order Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                {t.orderModal.title}
              </h3>

              <form onSubmit={handleSubmitOrder} className="space-y-4">
                {/* Selected Plan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.orderModal.planLabel}
                  </label>
                  <input
                    type="text"
                    value={selectedPlan}
                    readOnly
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.orderModal.nameLabel} *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.orderModal.emailLabel} *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.orderModal.phoneLabel} *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    {t.orderModal.cancel}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors"
                  >
                    {t.orderModal.submit}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg animate-slide-up z-50">
          {t.orderModal.successMessage}
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#0F172A] text-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            {/* Logo & Copyright */}
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Amber Solutions Logo"
                className="w-8 h-8 object-contain"
              />
              <div className="text-center md:text-start">
                <p className="font-semibold">{t.footer.copyright}</p>
                <p className="text-gray-400 text-sm mt-1">{t.footer.location}</p>
              </div>
            </div>

            {/* Contact Links */}
            <div className="flex gap-6">
              <a
                href="https://wa.me/972544858586"
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-amber-500 transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle size={24} />
              </a>
              <a
                href="mailto:ambersolutions.systems@gmail.com"
                className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-amber-500 transition-colors"
                aria-label="Email"
              >
                <Mail size={24} />
              </a>
              <a
                href="https://t.me/yourtelegramusername"
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-amber-500 transition-colors"
                aria-label="Telegram"
              >
                <Send size={24} />
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Global Styles for Animations */}
      <style jsx global>{`
        /* Smooth scroll */
        html {
          scroll-behavior: smooth;
        }

        .fade-in-section {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }

        .fade-in-section.animate-in {
          opacity: 1;
          transform: translateY(0);
        }

        .animate-slide-up {
          animation: slideUp 1s ease-out;
        }

        .animate-slide-up-delay {
          animation: slideUp 1s ease-out 0.2s both;
        }

        .animate-slide-up-delay-2 {
          animation: slideUp 1s ease-out 0.4s both;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .shadow-amber {
          box-shadow: 0 0 30px rgba(245, 158, 11, 0.6);
        }

        /* Floating shapes animation */
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delay {
          animation: float 7s ease-in-out infinite 1s;
        }

        .animate-float-delay-2 {
          animation: float 8s ease-in-out infinite 2s;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-30px) rotate(5deg);
          }
        }

        /* Modal animations */
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scaleIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

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

        /* Reviews auto-scroll animation */
        .reviews-scroll {
          animation: scrollReviews 30s linear infinite;
        }

        .reviews-scroll:hover {
          animation-play-state: paused;
        }

        @keyframes scrollReviews {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-50%);
          }
        }

        html[dir='rtl'] {
          direction: rtl;
        }

        html[dir='ltr'] {
          direction: ltr;
        }
      `}</style>
    </div>
  )
}

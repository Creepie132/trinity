'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type LandingLang = 'ru' | 'en' | 'he'

interface LandingLangContextType {
  lang: LandingLang
  setLang: (l: LandingLang) => void
  t: (key: string) => string
  dir: 'ltr' | 'rtl'
  isRTL: boolean
}

const LandingLangContext = createContext<LandingLangContextType | undefined>(undefined)

// ───────────────────────────────────────────────
// TRANSLATIONS
// ───────────────────────────────────────────────
const translations: Record<LandingLang, Record<string, string>> = {
  ru: {
    // Sidebar nav
    'nav.home':       'Главная',
    'nav.features':   'Возможности',
    'nav.pricing':    'Тарифы',
    'nav.how':        'Как это работает',
    'nav.security':   'Безопасность',
    'nav.reviews':    'Отзывы',
    'nav.contacts':   'Контакты',
    'nav.login':      'Войти →',

    // Hero
    'hero.eyebrow':   'СИСТЕМА УПРАВЛЕНИЯ БИЗНЕСОМ · ИЗРАИЛЬ',
    'hero.h1':        'Клиенты не пропадают. Запись не теряется. Хаос — прощай.',
    'hero.subtitle':  'Trinity — нервная система вашего бизнеса. Клиенты, записи, аналитика и WhatsApp-напоминания в одном месте. Запуск за один день.',
    'hero.cta':       'Попробовать бесплатно →',
    'hero.cta2':      'Посмотреть возможности',
    'hero.stat1.val': '90%',
    'hero.stat1.lbl': 'открываемость WhatsApp',
    'hero.stat2.val': '5 мин',
    'hero.stat2.lbl': 'на запуск системы',
    'hero.stat3.val': '0₪',
    'hero.stat3.lbl': 'скрытых комиссий',

    // Industries
    'industries.title': 'Для кого Trinity',

    // Pain
    'pain.heading': 'Бизнес растёт, а хаос не уменьшается',
    'pain.1.title': 'Записи теряются',
    'pain.1.text':  'Тетрадка, заметки в телефоне, голова — клиенты падают в щели и не возвращаются',
    'pain.2.title': 'SMS никто не читает',
    'pain.2.text':  'Отправили напоминание — клиент не пришёл. Потому что SMS открывают 3 из 10. WhatsApp — 9 из 10',
    'pain.3.title': 'Непонятно что работает',
    'pain.3.text':  'Кто лучший клиент? Что приносит больше денег? Без системы — просто догадки',

    // Features
    'features.heading':   'Всё что нужно — в одном месте',
    'features.subtitle':  'Никаких лишних кнопок. Только то что реально используется каждый день',
    'features.wa.title':  'WhatsApp рассылки',
    'features.wa.text':   'Отправляйте акции, поздравления и напоминания прямо в WhatsApp. Открываемость 90%.',
    'features.wa.tag':    'До 90% открываемость',
    'features.cl.title':  'База клиентов',
    'features.cl.text':   'Вся история каждого клиента: визиты, предпочтения, расходы, заметки.',
    'features.cl.tag':    'Всегда под рукой',
    'features.di.title':  'Дневник записей',
    'features.di.text':   'Удобный календарь с напоминаниями. Клиент записался — система сама напомнит через WhatsApp.',
    'features.di.tag':    'Авто-напоминания',
    'features.an.title':  'Аналитика',
    'features.an.text':   'Доход за день, месяц, год. Лучшие клиенты. Самые прибыльные услуги.',
    'features.an.tag':    'Решения на данных',
    'features.st.title':  'Склад и материалы',
    'features.st.text':   'Следите за остатками. Система напомнит когда пора заказывать.',
    'features.st.tag':    'Умный учёт',
    'features.pa.title':  'Продажи и оплаты',
    'features.pa.text':   'Фиксируйте платежи, видите долги, следите за выручкой.',
    'features.pa.tag':    'Прозрачность',

    // How
    'how.heading':    'Запуск за один день',
    'how.subtitle':   'Мы приезжаем, настраиваем, обучаем. Вы просто начинаете работать.',
    'how.1.title': 'Встреча и демо',
    'how.1.text':  'Показываем систему вживую, отвечаем на все вопросы.',
    'how.2.title': 'Настройка',
    'how.2.text':  'Приезжаем и настраиваем всё под ваш бизнес. Переносим существующие данные.',
    'how.3.title': 'Обучение',
    'how.3.text':  'Объясняем как пользоваться. Вы и ваши сотрудники готовы за пару часов.',
    'how.4.title': 'Работаете',
    'how.4.text':  'Мы на связи. Любой вопрос — пишите. Система обновляется автоматически.',

    // Security
    'security.heading':  'Ваши данные — только ваши',
    'security.subtitle': 'Доверяете нам клиентскую базу — мы относимся к этому серьёзно.',
    'security.1.title': 'Шифрование SSL/TLS',
    'security.1.text':  'Все данные передаются по защищённому протоколу.',
    'security.2.title': 'Ежедневные бэкапы',
    'security.2.text':  'Автоматическое резервное копирование каждый день.',
    'security.3.title': 'Соответствие стандартам',
    'security.3.text':  'Работаем в соответствии с израильским законом о защите данных.',
    'security.4.title': 'Никакой рекламы',
    'security.4.text':  'Ваша клиентская база не передаётся третьим лицам. Никогда.',

    // Pricing
    'pricing.heading':   'Честные цены. Без сюрпризов.',
    'pricing.subtitle':  'Платите только за то что используете. Никаких скрытых комиссий.',
    'pricing.badge.recommended': 'Рекомендован',
    'pricing.badge.business':    'Для бизнеса',
    'pricing.period':            '/ мес',
    'pricing.cta.select':        'Выбрать',

    // Reviews
    'reviews.heading':   'Что говорят наши клиенты',
    'reviews.subtitle':  'Реальные владельцы бизнеса о работе с Trinity',
    'reviews.1.text':    'Раньше вела всё в тетрадке и постоянно теряла клиентов. Теперь система сама напоминает через WhatsApp — пропусков стало в разы меньше.',
    'reviews.1.author':  'Анета',
    'reviews.1.role':    'Владелица салона Beautymania',
    'reviews.2.text':    'Влад приехал, всё настроил за один день. Теперь я вижу кто мой лучший клиент и сколько денег приносит каждая услуга. Это меняет всё.',
    'reviews.2.author':  'Ксения',
    'reviews.2.role':    'Владелица Hair Rehab',

    // Contacts
    'contacts.cta.h2':      'Готовы навести порядок в своём бизнесе?',
    'contacts.cta.p':       'Напишите нам — покажем систему вживую. Без обязательств.',
    'contacts.cta.wa':      'Написать в WhatsApp →',
    'contacts.cta.pricing': 'Посмотреть тарифы',
    'contacts.info.h3':     'Свяжитесь с нами',
    'contacts.wa':          'WhatsApp: +972-54-485-8586',
    'contacts.email':       'Email: info@ambersol.co.il',
    'contacts.location':    'Израиль',
    'contacts.form.name':   'Имя',
    'contacts.form.email':  'Email',
    'contacts.form.phone':  'Телефон',
    'contacts.form.msg':    'Сообщение',
    'contacts.form.submit': 'Отправить',

    // Footer
    'footer.copy':       '© 2025 Amber Solutions. Все права защищены.',
    'footer.features':   'Возможности',
    'footer.pricing':    'Тарифы',
    'footer.support':    'Поддержка',
    'footer.contacts':   'Контакты',
  },

  en: {
    'nav.home':       'Home',
    'nav.features':   'Features',
    'nav.pricing':    'Pricing',
    'nav.how':        'How it works',
    'nav.security':   'Security',
    'nav.reviews':    'Reviews',
    'nav.contacts':   'Contact',
    'nav.login':      'Login →',

    'hero.eyebrow':   'BUSINESS MANAGEMENT SYSTEM · ISRAEL',
    'hero.h1':        'No lost clients. No missed appointments. No chaos.',
    'hero.subtitle':  'Trinity is the nervous system of your business — clients, bookings, analytics, and WhatsApp reminders in one place. Up and running in one day.',
    'hero.cta':       'Try for free →',
    'hero.cta2':      'See features',
    'hero.stat1.val': '90%',
    'hero.stat1.lbl': 'WhatsApp open rate',
    'hero.stat2.val': '5 min',
    'hero.stat2.lbl': 'to launch the system',
    'hero.stat3.val': '₪0',
    'hero.stat3.lbl': 'hidden fees',

    'industries.title': 'Who is Trinity for',

    'pain.heading': 'Business grows, but the chaos doesn\'t go away',
    'pain.1.title': 'Bookings get lost',
    'pain.1.text':  'Notebooks, phone notes, memory — clients fall through the cracks and don\'t come back',
    'pain.2.title': 'Nobody reads SMS',
    'pain.2.text':  'You sent a reminder — client didn\'t show. Because only 3 in 10 open SMS. WhatsApp: 9 in 10',
    'pain.3.title': 'No idea what\'s working',
    'pain.3.text':  'Who\'s your best client? What brings the most revenue? Without a system — just guesses',

    'features.heading':   'Everything you need — in one place',
    'features.subtitle':  'No extra buttons. Only what you actually use every day',
    'features.wa.title':  'WhatsApp Broadcasts',
    'features.wa.text':   'Send promotions, greetings and reminders directly via WhatsApp. 90% open rate.',
    'features.wa.tag':    'Up to 90% open rate',
    'features.cl.title':  'Client Database',
    'features.cl.text':   'Full history of every client: visits, preferences, spending, notes.',
    'features.cl.tag':    'Always at hand',
    'features.di.title':  'Appointment Diary',
    'features.di.text':   'Smart calendar with reminders. Client books — system sends WhatsApp reminder automatically.',
    'features.di.tag':    'Auto-reminders',
    'features.an.title':  'Analytics',
    'features.an.text':   'Revenue by day, month, year. Top clients. Most profitable services.',
    'features.an.tag':    'Data-driven decisions',
    'features.st.title':  'Stock & Materials',
    'features.st.text':   'Track your inventory. System alerts you when it\'s time to reorder.',
    'features.st.tag':    'Smart tracking',
    'features.pa.title':  'Sales & Payments',
    'features.pa.text':   'Record payments, track debts, monitor revenue.',
    'features.pa.tag':    'Full transparency',

    'how.heading':    'Up and running in one day',
    'how.subtitle':   'We come, set up, train. You just start working.',
    'how.1.title': 'Demo meeting',
    'how.1.text':  'We show the system live and answer all questions. No commitments.',
    'how.2.title': 'Setup',
    'how.2.text':  'We come and configure everything for your business. We transfer existing data.',
    'how.3.title': 'Training',
    'how.3.text':  'We explain how to use it. You and your staff are ready in a few hours.',
    'how.4.title': 'You work',
    'how.4.text':  'We\'re available. Any question — just message us. System updates automatically.',

    'security.heading':  'Your data stays yours',
    'security.subtitle': 'You trust us with your client base — we take that seriously.',
    'security.1.title': 'SSL/TLS Encryption',
    'security.1.text':  'All data is transmitted via a secure protocol.',
    'security.2.title': 'Daily backups',
    'security.2.text':  'Automatic daily backup. Your data will never be lost.',
    'security.3.title': 'Standards compliance',
    'security.3.text':  'We operate in accordance with Israeli data protection law.',
    'security.4.title': 'No advertising',
    'security.4.text':  'Your client database is never shared with third parties. Ever.',

    'pricing.heading':   'Honest pricing. No surprises.',
    'pricing.subtitle':  'Pay only for what you use. No hidden fees.',
    'pricing.badge.recommended': 'Recommended',
    'pricing.badge.business':    'For business',
    'pricing.period':            '/ mo',
    'pricing.cta.select':        'Select',

    'reviews.heading':   'What our clients say',
    'reviews.subtitle':  'Real business owners about working with Trinity',
    'reviews.1.text':    'I used to keep everything in a notebook and constantly lost clients. Now the system reminds them via WhatsApp — way fewer no-shows.',
    'reviews.1.author':  'Aneta',
    'reviews.1.role':    'Owner of Beautymania salon',
    'reviews.2.text':    'Vlad came and set everything up in one day. Now I see who my best client is and how much each service brings. It changes everything.',
    'reviews.2.author':  'Ksenia',
    'reviews.2.role':    'Owner of Hair Rehab',

    'contacts.cta.h2':      'Ready to bring order to your business?',
    'contacts.cta.p':       'Write to us — we\'ll show the system live. No obligations.',
    'contacts.cta.wa':      'Write on WhatsApp →',
    'contacts.cta.pricing': 'See pricing',
    'contacts.info.h3':     'Contact us',
    'contacts.wa':          'WhatsApp: +972-54-485-8586',
    'contacts.email':       'Email: info@ambersol.co.il',
    'contacts.location':    'Israel',
    'contacts.form.name':   'Name',
    'contacts.form.email':  'Email',
    'contacts.form.phone':  'Phone',
    'contacts.form.msg':    'Message',
    'contacts.form.submit': 'Send',

    'footer.copy':       '© 2025 Amber Solutions. All rights reserved.',
    'footer.features':   'Features',
    'footer.pricing':    'Pricing',
    'footer.support':    'Support',
    'footer.contacts':   'Contact',
  },

  he: {
    'nav.home':       'ראשי',
    'nav.features':   'יכולות',
    'nav.pricing':    'תמחור',
    'nav.how':        'איך זה עובד',
    'nav.security':   'אבטחה',
    'nav.reviews':    'ביקורות',
    'nav.contacts':   'צור קשר',
    'nav.login':      'כניסה →',

    'hero.eyebrow':   'מערכת ניהול עסקים · ישראל',
    'hero.h1':        'לקוחות לא נעלמים. תורים לא אובדים. אין יותר כאוס.',
    'hero.subtitle':  'Trinity היא מערכת העצבים של העסק שלך — לקוחות, תורים, אנליטיקה והתראות WhatsApp במקום אחד. מוכן ביום אחד.',
    'hero.cta':       'נסה בחינם →',
    'hero.cta2':      'צפה ביכולות',
    'hero.stat1.val': '90%',
    'hero.stat1.lbl': 'שיעור פתיחה ב-WhatsApp',
    'hero.stat2.val': '5 דק\'',
    'hero.stat2.lbl': 'להשקת המערכת',
    'hero.stat3.val': '₪0',
    'hero.stat3.lbl': 'עמלות נסתרות',

    'industries.title': 'למי מיועדת Trinity',

    'pain.heading': 'העסק גדל, הכאוס לא קטן',
    'pain.1.title': 'תורים אובדים',
    'pain.1.text':  'מחברת, פתקים בטלפון, ראש — לקוחות נושרים ולא חוזרים',
    'pain.2.title': 'SMS לא קוראים',
    'pain.2.text':  'שלחתם תזכורת — הלקוח לא הגיע. כי 3 מ-10 פותחים SMS. WhatsApp — 9 מ-10',
    'pain.3.title': 'לא ברור מה עובד',
    'pain.3.text':  'מי הלקוח הטוב ביותר? מה מניב הכי הרבה כסף? בלי מערכת — רק ניחושים',

    'features.heading':   'כל מה שצריך — במקום אחד',
    'features.subtitle':  'ללא כפתורים מיותרים. רק מה שמשתמשים בו באמת כל יום',
    'features.wa.title':  'שליחת WhatsApp',
    'features.wa.text':   'שלחו מבצעים, ברכות ותזכורות ישירות ב-WhatsApp. שיעור פתיחה 90%.',
    'features.wa.tag':    'עד 90% שיעור פתיחה',
    'features.cl.title':  'בסיס לקוחות',
    'features.cl.text':   'כל ההיסטוריה של כל לקוח: ביקורים, העדפות, הוצאות, הערות.',
    'features.cl.tag':    'תמיד זמין',
    'features.di.title':  'יומן תורים',
    'features.di.text':   'לוח שנה נוח עם תזכורות. לקוח קבע — המערכת שולחת תזכורת ב-WhatsApp.',
    'features.di.tag':    'תזכורות אוטומטיות',
    'features.an.title':  'אנליטיקה',
    'features.an.text':   'הכנסות ליום, חודש, שנה. לקוחות מובילים. שירותים רווחיים ביותר.',
    'features.an.tag':    'החלטות מבוססות נתונים',
    'features.st.title':  'מחסן וחומרים',
    'features.st.text':   'עקוב אחר מלאי. המערכת תזכיר כשהגיע הזמן להזמין.',
    'features.st.tag':    'מעקב חכם',
    'features.pa.title':  'מכירות ותשלומים',
    'features.pa.text':   'רשמו תשלומים, עקבו אחר חובות, נהלו הכנסות.',
    'features.pa.tag':    'שקיפות מלאה',

    'how.heading':    'מוכן ביום אחד',
    'how.subtitle':   'אנחנו מגיעים, מגדירים, מדריכים. אתה פשוט מתחיל לעבוד.',
    'how.1.title': 'פגישה ודמו',
    'how.1.text':  'מציגים את המערכת בשידור חי ועונים על כל השאלות.',
    'how.2.title': 'הגדרה',
    'how.2.text':  'מגיעים ומגדירים הכל לעסק שלך. מעבירים נתונים קיימים.',
    'how.3.title': 'הדרכה',
    'how.3.text':  'מסבירים איך להשתמש. אתה והצוות מוכנים תוך שעות ספורות.',
    'how.4.title': 'עובד',
    'how.4.text':  'אנחנו זמינים. כל שאלה — שלח הודעה. המערכת מתעדכנת אוטומטית.',

    'security.heading':  'המידע שלך — שלך בלבד',
    'security.subtitle': 'אתה סומך עלינו עם בסיס הלקוחות — אנחנו לוקחים זה ברצינות.',
    'security.1.title': 'הצפנת SSL/TLS',
    'security.1.text':  'כל הנתונים מועברים בפרוטוקול מאובטח.',
    'security.2.title': 'גיבויים יומיים',
    'security.2.text':  'גיבוי אוטומטי כל יום. הנתונים לא יאבדו.',
    'security.3.title': 'עמידה בתקנות',
    'security.3.text':  'פועלים בהתאם לחוק הגנת הפרטיות הישראלי.',
    'security.4.title': 'ללא פרסום',
    'security.4.text':  'בסיס הלקוחות שלך לא מועבר לצד שלישי. לעולם.',

    'pricing.heading':   'תמחור הוגן. ללא הפתעות.',
    'pricing.subtitle':  'שלם רק על מה שאתה משתמש. ללא עמלות נסתרות.',
    'pricing.badge.recommended': 'מומלץ',
    'pricing.badge.business':    'לעסקים',
    'pricing.period':            '/ חודש',
    'pricing.cta.select':        'בחר',

    'reviews.heading':   'מה הלקוחות שלנו אומרים',
    'reviews.subtitle':  'בעלי עסקים אמיתיים על העבודה עם Trinity',
    'reviews.1.text':    'פעם ניהלתי הכל במחברת ואיבדתי לקוחות כל הזמן. עכשיו המערכת שולחת תזכורות ב-WhatsApp — הרבה פחות אי-הגעות.',
    'reviews.1.author':  'אנטה',
    'reviews.1.role':    'בעלת מכון Beautymania',
    'reviews.2.text':    'ולד הגיע והגדיר הכל ביום אחד. עכשיו אני רואה מי הלקוח הטוב ביותר שלי וכמה כסף מניב כל שירות. זה משנה הכל.',
    'reviews.2.author':  'קסניה',
    'reviews.2.role':    'בעלת Hair Rehab',

    'contacts.cta.h2':      'מוכן להביא סדר לעסק שלך?',
    'contacts.cta.p':       'כתוב לנו — נציג את המערכת בשידור חי. ללא התחייבות.',
    'contacts.cta.wa':      'כתוב ב-WhatsApp →',
    'contacts.cta.pricing': 'ראה תמחור',
    'contacts.info.h3':     'צור איתנו קשר',
    'contacts.wa':          'WhatsApp: 972-54-485-8586+',
    'contacts.email':       'Email: info@ambersol.co.il',
    'contacts.location':    'ישראל',
    'contacts.form.name':   'שם',
    'contacts.form.email':  'אימייל',
    'contacts.form.phone':  'טלפון',
    'contacts.form.msg':    'הודעה',
    'contacts.form.submit': 'שלח',

    'footer.copy':       '© 2025 Amber Solutions. כל הזכויות שמורות.',
    'footer.features':   'יכולות',
    'footer.pricing':    'תמחור',
    'footer.support':    'תמיכה',
    'footer.contacts':   'צור קשר',
  },
}

// ───────────────────────────────────────────────
// PROVIDER
// ───────────────────────────────────────────────
export function LandingLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LandingLang>('ru')

  // Detect browser language on mount
  useEffect(() => {
    const saved = localStorage.getItem('trinity-landing-lang') as LandingLang | null
    if (saved && ['ru', 'en', 'he'].includes(saved)) {
      setLangState(saved)
      return
    }
    const nav = navigator.language.toLowerCase()
    if (nav.startsWith('he')) setLangState('he')
    else if (nav.startsWith('ru')) setLangState('ru')
    else setLangState('en')
  }, [])

  // Apply dir to <html> when lang changes
  useEffect(() => {
    const dir = lang === 'he' ? 'rtl' : 'ltr'
    document.documentElement.setAttribute('lang', lang)
    // We only change dir on the landing wrapper, not the whole html
    // (applied via CSS class on the page container)
  }, [lang])

  const setLang = (l: LandingLang) => {
    setLangState(l)
    localStorage.setItem('trinity-landing-lang', l)
  }

  const t = (key: string) => translations[lang][key] ?? key

  const dir = lang === 'he' ? 'rtl' : 'ltr'

  return (
    <LandingLangContext.Provider value={{ lang, setLang, t, dir, isRTL: lang === 'he' }}>
      {children}
    </LandingLangContext.Provider>
  )
}

export function useLandingLang() {
  const ctx = useContext(LandingLangContext)
  if (!ctx) throw new Error('useLandingLang must be used inside LandingLangProvider')
  return ctx
}

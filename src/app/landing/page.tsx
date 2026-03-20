'use client'

import { useState, useEffect } from 'react'
import DemoRegisterModal from '@/components/landing/DemoRegisterModal'

// ─── i18n ─────────────────────────────────────────────────────────────────────
type LDir = 'ltr' | 'rtl'
type LangData = {
  dir: LDir
  langBtn: string
  navFeatures: string
  navPricing: string
  navHow: string
  navCta: string
  badge: string
  h1a: string
  h1b: string
  heroSub: string
  ctaPrimary: string
  ctaSecondary: string
  stat1n: string; stat1u: string; stat1l: string
  stat2n: string; stat2u: string; stat2l: string
  stat3n: string; stat3u: string; stat3l: string
  marqueeItems: string[]
  probLabel: string
  probH2a: string
  probH2b: string
  probSub: string
  problems: { icon: string; title: string; text: string }[]
  featLabel: string
  featH2a: string
  featH2b: string
  featSub: string
  features: { icon: string; title: string; text: string; tag: string }[]
  trustLabel: string
  trustH2a: string
  trustH2b: string
  trustSub: string
  trustItems: { icon: string; title: string; text: string }[]
  howLabel: string
  howH2a: string
  howH2b: string
  howSub: string
  steps: { n: string; title: string; text: string }[]
  priceLabel: string
  priceH2a: string
  priceH2b: string
  priceSub: string
  plans: { name: string; price: string; popular: boolean; period: string; useCase: string; features: string[] }[]
  popularBadge: string
  setupNote: string
  setupNote2: string
  setupNote3: string
  testiLabel: string
  testiH2a: string
  testiH2b: string
  testiSub: string
  reviews: { text: string; name: string; role: string; avatar: string }[]
  ctaH2a: string
  ctaH2b: string
  ctaSub: string
  ctaWA: string
  ctaPrice: string
  footerLinks: string[]
  footerCopy: string
  choosePlan: string
}

const RU: LangData = {
  dir: 'ltr',
  langBtn: 'עברית',
  navFeatures: 'Возможности',
  navPricing: 'Тарифы',
  navHow: 'Как это работает',
  navCta: 'Войти →',
  badge: 'Система управления бизнесом · Израиль',
  h1a: 'Клиенты не пропадают. Запись не теряется.',
  h1b: 'Хаос — прощай.',
  heroSub: 'Trinity — нервная система вашего бизнеса. Клиенты, записи, аналитика и WhatsApp-напоминания в одном месте. Запуск за один день.',
  ctaPrimary: 'Попробовать бесплатно →',
  ctaSecondary: 'Посмотреть возможности',
  stat1n: '90', stat1u: '%', stat1l: 'открываемость WhatsApp',
  stat2n: '5', stat2u: 'мин', stat2l: 'на запуск системы',
  stat3n: '0', stat3u: '₪', stat3l: 'скрытых комиссий',
  marqueeItems: ['Салоны красоты','Косметологические клиники','Магазины мебели','Цветочные магазины','Медицинские кабинеты','Фотостудии','Автомастерские','Ветеринарные клиники'],
  probLabel: 'Знакомо?',
  probH2a: 'Бизнес растёт,',
  probH2b: 'а хаос не уменьшается',
  probSub: 'Большинство владельцев бизнеса сталкиваются с одними и теми же проблемами каждый день',
  problems: [
    { icon: '📋', title: 'Записи теряются', text: 'Тетрадка, заметки в телефоне, голова — клиенты падают в щели и не возвращаются' },
    { icon: '📵', title: 'SMS никто не читает', text: 'Отправили напоминание — клиент не пришёл. Потому что SMS открывают 3 из 10. WhatsApp — 9 из 10' },
    { icon: '📊', title: 'Непонятно что работает', text: 'Кто лучший клиент? Что приносит больше денег? Без системы — просто догадки' },
  ],
  featLabel: 'Возможности',
  featH2a: 'Всё что нужно —',
  featH2b: 'в одном месте',
  featSub: 'Никаких лишних кнопок. Только то что реально используется каждый день',
  features: [
    { icon: '👥', title: 'База клиентов', text: 'Вся история каждого клиента: визиты, предпочтения, расходы, заметки. Всё в одном профиле.', tag: 'Всегда под рукой' },
    { icon: '📅', title: 'Дневник записей', text: 'Удобный календарь с напоминаниями. Клиент записался — система сама напомнит через WhatsApp.', tag: 'Авто-напоминания' },
    { icon: '💬', title: 'WhatsApp рассылки', text: 'Отправляйте акции, поздравления и напоминания прямо в WhatsApp. Открываемость 90%. Поможем подключить WhatsApp Business API.', tag: 'До 90% открываемость' },
    { icon: '📦', title: 'Склад и материалы', text: 'Следите за остатками. Система напомнит когда пора заказывать. Автосписание при продаже.', tag: 'Умный учёт' },
    { icon: '💰', title: 'Продажи и оплаты', text: 'Фиксируйте платежи, видите долги, следите за выручкой. Полная картина за любой период.', tag: 'Прозрачность' },
    { icon: '📈', title: 'Аналитика', text: 'Доход за день, месяц, год. Лучшие клиенты. Самые прибыльные услуги. Нажатием кнопки.', tag: 'Решения на данных' },
  ],
  trustLabel: 'Безопасность',
  trustH2a: 'Ваши данные —',
  trustH2b: 'только ваши',
  trustSub: 'Доверяете нам клиентскую базу — мы относимся к этому серьёзно.',
  trustItems: [
    { icon: '🔐', title: 'Шифрование SSL/TLS', text: 'Все данные передаются по защищённому протоколу. Никто не перехватит.' },
    { icon: '💾', title: 'Ежедневные бэкапы', text: 'Автоматическое резервное копирование каждый день. Данные не пропадут.' },
    { icon: '🇮🇱', title: 'Соответствие стандартам', text: 'Работаем в соответствии с израильским законом о защите персональных данных (Privacy Protection Authority).' },
    { icon: '🚫', title: 'Никакой рекламы', text: 'Ваша клиентская база не передаётся третьим лицам и не используется для рекламы. Никогда.' },
  ],
  howLabel: 'Как это работает',
  howH2a: 'Запуск за',
  howH2b: 'один день',
  howSub: 'Мы приезжаем, настраиваем, обучаем. Вы просто начинаете работать.',
  steps: [
    { n: '1', title: 'Встреча и демо', text: 'Показываем систему вживую, отвечаем на все вопросы. Никаких обязательств.' },
    { n: '2', title: 'Настройка', text: 'Приезжаем и настраиваем всё под ваш бизнес. Переносим существующие данные.' },
    { n: '3', title: 'Обучение', text: 'Объясняем как пользоваться. Вы и ваши сотрудники готовы за пару часов.' },
    { n: '4', title: 'Работаете', text: 'Мы на связи. Любой вопрос — пишите. Система обновляется автоматически.' },
  ],
  priceLabel: 'Тарифы',
  priceH2a: 'Честные цены.',
  priceH2b: 'Без сюрпризов.',
  priceSub: 'Платите только за то что используете. Никаких скрытых комиссий.',
  plans: [
    { name: 'Основа', price: '199', popular: false, period: 'в месяц', useCase: 'Для тех, кто только начинает наводить порядок', features: ['База клиентов','Дневник записей','WhatsApp напоминания','История визитов','Поддержка'] },
    { name: 'Рост', price: '399', popular: true, period: 'в месяц', useCase: 'Для тех, кто хочет понимать что приносит деньги', features: ['Всё из тарифа Основа','Склад и материалы','Продажи и оплаты','WhatsApp рассылки','Программа лояльности','Аналитика и отчёты'] },
    { name: 'Сеть', price: '549', popular: false, period: 'в месяц', useCase: 'Для нескольких точек или большой команды', features: ['Всё из тарифа Рост','Несколько филиалов','Онлайн запись','Приоритетная поддержка','Индивидуальные модули'] },
  ],
  popularBadge: 'Популярный',
  setupNote: 'Настройка: самостоятельно — бесплатно · онлайн (Zoom) — ',
  setupNote2: ' · выезд к вам — ',
  setupNote3: '',
  testiLabel: 'Отзывы',
  testiH2a: 'Что говорят',
  testiH2b: 'наши клиенты',
  testiSub: 'Реальные владельцы бизнеса о работе с Trinity',
  reviews: [
    { text: 'Раньше вела всё в тетрадке и постоянно теряла клиентов. Теперь система сама напоминает через WhatsApp — пропусков стало в разы меньше.', name: 'Анета', role: 'Владелица салона Beautymania', avatar: 'А' },
    { text: 'Влад приехал, всё настроил за один день. Теперь я вижу кто мой лучший клиент и сколько денег приносит каждая услуга. Это меняет всё.', name: 'Ксения', role: 'Владелица Hair Rehab', avatar: 'К' },
  ],
  ctaH2a: 'Готовы навести порядок',
  ctaH2b: 'в своём бизнесе?',
  ctaSub: 'Напишите нам — покажем систему вживую. Без обязательств.',
  ctaWA: 'Написать в WhatsApp →',
  ctaPrice: 'Посмотреть тарифы',
  footerLinks: ['Возможности','Тарифы','Поддержка','Контакты'],
  footerCopy: '© 2025 Amber Solutions. Все права защищены.',
  choosePlan: 'Выбрать →',
}

const HE: LangData = {
  dir: 'rtl',
  langBtn: 'Русский',
  navFeatures: 'יכולות',
  navPricing: 'תמחור',
  navHow: 'איך זה עובד',
  navCta: 'כניסה →',
  badge: 'מערכת ניהול עסקים · ישראל',
  h1a: 'לקוחות לא נעלמים. תורים לא אובדים.',
  h1b: 'הבלגן — נגמר.',
  heroSub: 'Trinity — מערכת העצבים של העסק שלך. לקוחות, תורים, אנליטיקה ותזכורות WhatsApp במקום אחד. הפעלה תוך יום אחד.',
  ctaPrimary: 'נסה בחינם →',
  ctaSecondary: 'ראה יכולות',
  stat1n: '90', stat1u: '%', stat1l: 'פתיחת הודעות WhatsApp',
  stat2n: '5', stat2u: 'דק', stat2l: 'להפעיל את המערכת',
  stat3n: '0', stat3u: '₪', stat3l: 'עמלות נסתרות',
  marqueeItems: ['סלוני יופי','קליניקות קוסמטיקה','חנויות רהיטים','חנויות פרחים','מרפאות','סטודיואים לצילום','מוסכים','קליניקות וטרינריה'],
  probLabel: 'מוכר?',
  probH2a: 'העסק גדל,',
  probH2b: 'אבל הבלגן לא קטן',
  probSub: 'רוב בעלי העסקים נתקלים באותן בעיות בדיוק כל יום',
  problems: [
    { icon: '📋', title: 'רשומות אובדות', text: 'מחברת, הערות בטלפון, ראש — לקוחות נופלים בין הכיסאות ולא חוזרים' },
    { icon: '📵', title: 'SMS אף אחד לא קורא', text: 'שלחת תזכורת — הלקוח לא הגיע. כי SMS פותחים 3 מתוך 10. WhatsApp — 9 מתוך 10' },
    { icon: '📊', title: 'לא ברור מה עובד', text: 'מי הלקוח הכי טוב? מה מביא יותר כסף? בלי מערכת — רק ניחושים' },
  ],
  featLabel: 'יכולות',
  featH2a: 'כל מה שצריך —',
  featH2b: 'במקום אחד',
  featSub: 'בלי כפתורים מיותרים. רק מה שמשתמשים בו כל יום',
  features: [
    { icon: '👥', title: 'בסיס לקוחות', text: 'כל ההיסטוריה של כל לקוח: ביקורים, העדפות, הוצאות, הערות. הכל בפרופיל אחד.', tag: 'תמיד בהישג יד' },
    { icon: '📅', title: 'יומן תורים', text: 'לוח שנה נוח עם תזכורות. לקוח נרשם — המערכת תזכיר לו דרך WhatsApp.', tag: 'תזכורות אוטו' },
    { icon: '💬', title: 'שיווק WhatsApp', text: 'שלח מבצעים, ברכות ותזכורות ישירות ל-WhatsApp. שיעור פתיחה 90%. נסייע לחבר WhatsApp Business API.', tag: 'עד 90% פתיחה' },
    { icon: '📦', title: 'מלאי וחומרים', text: 'עקוב אחרי מלאי. המערכת תזכיר מתי להזמין. ניכוי אוטומטי במכירה.', tag: 'ניהול חכם' },
    { icon: '💰', title: 'מכירות ותשלומים', text: 'רשום תשלומים, ראה חובות, עקוב אחרי הכנסות. תמונה מלאה לכל תקופה.', tag: 'שקיפות' },
    { icon: '📈', title: 'אנליטיקה', text: 'הכנסות ליום, לחודש, לשנה. הלקוחות הטובים. השירותים הרווחיים. בלחיצת כפתור.', tag: 'החלטות מבוססות נתונים' },
  ],
  trustLabel: 'אבטחה',
  trustH2a: 'המידע שלך —',
  trustH2b: 'רק שלך',
  trustSub: 'אתה סומך עלינו עם בסיס הלקוחות שלך — אנחנו לוקחים את זה ברצינות.',
  trustItems: [
    { icon: '🔐', title: 'הצפנת SSL/TLS', text: 'כל הנתונים מועברים בפרוטוקול מאובטח. אף אחד לא יוכל ליירט.' },
    { icon: '💾', title: 'גיבויים יומיים', text: 'גיבוי אוטומטי כל יום. הנתונים שלך לא ייעלמו לעולם.' },
    { icon: '🇮🇱', title: 'עמידה בתקנים', text: 'פועלים בהתאם לחוק הגנת הפרטיות הישראלי (רשות הגנת הפרטיות).' },
    { icon: '🚫', title: 'ללא פרסום', text: 'בסיס הלקוחות שלך לא מועבר לצד שלישי ולא משמש לפרסום. לעולם לא.' },
  ],
  howLabel: 'איך זה עובד',
  howH2a: 'הפעלה תוך',
  howH2b: 'יום אחד',
  howSub: 'אנחנו מגיעים, מגדירים, מלמדים. אתה פשוט מתחיל לעבוד.',
  steps: [
    { n: '1', title: 'פגישה ודמו', text: 'מראים את המערכת בחיים, עונים על כל השאלות. ללא התחייבות.' },
    { n: '2', title: 'הגדרה', text: 'מגיעים ומגדירים הכל לפי העסק שלך. מעבירים נתונים קיימים.' },
    { n: '3', title: 'הדרכה', text: 'מסבירים איך להשתמש. אתה והעובדים שלך מוכנים בכמה שעות.' },
    { n: '4', title: 'עובד', text: 'אנחנו בקשר. כל שאלה — כתוב. המערכת מתעדכנת אוטומטית.' },
  ],
  priceLabel: 'תמחור',
  priceH2a: 'מחירים הוגנים.',
  priceH2b: 'ללא הפתעות.',
  priceSub: 'משלמים רק על מה שמשתמשים בו. ללא עמלות נסתרות.',
  plans: [
    { name: 'בסיס', price: '199', popular: false, period: 'לחודש', useCase: 'למי שמתחיל לעשות סדר בעסק', features: ['בסיס לקוחות','יומן תורים','תזכורות WhatsApp','היסטוריית ביקורים','תמיכה'] },
    { name: 'צמיחה', price: '399', popular: true, period: 'לחודש', useCase: 'למי שרוצה להבין מה מביא כסף', features: ['הכל מתוכנית הבסיס','מלאי וחומרים','מכירות ותשלומים','שיווק WhatsApp','תוכנית נאמנות','אנליטיקה ודוחות'] },
    { name: 'רשת', price: '549', popular: false, period: 'לחודש', useCase: 'למספר סניפים או צוות גדול', features: ['הכל מתוכנית הצמיחה','מספר סניפים','הזמנה אונליין','תמיכה מועדפת','מודולים אישיים'] },
  ],
  popularBadge: 'פופולרי',
  setupNote: 'הגדרה: בעצמך — חינם · אונליין (Zoom) — ',
  setupNote2: ' · ביקור אצלך — ',
  setupNote3: '',
  testiLabel: 'המלצות',
  testiH2a: 'מה אומרים',
  testiH2b: 'הלקוחות שלנו',
  testiSub: 'בעלי עסקים אמיתיים על העבודה עם Trinity',
  reviews: [
    { text: 'קודם ניהלתי הכל במחברת ואיבדתי לקוחות כל הזמן. עכשיו המערכת מזכירה דרך WhatsApp — הרבה פחות היעדרויות.', name: 'אנטה', role: 'בעלת סלון Beautymania', avatar: 'א' },
    { text: 'ולד הגיע, הגדיר הכל ביום אחד. עכשיו אני רואה מי הלקוח הכי טוב שלי וכמה כסף מביא כל שירות. זה משנה הכל.', name: 'קסניה', role: 'בעלת Hair Rehab', avatar: 'ק' },
  ],
  ctaH2a: 'מוכן לסדר',
  ctaH2b: 'בעסק שלך?',
  ctaSub: 'כתוב לנו — נראה את המערכת בחיים. ללא התחייבות.',
  ctaWA: 'כתוב ב-WhatsApp →',
  ctaPrice: 'ראה תמחור',
  footerLinks: ['יכולות','תמחור','תמיכה','צור קשר'],
  footerCopy: '© 2025 Amber Solutions. כל הזכויות שמורות.',
  choosePlan: 'בחר →',
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [lang, setLang] = useState<'ru' | 'he'>('ru')
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)
  const [demoPlan, setDemoPlan] = useState('')
  const t = lang === 'ru' ? RU : HE

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('dir', t.dir)
    document.documentElement.setAttribute('lang', lang)
  }, [lang, t.dir])

  // Фикс белого пространства под футером — Tailwind base делает html белым
  useEffect(() => {
    const prev = document.documentElement.style.background
    document.documentElement.style.background = '#1E2D4A'
    document.body.style.background = '#FDFAF5'
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    return () => {
      document.documentElement.style.background = prev
    }
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const el = e.target as HTMLElement
          el.style.opacity = '1'
          el.style.transform = 'translateY(0)'
        }
      })
    }, { threshold: 0.1 })
    document.querySelectorAll<HTMLElement>('.feature-card,.problem-card,.plan,.testi-card,.step,.trust-card')
      .forEach(el => {
        el.style.opacity = '0'
        el.style.transform = 'translateY(32px)'
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease'
        obs.observe(el)
      })
    return () => obs.disconnect()
  }, [lang])

  return (
    <div dir={t.dir} className="page-root">
      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        :root {
          /* ── Brand Colors ── */
          --cream: #FDFAF5; --cream-dark: #F5F0E8; --cream-mid: #EDE7D8;
          --amber: #D97706; --amber-light: #F59E0B; --amber-pale: #FEF3C7;
          --amber-glow: rgba(217,119,6,0.12); --navy: #1E2D4A; --navy-mid: #2D3E5C;
          --text: #1A1A2E; --text-mid: #4A5568; --text-light: #8896A8;
          --white: #FFFFFF; --border: rgba(217,119,6,0.15);
          /* ── Fluid Spacing Scale ── */
          --space-xs:  clamp(8px,  1vw,  12px);
          --space-sm:  clamp(12px, 2vw,  20px);
          --space-md:  clamp(20px, 3vw,  36px);
          --space-lg:  clamp(36px, 5vw,  64px);
          --space-xl:  clamp(56px, 7vw,  100px);
          --space-2xl: clamp(72px, 9vw,  140px);
          /* ── Container ── */
          --container: 1440px;
          --container-inner: 1100px;
          --gutter: clamp(20px, 5vw, 80px);
          --shadow-sm: 0 2px 12px rgba(30,45,74,0.06);
          --shadow-md: 0 8px 32px rgba(30,45,74,0.10);
          --shadow-lg: 0 20px 60px rgba(30,45,74,0.14);
        }

        /* ─── Base ────────────────────────────────────────────────────────── */
        body {
          background: var(--cream); color: var(--text);
          font-family: 'Manrope', system-ui, sans-serif;
          overflow-x: hidden; line-height: 1.65;
          display: flex; flex-direction: column; min-height: 100dvh;
        }
        .page-root { display: contents; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: var(--cream); }
        ::-webkit-scrollbar-thumb { background: var(--amber-light); border-radius: 3px; }

        /* ─── Max-Width Container ─────────────────────────────────────────── */
        .container {
          width: 100%; max-width: var(--container-inner);
          margin-inline: auto; padding-inline: var(--gutter);
        }

        /* ─── Navigation ─────────────────────────────────────────────────── */
        nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px clamp(20px,4vw,60px);
          background: rgba(253,250,245,0.88); backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border); transition: box-shadow 0.3s;
        }
        nav.scrolled { box-shadow: var(--shadow-sm); }
        .logo { display:flex; align-items:center; gap:10px; font-family:'Lora',serif; font-size:22px; font-weight:600; color:var(--navy); text-decoration:none; letter-spacing:-0.3px; }
        .logo-img-wrap { width:40px; height:40px; border-radius:50%; overflow:hidden; background:#000; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
        .logo-img-wrap img { width:100%; height:100%; object-fit:cover; mix-blend-mode:lighten; display:block; }
        .nav-links { display:flex; align-items:center; gap:36px; }
        .nav-links a { color:var(--text-mid); text-decoration:none; font-size:15px; font-weight:500; transition:color 0.2s; }
        .nav-links a:hover { color:var(--amber); }
        .nav-right { display:flex; align-items:center; gap:12px; }
        .btn-nav { background:var(--navy); color:white; padding:10px 24px; border-radius:10px; font-size:14px; font-weight:600; text-decoration:none; transition:all 0.2s; box-shadow:var(--shadow-sm); }
        .btn-nav:hover { background:var(--navy-mid); transform:translateY(-1px); box-shadow:var(--shadow-md); }
        .btn-lang { background:transparent; border:1.5px solid var(--border); border-radius:8px; padding:7px 14px; cursor:pointer; font-size:13px; font-weight:600; color:var(--navy); transition:all 0.2s; font-family:inherit; }
        .btn-lang:hover { border-color:var(--amber); color:var(--amber); }
        .burger { display:none; background:none; border:none; cursor:pointer; color:var(--navy); padding:4px; }
        .mobile-menu { display:none; position:fixed; top:72px; left:0; right:0; z-index:99; background:rgba(253,250,245,0.98); backdrop-filter:blur(16px); border-bottom:1px solid var(--border); padding:20px 24px; flex-direction:column; gap:20px; }
        .mobile-menu.open { display:flex; }
        .mobile-menu a { color:var(--text-mid); text-decoration:none; font-size:16px; font-weight:500; }
        .mobile-menu .btn-nav { text-align:center; }

        /* ─── Hero ───────────────────────────────────────────────────────── */
        .hero {
          min-height: 100dvh; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: clamp(72px,8vw,120px) var(--gutter) clamp(28px,4vw,60px);
          position: relative; text-align: center; overflow: hidden;
        }
        .hero-bg { position:absolute; inset:0; z-index:0; background:radial-gradient(ellipse 70% 50% at 50% 0%,rgba(245,158,11,0.08) 0%,transparent 70%),radial-gradient(ellipse 40% 40% at 80% 80%,rgba(30,45,74,0.04) 0%,transparent 60%); }
        .shape {
          position: absolute; border-radius: 50%;
          background: linear-gradient(135deg,rgba(245,158,11,0.07),rgba(217,119,6,0.04));
          pointer-events: none; animation: float ease-in-out infinite;
          content-visibility: auto;
        }
        .s1 { width:clamp(200px,30vw,400px); height:clamp(200px,30vw,400px); top:-100px; right:-80px; animation-duration:12s; }
        .s2 { width:clamp(100px,15vw,200px); height:clamp(100px,15vw,200px); bottom:15%; left:5%; animation-duration:9s; animation-delay:-4s; }
        .s3 { width:clamp(60px,8vw,120px); height:clamp(60px,8vw,120px); top:30%; left:8%; animation-duration:7s; animation-delay:-2s; }
        @keyframes float { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-20px) rotate(3deg)} }
        .hero-inner { position:relative; z-index:1; max-width:min(820px,90vw); width:100%; display:flex; flex-direction:column; align-items:center; }
        .hero-badge { display:inline-flex; align-items:center; gap:8px; background:var(--amber-pale); border:1px solid rgba(217,119,6,0.25); border-radius:100px; padding:7px 18px; margin-bottom:clamp(14px,2vw,28px); font-size:13px; font-weight:600; color:var(--amber); animation:fadeUp 0.6s ease both; }
        .badge-dot { width:7px; height:7px; border-radius:50%; background:var(--amber-light); animation:pulse 2s ease infinite; display:inline-block; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.4)} }
        h1 { font-family:'Lora',serif; font-size:clamp(32px,5vw,64px); font-weight:600; line-height:1.12; letter-spacing:-1.5px; color:var(--navy); margin-bottom:clamp(12px,2vw,24px); animation:fadeUp 0.6s 0.1s ease both; }
        h1 em { font-style:normal; background:linear-gradient(135deg,var(--amber) 0%,var(--amber-light) 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .hero-sub { font-size:clamp(15px,1.8vw,20px); color:var(--text-mid); font-weight:400; max-width:580px; margin:0 auto clamp(20px,3vw,40px); line-height:1.7; animation:fadeUp 0.6s 0.2s ease both; }
        .hero-cta { display:flex; align-items:center; justify-content:center; gap:16px; flex-wrap:wrap; animation:fadeUp 0.6s 0.3s ease both; }
        .btn-primary { background:linear-gradient(135deg,var(--amber) 0%,var(--amber-light) 100%); color:white; padding:clamp(12px,1.5vw,16px) clamp(24px,3vw,36px); border-radius:14px; font-size:clamp(14px,1.5vw,16px); font-weight:700; text-decoration:none; box-shadow:0 6px 24px rgba(217,119,6,0.35); transition:all 0.25s; display:inline-flex; align-items:center; gap:8px; letter-spacing:0.1px; }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 10px 32px rgba(217,119,6,0.45); }
        .btn-secondary { background:transparent; color:var(--navy); padding:clamp(12px,1.5vw,16px) clamp(20px,2.5vw,28px); border-radius:14px; font-size:clamp(14px,1.5vw,16px); font-weight:700; text-decoration:none; border:1.5px solid var(--border); transition:all 0.25s; display:inline-flex; align-items:center; gap:8px; letter-spacing:0.1px; }
        .btn-secondary:hover { border-color:var(--amber); color:var(--amber); background:var(--amber-glow); }
        .hero-stats { display:flex; align-items:center; justify-content:center; gap:clamp(16px,4vw,48px); margin-top:clamp(36px,5vw,68px); padding-top:clamp(16px,3vw,40px); border-top:1px solid var(--border); animation:fadeUp 0.6s 0.4s ease both; flex-wrap:wrap; }
        .stat-item { text-align:center; }
        .stat-num { font-family:'Lora',serif; font-size:clamp(28px,4vw,36px); font-weight:600; color:var(--navy); letter-spacing:-1px; display:block; }
        .stat-num span { color:var(--amber); }
        .stat-label { font-size:13px; color:var(--text-light); font-weight:500; margin-top:4px; }
        .stat-divider { width:1px; height:48px; background:var(--border); opacity:0.3; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .marquee-wrap { background:var(--navy); padding:18px 0; overflow:hidden; border-top:1px solid rgba(255,255,255,0.05); border-bottom:1px solid rgba(255,255,255,0.05); }
        .marquee-track { display:flex; gap:0; white-space:nowrap; animation:marquee 28s linear infinite; }
        .marquee-track:hover { animation-play-state:paused; }
        .marquee-item { display:inline-flex; align-items:center; gap:12px; padding:0 36px; color:rgba(255,255,255,0.55); font-size:13px; font-weight:500; }
        .marquee-dot { color:var(--amber-light); font-size:18px; }
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }

        /* ─── Sections Base ──────────────────────────────────────────────── */
        section:not([aria-label]) { padding: var(--space-xl) var(--gutter); }
        .section-label { display:inline-flex; align-items:center; gap:8px; font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--amber); margin-bottom:20px; }
        .section-label::before { content:''; width:24px; height:2px; background:var(--amber); border-radius:2px; }
        h2 { font-family:'Lora',serif; font-size:clamp(28px,4vw,52px); font-weight:600; line-height:1.15; letter-spacing:-1px; color:var(--navy); margin-bottom:20px; }
        h2 em { font-style:normal; color:var(--amber); }
        .section-sub { font-size:clamp(15px,1.5vw,18px); color:var(--text-mid); max-width:560px; line-height:1.7; margin-bottom:clamp(36px,5vw,64px); }

        /* ─── Problem ────────────────────────────────────────────────────── */
        .problem { background:var(--navy); color:white; }
        .problem h2 { color:white; }
        .problem .section-label { color:var(--amber-light); }
        .problem .section-label::before { background:var(--amber-light); }
        .problem .section-sub { color:rgba(255,255,255,0.6); }
        .problem-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:clamp(16px,2vw,24px); max-width:var(--container-inner); margin:0 auto; }
        .problem-card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:20px; padding:clamp(24px,3vw,36px) clamp(20px,2.5vw,32px); transition:all 0.3s; position:relative; overflow:hidden; }
        .problem-card::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(217,119,6,0.06) 0%,transparent 60%); opacity:0; transition:opacity 0.3s; }
        .problem-card:hover { border-color:rgba(217,119,6,0.3); transform:translateY(-4px); }
        .problem-card:hover::before { opacity:1; }
        .problem-icon { font-size:36px; margin-bottom:20px; display:block; }
        .problem-card h3 { font-size:18px; font-weight:700; color:white; margin-bottom:12px; }
        .problem-card p { font-size:15px; color:rgba(255,255,255,0.5); line-height:1.65; }

        /* ─── Features ───────────────────────────────────────────────────── */
        .features { background:var(--cream); }
        .features-center { text-align:center; }
        .features-center .section-sub { margin:0 auto clamp(40px,5vw,72px); }
        .features-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:clamp(16px,2vw,24px); max-width:var(--container-inner); margin:0 auto; }
        .feature-card { background:var(--white); border:1px solid var(--border); border-radius:24px; padding:clamp(28px,3vw,40px) clamp(24px,2.5vw,36px); transition:all 0.3s; position:relative; overflow:hidden; }
        .feature-card::after { content:''; position:absolute; bottom:0; left:0; right:0; height:3px; background:linear-gradient(90deg,var(--amber),var(--amber-light)); transform:scaleX(0); transform-origin:left; transition:transform 0.3s; }
        .feature-card:hover { box-shadow:var(--shadow-lg); transform:translateY(-6px); border-color:rgba(217,119,6,0.25); }
        .feature-card:hover::after { transform:scaleX(1); }
        .feature-icon { width:56px; height:56px; border-radius:16px; background:var(--amber-pale); display:flex; align-items:center; justify-content:center; font-size:26px; margin-bottom:24px; transition:all 0.3s; }
        .feature-card:hover .feature-icon { background:var(--amber); }
        .feature-card h3 { font-size:19px; font-weight:700; color:var(--navy); margin-bottom:12px; }
        .feature-card p { font-size:15px; color:var(--text-mid); line-height:1.65; }
        .feature-tag { display:inline-block; margin-top:20px; font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--amber); background:var(--amber-pale); padding:4px 12px; border-radius:100px; }

        /* ─── How it works ───────────────────────────────────────────────── */
        .how { background:var(--cream-dark); }
        .how-inner { max-width:var(--container-inner); margin:0 auto; }
        .steps { display:grid; grid-template-columns:repeat(4,1fr); gap:0; position:relative; }
        .steps::before { content:''; position:absolute; top:36px; left:12%; right:12%; height:2px; background:linear-gradient(90deg,var(--amber),var(--amber-light),var(--amber)); opacity:0.25; }
        .step { text-align:center; padding:0 clamp(8px,1.5vw,20px); }
        .step-num { width:72px; height:72px; border-radius:50%; background:white; border:2px solid var(--border); display:flex; align-items:center; justify-content:center; margin:0 auto 28px; font-family:'Lora',serif; font-size:22px; font-weight:600; color:var(--navy); box-shadow:var(--shadow-sm); position:relative; z-index:1; transition:all 0.3s; }
        .step:hover .step-num { background:var(--amber); color:white; border-color:var(--amber); box-shadow:0 8px 24px rgba(217,119,6,0.35); }
        .step h3 { font-size:clamp(14px,1.5vw,17px); font-weight:700; color:var(--navy); margin-bottom:10px; }
        .step p { font-size:clamp(12px,1.2vw,14px); color:var(--text-mid); line-height:1.6; }

        /* ─── Pricing ────────────────────────────────────────────────────── */
        .pricing { background:var(--cream); }
        .pricing-center { text-align:center; }
        .pricing-center .section-sub { margin:0 auto clamp(40px,5vw,72px); }
        .plans { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:clamp(16px,2vw,24px); max-width:1000px; margin:0 auto; }
        .plan { background:white; border:1.5px solid var(--border); border-radius:28px; padding:clamp(28px,3vw,44px) clamp(20px,2.5vw,36px); position:relative; transition:all 0.3s; }
        .plan:hover { box-shadow:var(--shadow-lg); transform:translateY(-6px); }
        .plan.popular { border-color:var(--amber); background:var(--navy); transform:scale(1.04); box-shadow:var(--shadow-lg); }
        .plan.popular:hover { transform:scale(1.04) translateY(-6px); }
        .popular-badge { position:absolute; top:-14px; left:50%; transform:translateX(-50%); background:linear-gradient(135deg,var(--amber),var(--amber-light)); color:white; font-size:11px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; padding:6px 20px; border-radius:100px; box-shadow:0 4px 14px rgba(217,119,6,0.4); white-space:nowrap; }
        .plan-name { font-size:13px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--amber); margin-bottom:16px; }
        .plan.popular .plan-name { color:var(--amber-light); }
        .plan-price { font-family:'Lora',serif; font-size:clamp(40px,5vw,52px); font-weight:600; color:var(--navy); line-height:1; margin-bottom:6px; letter-spacing:-2px; }
        .plan.popular .plan-price { color:white; }
        .plan-price sup { font-size:22px; font-weight:600; vertical-align:top; margin-top:10px; }
        .plan-period { font-size:14px; color:var(--text-light); margin-bottom:12px; }
        .plan-usecase { font-size:13px; color:var(--text-light); font-style:italic; margin-bottom:24px; line-height:1.5; min-height:38px; }
        .plan.popular .plan-period { color:rgba(255,255,255,0.45); }
        .plan.popular .plan-usecase { color:rgba(255,255,255,0.45); }
        .plan-divider { height:1px; background:var(--border); margin-bottom:28px; }
        .plan.popular .plan-divider { background:rgba(255,255,255,0.1); }
        .plan-features { list-style:none; margin-bottom:36px; }
        .plan-features li { display:flex; align-items:flex-start; gap:12px; font-size:14px; color:var(--text-mid); padding:8px 0; border-bottom:1px solid rgba(0,0,0,0.04); }
        .plan.popular .plan-features li { color:rgba(255,255,255,0.7); border-color:rgba(255,255,255,0.06); }
        .plan-features li:last-child { border-bottom:none; }
        .check { width:20px; height:20px; border-radius:6px; background:var(--amber-pale); color:var(--amber); display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; margin-top:1px; }
        .plan.popular .check { background:rgba(245,158,11,0.2); color:var(--amber-light); }
        .btn-plan { display:block; text-align:center; padding:15px; border-radius:14px; font-size:15px; font-weight:700; text-decoration:none; transition:all 0.25s; cursor:pointer; width:100%; font-family:inherit; }
        .btn-plan-outline { border:1.5px solid var(--border); color:var(--navy); background:transparent; }
        .btn-plan-outline:hover { border-color:var(--amber); color:var(--amber); background:var(--amber-glow); }
        .btn-plan-fill { background:linear-gradient(135deg,var(--amber),var(--amber-light)); color:white; border:none; box-shadow:0 6px 20px rgba(217,119,6,0.4); }
        .btn-plan-fill:hover { box-shadow:0 10px 30px rgba(217,119,6,0.5); transform:translateY(-2px); }
        .setup-note { text-align:center; margin-top:40px; font-size:14px; color:var(--text-light); }
        .setup-note strong { color:var(--navy); }

        /* ─── Testimonials ───────────────────────────────────────────────── */
        .testimonials { background:var(--cream-dark); }
        .testi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:clamp(16px,2vw,24px); max-width:900px; margin:0 auto; }
        .testi-card { background:white; border:1px solid var(--border); border-radius:24px; padding:clamp(24px,3vw,36px) clamp(20px,2.5vw,40px); transition:all 0.3s; }
        .testi-card:hover { box-shadow:var(--shadow-md); transform:translateY(-4px); }
        .testi-quote { font-family:'Lora',serif; font-size:40px; color:var(--amber-light); line-height:1; margin-bottom:16px; }
        .testi-text { font-size:16px; color:var(--text-mid); line-height:1.7; margin-bottom:28px; font-style:italic; }
        .testi-author { display:flex; align-items:center; gap:14px; }
        .testi-avatar { width:46px; height:46px; border-radius:50%; background:linear-gradient(135deg,var(--amber),var(--amber-light)); display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:white; flex-shrink:0; }
        .testi-name { font-size:15px; font-weight:700; color:var(--navy); }
        .testi-role { font-size:13px; color:var(--text-light); }
        .testi-stars { margin-left:auto; color:var(--amber-light); font-size:14px; letter-spacing:1px; }

        /* ─── CTA ────────────────────────────────────────────────────────── */
        .cta-section { background:var(--navy); text-align:center; padding:clamp(72px,10vw,120px) var(--gutter); position:relative; overflow:hidden; }
        .cta-bg { position:absolute; inset:0; background:radial-gradient(ellipse 60% 60% at 50% 50%,rgba(245,158,11,0.08) 0%,transparent 70%); }
        .cta-section h2 { color:white; position:relative; z-index:1; margin:0 auto 20px; max-width:700px; }
        .cta-section p { color:rgba(255,255,255,0.55); font-size:clamp(15px,1.5vw,18px); margin-bottom:48px; position:relative; z-index:1; }
        .cta-section .hero-cta { position:relative; z-index:1; }
        .btn-white { background:white; color:var(--navy); padding:clamp(12px,1.5vw,16px) clamp(24px,3vw,36px); border-radius:14px; font-size:clamp(14px,1.5vw,16px); font-weight:700; text-decoration:none; box-shadow:0 6px 24px rgba(0,0,0,0.2); transition:all 0.25s; display:inline-flex; align-items:center; gap:8px; }
        .btn-white:hover { transform:translateY(-2px); box-shadow:0 10px 36px rgba(0,0,0,0.3); }

        /* ─── Trust & Security ───────────────────────────────────────────── */
        .trust-section { background:var(--cream-dark); }
        .trust-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:clamp(12px,2vw,20px); max-width:var(--container-inner); margin:0 auto; }
        .trust-card { background:white; border:1px solid var(--border); border-radius:20px; padding:clamp(20px,2.5vw,32px) clamp(16px,2vw,24px); text-align:center; transition:all 0.3s; }
        .trust-card:hover { box-shadow:var(--shadow-md); transform:translateY(-4px); border-color:rgba(217,119,6,0.25); }
        .trust-icon { font-size:40px; margin-bottom:16px; display:block; }
        .trust-card h3 { font-size:16px; font-weight:700; color:var(--navy); margin-bottom:10px; }
        .trust-card p { font-size:14px; color:var(--text-mid); line-height:1.6; }

        /* ─── Footer ─────────────────────────────────────────────────────── */
        footer { background:var(--navy); border-top:1px solid rgba(255,255,255,0.06); padding:clamp(40px,6vw,60px) var(--gutter); color:rgba(255,255,255,0.4); margin-top:auto; }
        .footer-inner { max-width:var(--container-inner); margin:0 auto; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:24px; }
        .footer-logo { display:flex; align-items:center; gap:10px; }
        .footer-logo-wrap { width:32px; height:32px; border-radius:50%; overflow:hidden; background:#000; display:flex; align-items:center; justify-content:center; }
        .footer-logo-wrap img { width:100%; height:100%; object-fit:cover; mix-blend-mode:lighten; display:block; }
        .footer-logo span { font-family:'Lora',serif; color:rgba(255,255,255,0.7); font-size:18px; }
        .footer-links { display:flex; gap:clamp(16px,3vw,32px); flex-wrap:wrap; }
        .footer-links a { color:rgba(255,255,255,0.4); text-decoration:none; font-size:14px; transition:color 0.2s; }
        .footer-links a:hover { color:var(--amber-light); }
        .footer-copy { font-size:13px; }

        /* ─── Responsive ─────────────────────────────────────────────────── */
        /* Tablet: 768–900px */
        @media (max-width:900px) {
          nav { padding:16px clamp(16px,3vw,24px); }
          .nav-links { display:none; }
          .btn-nav.desktop-only { display:none; }
          .burger { display:block; }
          .steps { grid-template-columns:repeat(2,1fr); gap:32px; }
          .steps::before { display:none; }
          .stat-divider { display:none; }
          .plan.popular { transform:scale(1); }
          .plan.popular:hover { transform:translateY(-6px); }
          .footer-inner { flex-direction:column; text-align:center; }
          .footer-links { justify-content:center; }
        }
        /* Mobile: ≤ 480px — центрирование для мобильных (LTR) */
        @media (max-width:480px) {
          [dir="ltr"] .section-label,
          [dir="ltr"] h2,
          [dir="ltr"] .section-sub,
          [dir="ltr"] .how-inner .section-label,
          [dir="ltr"] .how-inner h2,
          [dir="ltr"] .how-inner .section-sub,
          [dir="ltr"] .trust-section .section-label,
          [dir="ltr"] .trust-section h2,
          [dir="ltr"] .trust-section .section-sub {
            text-align: center;
          }
          [dir="ltr"] .section-label {
            justify-content: center;
          }
          .hero { text-align:center; }
          .hero-stats { justify-content:center; gap:16px; }
          .steps { grid-template-columns:1fr; }
          .hero-cta { flex-direction:column; align-items:center; }
          .btn-primary, .btn-secondary { width:100%; justify-content:center; max-width:320px; }
        }
        /* Ultrawide: 1800px+ */
        @media (min-width:1800px) {
          section:not([aria-label]) { padding: var(--space-2xl) var(--gutter); }
          .hero-inner { max-width: 1100px; }
          h1 { font-size: clamp(52px,4vw,72px); }
        }
        /* Short screens: ноутбуки ≤ 800px высоты */
        @media (max-height:800px) {
          nav { padding: 12px clamp(20px,4vw,60px); }
          .hero { padding-top: clamp(60px,8vh,80px); padding-bottom: clamp(16px,3vh,32px); gap: 0; }
          .hero-badge { margin-bottom: 12px; padding: 5px 14px; font-size: 12px; }
          h1 { font-size: clamp(28px,4.5vw,52px); margin-bottom: 10px; line-height: 1.1; }
          .hero-sub { font-size: clamp(14px,1.5vw,17px); margin-bottom: 16px; }
          .hero-cta { gap: 10px; }
          .btn-primary, .btn-secondary { padding: 12px 24px; font-size: 14px; }
          .hero-stats { margin-top: 16px; padding-top: 14px; gap: 20px; }
          .stat-num { font-size: clamp(22px,3vw,28px); }
        }
        /* Very short screens: ≤ 650px высоты */
        @media (max-height:650px) {
          h1 { font-size: clamp(24px,3.5vw,40px); }
          .hero-sub { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          .hero-stats { margin-top: 10px; padding-top: 10px; }
          .stat-label { display: none; }
        }
      `}</style>

      {/* NAV */}
      <nav id="nav" className={scrolled ? 'scrolled' : ''}>
        <a href="#" className="logo">
          <div className="logo-img-wrap">
            <img src="/trinity-logo.png" alt="Trinity CRM" />
          </div>
          Trinity CRM
        </a>
        <div className="nav-links">
          <a href="#features">{t.navFeatures}</a>
          <a href="#pricing">{t.navPricing}</a>
          <a href="#how">{t.navHow}</a>
        </div>
        <div className="nav-right">
          <button className="btn-lang" onClick={() => setLang(lang === 'ru' ? 'he' : 'ru')}>{t.langBtn}</button>
          <a href="/login" className="btn-nav desktop-only">{t.navCta}</a>
          <button className="burger" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
        </div>
      </nav>

      {/* MOBILE MENU */}
      <div className={`mobile-menu${mobileOpen ? ' open' : ''}`}>
        <a href="#features" onClick={() => setMobileOpen(false)}>{t.navFeatures}</a>
        <a href="#pricing"  onClick={() => setMobileOpen(false)}>{t.navPricing}</a>
        <a href="#how"      onClick={() => setMobileOpen(false)}>{t.navHow}</a>
        <a href="/login"  onClick={() => setMobileOpen(false)} className="btn-nav">{t.navCta}</a>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="shape s1"></div>
        <div className="shape s2"></div>
        <div className="shape s3"></div>
        <div className="hero-inner">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            {t.badge}
          </div>
          <h1>{t.h1a}<br /><em>{t.h1b}</em></h1>
          <p className="hero-sub">{t.heroSub}</p>
          <div className="hero-cta">
            <a href="#pricing" className="btn-primary">{t.ctaPrimary}</a>
            <a href="#features" className="btn-secondary">{t.ctaSecondary}</a>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-num">{t.stat1n}<span>{t.stat1u}</span></span>
              <div className="stat-label">{t.stat1l}</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-num">{t.stat2n}<span>{t.stat2u}</span></span>
              <div className="stat-label">{t.stat2l}</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-num">{t.stat3n}<span>{t.stat3u}</span></span>
              <div className="stat-label">{t.stat3l}</div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee-wrap">
        <div className="marquee-track">
          {[...t.marqueeItems, ...t.marqueeItems].map((item, i) => (
            <span key={i} className="marquee-item">
              <span className="marquee-dot">◆</span> {item}
            </span>
          ))}
        </div>
      </div>

      {/* PROBLEM */}
      <section className="problem">
        <div style={{maxWidth:'1100px',margin:'0 auto',textAlign:'center'}}>
          <div className="section-label">{t.probLabel}</div>
          <h2>{t.probH2a}<br /><em style={{color:'#F59E0B'}}>{t.probH2b}</em></h2>
          <p className="section-sub" style={{margin:'0 auto 64px'}}>{t.probSub}</p>
          <div className="problem-grid">
            {t.problems.map((p, i) => (
              <div key={i} className="problem-card">
                <span className="problem-icon">{p.icon}</span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="features-center" style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div className="section-label">{t.featLabel}</div>
          <h2>{t.featH2a}<br /><em>{t.featH2b}</em></h2>
          <p className="section-sub">{t.featSub}</p>
          <div className="features-grid">
            {t.features.map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                <span className="feature-tag">{f.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how" id="how">
        <div className="how-inner">
          <div className="section-label">{t.howLabel}</div>
          <h2>{t.howH2a} <em>{t.howH2b}</em></h2>
          <p className="section-sub">{t.howSub}</p>
          <div className="steps">
            {t.steps.map((s, i) => (
              <div key={i} className="step">
                <div className="step-num">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST & SECURITY */}
      <section className="trust-section">
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div className="section-label">{t.trustLabel}</div>
          <h2>{t.trustH2a}<br /><em>{t.trustH2b}</em></h2>
          <p className="section-sub" style={{marginBottom:'64px'}}>{t.trustSub}</p>
          <div className="trust-grid">
            {t.trustItems.map((item, i) => (
              <div key={i} className="trust-card">
                <div className="trust-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="pricing">
        <div className="pricing-center" style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div className="section-label">{t.priceLabel}</div>
          <h2>{t.priceH2a}<br /><em>{t.priceH2b}</em></h2>
          <p className="section-sub">{t.priceSub}</p>
          <div className="plans">
            {t.plans.map((plan, i) => (
              <div key={i} className={`plan${plan.popular ? ' popular' : ''}`}>
                {plan.popular && <div className="popular-badge">{t.popularBadge}</div>}
                <div className="plan-name">{plan.name}</div>
                <div className="plan-price"><sup>₪</sup>{plan.price}</div>
                <div className="plan-period">{plan.period}</div>
                <div className="plan-usecase">{plan.useCase}</div>
                <div className="plan-divider"></div>
                <ul className="plan-features">
                  {plan.features.map((f, j) => (
                    <li key={j}><span className="check">✓</span> {f}</li>
                  ))}
                </ul>
                <button
                  className={`btn-plan ${plan.popular ? 'btn-plan-fill' : 'btn-plan-outline'}`}
                  onClick={() => { setDemoPlan(plan.name); setDemoOpen(true) }}
                >
                  {t.choosePlan}
                </button>
              </div>
            ))}
          </div>
          <p className="setup-note">{t.setupNote}<strong>₪250</strong>{t.setupNote2}<strong>₪500</strong></p>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div className="section-label">{t.testiLabel}</div>
          <h2>{t.testiH2a}<br /><em>{t.testiH2b}</em></h2>
          <p className="section-sub" style={{marginBottom:'56px'}}>{t.testiSub}</p>
          <div className="testi-grid">
            {t.reviews.map((r, i) => (
              <div key={i} className="testi-card">
                <div className="testi-quote">"</div>
                <p className="testi-text">{r.text}</p>
                <div className="testi-author">
                  <div className="testi-avatar">{r.avatar}</div>
                  <div>
                    <div className="testi-name">{r.name}</div>
                    <div className="testi-role">{r.role}</div>
                  </div>
                  <div className="testi-stars">★★★★★</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-bg"></div>
        <h2>{t.ctaH2a}<br />{t.ctaH2b}</h2>
        <p>{t.ctaSub}</p>
        <div className="hero-cta">
          <a href="https://wa.me/972544858586" className="btn-white">{t.ctaWA}</a>
          <a href="#pricing" className="btn-secondary" style={{color:'rgba(255,255,255,0.6)',borderColor:'rgba(255,255,255,0.15)'}}>{t.ctaPrice}</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-inner">
          <div className="footer-logo">
            <div className="footer-logo-wrap">
              <img src="/trinity-logo.png" alt="Trinity CRM" />
            </div>
            <span>Trinity CRM</span>
          </div>
          <div className="footer-links">
            {t.footerLinks.map((l, i) => <a key={i} href="#">{l}</a>)}
          </div>
          <div className="footer-copy">{t.footerCopy}</div>
        </div>
      </footer>

      {/* DEMO MODAL */}
      {demoOpen && (
        <DemoRegisterModal
          lang={lang}
          planName={demoPlan}
          planKey={demoPlan.toLowerCase()}
          onClose={() => setDemoOpen(false)}
        />
      )}
    </div>
  )
}

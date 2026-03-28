'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

// ─── Static knowledge base content ───────────────────────────────────────────

const OBJECTIONS_HE = [
  {
    id: 1,
    objection: 'יקר לי',
    answer: 'אני מבין. אבל שאל את עצמך — כמה עולה לך לנהל את הכל בעצמך? הזמן שחוסך לבעל עסק עם Trinity שווה הרבה יותר מהמחיר.',
    tip: 'השווה לעלות של עובד נוסף או של אובדן לקוחות',
  },
  {
    id: 2,
    objection: 'אני לא צריך מערכת, יש לי Excel',
    answer: 'Excel זה כלי נהדר — אבל הוא לא מזכיר לך מתי לחזור ללקוח, לא שולח WA אוטומטי, ולא מראה לך אנליטיקה בזמן אמת.',
    tip: 'שאל כמה לקוחות "נפלו בין הכסאות" בגלל Excel',
  },
  {
    id: 3,
    objection: 'אני צריך לחשוב על זה',
    answer: 'כמובן! מה בדיוק אתה רוצה לחשוב עליו? אולי יש שאלה שאני יכול לענות עליה עכשיו?',
    tip: 'זה לרוב אומר שהם לא בטוחים — מצא את ההתנגדות האמיתית',
  },
  {
    id: 4,
    objection: 'אין לי זמן ללמוד מערכת חדשה',
    answer: 'Trinity מוכנה תוך 20 דקות. אנחנו עושים את ההגדרה ביחד, ואתה מתחיל להשתמש בה אותו יום.',
    tip: 'הדגש שה-onboarding הוא פשוט ומהיר',
  },
  {
    id: 5,
    objection: 'יש לי כבר מערכת אחרת',
    answer: 'מה המערכת שלך נותנת שאני לא? כי Trinity כוללת WA אוטומטי, לקוחות, יומן, קופת רושמת ואנליטיקה — כל זה במחיר אחד.',
    tip: 'בקש לראות מה הם כבר משתמשים ומה חסר להם',
  },
]

const OBJECTIONS_RU = [
  {
    id: 1,
    objection: 'Это дорого',
    answer: 'Понимаю. Но спроси себя — сколько стоит вести всё вручную? Время, которое Trinity экономит владельцу бизнеса, стоит намного больше.',
    tip: 'Сравни со стоимостью дополнительного сотрудника или потерянных клиентов',
  },
  {
    id: 2,
    objection: 'У меня есть Excel, мне не нужна система',
    answer: 'Excel — отличный инструмент, но он не напоминает о звонке клиенту, не отправляет WhatsApp автоматически и не показывает аналитику в реальном времени.',
    tip: 'Спроси, сколько клиентов "упало" из-за Excel',
  },
  {
    id: 3,
    objection: 'Мне нужно подумать',
    answer: 'Конечно! О чём именно ты хочешь подумать? Возможно, есть вопрос, на который я могу ответить прямо сейчас?',
    tip: 'Обычно это означает неуверенность — найди истинное возражение',
  },
  {
    id: 4,
    objection: 'У меня нет времени учить новую систему',
    answer: 'Trinity готова за 20 минут. Мы делаем настройку вместе, и ты начинаешь использовать её в тот же день.',
    tip: 'Подчеркни, что онбординг простой и быстрый',
  },
  {
    id: 5,
    objection: 'У меня уже есть другая система',
    answer: 'Что твоя система даёт, чего нет у нас? Trinity включает WA-автоматизацию, CRM, календарь, кассу и аналитику — всё за одну цену.',
    tip: 'Попроси показать, что они используют и чего им не хватает',
  },
]

const SCRIPTS_HE = [
  {
    title: 'פתיחת שיחה קרה',
    icon: '📞',
    script: `"שלום [שם], אני [שמך] מ-Amber Solutions. 
אנחנו עוזרים לעסקים כמו שלך לנהל לקוחות וזמינות בצורה פשוטה יותר. 
יש לך דקה אחת עכשיו?"`,
  },
  {
    title: 'הצגת Trinity',
    icon: '🎯',
    script: `"Trinity CRM היא מערכת ניהול לקוחות שמיועדת לעסקים קטנים-בינוניים. 
היא כוללת: ניהול לקוחות, שליחת WA אוטומטי, יומן, ואנליטיקה. 
הכל במקום אחד, בחודש אחד בלי התחייבות."`,
  },
  {
    title: 'סגירת עסקה',
    icon: '✅',
    script: `"אז מה דעתך? רוצה שנתחיל עם דמו חי של 20 דקות — 
אני מראה לך את כל המערכת על העסק שלך?
אין שום עלות להתחיל."`,
  },
]

const SCRIPTS_RU = [
  {
    title: 'Открытие холодного звонка',
    icon: '📞',
    script: `"Добрый день, [имя], я [твоё имя] из Amber Solutions.
Мы помогаем бизнесам, как ваш, управлять клиентами и расписанием проще.
Есть одна минута сейчас?"`,
  },
  {
    title: 'Представление Trinity',
    icon: '🎯',
    script: `"Trinity CRM — это система управления клиентами для малого и среднего бизнеса.
Включает: CRM, автоматические WhatsApp, календарь и аналитику.
Всё в одном месте, помесячная оплата без обязательств."`,
  },
  {
    title: 'Закрытие сделки',
    icon: '✅',
    script: `"Как вам идея? Хотите начнём с 20-минутного живого демо —
я покажу всю систему на примере вашего бизнеса?
Никаких затрат для начала."`,
  },
]

const TIPS_HE = [
  { icon: '⏰', title: 'עקוב תוך 24 שעות', text: 'אחרי כל פגישה, שלח WhatsApp תוך 24 שעות. עסקאות ש"מתקררות" נסגרות פחות.' },
  { icon: '🎯', title: 'שאל לפני שאתה מוכר', text: 'שאל 3 שאלות לפחות לפני שאתה מציג — כך תבין מה הלקוח באמת צריך.' },
  { icon: '📊', title: 'הכן נתונים', text: 'לקוחות שרואים מספרים (חיסכון, ROI) קונים יותר. בא עם דוגמאות מעסקים דומים.' },
  { icon: '🤝', title: 'השתמש בשם', text: 'השתמש בשם הלקוח לפחות 3 פעמים בשיחה. זה יוצר קשר אישי ואמון.' },
]

const TIPS_RU = [
  { icon: '⏰', title: 'Следи в течение 24 часов', text: 'После каждой встречи — WhatsApp в течение 24 часов. Сделки, которые "остывают", закрываются реже.' },
  { icon: '🎯', title: 'Спрашивай перед продажей', text: 'Задай минимум 3 вопроса до презентации — так поймёшь, что клиенту реально нужно.' },
  { icon: '📊', title: 'Готовь данные', text: 'Клиенты, видящие цифры (экономия, ROI), покупают чаще. Приходи с примерами похожих бизнесов.' },
  { icon: '🤝', title: 'Используй имя', text: 'Называй клиента по имени минимум 3 раза за разговор. Это создаёт личную связь и доверие.' },
]

// ─── Components ───────────────────────────────────────────────────────────────

function ObjectionCard({ item, lang }: { item: typeof OBJECTIONS_HE[0]; lang: string }) {
  const [open, setOpen] = useState(false)
  const isHe = lang === 'he'
  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${open ? 'bg-white/80 border-indigo-200/60 shadow-lg' : 'bg-white/50 border-white/50 hover:border-indigo-200/40 shadow-sm'}`}>
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-start"
        onClick={() => setOpen(v => !v)}
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all ${open ? 'bg-red-100' : 'bg-gray-100'}`}>
          {open ? '💡' : '❓'}
        </div>
        <span className="flex-1 font-semibold text-gray-800 text-sm">{item.objection}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 space-y-3 animate-in fade-in duration-200">
          <div className="bg-indigo-50/80 rounded-xl p-3.5">
            <p className="text-xs font-bold text-indigo-600 mb-1">{isHe ? '✅ תשובה מומלצת' : '✅ Рекомендуемый ответ'}</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{item.answer}</p>
          </div>
          <div className="bg-amber-50/80 rounded-xl p-3 flex items-start gap-2">
            <span className="text-base">💡</span>
            <p className="text-xs text-amber-700">{item.tip}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function ScriptCard({ item }: { item: typeof SCRIPTS_HE[0] }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(item.script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-md overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100/80">
        <span className="text-xl">{item.icon}</span>
        <span className="text-sm font-bold text-gray-700 flex-1">{item.title}</span>
        <button onClick={copy}
          className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${copied ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600'}`}>
          {copied ? '✓ הועתק' : '📋'}
        </button>
      </div>
      <div className="px-4 py-3">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">{item.script}</pre>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkerKnowledgePage() {
  const { language, dir } = useLanguage()
  const isHe = language === 'he'
  const [tab, setTab] = useState<'objections' | 'scripts' | 'tips'>('objections')

  const objections = isHe ? OBJECTIONS_HE : OBJECTIONS_RU
  const scripts    = isHe ? SCRIPTS_HE    : SCRIPTS_RU
  const tips       = isHe ? TIPS_HE       : TIPS_RU

  return (
    <div className="min-h-full p-4 lg:p-6 space-y-5" dir={dir}>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">{isHe ? '📚 מאגר ידע' : '📚 База знаний'}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isHe ? 'סקריפטים, התנגדויות וטיפים לסגירת עסקאות' : 'Скрипты, возражения и советы по закрытию сделок'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/50 backdrop-blur-sm rounded-2xl p-1.5 border border-white/50 shadow-sm">
        {[
          { key: 'objections' as const, he: '💬 התנגדויות', ru: '💬 Возражения' },
          { key: 'scripts'    as const, he: '📝 סקריפטים',  ru: '📝 Скрипты'   },
          { key: 'tips'       as const, he: '⚡ טיפים',      ru: '⚡ Советы'     },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              tab === t.key
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/50'
                : 'text-gray-500 hover:bg-white/80 hover:text-gray-700'
            }`}>
            {isHe ? t.he : t.ru}
          </button>
        ))}
      </div>

      {/* Objections */}
      {tab === 'objections' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 px-1">
            {isHe ? 'לחץ על כל התנגדות לקבל תשובה מוכנה' : 'Кликни на возражение для готового ответа'}
          </p>
          {objections.map(item => <ObjectionCard key={item.id} item={item} lang={language} />)}
        </div>
      )}

      {/* Scripts */}
      {tab === 'scripts' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 px-1">
            {isHe ? 'לחץ על 📋 להעתיק סקריפט' : 'Нажми 📋 чтобы скопировать скрипт'}
          </p>
          {scripts.map((s, i) => <ScriptCard key={i} item={s} />)}
        </div>
      )}

      {/* Tips */}
      {tab === 'tips' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {tips.map((tip, i) => (
            <div key={i} className="rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-md p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{tip.icon}</span>
                <p className="text-sm font-bold text-gray-800">{tip.title}</p>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{tip.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Footer promo */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/80 p-4 flex items-center gap-4">
        <span className="text-3xl">🚀</span>
        <div>
          <p className="font-bold text-indigo-800 text-sm">
            {isHe ? 'רוצה עוד תוכן?' : 'Хочешь больше контента?'}
          </p>
          <p className="text-xs text-indigo-600 mt-0.5">
            {isHe
              ? 'פנה למנהל שלך להוספת סקריפטים וחומרי הדרכה'
              : 'Обратись к менеджеру для добавления скриптов и материалов'}
          </p>
        </div>
      </div>
    </div>
  )
}

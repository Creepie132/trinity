'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Lang = 'ru' | 'he'

const STEPS = [
  {
    id: 'welcome',
    icon: '👋',
    title_ru: 'Добро пожаловать в Trinity CRM!',
    title_he: 'ברוכים הבאים ל-Trinity CRM!',
    body_ru: 'Это ваш личный рабочий кабинет. За несколько минут мы покажем, как всё устроено.',
    body_he: 'זהו הקבינט האישי שלך. תוך מספר דקות נציג לך כיצד הכל עובד.',
    highlight: null,
  },
  {
    id: 'dashboard',
    icon: '🏠',
    title_ru: 'Дашборд — ваш штаб',
    title_he: 'לוח בקרה — המרכז שלך',
    body_ru: 'Здесь вы видите активные сделки, красную зону (клиенты без касания), срочные задачи и вашу комиссию за месяц.',
    body_he: 'כאן תראה עסקאות פעילות, אזור אדום (לקוחות ללא מגע), משימות דחופות ועמלה חודשית.',
    highlight: 'dashboard',
  },
  {
    id: 'pipeline',
    icon: '📊',
    title_ru: 'Мой пайплайн — воронка сделок',
    title_he: 'הפייפליין שלי — משפך עסקאות',
    body_ru: 'Ведите сделки по этапам: новый лид → в работе → закрыт. Перетаскивайте карточки, добавляйте заметки и следующие шаги.',
    body_he: 'נהל עסקאות לפי שלבים: ליד חדש → בתהליך → נסגר. גרור קלפים, הוסף הערות וצעדים הבאים.',
    highlight: 'pipeline',
  },
  {
    id: 'clients',
    icon: '👥',
    title_ru: 'Клиенты',
    title_he: 'לקוחות',
    body_ru: 'Добавляйте клиентов, привязывайте к сделкам, смотрите историю общения. Номер телефона — быстрый звонок прямо из системы.',
    body_he: 'הוסף לקוחות, קשר לעסקאות, צפה בהיסטוריית תקשורת. מספר טלפון — שיחה מהירה ישירות מהמערכת.',
    highlight: 'clients',
  },
  {
    id: 'tasks',
    icon: '📋',
    title_ru: 'Задачи и встречи',
    title_he: 'משימות וקביעות',
    body_ru: 'Создавайте задачи и встречи, привязывайте к клиентам. Просроченные задачи попадают в "Красную зону" на дашборде.',
    body_he: 'צור משימות ופגישות, קשר ללקוחות. משימות שעברו את המועד נכנסות ל"אזור האדום" בלוח הבקרה.',
    highlight: 'tasks',
  },
  {
    id: 'notifications',
    icon: '🔔',
    title_ru: 'Уведомления',
    title_he: 'התראות',
    body_ru: 'Колокольчик в шапке — ваши уведомления в реальном времени: новые задачи от руководителя, упоминания, важные события.',
    body_he: 'הפעמון בכותרת — ההתראות שלך בזמן אמת: משימות חדשות ממנהל, אזכורים, אירועים חשובים.',
    highlight: 'bell',
  },
  {
    id: 'lead',
    icon: '➕',
    title_ru: 'Создание лида',
    title_he: 'יצירת ליד',
    body_ru: 'Кнопка "+ Новый лид" вверху меню — быстрое создание нового потенциального клиента. Укажите имя, телефон и источник.',
    body_he: 'כפתור "+ ליד חדש" בראש התפריט — יצירה מהירה של לקוח פוטנציאלי חדש. ציין שם, טלפון ומקור.',
    highlight: 'newlead',
  },
  {
    id: 'done',
    icon: '🎉',
    title_ru: 'Готово! Вы всё знаете',
    title_he: 'סיימנו! אתה יודע הכל',
    body_ru: 'Теперь вы знаете основы. Удачи в работе! Если понадобится помощь — загляните в раздел "База знаний".',
    body_he: 'עכשיו אתה מכיר את הבסיס. בהצלחה! אם תצטרך עזרה — עיין ב"מאגר ידע".',
    highlight: null,
  },
]

interface Props {
  onComplete: (lang: Lang) => void
}

export function WorkerOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [lang, setLang] = useState<Lang | null>(null)
  const [saving, setSaving] = useState(false)
  const isHe = lang === 'he'
  const dir = isHe ? 'rtl' : 'ltr'

  const currentStep = STEPS[step]
  const isLast = step === STEPS.length - 1

  const handleFinish = useCallback(async () => {
    if (!lang) return
    setSaving(true)
    try {
      await fetch('/api/worker/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      })
      onComplete(lang)
    } finally {
      setSaving(false)
    }
  }, [lang, onComplete])

  // Выбор языка — первый экран
  if (!lang) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#1a237e] via-[#283593] to-[#3949ab] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🌍</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Выберите язык системы</h2>
          <p className="text-sm text-gray-500 mb-2">בחר שפת המערכת</p>
          <p className="text-xs text-gray-400 mb-8">Choose system language</p>
          <div className="space-y-3">
            <button
              onClick={() => setLang('ru')}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl border-2 border-indigo-100 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
            >
              <span className="text-2xl">🇷🇺</span>
              <div>
                <p className="font-bold text-gray-900">Русский</p>
                <p className="text-xs text-gray-400">Интерфейс на русском языке</p>
              </div>
            </button>
            <button
              onClick={() => setLang('he')}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl border-2 border-indigo-100 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-right group"
              dir="rtl"
            >
              <span className="text-2xl">🇮🇱</span>
              <div className="text-right">
                <p className="font-bold text-gray-900">עברית</p>
                <p className="text-xs text-gray-400">ממשק בעברית</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" dir={dir}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a237e] to-[#3949ab] px-6 py-4 flex items-center justify-between">
          <span className="text-white/60 text-xs font-medium">
            {isHe ? `שלב ${step + 1} מתוך ${STEPS.length}` : `Шаг ${step + 1} из ${STEPS.length}`}
          </span>
          <button
            onClick={handleFinish}
            className="text-white/40 hover:text-white/70 text-xs transition-colors"
          >
            {isHe ? 'דלג' : 'Пропустить'}
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8 text-center">
          <div className="text-6xl mb-4 animate-in zoom-in duration-300">{currentStep.icon}</div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            {isHe ? currentStep.title_he : currentStep.title_ru}
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            {isHe ? currentStep.body_he : currentStep.body_ru}
          </p>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 pb-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-5 h-2 bg-indigo-500'
                  : i < step
                  ? 'w-2 h-2 bg-indigo-200'
                  : 'w-2 h-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all"
            >
              {isHe ? '← חזרה' : '← Назад'}
            </button>
          )}
          {isLast ? (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-60"
            >
              {saving
                ? (isHe ? 'שומר...' : 'Сохранение...')
                : (isHe ? '🚀 התחל לעבוד!' : '🚀 Начать работу!')}
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all"
            >
              {isHe ? 'הבא →' : 'Далее →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

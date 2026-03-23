'use client'

import { useState, useEffect, useCallback } from 'react'

type Lang = 'ru' | 'he'

type Phase = 'loading' | 'lang' | 'tour' | 'profile' | 'done'

interface Profile {
  first_name: string
  last_name: string
  phone: string
  birth_date: string
  address: string
  city: string
  email: string
}

const TOUR_STEPS = [
  { id: 'dashboard', icon: '🏠',
    title_ru: 'Дашборд — ваш штаб',           title_he: 'לוח בקרה — המרכז שלך',
    body_ru:  'Активные сделки, красная зона (клиенты без касания), срочные задачи и комиссия за месяц — всё в одном месте.',
    body_he:  'עסקאות פעילות, אזור אדום, משימות דחופות ועמלה חודשית — הכל במקום אחד.' },
  { id: 'pipeline', icon: '📊',
    title_ru: 'Мой пайплайн — воронка сделок', title_he: 'הפייפליין שלי — משפך עסקאות',
    body_ru:  'Ведите сделки по этапам: новый лид → в работе → закрыт. Перетаскивайте карточки, добавляйте заметки.',
    body_he:  'נהל עסקאות לפי שלבים: ליד חדש → בתהליך → נסגר. גרור קלפים, הוסף הערות.' },
  { id: 'clients', icon: '👥',
    title_ru: 'Клиенты',                       title_he: 'לקוחות',
    body_ru:  'Добавляйте клиентов, привязывайте к сделкам, смотрите историю. Номер телефона — быстрый звонок прямо из системы.',
    body_he:  'הוסף לקוחות, קשר לעסקאות, צפה בהיסטוריה. מספר טלפון — שיחה מהירה ישירות מהמערכת.' },
  { id: 'tasks', icon: '📋',
    title_ru: 'Задачи и встречи',              title_he: 'משימות וקביעות',
    body_ru:  'Создавайте задачи, привязывайте к клиентам. Просроченные попадают в "Красную зону" на дашборде.',
    body_he:  'צור משימות, קשר ללקוחות. משימות שעברו מועד נכנסות ל"אזור האדום" בלוח הבקרה.' },
  { id: 'bell', icon: '🔔',
    title_ru: 'Уведомления',                   title_he: 'התראות',
    body_ru:  'Колокольчик в шапке — уведомления в реальном времени: новые задачи, упоминания, важные события.',
    body_he:  'הפעמון בכותרת — התראות בזמן אמת: משימות חדשות, אזכורים, אירועים חשובים.' },
  { id: 'newlead', icon: '➕',
    title_ru: 'Создание лида',                 title_he: 'יצירת ליד',
    body_ru:  'Кнопка "+ Новый лид" вверху меню — быстрое создание потенциального клиента. Имя, телефон, источник.',
    body_he:  'כפתור "+ ליד חדש" — יצירה מהירה של לקוח פוטנציאלי. שם, טלפון, מקור.' },
]

// ── Израильские города для автокомплита ───────────────────────────────────────
const IL_CITIES = [
  'ירושלים','תל אביב','חיפה','ראשון לציון','פתח תקווה','אשדוד','נתניה',
  'באר שבע','חולון','בני ברק','רמת גן','אשקלון','רחובות','בת ים',
  'הרצליה','כפר סבא','מודיעין','לוד','נס ציונה','עפולה','עכו','אילת',
  'נהריה','קריית גת','דימונה','יבנה','טבריה','צפת','קריית שמונה',
]

interface Props {
  onComplete: (lang: Lang) => void
}

export function WorkerOnboarding({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [lang, setLang] = useState<Lang>('ru')
  const [tourStep, setTourStep] = useState(0)
  const [profile, setProfile] = useState<Profile>({
    first_name: '', last_name: '', phone: '',
    birth_date: '', address: '', city: '', email: '',
  })
  const [citySuggestions, setCitySuggestions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const isHe = lang === 'he'
  const dir = isHe ? 'rtl' : 'ltr'

  // ── Загружаем статус НЕМЕДЛЕННО при монтировании ──────────────────────────
  useEffect(() => {
    fetch('/api/worker/onboarding')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setPhase('done'); return }
        if (!data.completed) {
          setPhase('lang')
        } else if (!data.profile_completed) {
          if (data.language) setLang(data.language as Lang)
          if (data.profile) setProfile(p => ({ ...p, ...data.profile }))
          setPhase('profile')
        } else {
          setPhase('done')
        }
      })
      .catch(() => setPhase('done'))
  }, [])

  const handleLangSelect = (l: Lang) => {
    setLang(l)
    setPhase('tour')
    setTourStep(0)
  }

  const handleTourFinish = useCallback(async () => {
    await fetch('/api/worker/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang }),
    })
    // Загружаем email из профиля
    fetch('/api/worker/onboarding').then(r => r.json()).then(data => {
      if (data.profile) setProfile(p => ({ ...p, ...data.profile }))
    })
    setPhase('profile')
  }, [lang])

  const handleCityInput = (val: string) => {
    setProfile(p => ({ ...p, city: val }))
    if (val.length >= 1) {
      setCitySuggestions(IL_CITIES.filter(c => c.startsWith(val)).slice(0, 5))
    } else {
      setCitySuggestions([])
    }
  }

  const handleProfileSave = async () => {
    if (!profile.first_name.trim() || !profile.last_name.trim()) {
      setProfileError(isHe ? 'שם פרטי ושם משפחה הם שדות חובה' : 'Имя и фамилия обязательны')
      return
    }
    setSaving(true)
    setProfileError('')
    try {
      await fetch('/api/worker/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      onComplete(lang)
    } finally {
      setSaving(false)
    }
  }

  // ── LOADING — полноэкранный сплэш, блокирует систему ─────────────────────
  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#1a237e] via-[#283593] to-[#3949ab] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none">
            <polygon points="12,2 22,20 2,20" fill="#C8922A" opacity="0.95"/>
          </svg>
        </div>
        <p className="text-white font-bold text-lg">Trinity CRM</p>
        <div className="flex gap-1.5 mt-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-white/40 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}/>
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'done') return null

  // ── LANG — выбор языка ────────────────────────────────────────────────────
  if (phase === 'lang') {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#1a237e] via-[#283593] to-[#3949ab] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🌍</div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Выберите язык системы</h2>
          <p className="text-sm text-gray-400 mb-8">בחר שפת המערכת</p>
          <div className="space-y-3">
            <button onClick={() => handleLangSelect('ru')}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-gray-100 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left">
              <span className="text-2xl">🇷🇺</span>
              <div><p className="font-bold text-gray-900">Русский</p><p className="text-xs text-gray-400">Интерфейс на русском языке</p></div>
            </button>
            <button onClick={() => handleLangSelect('he')}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-gray-100 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-right" dir="rtl">
              <span className="text-2xl">🇮🇱</span>
              <div><p className="font-bold text-gray-900">עברית</p><p className="text-xs text-gray-400">ממשק בעברית</p></div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── TOUR — интерактивный тур ───────────────────────────────────────────────
  if (phase === 'tour') {
    const step = TOUR_STEPS[tourStep]
    const isLast = tourStep === TOUR_STEPS.length - 1
    return (
      <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" dir={dir}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="h-1.5 bg-gray-100">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
              style={{ width: `${((tourStep + 1) / TOUR_STEPS.length) * 100}%` }}/>
          </div>
          <div className="bg-gradient-to-r from-[#1a237e] to-[#3949ab] px-6 py-4 flex items-center justify-between">
            <span className="text-white/60 text-xs">{isHe ? `שלב ${tourStep+1} מתוך ${TOUR_STEPS.length}` : `Шаг ${tourStep+1} из ${TOUR_STEPS.length}`}</span>
            <button onClick={handleTourFinish} className="text-white/40 hover:text-white/70 text-xs transition-colors">
              {isHe ? 'דלג' : 'Пропустить'}
            </button>
          </div>
          <div className="px-6 py-8 text-center">
            <div className="text-6xl mb-4">{step.icon}</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{isHe ? step.title_he : step.title_ru}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{isHe ? step.body_he : step.body_ru}</p>
          </div>
          <div className="flex justify-center gap-1.5 pb-2">
            {TOUR_STEPS.map((_, i) => (
              <div key={i} className={`rounded-full transition-all duration-300 ${i === tourStep ? 'w-5 h-2 bg-indigo-500' : i < tourStep ? 'w-2 h-2 bg-indigo-200' : 'w-2 h-2 bg-gray-200'}`}/>
            ))}
          </div>
          <div className="px-6 pb-6 flex gap-3">
            {tourStep > 0 && (
              <button onClick={() => setTourStep(s => s-1)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all">
                {isHe ? '← חזרה' : '← Назад'}
              </button>
            )}
            <button
              onClick={isLast ? handleTourFinish : () => setTourStep(s => s+1)}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all">
              {isLast ? (isHe ? '📝 מלא פרופיל' : '📝 Заполнить профиль') : (isHe ? 'הבא →' : 'Далее →')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── PROFILE — форма профиля ───────────────────────────────────────────────
  const inp = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm text-gray-900 transition-all bg-white'
  const lbl = 'block text-xs font-semibold text-gray-500 mb-1.5'

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto" dir={dir}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md my-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a237e] to-[#3949ab] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl">👤</div>
            <div>
              <h2 className="text-white font-bold text-base">{isHe ? 'השלמת פרופיל' : 'Заполнение профиля'}</h2>
              <p className="text-white/60 text-xs">{isHe ? 'מלא את הפרטים שלך' : 'Заполните ваши данные'}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-4">
          {/* Email — readonly */}
          <div>
            <label className={lbl}>{isHe ? 'אימייל' : 'Email'}</label>
            <input value={profile.email} readOnly
              className={`${inp} bg-gray-50 text-gray-400 cursor-not-allowed`}/>
          </div>

          {/* Имя + Фамилия */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>{isHe ? 'שם פרטי *' : 'Имя *'}</label>
              <input value={profile.first_name} onChange={e => setProfile(p => ({...p, first_name: e.target.value}))}
                placeholder={isHe ? 'ישראל' : 'Иван'} className={inp}/>
            </div>
            <div>
              <label className={lbl}>{isHe ? 'שם משפחה *' : 'Фамилия *'}</label>
              <input value={profile.last_name} onChange={e => setProfile(p => ({...p, last_name: e.target.value}))}
                placeholder={isHe ? 'ישראלי' : 'Иванов'} className={inp}/>
            </div>
          </div>

          {/* Телефон */}
          <div>
            <label className={lbl}>{isHe ? 'טלפון' : 'Телефон'}</label>
            <input value={profile.phone} onChange={e => setProfile(p => ({...p, phone: e.target.value}))}
              placeholder="05X-XXXXXXX" type="tel" className={inp} dir="ltr"/>
          </div>

          {/* Дата рождения */}
          <div>
            <label className={lbl}>{isHe ? 'תאריך לידה' : 'Дата рождения'}</label>
            <input value={profile.birth_date} onChange={e => setProfile(p => ({...p, birth_date: e.target.value}))}
              type="date" className={inp} dir="ltr"/>
          </div>

          {/* Адрес */}
          <div>
            <label className={lbl}>{isHe ? 'כתובת' : 'Адрес'} <span className="text-gray-400 font-normal text-[10px]">{isHe ? '(בעברית)' : '(на иврите)'}</span></label>
            <input value={profile.address} onChange={e => setProfile(p => ({...p, address: e.target.value}))}
              placeholder={isHe ? 'רחוב הרצל 1' : 'ул. Герцль 1'} className={inp} dir="rtl"/>
          </div>

          {/* Город с автокомплитом */}
          <div className="relative">
            <label className={lbl}>{isHe ? 'עיר' : 'Город'} <span className="text-gray-400 font-normal text-[10px]">{isHe ? '(בעברית)' : '(на иврите)'}</span></label>
            <input value={profile.city} onChange={e => handleCityInput(e.target.value)}
              placeholder={isHe ? 'תל אביב' : 'Тель-Авив'} className={inp} dir="rtl"
              autoComplete="off"/>
            {citySuggestions.length > 0 && (
              <div className="absolute top-full start-0 end-0 z-10 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden mt-1">
                {citySuggestions.map(c => (
                  <button key={c} type="button"
                    onClick={() => { setProfile(p => ({...p, city: c})); setCitySuggestions([]) }}
                    className="w-full px-4 py-2.5 text-sm text-right text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors border-b border-gray-50 last:border-0"
                    dir="rtl">
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {profileError && (
            <p className="text-xs text-red-500 font-medium">{profileError}</p>
          )}

          <button onClick={handleProfileSave} disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-60 mt-2">
            {saving ? (isHe ? 'שומר...' : 'Сохранение...') : (isHe ? '🚀 התחל לעבוד!' : '🚀 Начать работу!')}
          </button>

          <button onClick={() => { onComplete(lang) }}
            className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            {isHe ? 'דלג להשלמה מאוחר יותר' : 'Заполнить позже'}
          </button>
        </div>
      </div>
    </div>
  )
}

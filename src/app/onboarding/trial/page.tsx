'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
  Sparkles, Loader2, ChevronRight, ChevronLeft,
  Phone, User, Building2, Check, ArrowRight,
} from 'lucide-react'

type Step = 'lang' | 'form' | 'loading' | 'error'
type Lang = 'he' | 'ru'

const T = {
  he: {
    title:        'פרטי ההרשמה',
    subtitle:     'מלאו את הפרטים ליצירת חשבון ניסיון',
    first_name:   'שם פרטי',     first_name_ph: 'ישראל',
    last_name:    'שם משפחה',    last_name_ph:  'ישראלי',
    phone:        'טלפון',        phone_ph:      '050-000-0000',
    business:     'שם העסק',     business_ph:   'מספרת מעוף',
    submit:       'יצירת חשבון ניסיון',
    limit_note:   '30 לקוחות · 15 תורים · 5 מוצרים',
    back:         'שנה שפה',
    err_req:      'שדה חובה',
    err_phone:    'מספר לא תקין',
    err_exists:   'מספר זה כבר רשום. נסה מספר אחר.',
    err_generic:  'שגיאה, נסה שוב',
    retry:        'נסה שוב',
    p1: 'יוצר חשבון...',
    p2: 'מגדיר ארגון...',
    p3: 'מכין מערכת...',
    p4: 'פותח Trinity CRM...',
  },
  ru: {
    title:        'Данные для регистрации',
    subtitle:     'Заполните форму — система будет готова за минуту',
    first_name:   'Имя',          first_name_ph: 'Иван',
    last_name:    'Фамилия',      last_name_ph:  'Иванов',
    phone:        'Телефон',       phone_ph:      '054-000-0000',
    business:     'Название бизнеса', business_ph: 'Beauty Studio',
    submit:       'Создать триал-аккаунт',
    limit_note:   '30 клиентов · 15 визитов · 5 товаров',
    back:         'Сменить язык',
    err_req:      'Обязательное поле',
    err_phone:    'Неверный номер',
    err_exists:   'Этот номер уже зарегистрирован. Введите другой.',
    err_generic:  'Ошибка, попробуйте снова',
    retry:        'Попробовать снова',
    p1: 'Создаём аккаунт...',
    p2: 'Настраиваем организацию...',
    p3: 'Готовим систему...',
    p4: 'Открываем Trinity CRM...',
  },
} as const

function LangPicker({ onSelect, userEmail }: { onSelect: (l: Lang) => void; userEmail: string }) {
  return (
    <div className="w-full max-w-xs">
      <div className="text-center mb-8">
        <div className="relative inline-block mb-3">
          <div className="absolute inset-0 bg-amber-500/30 rounded-2xl animate-ping" />
          <div className="relative w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/40 mx-auto">
            <Sparkles size={26} className="text-white" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-white">Trinity CRM</h1>
        {userEmail && (
          <p className="text-white/40 text-xs mt-1 truncate max-w-[220px] mx-auto">{userEmail}</p>
        )}
      </div>
      <div className="bg-white rounded-3xl shadow-2xl p-6">
        <p className="text-gray-600 font-semibold text-center mb-5">
          בחר שפה / Выберите язык
        </p>
        <div className="space-y-3">
          <button onClick={() => onSelect('he')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group">
            <span className="text-2xl">🇮🇱</span>
            <div className="flex-1 text-right" dir="rtl">
              <p className="font-bold text-gray-900">עברית</p>
              <p className="text-xs text-gray-400">ממשק ונתונים בעברית</p>
            </div>
            <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-400 transition-colors rotate-180" />
          </button>
          <button onClick={() => onSelect('ru')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group">
            <span className="text-2xl">🇷🇺</span>
            <div className="flex-1 text-left">
              <p className="font-bold text-gray-900">Русский</p>
              <p className="text-xs text-gray-400">Интерфейс и данные на русском</p>
            </div>
            <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, icon, error, children }: {
  label: string; icon: React.ReactNode; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        <span className="text-amber-500">{icon}</span>{label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">⚠ {error}</p>}
    </div>
  )
}

function FInput(props: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  const { hasError, className, ...rest } = props
  return (
    <input {...rest} className={[
      'w-full px-3.5 py-3 rounded-xl text-gray-900 text-sm placeholder-gray-400',
      'border-2 transition-all duration-150 focus:outline-none',
      hasError
        ? 'border-red-300 bg-red-50 focus:border-red-400'
        : 'border-gray-200 bg-white hover:border-gray-300 focus:border-amber-400',
      className ?? '',
    ].join(' ')} />
  )
}

function LoadingScreen({ lang }: { lang: Lang }) {
  const t = T[lang]
  const steps = [t.p1, t.p2, t.p3, t.p4]
  const [cur, setCur] = useState(0)
  useEffect(() => {
    const timers = steps.map((_, i) => setTimeout(() => setCur(i), i * 1600))
    return () => timers.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
      <div className="relative w-16 h-16 mx-auto mb-5">
        <div className="absolute inset-0 bg-amber-500/25 rounded-2xl animate-ping" />
        <div className="relative w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
          <Sparkles size={26} className="text-white" />
        </div>
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Trinity CRM</h2>
      <p className="text-sm text-gray-400 mb-5">
        {lang === 'he' ? 'מכין את המערכת שלך...' : 'Готовим систему для вас...'}
      </p>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-5">
        <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700"
          style={{ width: `${((cur + 1) / steps.length) * 100}%` }} />
      </div>
      <div className="space-y-2.5 text-left">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={[
              'w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold transition-all',
              i < cur ? 'bg-green-500 text-white' : i === cur ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400',
            ].join(' ')}>
              {i < cur ? <Check size={11} strokeWidth={3} /> : i === cur
                ? <Loader2 size={11} className="animate-spin" />
                : <span className="text-[10px]">{i + 1}</span>}
            </div>
            <span className={[
              'text-sm transition-all',
              i < cur ? 'text-green-600 font-medium' : i === cur ? 'text-gray-900 font-semibold' : 'text-gray-400',
            ].join(' ')}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TrialOnboardingPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [step, setStep] = useState<Step>('lang')
  const [lang, setLang] = useState<Lang>('ru')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [errMsg, setErrMsg] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const submitting = useRef(false)

  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', business_name: '',
  })

  const t = T[lang]
  const isHe = lang === 'he'
  const dir = isHe ? 'rtl' : 'ltr'

  // Auth guard + проверка существующей орг
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/demo/try')
        return
      }
      setUserEmail(data.user.email ?? '')

      // Если у юзера уже есть орг с реальным доступом — в дашборд
      supabase
        .from('org_users')
        .select('org_id')
        .eq('user_id', data.user.id)
        .limit(1)
        .maybeSingle()
        .then(({ data: orgRow }) => {
          if (orgRow?.org_id) router.replace('/dashboard')
        })

      // Автозаполняем имя из Google profile
      const meta = data.user.user_metadata
      if (meta?.given_name || meta?.full_name) {
        const parts = (meta.full_name || '').split(' ')
        setForm(f => ({
          ...f,
          first_name: meta.given_name || parts[0] || '',
          last_name: meta.family_name || parts.slice(1).join(' ') || '',
        }))
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLangSelect = (l: Lang) => {
    setLang(l)
    try { localStorage.setItem('trinity-language', l) } catch {}
    setStep('form')
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setErrors(er => { const n = { ...er }; delete n[k]; return n })
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.first_name.trim())  e.first_name    = t.err_req
    if (!form.last_name.trim())   e.last_name      = t.err_req
    if (form.phone.replace(/\D/g, '').length < 9) e.phone = t.err_phone
    if (!form.business_name.trim()) e.business_name = t.err_req
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate() || submitting.current) return
    submitting.current = true
    setStep('loading')

    try {
      const res = await fetch('/api/demo/create-trial-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, language: lang }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'PHONE_EXISTS') {
          submitting.current = false
          setErrors({ phone: t.err_exists })
          setStep('form')
          return
        }
        throw new Error(data.message || data.error || t.err_generic)
      }

      // Обновляем сессию чтобы JWT получил org_id
      await supabase.auth.refreshSession().catch(() => {})
      try { localStorage.setItem('trinity_demo_start_tour', '1') } catch {}
      // Hard redirect — обязателен чтобы layout перезагрузился с новым JWT+org_id
      window.location.href = '/dashboard'
    } catch (err: any) {
      submitting.current = false
      setErrMsg(err.message || t.err_generic)
      setStep('error')
    }
  }

  return (
    <div
      dir={dir}
      className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)' }}
    >
      <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-blue-500/8 rounded-full blur-3xl pointer-events-none" />

      {step === 'lang' && <LangPicker onSelect={handleLangSelect} userEmail={userEmail} />}

      {step === 'form' && (
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="text-white font-semibold text-sm">Trinity CRM</span>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-6 pt-5 pb-4">
              <h2 className="text-white font-bold text-xl">{t.title}</h2>
              <p className="text-white/50 text-xs mt-0.5">{t.subtitle}</p>
              {userEmail && (
                <div className="mt-2 flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5 w-fit">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-white/70 text-xs truncate max-w-[240px]">{userEmail}</span>
                </div>
              )}
            </div>

            <div className="px-6 py-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.first_name} icon={<User size={11} />} error={errors.first_name}>
                  <FInput value={form.first_name} onChange={set('first_name')} placeholder={t.first_name_ph} hasError={!!errors.first_name} autoFocus />
                </Field>
                <Field label={t.last_name} icon={<User size={11} />} error={errors.last_name}>
                  <FInput value={form.last_name} onChange={set('last_name')} placeholder={t.last_name_ph} hasError={!!errors.last_name} />
                </Field>
              </div>

              <Field label={t.phone} icon={<Phone size={11} />} error={errors.phone}>
                <FInput type="tel" value={form.phone} onChange={set('phone')} placeholder={t.phone_ph} hasError={!!errors.phone} />
              </Field>

              <Field label={t.business} icon={<Building2 size={11} />} error={errors.business_name}>
                <FInput value={form.business_name} onChange={set('business_name')} placeholder={t.business_ph} hasError={!!errors.business_name} />
              </Field>

              <button
                onClick={handleSubmit}
                className="w-full mt-1 py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}
              >
                {t.submit}
                {isHe ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>

              <p className="text-center text-gray-400 text-xs pb-1">{t.limit_note}</p>
            </div>
          </div>

          <button
            onClick={() => setStep('lang')}
            className="mt-4 w-full text-center text-white/35 hover:text-white/60 text-xs transition-colors flex items-center justify-center gap-1"
          >
            {isHe ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}{t.back}
          </button>
        </div>
      )}

      {step === 'loading' && <LoadingScreen lang={lang} />}

      {step === 'error' && (
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            {isHe ? 'משהו השתבש' : 'Что-то пошло не так'}
          </h2>
          <p className="text-gray-500 text-sm mb-5">{errMsg}</p>
          <div className="flex gap-3">
            <button
              onClick={() => { setStep('form'); setErrMsg(''); submitting.current = false }}
              className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl hover:border-gray-300 text-sm transition-all"
            >
              {t.retry}
            </button>
            <a
              href="https://wa.me/972544858586"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-2xl text-sm text-center transition-all"
            >
              WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

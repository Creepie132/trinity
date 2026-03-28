'use client'

/**
 * /demo/callback/google — NEW: DynamicDemoForm + Trial Pipeline
 *
 * Поток:
 *   1. LangPicker — выбор языка
 *   2. DynamicDemoForm — имя, фамилия, телефон, бизнес
 *   3. POST /api/demo/create-trial → создаёт Auth user + org атомарно
 *   4. signInWithPassword → /dashboard
 */

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Sparkles, Loader2, ChevronRight, ChevronLeft, Phone, User, Building2, Check } from 'lucide-react'

type Step = 'lang' | 'form' | 'creating' | 'done' | 'error'

// ─── Language picker ──────────────────────────────────────────────────────────
function LangPicker({ onSelect }: { onSelect: (lang: 'he' | 'ru') => void }) {
  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 bg-amber-500/30 rounded-2xl animate-ping" />
          <div className="relative w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/40 mx-auto">
            <Sparkles size={28} className="text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white">Trinity CRM</h1>
        <p className="text-white/50 text-sm mt-1">14 дней бесплатно</p>
      </div>
      <div className="bg-white rounded-3xl shadow-2xl p-8">
        <p className="text-gray-700 font-semibold text-center mb-6 text-lg">
          בחר שפה / Выберите язык
        </p>
        <div className="space-y-3">
          <button onClick={() => onSelect('he')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200">
            <div className="text-right flex-1" dir="rtl">
              <p className="font-bold text-gray-900 text-lg">עברית</p>
              <p className="text-sm text-gray-500">ממשק בעברית עם נתונים בעברית</p>
            </div>
            <span className="text-3xl leading-none flex-shrink-0">🇮🇱</span>
          </button>
          <button onClick={() => onSelect('ru')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200">
            <span className="text-3xl leading-none flex-shrink-0">🇷🇺</span>
            <div className="text-left flex-1" dir="ltr">
              <p className="font-bold text-gray-900 text-lg">Русский</p>
              <p className="text-sm text-gray-500">Интерфейс и данные на русском</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-1.5">
        <span className="text-amber-500">{icon}</span>{label}
      </label>
      {children}
    </div>
  )
}

function TrialInput({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <div>
      <input {...props}
        className={`w-full px-4 py-3.5 border-2 rounded-xl text-gray-900 placeholder-gray-400
          focus:outline-none focus:ring-0 transition-all duration-200 text-base
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300 focus:border-amber-400'}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">⚠ {error}</p>}
    </div>
  )
}

// ─── Progress screen ──────────────────────────────────────────────────────────
function CreatingScreen({ lang }: { lang: 'he' | 'ru' }) {
  const labels = lang === 'he'
    ? ['יוצר חשבון משתמש...', 'מגדיר את הארגון שלך...', 'ממלא נתוני דמו...', 'מוכן! פותח Trinity CRM...']
    : ['Создаём аккаунт...', 'Настраиваем вашу организацию...', 'Заполняем демо-данными...', 'Готово! Открываем Trinity CRM...']

  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const timers = labels.map((_, i) =>
      setTimeout(() => setCurrentStep(i), i * 1600)
    )
    return () => timers.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
      <div className="relative w-16 h-16 mx-auto mb-6">
        <div className="absolute inset-0 bg-amber-500/30 rounded-2xl animate-ping" />
        <div className="relative w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-xl">
          <Sparkles size={28} className="text-white" />
        </div>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        {lang === 'he' ? 'מכין את Trinity CRM שלך' : 'Готовим Trinity CRM для вас'}
      </h2>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all duration-700"
          style={{ width: `${((currentStep + 1) / labels.length) * 100}%` }} />
      </div>
      <div className="space-y-3 text-left">
        {labels.map((label, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all
              ${i < currentStep ? 'bg-green-500 text-white' : i === currentStep ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {i < currentStep ? <Check size={12}/> : i === currentStep ? <Loader2 size={12} className="animate-spin"/> : '·'}
            </div>
            <span className={`text-sm ${i < currentStep ? 'text-green-700 font-medium' : i === currentStep ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DemoGoogleCallbackPage() {
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [step, setStep]       = useState<Step>('lang')
  const [lang, setLang]       = useState<'he' | 'ru'>('ru')
  const [errors, setErrors]   = useState<Record<string, string>>({})
  const [errorMsg, setErrorMsg] = useState('')
  const hasSubmitted = useRef(false)

  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', business_name: '' })

  const isHe = lang === 'he'
  const T = {
    he: {
      title: 'הרשמה לניסיון חינם', subtitle: '14 יום ניסיון ללא כרטיס אשראי',
      first_name: 'שם פרטי', last_name: 'שם משפחה', phone: 'טלפון', business_name: 'שם העסק',
      phone_ph: '050-000-0000', business_ph: 'מספרת מעוף', back: 'חזרה לבחירת שפה',
      submit: 'צור חשבון ניסיון', loading: 'יוצר חשבון...',
      free: 'ללא כרטיס אשראי · ניסיון חינם 14 יום',
      err_required: 'שדה חובה', err_phone: 'מספר טלפון לא תקין',
      err_exists: 'מספר טלפון זה כבר רשום. נסה מספר אחר.',
    },
    ru: {
      title: 'Регистрация пробного доступа', subtitle: '14 дней бесплатно — без карты',
      first_name: 'Имя', last_name: 'Фамилия', phone: 'Телефон', business_name: 'Название бизнеса',
      phone_ph: '054-000-0000', business_ph: 'Beauty Studio', back: 'Сменить язык',
      submit: 'Создать пробный аккаунт', loading: 'Создаём аккаунт...',
      free: 'Без карты · 14 дней бесплатно',
      err_required: 'Обязательное поле', err_phone: 'Неверный номер телефона',
      err_exists: 'Этот номер уже зарегистрирован. Попробуйте другой.',
    },
  }[lang]

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setErrors(er => { const n = { ...er }; delete n[k]; return n })
  }

  const handleLangSelect = (l: 'he' | 'ru') => {
    setLang(l)
    try { localStorage.setItem('trinity-language', l) } catch {}
    setStep('form')
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.first_name.trim())    e.first_name    = T.err_required
    if (!form.last_name.trim())     e.last_name      = T.err_required
    if (!form.business_name.trim()) e.business_name  = T.err_required
    if (form.phone.replace(/\D/g,'').length < 9) e.phone = T.err_phone
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate() || hasSubmitted.current) return
    hasSubmitted.current = true
    setStep('creating')

    try {
      const res = await fetch('/api/demo/create-trial', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, language: lang }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'PHONE_EXISTS') {
          hasSubmitted.current = false
          setErrors({ phone: T.err_exists })
          setStep('form')
          return
        }
        throw new Error(data.message || data.error || 'Server error')
      }

      // Auto-login через email/password (получены из API)
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email:    data.email,
        password: data.password,
      })
      if (signInErr) throw new Error('Auth failed: ' + signInErr.message)

      // Обновляем JWT чтобы содержал org_id из app_metadata
      await supabase.auth.refreshSession().catch(() => {})

      try { localStorage.setItem('trinity_demo_start_tour', '1') } catch {}

      setStep('done')
      await new Promise(r => setTimeout(r, 900))
      router.push('/dashboard')

    } catch (err: any) {
      hasSubmitted.current = false
      setErrorMsg(err.message || 'Неизвестная ошибка')
      setStep('error')
    }
  }

  const dir = isHe ? 'rtl' : 'ltr'

  return (
    <div dir={dir} className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Step 1: Language */}
      {step === 'lang' && <LangPicker onSelect={handleLangSelect} />}

      {/* Step 2: Lead form */}
      {step === 'form' && (
        <div className="w-full max-w-sm">
          <div className="text-center mb-5">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/40 mx-auto mb-2">
              <Sparkles size={22} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-white">Trinity CRM</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-blue-900 px-6 py-4">
              <h2 className="text-white font-bold text-base">{T.title}</h2>
              <p className="text-white/55 text-xs mt-0.5">{T.subtitle}</p>
            </div>

            <div className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <Field label={T.first_name} icon={<User size={12}/>}>
                  <TrialInput value={form.first_name} onChange={set('first_name')}
                    placeholder={isHe ? 'ישראל' : 'Иван'}
                    error={errors.first_name} autoFocus />
                </Field>
                <Field label={T.last_name} icon={<User size={12}/>}>
                  <TrialInput value={form.last_name} onChange={set('last_name')}
                    placeholder={isHe ? 'ישראלי' : 'Иванов'}
                    error={errors.last_name} />
                </Field>
              </div>

              <Field label={T.phone} icon={<Phone size={12}/>}>
                <TrialInput type="tel" value={form.phone} onChange={set('phone')}
                  placeholder={T.phone_ph} error={errors.phone} />
              </Field>

              <Field label={T.business_name} icon={<Building2 size={12}/>}>
                <TrialInput value={form.business_name} onChange={set('business_name')}
                  placeholder={T.business_ph} error={errors.business_name} />
              </Field>

              <button onClick={handleSubmit}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500
                  text-white font-bold text-sm rounded-2xl mt-1
                  hover:from-amber-600 hover:to-orange-600 hover:shadow-lg hover:scale-[1.02]
                  active:scale-[0.98] transition-all duration-200
                  flex items-center justify-center gap-2">
                {T.submit}
                {isHe ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}
              </button>

              <p className="text-center text-gray-400 text-xs">{T.free}</p>
            </div>
          </div>

          <button onClick={() => setStep('lang')}
            className="mt-4 w-full text-center text-white/40 hover:text-white/70 text-xs transition-colors flex items-center justify-center gap-1">
            {isHe ? <ChevronRight size={12}/> : <ChevronLeft size={12}/>}
            {T.back}
          </button>
        </div>
      )}

      {/* Step 3 + 4: Progress */}
      {(step === 'creating' || step === 'done') && <CreatingScreen lang={lang} />}

      {/* Error */}
      {step === 'error' && (
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {isHe ? 'משהו השתבש' : 'Что-то пошло не так'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
          <div className="flex gap-3">
            <button onClick={() => { setStep('form'); setErrorMsg('') }}
              className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl hover:border-gray-300 transition-all text-sm">
              {isHe ? 'נסה שוב' : 'Попробовать снова'}
            </button>
            <a href="https://wa.me/972544858586" target="_blank" rel="noopener noreferrer"
              className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-2xl transition-all text-sm text-center">
              WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

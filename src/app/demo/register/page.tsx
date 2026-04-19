'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Check, ChevronRight, ChevronLeft, X, MessageCircle,
  User, Building2, Phone, MapPin, Globe, Sparkles,
  CreditCard, Package, Calendar, BarChart2, ShoppingBag,
  Users, GitBranch, Repeat, BookOpen, ShoppingCart, Star,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormData {
  first_name: string
  last_name: string
  business_name: string
  phone: string
  address: string
  city: string
  country: string
  email: string
}

interface Module {
  key: string
  label_he: string
  label_ru: string
  desc_he: string
  desc_ru: string
  icon: React.ReactNode
  popular?: boolean
}

// ─── Modules list ─────────────────────────────────────────────────────────────
const MODULES: Module[] = [
  { key: 'clients',       label_he: 'ניהול לקוחות',  label_ru: 'Клиенты',        desc_he: 'בסיס לקוחות, היסטוריה, תיוג',         desc_ru: 'База клиентов, история, теги',            icon: <Users size={20}/>,      popular: true },
  { key: 'visits',        label_he: 'יומן פגישות',   label_ru: 'Визиты',          desc_he: 'לוח שנה ותורים',                       desc_ru: 'Календарь записей',                       icon: <Calendar size={20}/>,   popular: true },
  { key: 'payments',      label_he: 'תשלומים',       label_ru: 'Платежи',         desc_he: 'כרטיסי אשראי, הוראת קבע',             desc_ru: 'Кредитные карты, прямой дебет',           icon: <CreditCard size={20}/>, popular: true },
  { key: 'analytics',     label_he: 'אנליטיקה',      label_ru: 'Аналитика',       desc_he: 'גרפים וסטטיסטיקות',                   desc_ru: 'Графики и статистика',                    icon: <BarChart2 size={20}/> },
  { key: 'inventory',     label_he: 'מלאי',          label_ru: 'Склад',           desc_he: 'ניהול מוצרים ומלאי',                  desc_ru: 'Управление товарами',                     icon: <ShoppingBag size={20}/> },
  { key: 'subscriptions', label_he: 'מנויים',        label_ru: 'Абонементы',      desc_he: 'מנויים ותוכניות נאמנות',              desc_ru: 'Подписки и программы лояльности',         icon: <Repeat size={20}/> },
  { key: 'booking',       label_he: 'הזמנה אונליין', label_ru: 'Онлайн запись',   desc_he: 'דף הזמנה ציבורי ללקוחות',            desc_ru: 'Публичная страница записи',               icon: <Globe size={20}/> },
  { key: 'diary',         label_he: 'יומן',          label_ru: 'Дневник',         desc_he: 'הערות ומשימות יומיות',                desc_ru: 'Заметки и ежедневные задачи',             icon: <BookOpen size={20}/> },
  { key: 'sales',         label_he: 'מכירות',        label_ru: 'Продажи',         desc_he: 'קופה, מכירות ומוצרים',               desc_ru: 'Касса, продажи и товары',                 icon: <ShoppingCart size={20}/> },
  { key: 'branches',      label_he: 'סניפים',        label_ru: 'Филиалы',         desc_he: 'ניהול מספר סניפים',                  desc_ru: 'Управление несколькими точками',          icon: <GitBranch size={20}/> },
]

const COUNTRIES = [
  { code: 'IL', label_he: 'ישראל', label_ru: 'Израиль' },
  { code: 'RU', label_he: 'רוסיה', label_ru: 'Россия' },
  { code: 'US', label_he: 'ארה"ב', label_ru: 'США' },
  { code: 'UA', label_he: 'אוקראינה', label_ru: 'Украина' },
  { code: 'DE', label_he: 'גרמניה', label_ru: 'Германия' },
  { code: 'OTHER', label_he: 'אחר', label_ru: 'Другая' },
]

// Demo pricing defaults — overridden by DB values on mount
const PRICING_DEFAULTS = {
  demo_setup_base: 1500,
  demo_module_price: 50,
  demo_discount_threshold: 5,
  demo_discount_pct: 15,
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`transition-all duration-500 rounded-full ${
          i < current ? 'w-6 h-2 bg-amber-500' :
          i === current ? 'w-8 h-2 bg-amber-500 shadow-amber' : 'w-2 h-2 bg-gray-200'
        }`} />
      ))}
    </div>
  )
}

// ─── Input component ──────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      {children}
    </div>
  )
}

function Input({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <div>
      <input
        {...props}
        className={`w-full px-4 py-3 border rounded-xl text-gray-900 placeholder-gray-400 
          focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
          transition-all duration-200 bg-white
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ─── WhatsApp floating button ─────────────────────────────────────────────────
function WhatsAppButton({ lang }: { lang: 'he' | 'ru' }) {
  return (
    <a
      href="https://wa.me/972544858586"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-green-500 hover:bg-green-600 
        text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 
        hover:scale-105 group"
    >
      <MessageCircle size={22} />
      <span className="text-sm font-semibold whitespace-nowrap overflow-hidden max-w-0 
        group-hover:max-w-xs transition-all duration-500 opacity-0 group-hover:opacity-100">
        {lang === 'he' ? 'שוחח עם נציג' : 'Связь с представителем'}
      </span>
    </a>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DemoRegisterPage() {
  const [lang, setLang] = useState<'he' | 'ru'>('he')
  const dir = lang === 'he' ? 'rtl' : 'ltr'
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [registrationId, setRegistrationId] = useState<string | null>(null)
  const [pricingInfo, setPricingInfo] = useState<{setup_fee:number;monthly_fee:number;discount_pct:number} | null>(null)
  const [demoConfig, setDemoConfig] = useState(PRICING_DEFAULTS)
  const containerRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState<FormData>({
    first_name: '', last_name: '', business_name: '',
    phone: '', address: '', city: '', country: 'IL', email: '',
  })
  const [selectedModules, setSelectedModules] = useState<string[]>([])

  const isIsrael = form.country === 'IL'

  // Load demo pricing config from DB
  useEffect(() => {
    fetch('/api/admin/pricing-config')
      .then(r => r.json())
      .then(d => setDemoConfig({
        demo_setup_base: d.demo_setup_base ?? PRICING_DEFAULTS.demo_setup_base,
        demo_module_price: d.demo_module_price ?? PRICING_DEFAULTS.demo_module_price,
        demo_discount_threshold: d.demo_discount_threshold ?? PRICING_DEFAULTS.demo_discount_threshold,
        demo_discount_pct: d.demo_discount_pct ?? PRICING_DEFAULTS.demo_discount_pct,
      }))
      .catch(() => {}) // fallback to defaults
  }, [])

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setErrors(er => { const n={...er}; delete n[k]; return n })
  }

  const scrollTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Step 0 validation ──
  const validateStep0 = () => {
    const e: Record<string, string> = {}
    const t = lang === 'he'
    if (!form.first_name.trim()) e.first_name = t ? 'שדה חובה' : 'Обязательное поле'
    if (!form.last_name.trim())  e.last_name  = t ? 'שדה חובה' : 'Обязательное поле'
    if (!form.business_name.trim()) e.business_name = t ? 'שדה חובה' : 'Обязательное поле'
    if (!form.phone.trim() || form.phone.replace(/\D/g,'').length < 9)
      e.phone = t ? 'מספר טלפון לא תקין' : 'Неверный номер телефона'
    if (form.email && !/\S+@\S+\.\S+/.test(form.email))
      e.email = t ? 'מייל לא תקין' : 'Неверный email'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Step 0 → 1 ──
  const handleNextFromInfo = () => {
    if (!validateStep0()) return
    setStep(1)
    scrollTop()
  }

  // ── Step 1 → 2 (modules → pricing) ──
  const handleNextFromModules = async () => {
    if (!isIsrael) return
    if (selectedModules.length === 0) {
      setErrors({ modules: lang === 'he' ? 'בחר מודול אחד לפחות' : 'Выберите хотя бы один модуль' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/demo/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, selected_modules: selectedModules }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setRegistrationId(data.registration_id)
      setPricingInfo({ setup_fee: data.setup_fee, monthly_fee: data.monthly_fee, discount_pct: data.discount_pct })
      setStep(2)
      scrollTop()
    } catch (err: any) {
      setErrors({ submit: err.message })
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2 → Tranzila ──
  const handlePay = () => {
    if (!registrationId || !pricingInfo) return
    const callbackBase = `${window.location.origin}/demo/callback`
    const successUrl = encodeURIComponent(`${callbackBase}?reg=${registrationId}&status=success`)
    const failUrl    = encodeURIComponent(`${callbackBase}?reg=${registrationId}&status=fail`)
    const desc       = encodeURIComponent(`Trinity CRM - ${form.business_name}`)
    // Tranzila recurring link — terminal name "ambersol"
    const tranzilaUrl =
      `https://direct.tranzila.com/ambersol/iframenew.php` +
      `?sum=${pricingInfo.setup_fee}` +
      `&currency=1` +
      `&cred_type=6` +
      `&pdesc=${desc}` +
      `&success_url=${successUrl}` +
      `&fail_url=${failUrl}` +
      `&contact=${encodeURIComponent(form.first_name + ' ' + form.last_name)}` +
      `&phone=${encodeURIComponent(form.phone)}`
    window.location.href = tranzilaUrl
  }

  const toggleModule = (key: string) => {
    setErrors(e => { const n={...e}; delete n.modules; return n })
    setSelectedModules(m => m.includes(key) ? m.filter(k=>k!==key) : [...m, key])
  }

  const monthlyFee = selectedModules.length * demoConfig.demo_module_price
  const discountPct = selectedModules.length >= demoConfig.demo_discount_threshold ? demoConfig.demo_discount_pct : 0
  const setupFee = Math.round(demoConfig.demo_setup_base * (1 - discountPct / 100))

  const he = lang === 'he'

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-start py-12 px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Lang switcher + back to site */}
      <div className="w-full max-w-lg flex justify-between items-center mb-8">
        <a href="/landing" className="text-white/60 hover:text-white/90 text-sm transition-colors flex items-center gap-1">
          {he ? '← לאתר' : '← На сайт'}
        </a>
        <div className="flex items-center gap-3">
          <button onClick={()=>setLang(l=>l==='he'?'ru':'he')}
            className="text-xs text-white/60 hover:text-white border border-white/20 px-3 py-1.5 rounded-lg transition-colors">
            {he ? 'Русский' : 'עברית'}
          </button>
        </div>
      </div>

      {/* Card */}
      <div ref={containerRef} className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in">

        {/* Header gradient */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 px-8 pt-8 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">{he ? 'Trinity CRM' : 'Trinity CRM'}</h1>
              <p className="text-white/60 text-sm">{he ? 'הרשמה למערכת' : 'Регистрация'}</p>
            </div>
          </div>
          <StepDots current={step} total={3} />
          <div className="flex justify-between text-xs text-white/50">
            {[
              he ? 'פרטים אישיים' : 'Данные',
              he ? 'מודולים' : 'Модули',
              he ? 'תשלום' : 'Оплата',
            ].map((label, i) => (
              <span key={i} className={step === i ? 'text-amber-400 font-semibold' : ''}>{label}</span>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-8">

          {/* ── STEP 0: Personal info ── */}
          {step === 0 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-900">{he ? 'ספרו לנו עליכם' : 'Расскажите о себе'}</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label={he ? 'שם פרטי *' : 'Имя *'}>
                  <Input value={form.first_name} onChange={set('first_name')} placeholder={he?'ישראל':'Иван'} error={errors.first_name} />
                </Field>
                <Field label={he ? 'שם משפחה *' : 'Фамилия *'}>
                  <Input value={form.last_name} onChange={set('last_name')} placeholder={he?'ישראלי':'Иванов'} error={errors.last_name} />
                </Field>
              </div>
              <Field label={he ? 'שם העסק *' : 'Название бизнеса *'}>
                <Input value={form.business_name} onChange={set('business_name')} placeholder={he?'מספרת מעוף':'Beauty Studio'} error={errors.business_name} />
              </Field>
              <Field label={he ? 'טלפון *' : 'Телефон *'}>
                <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="054-000-0000" error={errors.phone} />
              </Field>
              <Field label={he ? 'כתובת' : 'Адрес'}>
                <Input value={form.address} onChange={set('address')} placeholder={he?'רחוב הרצל 1':'ул. Герцля 1'} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label={he ? 'עיר' : 'Город'}>
                  <Input value={form.city} onChange={set('city')} placeholder={he?'תל אביב':'Тель-Авив'} />
                </Field>
                <Field label={he ? 'מדינה *' : 'Страна *'}>
                  <select value={form.country} onChange={set('country')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all">
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{he ? c.label_he : c.label_ru}</option>)}
                  </select>
                </Field>
              </div>
              <Field label={he ? 'אימייל (אופציונלי)' : 'Email (опционально)'}>
                <Input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" error={errors.email} />
              </Field>
              <button onClick={handleNextFromInfo}
                className="mt-2 w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg rounded-2xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
                {he ? 'המשך' : 'Далее'}
                {dir === 'rtl' ? <ChevronLeft size={20}/> : <ChevronRight size={20}/>}
              </button>
            </div>
          )}

          {/* ── STEP 1: Modules ── */}
          {step === 1 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-900">{he ? 'בחרו מודולים' : 'Выберите модули'}</h2>
              {!isIsrael && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
                  <p className="text-amber-800 font-semibold mb-2">{he ? '🌍 שירות מחוץ לישראל' : '🌍 Вне Израиля'}</p>
                  <p className="text-amber-700 text-sm mb-4">
                    {he ? 'כדי להשתמש ב-Trinity מחוץ לישראל, צרו קשר עם נציג שלנו לתנאים מותאמים אישית.'
                         : 'Для использования Trinity за пределами Израиля свяжитесь с нашим представителем для получения персональных условий.'}
                  </p>
                  <a href="https://wa.me/972544858586" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold transition-all">
                    <MessageCircle size={18}/>
                    {he ? 'צרו קשר' : 'Связаться'}
                  </a>
                </div>
              )}

              {isIsrael && (
                <>
                  <p className="text-gray-500 text-sm">
                    {he ? `כל מודול — ₪${demoConfig.demo_module_price}/חודש. בחירת ${demoConfig.demo_discount_threshold}+ מודולים — הנחה של ${demoConfig.demo_discount_pct}% על דמי ההגדרה!`
                         : `Каждый модуль — ₪${demoConfig.demo_module_price}/мес. При выборе ${demoConfig.demo_discount_threshold}+ модулей — скидка ${demoConfig.demo_discount_pct}% на настройку!`}
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {MODULES.map(m => {
                      const active = selectedModules.includes(m.key)
                      return (
                        <button key={m.key} onClick={() => toggleModule(m.key)}
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200
                            ${active
                              ? 'border-amber-500 bg-amber-50 shadow-md scale-[1.01]'
                              : 'border-gray-100 bg-gray-50 hover:border-gray-300 hover:bg-white'}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors
                            ${active ? 'bg-amber-500 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
                            {m.icon}
                          </div>
                          <div className="flex-1 min-w-0 text-start">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{he ? m.label_he : m.label_ru}</span>
                              {m.popular && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{he?'פופולרי':'Топ'}</span>}
                            </div>
                            <p className="text-sm text-gray-500 truncate">{he ? m.desc_he : m.desc_ru}</p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                            ${active ? 'border-amber-500 bg-amber-500' : 'border-gray-300'}`}>
                            {active && <Check size={14} className="text-white" strokeWidth={3}/>}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {errors.modules && <p className="text-sm text-red-500">{errors.modules}</p>}

                  {/* Live price preview */}
                  {selectedModules.length > 0 && (
                    <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-5 text-white animate-fade-in">
                      <div className="flex justify-between mb-2">
                        <span className="text-white/70 text-sm">{he ? 'אבונמנט' : 'Абонемент'}:</span>
                        <span className="font-bold">₪{monthlyFee}{he?'/חודש':'/мес'}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-white/70 text-sm">{he ? 'הגדרה' : 'Настройка'}:</span>
                        <span className="font-bold">
                          {discountPct > 0 && <span className="line-through text-white/40 text-sm me-2">₪{demoConfig.demo_setup_base}</span>}
                          ₪{setupFee}
                        </span>
                      </div>
                      {discountPct > 0 && (
                        <div className="mt-2 bg-amber-500/20 border border-amber-400/30 rounded-xl px-3 py-2 text-amber-300 text-sm text-center">
                          🎉 {he ? `הנחה ${discountPct}% על הגדרה!` : `Скидка ${discountPct}% на настройку!`}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 mt-2">
                <button onClick={() => { setStep(0); scrollTop() }}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl hover:border-gray-300 transition-all flex items-center justify-center gap-2">
                  {dir === 'rtl' ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
                  {he ? 'חזרה' : 'Назад'}
                </button>
                {isIsrael && (
                  <button onClick={handleNextFromModules} disabled={loading}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-2xl hover:from-amber-600 hover:to-orange-600 transition-all hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : null}
                    {he ? 'המשך לתשלום' : 'К оплате'}
                    {!loading && (dir === 'rtl' ? <ChevronLeft size={18}/> : <ChevronRight size={18}/>)}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2: Payment summary ── */}
          {step === 2 && pricingInfo && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CreditCard size={28} className="text-amber-600"/>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{he ? 'סיכום הזמנה' : 'Итог заказа'}</h2>
                <p className="text-gray-500 text-sm mt-1">{form.business_name}</p>
              </div>

              {/* Order details */}
              <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{he ? 'דמי הגדרה חד-פעמיים' : 'Разовая плата за настройку'}</span>
                  <div className="text-end">
                    {pricingInfo.discount_pct > 0 && (
                      <span className="line-through text-gray-400 text-xs me-2">₪{demoConfig.demo_setup_base}</span>
                    )}
                    <span className="font-bold text-gray-900">₪{pricingInfo.setup_fee}</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{he ? 'תשלום חודשי' : 'Ежемесячная оплата'}</span>
                  <span className="font-bold text-gray-900">₪{pricingInfo.monthly_fee}{he?'/חודש':'/мес'}</span>
                </div>
                {pricingInfo.discount_pct > 0 && (
                  <div className="flex justify-between text-sm border-t border-dashed border-gray-200 pt-3">
                    <span className="text-green-600 font-semibold">{he ? `הנחה ${pricingInfo.discount_pct}%` : `Скидка ${pricingInfo.discount_pct}%`}</span>
                    <span className="text-green-600 font-semibold">-₪{demoConfig.demo_setup_base - pricingInfo.setup_fee}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="font-bold text-gray-900">{he ? 'לתשלום עכשיו' : 'К оплате сейчас'}</span>
                  <span className="font-bold text-xl text-amber-600">₪{pricingInfo.setup_fee}</span>
                </div>
              </div>

              {/* Modules selected */}
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">{he ? 'מודולים שנבחרו:' : 'Выбранные модули:'}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedModules.map(key => {
                    const m = MODULES.find(x => x.key === key)
                    return m ? (
                      <span key={key} className="flex items-center gap-1.5 text-xs bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full font-medium">
                        {m.icon && <span className="scale-75">{m.icon}</span>}
                        {he ? m.label_he : m.label_ru}
                      </span>
                    ) : null
                  })}
                </div>
              </div>

              {/* Payment method info */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800">
                🔒 {he ? 'תשלום מאובטח דרך Tranzila. נשמר טוקן להוראת קבע חודשית.' : 'Безопасная оплата через Tranzila. Сохраняется токен для ежемесячного списания.'}
              </div>

              {errors.submit && <p className="text-sm text-red-500 text-center">{errors.submit}</p>}

              <div className="flex gap-3">
                <button onClick={() => { setStep(1); scrollTop() }}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl hover:border-gray-300 transition-all flex items-center justify-center gap-2">
                  {dir === 'rtl' ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
                  {he ? 'חזרה' : 'Назад'}
                </button>
                <button onClick={handlePay}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-2xl hover:from-amber-600 hover:to-orange-600 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
                  <CreditCard size={18}/>
                  {he ? `שלם ₪${pricingInfo.setup_fee}` : `Оплатить ₪${pricingInfo.setup_fee}`}
                </button>
              </div>
            </div>
          )}

        </div>{/* /Body */}
      </div>{/* /Card */}

      <WhatsAppButton lang={lang}/>

      <style jsx global>{`
        @keyframes fade-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .animate-fade-in { animation: fade-in 0.35s cubic-bezier(0.34,1.2,0.64,1) both; }
        .shadow-amber { box-shadow: 0 0 16px rgba(245,158,11,0.5); }
      `}</style>
    </div>
  )
}

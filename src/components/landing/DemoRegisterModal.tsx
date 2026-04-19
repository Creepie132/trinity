'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Check, ChevronRight, ChevronLeft, X, MessageCircle,
  Globe, CreditCard, Calendar, BarChart2, ShoppingBag,
  Users, GitBranch, Repeat, BookOpen, ShoppingCart, Sparkles,
} from 'lucide-react'

interface Module {
  key: string; label_he: string; label_ru: string
  desc_he: string; desc_ru: string; icon: React.ReactNode; popular?: boolean
}

const MODULES: Module[] = [
  { key: 'clients',       label_he: 'ניהול לקוחות',  label_ru: 'Клиенты',       desc_he: 'בסיס לקוחות, היסטוריה, תיוג',  desc_ru: 'База клиентов, история, теги',    icon: <Users size={18}/>,      popular: true },
  { key: 'visits',        label_he: 'יומן פגישות',   label_ru: 'Визиты',         desc_he: 'לוח שנה ותורים',               desc_ru: 'Календарь записей',               icon: <Calendar size={18}/>,   popular: true },
  { key: 'payments',      label_he: 'תשלומים',       label_ru: 'Платежи',        desc_he: 'כרטיסי אשראי, הוראת קבע',     desc_ru: 'Кредитные карты, прямой дебет',  icon: <CreditCard size={18}/>, popular: true },
  { key: 'analytics',     label_he: 'אנליטיקה',      label_ru: 'Аналитика',      desc_he: 'גרפים וסטטיסטיקות',           desc_ru: 'Графики и статистика',            icon: <BarChart2 size={18}/> },
  { key: 'inventory',     label_he: 'מלאי',          label_ru: 'Склад',          desc_he: 'ניהול מוצרים ומלאי',          desc_ru: 'Управление товарами',             icon: <ShoppingBag size={18}/> },
  { key: 'subscriptions', label_he: 'מנויים',        label_ru: 'Абонементы',     desc_he: 'מנויים ותוכניות נאמנות',      desc_ru: 'Подписки и программы лояльности', icon: <Repeat size={18}/> },
  { key: 'booking',       label_he: 'הזמנה אונליין', label_ru: 'Онлайн запись',  desc_he: 'דף הזמנה ציבורי ללקוחות',    desc_ru: 'Публичная страница записи',       icon: <Globe size={18}/> },
  { key: 'diary',         label_he: 'יומן',          label_ru: 'Дневник',        desc_he: 'הערות ומשימות יומיות',        desc_ru: 'Заметки и ежедневные задачи',     icon: <BookOpen size={18}/> },
  { key: 'sales',         label_he: 'מכירות',        label_ru: 'Продажи',        desc_he: 'קופה, מכירות ומוצרים',       desc_ru: 'Касса, продажи и товары',         icon: <ShoppingCart size={18}/> },
  { key: 'branches',      label_he: 'סניפים',        label_ru: 'Филиалы',        desc_he: 'ניהול מספר סניפים',          desc_ru: 'Управление несколькими точками', icon: <GitBranch size={18}/> },
]

const COUNTRIES = [
  { code: 'IL', label_he: 'ישראל', label_ru: 'Израиль' },
  { code: 'RU', label_he: 'רוסיה', label_ru: 'Россия' },
  { code: 'US', label_he: 'ארה"ב', label_ru: 'США' },
  { code: 'UA', label_he: 'אוקראינה', label_ru: 'Украина' },
  { code: 'DE', label_he: 'גרמניה', label_ru: 'Германия' },
  { code: 'OTHER', label_he: 'אחר', label_ru: 'Другая' },
]

// Plan keys that show module selection step
const CUSTOM_PLAN_KEYS = ['custom', 'individual', 'modules', 'custom_modules', 'הרכבה אישית', 'инд. настройка']

interface FormData {
  first_name: string; last_name: string; business_name: string
  phone: string; address: string; city: string; country: string; email: string
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`transition-all duration-500 rounded-full ${
          i < current ? 'w-6 h-2 bg-amber-500' :
          i === current ? 'w-8 h-2 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'w-2 h-2 bg-gray-200'
        }`} />
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>{children}</div>
}

function Inp({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <div>
      <input {...props} className={`w-full px-3 py-2.5 text-sm border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all bg-white ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

interface Props {
  lang: 'he' | 'ru'
  planName: string
  planKey?: string
  onClose: () => void
}

export default function DemoRegisterModal({ lang, planName, planKey, onClose }: Props) {
  const dir = lang === 'he' ? 'rtl' : 'ltr'
  const he = lang === 'he'

  // Determine if this plan uses custom module selection
  const isCustomPlan = CUSTOM_PLAN_KEYS.some(k =>
    (planKey || '').toLowerCase().includes(k.toLowerCase()) ||
    planName.toLowerCase().includes(k.toLowerCase())
  )

  // Steps: non-custom = [info(0), payment(1)], custom = [info(0), modules(1), payment(2)]
  const totalSteps = isCustomPlan ? 3 : 2
  const STEP_PAYMENT = isCustomPlan ? 2 : 1

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [registrationId, setRegistrationId] = useState<string | null>(null)
  const [pricingInfo, setPricingInfo] = useState<{setup_fee:number;monthly_fee:number;discount_pct:number} | null>(null)
  const [demoConfig, setDemoConfig] = useState({ demo_setup_base: 1500, demo_module_price: 50, demo_discount_threshold: 5, demo_discount_pct: 15 })
  const [notified, setNotified] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState<FormData>({ first_name:'', last_name:'', business_name:'', phone:'', address:'', city:'', country:'IL', email:'' })
  const [selectedModules, setSelectedModules] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/admin/pricing-config').then(r=>r.json()).then(d => setDemoConfig({
      demo_setup_base: d.demo_setup_base ?? 1500,
      demo_module_price: d.demo_module_price ?? 50,
      demo_discount_threshold: d.demo_discount_threshold ?? 5,
      demo_discount_pct: d.demo_discount_pct ?? 15,
    })).catch(() => {})
  }, [])

  const notifyAbandoned = useCallback(() => {
    if (notified) return
    if (!form.first_name && !form.phone) return // ничего не ввели — не спамим
    setNotified(true)
    fetch('/api/demo/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'abandoned',
        data: {
          firstName: form.first_name,
          lastName: form.last_name,
          email: form.email,
          country: form.country,
          plan: planName,
        },
      }),
    }).catch(() => {})
  }, [form, planName, notified])

  // Notify on close if user started filling but didn't complete
  const handleClose = useCallback(() => {
    if (step > 0 && step < STEP_PAYMENT) notifyAbandoned()
    onClose()
  }, [step, STEP_PAYMENT, notifyAbandoned, onClose])

  const setF = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setErrors(er => { const n={...er}; delete n[k]; return n })
  }

  const scrollTop = () => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })

  const validateStep0 = () => {
    const e: Record<string, string> = {}
    if (!form.first_name.trim()) e.first_name = he ? 'שדה חובה' : 'Обязательное поле'
    if (!form.last_name.trim())  e.last_name  = he ? 'שדה חובה' : 'Обязательное поле'
    if (!form.business_name.trim()) e.business_name = he ? 'שדה חובה' : 'Обязательное поле'
    if (!form.phone.trim() || form.phone.replace(/\D/g,'').length < 9)
      e.phone = he ? 'מספר טלפון לא תקין' : 'Неверный номер'
    if (form.email && !/\S+@\S+\.\S+/.test(form.email))
      e.email = he ? 'מייל לא תקין' : 'Неверный email'
    setErrors(e); return Object.keys(e).length === 0
  }

  // Step 0 → next (modules if custom, payment if fixed plan)
  const handleNextFromInfo = async () => {
    if (!validateStep0()) return
    if (isCustomPlan) {
      // Go to module selection
      setStep(1); scrollTop()
    } else {
      // Fixed plan: register directly with empty modules, then go to payment
      setLoading(true)
      try {
        const res = await fetch('/api/demo/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, selected_modules: [], plan_name: planName }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error')
        setRegistrationId(data.registration_id)
        setPricingInfo({ setup_fee: data.setup_fee, monthly_fee: data.monthly_fee, discount_pct: data.discount_pct })
        // Notify admin of new lead
        fetch('/api/demo/notify-admin', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'order_submitted', data: { firstName: form.first_name, lastName: form.last_name, email: form.email, country: form.country, plan: planName } }),
        }).catch(() => {})
        setNotified(true)
        setStep(1); scrollTop()
      } catch (err: any) { setErrors({ submit: err.message }) }
      finally { setLoading(false) }
    }
  }

  // Step 1 (modules) → payment — only for custom plan
  const handleNextFromModules = async () => {
    if (form.country !== 'IL') return
    if (selectedModules.length === 0) { setErrors({ modules: he ? 'בחר מודול אחד לפחות' : 'Выберите хотя бы один модуль' }); return }
    setLoading(true)
    try {
      const res = await fetch('/api/demo/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, selected_modules: selectedModules, plan_name: planName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setRegistrationId(data.registration_id)
      setPricingInfo({ setup_fee: data.setup_fee, monthly_fee: data.monthly_fee, discount_pct: data.discount_pct })
      fetch('/api/demo/notify-admin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'order_submitted', data: { firstName: form.first_name, lastName: form.last_name, email: form.email, country: form.country, plan: planName } }),
      }).catch(() => {})
      setNotified(true)
      setStep(2); scrollTop()
    } catch (err: any) { setErrors({ submit: err.message }) }
    finally { setLoading(false) }
  }

  const handlePay = () => {
    if (!registrationId || !pricingInfo) return
    const base = `${window.location.origin}/demo/callback`
    const ok  = encodeURIComponent(`${base}?reg=${registrationId}&status=success`)
    const fail = encodeURIComponent(`${base}?reg=${registrationId}&status=fail`)
    const desc = encodeURIComponent(`Trinity CRM - ${form.business_name}`)
    window.location.href =
      `https://direct.tranzila.com/ambersol/iframenew.php` +
      `?sum=${pricingInfo.setup_fee}&currency=1&cred_type=6&pdesc=${desc}` +
      `&success_url=${ok}&fail_url=${fail}` +
      `&contact=${encodeURIComponent(form.first_name + ' ' + form.last_name)}&phone=${encodeURIComponent(form.phone)}`
  }

  const toggleModule = (key: string) => {
    setErrors(e => { const n={...e}; delete n.modules; return n })
    setSelectedModules(m => m.includes(key) ? m.filter(k=>k!==key) : [...m, key])
  }

  const monthlyFee = selectedModules.length * demoConfig.demo_module_price
  const discountPct = selectedModules.length >= demoConfig.demo_discount_threshold ? demoConfig.demo_discount_pct : 0
  const setupFee = Math.round(demoConfig.demo_setup_base * (1 - discountPct / 100))
  const isIsrael = form.country === 'IL'

  // Step labels
  const stepLabels = isCustomPlan
    ? [he ? 'פרטים' : 'Данные', he ? 'מודולים' : 'Модули', he ? 'תשלום' : 'Оплата']
    : [he ? 'פרטים' : 'Данные', he ? 'תשלום' : 'Оплата']

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 modal-backdrop-enter"
      onMouseDown={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div ref={containerRef} dir={dir}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto modal-card-enter"
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 px-7 pt-7 pb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">Trinity CRM</h2>
                <p className="text-white/60 text-xs">{he ? `תוכנית: ${planName}` : `План: ${planName}`}</p>
              </div>
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all">
              <X size={16} />
            </button>
          </div>
          <StepDots current={step} total={totalSteps} />
          <div className="flex justify-between text-xs text-white/50">
            {stepLabels.map((l, i) => (
              <span key={i} className={step === i ? 'text-amber-400 font-semibold' : ''}>{l}</span>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-7 py-6">

          {/* ── STEP 0: Personal info ── */}
          {step === 0 && (
            <div className="flex flex-col gap-4 step-enter">
              <h3 className="text-xl font-bold text-gray-900">{he ? 'ספרו לנו עליכם' : 'Расскажите о себе'}</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label={he ? 'שם פרטי *' : 'Имя *'}><Inp value={form.first_name} onChange={setF('first_name')} placeholder={he?'ישראל':'Иван'} error={errors.first_name} /></Field>
                <Field label={he ? 'שם משפחה *' : 'Фамилия *'}><Inp value={form.last_name} onChange={setF('last_name')} placeholder={he?'ישראלי':'Иванов'} error={errors.last_name} /></Field>
              </div>
              <Field label={he ? 'שם העסק *' : 'Название бизнеса *'}><Inp value={form.business_name} onChange={setF('business_name')} placeholder={he?'מספרת מעוף':'Beauty Studio'} error={errors.business_name} /></Field>
              <Field label={he ? 'טלפון *' : 'Телефон *'}><Inp type="tel" value={form.phone} onChange={setF('phone')} placeholder="054-000-0000" error={errors.phone} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={he ? 'עיר' : 'Город'}><Inp value={form.city} onChange={setF('city')} placeholder={he?'תל אביב':'Тель-Авив'} /></Field>
                <Field label={he ? 'מדינה *' : 'Страна *'}>
                  <select value={form.country} onChange={setF('country')} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all">
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{he ? c.label_he : c.label_ru}</option>)}
                  </select>
                </Field>
              </div>
              <Field label={he ? 'אימייל (אופציונלי)' : 'Email (опционально)'}><Inp type="email" value={form.email} onChange={setF('email')} placeholder="you@example.com" error={errors.email} /></Field>
              {errors.submit && <p className="text-sm text-red-500 text-center">{errors.submit}</p>}
              <button onClick={handleNextFromInfo} disabled={loading}
                className="mt-1 w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-2xl hover:from-amber-600 hover:to-orange-600 transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : null}
                {he ? 'המשך' : 'Далее'}
                {!loading && (dir === 'rtl' ? <ChevronLeft size={18}/> : <ChevronRight size={18}/>)}
              </button>
            </div>
          )}

          {/* ── STEP 1 (custom only): Modules ── */}
          {step === 1 && isCustomPlan && (
            <div className="flex flex-col gap-4 step-enter">
              <h3 className="text-xl font-bold text-gray-900">{he ? 'בחרו מודולים' : 'Выберите модули'}</h3>
              {!isIsrael ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                  <p className="text-amber-800 font-semibold mb-2">{he ? '🌍 שירות מחוץ לישראל' : '🌍 Вне Израиля'}</p>
                  <p className="text-amber-700 text-sm mb-3">{he ? 'צרו קשר לתנאים מותאמים אישית' : 'Свяжитесь для персональных условий'}</p>
                  <a href="https://wa.me/972544858586" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-all text-sm">
                    <MessageCircle size={16}/>{he ? 'צרו קשר' : 'Связаться'}
                  </a>
                </div>
              ) : (<>
                <p className="text-gray-500 text-xs">
                  {he ? `כל מודול — ₪${demoConfig.demo_module_price}/חודש. ${demoConfig.demo_discount_threshold}+ מודולים — הנחה ${demoConfig.demo_discount_pct}% על ההגדרה!`
                       : `Каждый модуль — ₪${demoConfig.demo_module_price}/мес. ${demoConfig.demo_discount_threshold}+ модулей — скидка ${demoConfig.demo_discount_pct}% на настройку!`}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {MODULES.map(m => {
                    const active = selectedModules.includes(m.key)
                    return (
                      <button key={m.key} onClick={() => toggleModule(m.key)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-200 ${active ? 'border-amber-500 bg-amber-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${active ? 'bg-amber-500 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>{m.icon}</div>
                        <div className="flex-1 min-w-0 text-start">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{he ? m.label_he : m.label_ru}</span>
                            {m.popular && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{he?'פופולרי':'Топ'}</span>}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{he ? m.desc_he : m.desc_ru}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${active ? 'border-amber-500 bg-amber-500' : 'border-gray-300'}`}>
                          {active && <Check size={12} className="text-white" strokeWidth={3}/>}
                        </div>
                      </button>
                    )
                  })}
                </div>
                {errors.modules && <p className="text-sm text-red-500">{errors.modules}</p>}
                {selectedModules.length > 0 && (
                  <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-4 text-white">
                    <div className="flex justify-between mb-1.5 text-sm">
                      <span className="text-white/70">{he ? 'אבונמנט' : 'Абонемент'}:</span>
                      <span className="font-bold">₪{monthlyFee}{he?'/חודש':'/мес'}</span>
                    </div>
                    <div className="flex justify-between mb-1.5 text-sm">
                      <span className="text-white/70">{he ? 'הגדרה' : 'Настройка'}:</span>
                      <span className="font-bold">
                        {discountPct > 0 && <span className="line-through text-white/40 text-xs me-2">₪{demoConfig.demo_setup_base}</span>}
                        ₪{setupFee}
                      </span>
                    </div>
                    {discountPct > 0 && (
                      <div className="mt-2 bg-amber-500/20 border border-amber-400/30 rounded-xl px-3 py-1.5 text-amber-300 text-xs text-center">
                        🎉 {he ? `הנחה ${discountPct}% על הגדרה!` : `Скидка ${discountPct}% на настройку!`}
                      </div>
                    )}
                  </div>
                )}
              </>)}
              <div className="flex gap-3 mt-1">
                <button onClick={() => { setStep(0); scrollTop() }}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl hover:border-gray-300 transition-all flex items-center justify-center gap-2 text-sm">
                  {dir === 'rtl' ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}{he ? 'חזרה' : 'Назад'}
                </button>
                {isIsrael && (
                  <button onClick={handleNextFromModules} disabled={loading}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-2xl hover:from-amber-600 hover:to-orange-600 transition-all hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : null}
                    {he ? 'המשך לתשלום' : 'К оплате'}
                    {!loading && (dir === 'rtl' ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>)}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── PAYMENT STEP ── */}
          {step === STEP_PAYMENT && pricingInfo && (
            <div className="flex flex-col gap-5 step-enter">
              <div className="text-center">
                <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CreditCard size={24} className="text-amber-600"/>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{he ? 'סיכום הזמנה' : 'Итог заказа'}</h3>
                <p className="text-gray-500 text-sm mt-0.5">{form.business_name} — {planName}</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{he ? 'דמי הגדרה חד-פעמיים' : 'Разовая плата за настройку'}</span>
                  <div className="text-end">
                    {pricingInfo.discount_pct > 0 && <span className="line-through text-gray-400 text-xs me-2">₪{demoConfig.demo_setup_base}</span>}
                    <span className="font-bold text-gray-900">₪{pricingInfo.setup_fee}</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{he ? 'תשלום חודשי' : 'Ежемесячная оплата'}</span>
                  <span className="font-bold text-gray-900">₪{pricingInfo.monthly_fee}{he?'/חודש':'/мес'}</span>
                </div>
                {pricingInfo.discount_pct > 0 && (
                  <div className="flex justify-between text-sm border-t border-dashed border-gray-200 pt-2.5">
                    <span className="text-green-600 font-semibold">{he ? `הנחה ${pricingInfo.discount_pct}%` : `Скидка ${pricingInfo.discount_pct}%`}</span>
                    <span className="text-green-600 font-semibold">-₪{demoConfig.demo_setup_base - pricingInfo.setup_fee}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2.5 flex justify-between">
                  <span className="font-bold text-gray-900">{he ? 'לתשלום עכשיו' : 'К оплате сейчас'}</span>
                  <span className="font-bold text-xl text-amber-600">₪{pricingInfo.setup_fee}</span>
                </div>
              </div>
              {selectedModules.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedModules.map(key => {
                    const m = MODULES.find(x => x.key === key)
                    return m ? (
                      <span key={key} className="flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-medium">
                        <span className="scale-75">{m.icon}</span>{he ? m.label_he : m.label_ru}
                      </span>
                    ) : null
                  })}
                </div>
              )}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-xs text-blue-800">
                🔒 {he ? 'תשלום מאובטח דרך Tranzila. נשמר טוקן להוראת קבע חודשית.' : 'Безопасная оплата через Tranzila. Токен для ежемесячного списания.'}
              </div>
              {errors.submit && <p className="text-sm text-red-500 text-center">{errors.submit}</p>}
              <div className="flex gap-3">
                <button onClick={() => { setStep(isCustomPlan ? 1 : 0); scrollTop() }}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl hover:border-gray-300 transition-all flex items-center justify-center gap-2 text-sm">
                  {dir === 'rtl' ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}{he ? 'חזרה' : 'Назад'}
                </button>
                <button onClick={handlePay}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-2xl hover:from-amber-600 hover:to-orange-600 transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 text-sm">
                  <CreditCard size={16}/>{he ? `שלם ₪${pricingInfo.setup_fee}` : `Оплатить ₪${pricingInfo.setup_fee}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .modal-backdrop-enter { animation: backdropIn 0.25s ease both; }
        @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
        .modal-card-enter { animation: cardIn 0.3s cubic-bezier(0.34,1.2,0.64,1) both; }
        @keyframes cardIn { from { opacity: 0; transform: scale(0.92) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .step-enter { animation: stepIn 0.3s cubic-bezier(0.34,1.1,0.64,1) both; }
        @keyframes stepIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  )
}

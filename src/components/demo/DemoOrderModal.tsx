'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { X, ChevronRight, ChevronLeft, Check, Sparkles, Package, Zap, Settings2, Lock, ExternalLink } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface OrderForm {
  firstName: string; lastName: string; birthDate: string
  street: string; city: string; country: string
  email: string; notes: string; agreed: boolean
}
export interface ModuleItem { id: string; labelHe: string; labelRu: string }

export const MODULES: ModuleItem[] = [
  { id: 'clients',       labelHe: 'לקוחות',          labelRu: 'Клиенты' },
  { id: 'visits',        labelHe: 'ביקורים / תורים', labelRu: 'Визиты / Записи' },
  { id: 'diary',         labelHe: 'יומן',             labelRu: 'Дневник / Задачи' },
  { id: 'inventory',     labelHe: 'מלאי',             labelRu: 'Склад' },
  { id: 'booking',       labelHe: 'הזמנה אונליין',   labelRu: 'Онлайн-запись' },
  { id: 'analytics',     labelHe: 'אנליטיקה',        labelRu: 'Статистика' },
  { id: 'sms',           labelHe: 'SMS / הודעות',     labelRu: 'SMS / Рассылки' },
  { id: 'loyalty',       labelHe: 'מועדון נאמנות',   labelRu: 'Программа лояльности' },
  { id: 'subscriptions', labelHe: 'מנויים',           labelRu: 'Абонементы' },
  { id: 'branches',      labelHe: 'סניפים',           labelRu: 'Филиалы' },
]

const COUNTRIES_HE = ['ישראל','ארה"ב','רוסיה','אוקראינה','גרמניה','צרפת','בריטניה','אחר']
const COUNTRIES_RU = ['Израиль','США','Россия','Украина','Германия','Франция','Великобритания','Другое']

// ─── FormField — stable, defined outside modal ────────────────────────────────
interface FieldProps {
  label: string; value: string; onChange: (v: string) => void
  type?: string; required?: boolean; placeholder?: string
}
const FormField = memo(({ label, value, onChange, type = 'text', placeholder }: FieldProps) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all placeholder:text-slate-300"
      placeholder={placeholder ?? label}
    />
  </div>
))
FormField.displayName = 'FormField'

// ─── Step1 — defined outside, receives props ──────────────────────────────────
interface Step1Props {
  form: OrderForm; setForm: React.Dispatch<React.SetStateAction<OrderForm>>; l: boolean
}
const Step1 = memo(({ form, setForm, l }: Step1Props) => {
  const set = useCallback((key: keyof OrderForm) => (v: string) => setForm(f => ({ ...f, [key]: v })), [setForm])
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label={l ? 'שם פרטי' : 'Имя'} value={form.firstName} onChange={set('firstName')}/>
        <FormField label={l ? 'שם משפחה' : 'Фамилия'} value={form.lastName} onChange={set('lastName')}/>
      </div>
      <FormField label={l ? 'תאריך לידה' : 'Дата рождения'} value={form.birthDate} onChange={set('birthDate')} type="date"/>
      <FormField label={l ? 'רחוב' : 'Улица'} value={form.street} onChange={set('street')}/>
      <div className="grid grid-cols-2 gap-3">
        <FormField label={l ? 'עיר' : 'Город'} value={form.city} onChange={set('city')}/>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{l ? 'מדינה' : 'Страна'} *</label>
          <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all">
            <option value="">— {l ? 'בחר' : 'Выбрать'} —</option>
            {(l ? COUNTRIES_HE : COUNTRIES_RU).map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <FormField label="Email" value={form.email} onChange={set('email')} type="email"/>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {l ? 'הערות לאדמין' : 'Заметки для администратора'}
        </label>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all resize-none placeholder:text-slate-300"
          placeholder={l ? 'הערות נוספות...' : 'Дополнительные пожелания...'}
        />
      </div>
      <label className="flex items-start gap-3 cursor-pointer group" onClick={() => setForm(f => ({ ...f, agreed: !f.agreed }))}>
        <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${form.agreed ? 'bg-amber-500 border-amber-500' : 'border-slate-300 group-hover:border-amber-400'}`}>
          {form.agreed && <Check size={12} className="text-white" strokeWidth={3}/>}
        </div>
        <span className="text-xs text-slate-500 leading-relaxed">
          {l ? 'אני מסכים/ה לתנאי השימוש ולמדיניות הפרטיות של Trinity CRM ולאיסוף נתוניי האישיים.'
             : 'Я соглашаюсь с условиями использования и политикой конфиденциальности Trinity CRM, а также с обработкой моих персональных данных.'}
        </span>
      </label>
    </div>
  )
})
Step1.displayName = 'Step1'

// ─── PlanCard — defined outside ───────────────────────────────────────────────
interface PlanCardProps {
  id: 'base' | 'pro' | 'custom'; icon: React.ReactNode; title: string
  price: string; priceNote?: string; features: string[]
  accent: string; badge?: string; selected: boolean
  onSelect: (id: 'base' | 'pro' | 'custom') => void
}
const PlanCard = memo(({ id, icon, title, price, priceNote, features, accent, badge, selected, onSelect }: PlanCardProps) => (
  <div onClick={() => onSelect(id)}
    className={`relative rounded-2xl border-2 p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
      ${selected ? `border-${accent}-400 bg-${accent}-50 shadow-lg` : 'border-slate-200 bg-white hover:border-slate-300'}`}>
    {badge && <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-3 py-0.5 rounded-full whitespace-nowrap bg-gradient-to-r from-${accent}-500 to-${accent}-400`}>{badge}</div>}
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow bg-gradient-to-br from-${accent}-400 to-${accent}-600`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <span className="font-bold text-slate-800 text-sm">{title}</span>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className={`text-xl font-extrabold text-${accent}-600`}>{price}</span>
          {priceNote && <span className="text-xs text-slate-400">{priceNote}</span>}
        </div>
        <ul className="mt-2 space-y-0.5">
          {features.map(f => (
            <li key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
              <Check size={10} className={`text-${accent}-500 flex-shrink-0`} strokeWidth={3}/>{f}
            </li>
          ))}
        </ul>
      </div>
      {selected && <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-${accent}-500`}><Check size={10} className="text-white" strokeWidth={3}/></div>}
    </div>
  </div>
))
PlanCard.displayName = 'PlanCard'

// ─── CustomPicker — defined outside ──────────────────────────────────────────
interface CustomPickerProps {
  l: boolean; isIsrael: boolean
  selectedModules: Set<string>; setSelectedModules: React.Dispatch<React.SetStateAction<Set<string>>>
  setupCustom: number; setupPrice: number; discountApplied: boolean
}
const CustomPicker = memo(({ l, isIsrael, selectedModules, setSelectedModules, setupCustom, setupPrice, discountApplied }: CustomPickerProps) => {
  const toggle = useCallback((id: string) => {
    setSelectedModules(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [setSelectedModules])
  return (
    <div className="mt-3 bg-slate-50 rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        {l ? 'בחר מודולים' : 'Выберите модули'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {MODULES.map(mod => {
          const selected = selectedModules.has(mod.id)
          return (
            <label key={mod.id} onClick={() => toggle(mod.id)}
              className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all
                ${selected ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-amber-300'}`}>
              <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? 'bg-amber-500 border-amber-500' : 'border-slate-300'}`}>
                {selected && <Check size={10} className="text-white" strokeWidth={3}/>}
              </div>
              <span className="text-xs font-medium text-slate-700">{l ? mod.labelHe : mod.labelRu}</span>
            </label>
          )
        })}
      </div>
      {selectedModules.size >= 5 && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700 font-medium flex items-center gap-2">
          <Sparkles size={12} className="text-green-500"/>
          {l ? '🎉 הנחה 15% על סטאפ!' : '🎉 Скидка 15% на сетап!'}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
        <span className="text-xs text-slate-500">{l ? 'עלות סטאפ:' : 'Стоимость сетапа:'}</span>
        <div className="text-right">
          {discountApplied && <span className="text-xs line-through text-slate-400 mr-1">₪{setupCustom}</span>}
          <span className="font-bold text-amber-600">₪{setupPrice}</span>
          <span className="text-xs text-slate-400 ml-1">{l ? 'חד פעמי' : 'разово'}</span>
        </div>
      </div>
    </div>
  )
})
CustomPicker.displayName = 'CustomPicker'

// ─── Step2 — defined outside ──────────────────────────────────────────────────
interface Step2Props {
  l: boolean; isIsrael: boolean; plan: 'base' | 'pro' | 'custom' | null
  onPlan: (p: 'base' | 'pro' | 'custom') => void
  selectedModules: Set<string>; setSelectedModules: React.Dispatch<React.SetStateAction<Set<string>>>
  setupCustom: number; setupPrice: number; discountApplied: boolean
}
const Step2 = memo(({ l, isIsrael, plan, onPlan, selectedModules, setSelectedModules, setupCustom, setupPrice, discountApplied }: Step2Props) => (
  <div className="flex flex-col gap-3">
    <PlanCard id="base" selected={plan === 'base'} onSelect={onPlan}
      icon={<Package size={18} className="text-white"/>}
      title={l ? 'בייס' : 'Base'} price="₪199" priceNote={l ? '/חודש' : '/мес'} accent="blue"
      badge={l ? 'פופולרי' : 'Популярный'}
      features={l ? ['לקוחות','ביקורים / תורים','יומן ומשימות','מלאי','סטאפ ₪500']
                  : ['Клиенты','Визиты / Записи','Дневник и задачи','Склад','Сетап ₪500']}/>
    <PlanCard id="pro" selected={plan === 'pro'} onSelect={onPlan}
      icon={<Zap size={18} className="text-white"/>}
      title="Pro" price="₪349" priceNote={l ? '/חודש' : '/мес'} accent="amber"
      badge={l ? 'מומלץ' : 'Рекомендован'}
      features={l ? ['הכל מ-Base','הזמנה אונליין','אנליטיקה ודוחות','SMS ותזכורות','סטאפ ₪500']
                  : ['Всё из Base','Онлайн-запись','Статистика и отчёты','SMS и напоминания','Сетап ₪500']}/>
    <PlanCard id="custom" selected={plan === 'custom'} onSelect={onPlan}
      icon={<Settings2 size={18} className="text-white"/>}
      title={l ? 'הגדרה אישית' : 'Инд. настройка'} price={l ? 'לפי בחירה' : 'По выбору'}
      priceNote={l ? '+ סטאפ ₪1500' : '+ сетап ₪1500'} accent="purple"
      features={l ? ['בחר מודולים לפי הצורך','הגדרות מותאמות אישית','תמיכה מועדפת','הנחה 15% ל-5+ מודולים']
                  : ['Выберите нужные модули','Индивидуальная конфигурация','Приоритетная поддержка','Скидка 15% от 5+ модулей']}/>
    {plan === 'custom' && (
      <CustomPicker l={l} isIsrael={isIsrael} selectedModules={selectedModules}
        setSelectedModules={setSelectedModules} setupCustom={setupCustom}
        setupPrice={setupPrice} discountApplied={discountApplied}/>
    )}
    <div className={`flex items-start gap-2 p-3 rounded-xl border text-xs ${isIsrael ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
      <Lock size={12} className="flex-shrink-0 mt-0.5"/>
      <span>
        {l ? 'מערכת תשלומים (קבלת כרטיסי אשראי, קבלות, תשלומים חוזרים) — לבעלי עסקים בישראל בלבד. המחיר נקבע אישית.'
           : 'Платёжная система (приём карт, квитанции, рекуррентные платежи) — только для бизнесов в Израиле. Стоимость индивидуальна.'}
      </span>
    </div>
    {plan && (
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-slate-600 font-medium">{l ? 'תוכנית:' : 'Пакет:'}</span>
          <span className="font-bold text-slate-800">{plan === 'base' ? 'Base ₪199/мес' : plan === 'pro' ? 'Pro ₪349/мес' : l ? 'הגדרה אישית' : 'Инд. настройка'}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-slate-600 font-medium">{l ? 'סטאפ חד פעמי:' : 'Единовременный сетап:'}</span>
          <span className="font-bold text-amber-600">₪{setupPrice}{discountApplied ? ' (−15%)' : ''}</span>
        </div>
      </div>
    )}
  </div>
))
Step2.displayName = 'Step2'

// ─── Main modal ───────────────────────────────────────────────────────────────
interface Props { open: boolean; onClose: () => void }

export function DemoOrderModal({ open, onClose }: Props) {
  const { language } = useLanguage()
  const l = language === 'he'
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState<OrderForm>({
    firstName: '', lastName: '', birthDate: '', street: '', city: '',
    country: '', email: '', notes: '', agreed: false,
  })
  const [plan, setPlan] = useState<'base' | 'pro' | 'custom' | null>(null)
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const isIsrael = form.country === (l ? 'ישראל' : 'Израиль')
  const setupCustom = 1500
  const setupBase = 500
  const discountApplied = selectedModules.size >= 5
  const setupPrice = plan === 'custom'
    ? Math.round(setupCustom * (discountApplied ? 0.85 : 1))
    : setupBase

  const planAmount = plan === 'base' ? 199 : plan === 'pro' ? 349 : 0

  const handlePlan = useCallback((p: 'base' | 'pro' | 'custom') => {
    setPlan(p)
    if (p !== 'custom') setSelectedModules(new Set())
  }, [])

  useEffect(() => {
    if (!open) { setStep(1); setSubmitted(false); setPlan(null); setPaymentUrl(null); setSelectedModules(new Set()) }
  }, [open])

  const handleSubmit = async () => {
    if (!plan) return
    setSubmitting(true)
    try {
      // 1. Send order notification
      await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `🛒 Заказ Trinity CRM — ${plan.toUpperCase()} | ${form.firstName} ${form.lastName}`,
          message: [
            `Имя: ${form.firstName} ${form.lastName}`,
            `Email: ${form.email}`,
            `Дата рождения: ${form.birthDate || '—'}`,
            `Адрес: ${[form.street, form.city, form.country].filter(Boolean).join(', ')}`,
            `Пакет: ${plan}${plan === 'custom' ? ` (модули: ${Array.from(selectedModules).join(', ')})` : ''}`,
            `Ежемесячная оплата: ₪${planAmount || '—'}`,
            `Сетап: ₪${setupPrice}${discountApplied ? ' (−15%)' : ''}`,
            `Заметки: ${form.notes || '—'}`,
          ].join('\n'),
          from: form.email,
        }),
      })
      // 2. Create Tranzila payment link for setup fee (if Israel + plan has amount)
      if (isIsrael && setupPrice > 0) {
        const res = await fetch('/api/demo/create-payment-link', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: setupPrice,
            description: `Trinity CRM Setup — ${plan} | ${form.firstName} ${form.lastName}`,
            email: form.email,
            plan,
          }),
        })
        const json = await res.json()
        if (json.url) setPaymentUrl(json.url)
      }
    } catch (e) { console.error('[DemoOrderModal] submit:', e) }
    setSubmitting(false)
    setSubmitted(true)
  }

  const canProceed = !!(form.firstName && form.lastName && form.email && form.country && form.agreed)
  const canSubmit = !!(plan && (plan !== 'custom' || selectedModules.size > 0)) && !submitting

  if (!open) return null

  // ─── Success screen ──────────────────────────────────────────────────────────
  if (submitted) return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center" style={{ animation: 'modal-pop 0.35s cubic-bezier(0.34,1.3,0.64,1) both' }}>
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
          <Check size={36} className="text-white" strokeWidth={2.5}/>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{l ? 'תודה!' : 'Спасибо!'}</h2>
        <p className="text-slate-500 text-sm mb-6">
          {l ? 'הבקשה שלך התקבלה. ניצור איתך קשר תוך 24 שעות.' : 'Ваша заявка получена. Мы свяжемся с вами в течение 24 часов.'}
        </p>
        {paymentUrl && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs text-amber-700 font-semibold mb-3">
              {l ? '💳 תשלום סטאפ חד פעמי — ₪' + setupPrice : '💳 Разовая оплата сетапа — ₪' + setupPrice}
            </p>
            <a href={paymentUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] shadow-md shadow-amber-200 text-sm">
              <ExternalLink size={14}/>
              {l ? 'לתשלום מאובטח' : 'Перейти к оплате'}
            </a>
            <p className="text-xs text-slate-400 mt-2">{l ? 'מאובטח על ידי Tranzila' : 'Защищено Tranzila'}</p>
          </div>
        )}
        <a href="https://wa.me/972544858586" target="_blank" rel="noopener noreferrer"
          className="block w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-2xl transition-all hover:scale-[1.02] shadow-lg shadow-green-200 text-sm mb-3">
          💬 WhatsApp
        </a>
        <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          {l ? 'סגור' : 'Закрыть'}
        </button>
      </div>
      <style jsx global>{`@keyframes modal-pop{from{opacity:0;transform:scale(0.92) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  )

  // ─── Modal ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      ref={overlayRef} onClick={e => e.target === overlayRef.current && onClose()}>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        style={{ animation: 'modal-pop 0.35s cubic-bezier(0.34,1.3,0.64,1) both' }}>
        {/* Header */}
        <div className="flex-shrink-0">
          <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400"/>
          <div className="px-6 pt-5 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {step === 1 ? (l ? '📋 פרטי הזמנה' : '📋 Оформление заказа') : (l ? '📦 בחר תוכנית' : '📦 Выбор пакета')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{l ? `שלב ${step} מתוך 2` : `Шаг ${step} из 2`}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all">
              <X size={16} className="text-slate-500"/>
            </button>
          </div>
          <div className="mx-6 mb-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500" style={{ width: step === 1 ? '50%' : '100%' }}/>
          </div>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 pb-4">
          {step === 1
            ? <Step1 form={form} setForm={setForm} l={l}/>
            : <Step2 l={l} isIsrael={isIsrael} plan={plan} onPlan={handlePlan}
                selectedModules={selectedModules} setSelectedModules={setSelectedModules}
                setupCustom={setupCustom} setupPrice={setupPrice} discountApplied={discountApplied}/>
          }
        </div>
        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-slate-100 flex gap-3">
          {step === 2 && (
            <button onClick={() => setStep(1)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-all">
              <ChevronLeft size={16}/>{l ? 'חזרה' : 'Назад'}
            </button>
          )}
          <button disabled={step === 1 ? !canProceed : !canSubmit}
            onClick={() => step === 1 ? setStep(2) : handleSubmit()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all hover:scale-[1.02] disabled:hover:scale-100 shadow-lg shadow-amber-200">
            {submitting ? <span className="animate-spin inline-block">⟳</span> :
              step === 1 ? <>{l ? 'הבא' : 'Далее'}<ChevronRight size={16}/></> :
              <>{l ? 'שלח הזמנה' : 'Отправить заявку'}<Sparkles size={14}/></>}
          </button>
        </div>
      </div>
      <style jsx global>{`@keyframes modal-pop{from{opacity:0;transform:scale(0.92) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  )
}

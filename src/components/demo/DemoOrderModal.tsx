'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { X, ChevronRight, ChevronLeft, Check, Sparkles, Package, Zap,
  Settings2, Lock, ExternalLink, CreditCard, AlertCircle, Crown, Plus, Minus } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { validatePhone } from '@/lib/validations'
import { usePricingPlans, type LandingPlan, type SetupOption, FALLBACK_SETUP_OPTIONS } from '@/hooks/usePricingPlans'

export interface OrderForm {
  firstName: string; lastName: string; birthDate: string
  phone: string
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

export type SetupType = 'full' | 'standart' | 'self' | null
export function calcSetup(type: SetupType, discount: boolean): number {
  if (!type) return 0
  const base = type === 'full' ? 2000 : type === 'standart' ? 1300 : 300
  return (!discount || type === 'self') ? base : Math.round(base * 0.85)
}
export function calcMonthly(count: number): number {
  if (count === 0) return 0
  if (count <= 2) return 149
  return 149 + (count - 2) * 50
}
// staff pricing: 1→99/each, 3→79/each, 5+→50/each
export function calcStaffMonthly(count: number): number {
  if (count === 0) return 0
  if (count === 1 || count === 2) return count * 99
  if (count >= 3 && count <= 4)   return count * 79
  return count * 50
}

async function notifyAdmin(type: 'order_submitted' | 'abandoned', data: Record<string, any>) {
  try {
    await fetch('/api/demo/notify-admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data }),
    })
  } catch {}
}

// ─── FormField ────────────────────────────────────────────────────────────────
const FormField = memo(({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all placeholder:text-slate-300"
      placeholder={placeholder ?? label}/>
  </div>
))
FormField.displayName = 'FormField'

// ─── Step1 ────────────────────────────────────────────────────────────────────
const Step1 = memo(({ form, setForm, l }: { form: OrderForm; setForm: React.Dispatch<React.SetStateAction<OrderForm>>; l: boolean }) => {
  const set = useCallback((key: keyof OrderForm) => (v: string) => setForm(f => ({ ...f, [key]: v })), [setForm])
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label={l ? 'שם פרטי' : 'Имя'} value={form.firstName} onChange={set('firstName')}/>
        <FormField label={l ? 'שם משפחה' : 'Фамилия'} value={form.lastName} onChange={set('lastName')}/>
      </div>
      <FormField label={l ? 'תאריך לידה' : 'Дата рождения'} value={form.birthDate} onChange={set('birthDate')} type="date"/>
      {/* Телефон — обязательное поле */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {l ? 'טלפון' : 'Номер телефона'} <span className="text-red-400">*</span>
        </label>
        <input
          type="tel"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all placeholder:text-slate-300 ${
            form.phone && !validatePhone(form.phone) ? 'border-red-300 bg-red-50' : 'border-slate-200'
          }`}
          placeholder={l ? '05X-XXXXXXX' : '05X-XXXXXXX или +972...'}
        />
        {form.phone && !validatePhone(form.phone) && (
          <p className="text-xs text-red-500 mt-0.5">
            {l ? 'פורמט לא תקין. לדוגמה: 052-1234567' : 'Неверный формат. Пример: 052-1234567'}
          </p>
        )}
      </div>
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
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{l ? 'הערות לאדמין' : 'Заметки для администратора'}</label>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all resize-none placeholder:text-slate-300"
          placeholder={l ? 'הערות נוספות...' : 'Дополнительные пожелания...'}/>
      </div>
      <label className="flex items-start gap-3 cursor-pointer group" onClick={() => setForm(f => ({ ...f, agreed: !f.agreed }))}>
        <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${form.agreed ? 'bg-amber-500 border-amber-500' : 'border-slate-300 group-hover:border-amber-400'}`}>
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

// ─── PlanCard ─────────────────────────────────────────────────────────────────
const PlanCard = memo(({ id, icon, title, price, priceNote, features, accent, badge, selected, onSelect }: {
  id: 'base' | 'pro' | 'enterprise' | 'custom'; icon: React.ReactNode; title: string
  price: string; priceNote?: string; features: string[]; accent: string
  badge?: string; selected: boolean; onSelect: (id: 'base' | 'pro' | 'enterprise' | 'custom') => void
}) => (
  <div onClick={() => onSelect(id)}
    className={`relative rounded-2xl border-2 p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg mt-4
      ${selected ? `border-${accent}-400 bg-${accent}-50 shadow-lg` : 'border-slate-200 bg-white hover:border-slate-300'}`}>
    {badge && (
      <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-sm bg-gradient-to-r from-${accent}-500 to-${accent}-400`}>
        {badge}
      </div>
    )}
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

// ─── StaffCounter ─────────────────────────────────────────────────────────────
const StaffCounter = memo(({ l, count, setCount }: { l: boolean; count: number; setCount: (n: number) => void }) => {
  const pricePerStaff = count >= 5 ? 50 : count >= 3 ? 79 : 99
  const total = calcStaffMonthly(count)
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-700">{l ? 'מספר עובדים' : 'Количество работников'}</span>
        <span className="text-xs text-slate-400">
          {count === 0 ? '' : `₪${pricePerStaff}/${l ? 'עובד' : 'чел'}`}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => setCount(Math.max(0, count - 1))}
          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95">
          <Minus size={14} className="text-slate-600"/>
        </button>
        <span className="flex-1 text-center font-bold text-slate-800 text-lg">{count}</span>
        <button onClick={() => setCount(count + 1)}
          className="w-8 h-8 rounded-lg bg-amber-100 hover:bg-amber-200 flex items-center justify-center transition-all active:scale-95">
          <Plus size={14} className="text-amber-600"/>
        </button>
      </div>
      {count > 0 && (
        <div className="mt-2 flex justify-between items-center pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500">{l ? 'תוספת חודשית:' : 'Доп. в месяц:'}</span>
          <span className="font-bold text-amber-600 text-sm">+₪{total}</span>
        </div>
      )}
      <div className="mt-2 text-xs text-slate-400 space-y-0.5">
        <div>1–2 {l ? 'עובדים' : 'работника'}: ₪99/{l ? 'כל אחד' : 'каждый'}</div>
        <div>3–4: ₪79/{l ? 'כל אחד' : 'каждый'} · 5+: ₪50/{l ? 'כל אחד' : 'каждый'}</div>
      </div>
    </div>
  )
})
StaffCounter.displayName = 'StaffCounter'

// ─── CustomPicker ─────────────────────────────────────────────────────────────
const CustomPicker = memo(({ l, selectedModules, setSelectedModules, discountApplied,
  monthlyPrice, staffCount, setStaffCount }: {
  l: boolean; selectedModules: Set<string>
  setSelectedModules: React.Dispatch<React.SetStateAction<Set<string>>>
  discountApplied: boolean; monthlyPrice: number
  staffCount: number; setStaffCount: (n: number) => void
}) => {
  const toggle = useCallback((id: string) => {
    setSelectedModules(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [setSelectedModules])
  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{l ? 'בחר מודולים' : 'Выберите модули'}</p>
      <div className="grid grid-cols-2 gap-2">
        {MODULES.map(mod => {
          const selected = selectedModules.has(mod.id)
          return (
            <label key={mod.id} onClick={() => toggle(mod.id)}
              className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all select-none
                ${selected ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-amber-300'}`}>
              <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? 'bg-amber-500 border-amber-500' : 'border-slate-300'}`}>
                {selected && <Check size={10} className="text-white" strokeWidth={3}/>}
              </div>
              <span className="text-xs font-medium text-slate-700">{l ? mod.labelHe : mod.labelRu}</span>
            </label>
          )
        })}
      </div>
      {discountApplied ? (
        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700 flex items-center gap-2">
          <Sparkles size={12} className="text-green-500 flex-shrink-0"/>
          {l ? '🎉 הנחה עד 15% על Full-setup ו-Standart-setup!' : '🎉 Скидка до 15% на Full-setup и Standart-setup!'}
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
          <AlertCircle size={12} className="text-blue-500 flex-shrink-0"/>
          {l ? 'בחר 5+ מודולים לקבלת הנחה עד 15% על סטאפ' : 'Выберите 5+ модулей для скидки до 15% на сетап'}
        </div>
      )}
      {/* Staff counter */}
      <StaffCounter l={l} count={staffCount} setCount={setStaffCount}/>
      {selectedModules.size > 0 && (
        <div className="pt-2 border-t border-slate-200 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">{l ? 'מודולים:' : 'Модули:'}</span>
            <span className="font-bold text-purple-600 text-sm">₪{monthlyPrice}/{l ? 'חודש' : 'мес'}</span>
          </div>
          {staffCount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">{l ? 'עובדים:' : 'Работники:'}</span>
              <span className="font-bold text-amber-600 text-sm">+₪{calcStaffMonthly(staffCount)}/{l ? 'חודש' : 'мес'}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-1 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-600">{l ? 'סה"כ:' : 'Итого:'}</span>
            <span className="font-extrabold text-slate-800">₪{monthlyPrice + calcStaffMonthly(staffCount)}/{l ? 'חודש' : 'мес'}</span>
          </div>
        </div>
      )}
    </div>
  )
})
CustomPicker.displayName = 'CustomPicker'

// ─── Step2 ────────────────────────────────────────────────────────────────────
// Цвет плана → Tailwind accent для PlanCard
const COLOR_ACCENT: Record<string, string> = {
  blue: 'blue', amber: 'amber', purple: 'purple', green: 'green',
  navy: 'indigo', red: 'red',
}
const PLAN_ICONS: Record<string, React.ReactNode> = {
  base:       <Package size={18} className="text-white" />,
  pro:        <Zap size={18} className="text-white" />,
  enterprise: <Crown size={18} className="text-white" />,
  custom:     <Settings2 size={18} className="text-white" />,
}

interface Step2Props {
  l: boolean; isIsrael: boolean; plan: string | null
  onPlan: (p: 'base' | 'pro' | 'enterprise' | 'custom') => void
  selectedModules: Set<string>; setSelectedModules: React.Dispatch<React.SetStateAction<Set<string>>>
  discountApplied: boolean; monthlyPrice: number
  staffCount: number; setStaffCount: (n: number) => void
  wantsPayments: boolean; setWantsPayments: (v: boolean) => void
  apiPlans: LandingPlan[]
}
const Step2 = memo((p: Step2Props) => {
  const { l, isIsrael, plan, onPlan, selectedModules, setSelectedModules,
    discountApplied, monthlyPrice, staffCount, setStaffCount, wantsPayments, setWantsPayments,
    apiPlans } = p
  const isCustom = plan === 'custom'
  return (
    <div className="flex flex-col gap-3 pt-2">
      {apiPlans.map(ap => {
        const accent = COLOR_ACCENT[ap.color] ?? 'blue'
        const icon = PLAN_ICONS[ap.key] ?? <Package size={18} className="text-white" />
        const badge = l ? ap.badge_he : ap.badge_ru
        const features = l ? ap.features_he : ap.features_ru
        const price = l ? ap.price_he : ap.price_ru
        const period = l ? ap.period_he : ap.period_ru
        const title = l ? ap.name_he : ap.name_ru
        return (
          <PlanCard
            key={ap.key}
            id={ap.key as any}
            selected={plan === ap.key}
            onSelect={onPlan}
            icon={icon}
            title={title}
            price={price}
            priceNote={period || undefined}
            accent={accent}
            badge={badge || undefined}
            features={features}
          />
        )
      })}
      {isCustom && (
        <>
          <div className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-xs text-purple-700 flex items-center gap-2">
            <Sparkles size={12} className="text-purple-500 flex-shrink-0"/>
            {l ? 'בחר 5+ מודולים וקבל הנחה עד 15% על Full-setup ו-Standart-setup'
               : 'Выберите 5+ модулей и получите скидку до 15% на Full-setup и Standart-setup'}
          </div>
          <CustomPicker l={l} selectedModules={selectedModules} setSelectedModules={setSelectedModules}
            discountApplied={discountApplied} monthlyPrice={monthlyPrice}
            staffCount={staffCount} setStaffCount={setStaffCount}/>
        </>
      )}
      {!isCustom && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
          <Sparkles size={12} className="text-amber-500 flex-shrink-0"/>
          {l ? 'עם הגדרה אישית של 5+ מודולים — הנחה עד 15% על סטאפ Full ו-Standart'
             : 'При инд. настройке 5+ модулей — скидка до 15% на сетап Full и Standart'}
        </div>
      )}
      {/* Payments checkbox */}
      <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all
        ${isIsrael ? (wantsPayments ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-green-300') : 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-50'}`}
        onClick={() => isIsrael && setWantsPayments(!wantsPayments)}>
        <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${wantsPayments && isIsrael ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
          {wantsPayments && isIsrael && <Check size={10} className="text-white" strokeWidth={3}/>}
        </div>
        <div className="flex-1">
          <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <CreditCard size={14} className="text-green-600"/>
            {l ? 'מערכת תשלומים' : 'Платёжная система'}
            {!isIsrael && <Lock size={11} className="text-slate-400"/>}
          </span>
          <span className="text-xs text-slate-500">
            {isIsrael
              ? (l ? 'קבלת כרטיסי אשראי, קבלות, תשלומים חוזרים — ישראל בלבד' : 'Приём карт, квитанции, рекуррентные платежи')
              : (l ? 'זמין לבעלי עסקים בישראל בלבד' : 'Доступно только для бизнесов в Израиле')}
          </span>
        </div>
      </label>
      {wantsPayments && isIsrael && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700 flex items-center gap-2">
          <AlertCircle size={12} className="text-green-500 flex-shrink-0"/>
          {l ? 'נציג Amber Solutions ייצור איתך קשר בהקדם לתיאום הגדרת מערכת התשלומים.'
             : 'Представитель Amber Solutions свяжется с вами в ближайшее время для настройки платёжной системы.'}
        </div>
      )}
    </div>
  )
})
Step2.displayName = 'Step2'

// ─── SetupPicker ──────────────────────────────────────────────────────────────
// Опции онбординга читаются из БД через usePricingPlans().setupOptions
const SetupPicker = memo(({ l, discountApplied, discountPct, onSelect, onClose, setupOptions }: {
  l: boolean; discountApplied: boolean; discountPct: number
  onSelect: (t: SetupType, price: number) => void; onClose: () => void
  setupOptions: SetupOption[]
}) => {
  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ animation: 'modal-pop 0.3s cubic-bezier(0.34,1.3,0.64,1) both' }}>
        <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-400"/>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-base">{l ? '⚙️ בחר סוג סטאפ' : '⚙️ Выберите тип сетапа'}</h3>
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all"><X size={14} className="text-slate-500"/></button>
          </div>
          {discountApplied && (
            <div className="mb-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700 flex items-center gap-2">
              <Sparkles size={12} className="text-green-500 flex-shrink-0"/>
              {l
                ? `🎉 הנחה ${discountPct}% על Full ו-Standart (5+ מודולים)!`
                : `🎉 Скидка ${discountPct}% на Full и Standart (5+ модулей)!`}
            </div>
          )}
          <div className="space-y-2">
            {setupOptions.map(opt => {
              const final = (discountApplied && opt.discount_eligible)
                ? Math.round(opt.price * (1 - discountPct / 100))
                : opt.price
              return (
                <button key={opt.id} onClick={() => onSelect(opt.id as SetupType, final)}
                  className="w-full text-left p-3 rounded-2xl border-2 border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="font-bold text-slate-800 text-sm">{l ? opt.title_he : opt.title_ru}</span>
                    </div>
                    <div className="text-right">
                      {discountApplied && opt.discount_eligible && (
                        <span className="text-xs line-through text-slate-400 mr-1">₪{opt.price}</span>
                      )}
                      <span className="font-extrabold text-amber-600">₪{final}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 ml-7">{l ? opt.desc_he : opt.desc_ru}</p>
                  {!opt.discount_eligible && (
                    <p className="text-xs text-slate-400 mt-0.5 ml-7 italic">{l ? 'ללא הנחה' : 'Без скидки'}</p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
})
SetupPicker.displayName = 'SetupPicker'

// ─── Main modal ───────────────────────────────────────────────────────────────
export function DemoOrderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { language } = useLanguage()
  const l = language === 'he'
  const { plans: apiPlans, setupOptions, discountPct } = usePricingPlans()  // динамические планы и сетап-опции из БД
  const [step, setStep]     = useState<1 | 2>(1)
  const [form, setForm]     = useState<OrderForm>({ firstName:'', lastName:'', birthDate:'', phone:'', street:'', city:'', country:'', email:'', notes:'', agreed: false })
  const [plan, setPlan]     = useState<string | null>(null)
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set())
  const [staffCount, setStaffCount]           = useState(0)
  const [wantsPayments, setWantsPayments]     = useState(false)
  const [showSetupPicker, setShowSetupPicker] = useState(false)
  const [setupType, setSetupType]             = useState<SetupType>(null)
  const [setupFinalPrice, setSetupFinalPrice] = useState(0)
  const [submitted, setSubmitted]             = useState(false)
  const [submitting, setSubmitting]           = useState(false)
  const [paymentUrl, setPaymentUrl]           = useState<string | null>(null)
  const overlayRef  = useRef<HTMLDivElement>(null)
  const abandonSent = useRef(false)

  const isIsrael        = form.country === (l ? 'ישראל' : 'Израиль')
  const discountApplied = selectedModules.size >= 5
  const monthlyPrice    = calcMonthly(selectedModules.size)
  const staffMonthly    = calcStaffMonthly(staffCount)
  // Цена плана: читаем из динамических данных API
  const planAmount      = (() => {
    if (!plan || plan === 'custom') return monthlyPrice + staffMonthly
    const found = apiPlans.find(p => p.key === plan)
    if (found) {
      const priceStr = found.price_ru.replace(/[^\d]/g, '')
      const parsed = parseInt(priceStr, 10)
      return isNaN(parsed) ? monthlyPrice + staffMonthly : parsed
    }
    return monthlyPrice + staffMonthly
  })()

  const handlePlan = useCallback((p: 'base' | 'pro' | 'enterprise' | 'custom') => {
    setPlan(p); if (p !== 'custom') { setSelectedModules(new Set()); setStaffCount(0) }
  }, [])

  useEffect(() => {
    if (!open) {
      setStep(1); setSubmitted(false); setPlan(null); setPaymentUrl(null)
      setSelectedModules(new Set()); setWantsPayments(false)
      setShowSetupPicker(false); setSetupType(null); setSetupFinalPrice(0)
      setStaffCount(0); abandonSent.current = false
    }
  }, [open])

  // Abandon detection: send notification when modal closes without submitting
  useEffect(() => {
    if (!open && !submitted && !abandonSent.current) {
      if (form.firstName || form.email) {
        abandonSent.current = true
        notifyAdmin('abandoned', { firstName: form.firstName, lastName: form.lastName, email: form.email, country: form.country })
      }
    }
  }, [open, submitted, form])

  const canProceed = !!(form.firstName && form.lastName && form.email && form.phone && validatePhone(form.phone) && form.country && form.agreed)
  const canSubmit  = !!(plan && (plan !== 'custom' || selectedModules.size > 0)) && !submitting

  const handleSendClick = () => { if (canSubmit) setShowSetupPicker(true) }

  const handleSetupSelect = async (type: SetupType, price: number) => {
    setSetupType(type); setSetupFinalPrice(price); setShowSetupPicker(false)
    setSubmitting(true)
    try {
      // 1. Notify admin
      await notifyAdmin('order_submitted', {
        firstName: form.firstName, lastName: form.lastName, email: form.email,
        phone: form.phone, country: form.country, plan, setupType: type, setupPrice: price,
        monthlyPrice: planAmount, staffCount, wantsPayments, notes: form.notes,
      })
      // 2. Send contact email
      await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `🛒 Заказ Trinity CRM — ${plan?.toUpperCase()} | ${form.firstName} ${form.lastName}`,
          message: [
            `Имя: ${form.firstName} ${form.lastName}`, `Email: ${form.email}`,
            `Адрес: ${[form.street, form.city, form.country].filter(Boolean).join(', ')}`,
            `Пакет: ${plan}`, `Ежемесячно: ₪${planAmount}`,
            plan === 'custom' && staffCount > 0 ? `Работники: ${staffCount} (+₪${staffMonthly}/мес)` : '',
            `Setup: ${type} — ₪${price}${discountApplied && type !== 'self' ? ' (−15%)' : ''}`,
            wantsPayments ? '💳 Запросил платёжную систему' : '',
            form.notes ? `Заметки: ${form.notes}` : '',
          ].filter(Boolean).join('\n'), from: form.email,
        }),
      })
      // 3. Tranzila link (Israel only)
      // SECURITY: передаём setupId, НЕ сумму — бэкенд сам считает цену из БД (anti-tampering)
      if (isIsrael && type) {
        const res = await fetch('/api/demo/create-payment-link', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setupId:      type,               // 'full' | 'standart' | 'self'
            moduleCount:  selectedModules.size, // для расчёта скидки на бэке
            monthlyAmount: planAmount,
            description: `Trinity CRM ${type} | ${form.firstName} ${form.lastName}`,
            email: form.email, plan,
          }),
        })
        const json = await res.json()
        if (json.url) setPaymentUrl(json.url)
        // Обновляем отображаемую цену из ответа бэкенда (эталонная)
        if (json.setupAmount && json.setupAmount !== price) {
          setSetupFinalPrice(json.setupAmount)
        }
      }
    } catch (e) { console.error('[DemoOrderModal]', e) }
    setSubmitting(false); setSubmitted(true)
  }

  if (!open) return null

  // ─── Success ──────────────────────────────────────────────────────────────────
  if (submitted) return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center" style={{ animation: 'modal-pop 0.35s cubic-bezier(0.34,1.3,0.64,1) both' }}>
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
          <Check size={36} className="text-white" strokeWidth={2.5}/>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{l ? 'תודה!' : 'Спасибо!'}</h2>
        <p className="text-slate-500 text-sm mb-4">{l ? 'הבקשה שלך התקבלה. ניצור איתך קשר תוך 24 שעות.' : 'Ваша заявка получена. Мы свяжемся с вами в течение 24 часов.'}</p>
        {setupType && (
          <div className="mb-4 bg-slate-50 rounded-xl px-4 py-3 text-sm text-left space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">{l ? 'תוכנית:' : 'Пакет:'}</span><span className="font-bold">{plan}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">{l ? 'חודשי:' : 'Ежемесячно:'}</span><span className="font-bold text-purple-600">₪{planAmount}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Setup:</span><span className="font-bold text-amber-600">₪{setupFinalPrice}</span></div>
          </div>
        )}
        {paymentUrl && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs text-amber-700 font-semibold mb-3">{l ? '💳 תשלום סטאפ — ₪' + setupFinalPrice : '💳 Оплата сетапа — ₪' + setupFinalPrice}</p>
            <a href={paymentUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] shadow-md text-sm">
              <ExternalLink size={14}/>{l ? 'לתשלום מאובטח' : 'Перейти к оплате'}
            </a>
            <p className="text-xs text-slate-400 mt-2">{l ? 'מאובטח על ידי Tranzila' : 'Защищено Tranzila'}</p>
          </div>
        )}
        <a href="https://wa.me/972544858586" target="_blank" rel="noopener noreferrer"
          className="block w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-3 rounded-2xl transition-all hover:scale-[1.02] text-sm mb-3">
          💬 WhatsApp
        </a>
        <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">{l ? 'סגור' : 'Закрыть'}</button>
      </div>
      <style jsx global>{`@keyframes modal-pop{from{opacity:0;transform:scale(0.92) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  )

  // ─── Modal ────────────────────────────────────────────────────────────────────
  return (
    <>
      {showSetupPicker && <SetupPicker l={l} discountApplied={discountApplied} discountPct={discountPct} setupOptions={setupOptions} onSelect={handleSetupSelect} onClose={() => setShowSetupPicker(false)}/>}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        ref={overlayRef} onClick={e => e.target === overlayRef.current && onClose()}>
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
          style={{ animation: 'modal-pop 0.35s cubic-bezier(0.34,1.3,0.64,1) both' }}>
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
          <div className="overflow-y-auto flex-1 px-6 pb-4">
            {step === 1 ? <Step1 form={form} setForm={setForm} l={l}/> :
              <Step2 l={l} isIsrael={isIsrael} plan={plan} onPlan={handlePlan}
                selectedModules={selectedModules} setSelectedModules={setSelectedModules}
                discountApplied={discountApplied} monthlyPrice={monthlyPrice}
                staffCount={staffCount} setStaffCount={setStaffCount}
                wantsPayments={wantsPayments} setWantsPayments={setWantsPayments}
                apiPlans={apiPlans}/>}
          </div>
          <div className="flex-shrink-0 px-6 py-4 border-t border-slate-100 flex gap-3">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-all">
                <ChevronLeft size={16}/>{l ? 'חזרה' : 'Назад'}
              </button>
            )}
            <button disabled={step === 1 ? !canProceed : !canSubmit}
              onClick={() => step === 1 ? setStep(2) : handleSendClick()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all hover:scale-[1.02] disabled:hover:scale-100 shadow-lg shadow-amber-200">
              {submitting ? <span className="animate-spin inline-block">⟳</span> :
                step === 1 ? <>{l ? 'הבא' : 'Далее'}<ChevronRight size={16}/></> :
                <>{l ? 'שלח הזמנה' : 'Отправить заявку'}<Sparkles size={14}/></>}
            </button>
          </div>
        </div>
      </div>
      <style jsx global>{`@keyframes modal-pop{from{opacity:0;transform:scale(0.92) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </>
  )
}

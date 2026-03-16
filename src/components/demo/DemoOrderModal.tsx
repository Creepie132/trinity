'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronRight, ChevronLeft, Check, Sparkles, Package, Zap, Settings2, Lock } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrderForm {
  firstName: string
  lastName: string
  birthDate: string
  street: string
  city: string
  country: string
  email: string
  notes: string
  agreed: boolean
}

interface ModuleConfig {
  id: string
  labelHe: string
  labelRu: string
  notes: string
}

const MODULES: ModuleConfig[] = [
  { id: 'clients',       labelHe: 'לקוחות',           labelRu: 'Клиенты',            notes: '' },
  { id: 'visits',        labelHe: 'ביקורים / תורים',  labelRu: 'Визиты / Записи',    notes: '' },
  { id: 'diary',         labelHe: 'יומן',              labelRu: 'Дневник / Задачи',   notes: '' },
  { id: 'inventory',     labelHe: 'מלאי',              labelRu: 'Склад',              notes: '' },
  { id: 'booking',       labelHe: 'הזמנה אונליין',    labelRu: 'Онлайн-запись',      notes: '' },
  { id: 'analytics',     labelHe: 'אנליטיקה',         labelRu: 'Статистика',         notes: '' },
  { id: 'sms',           labelHe: 'SMS / הודעות',      labelRu: 'SMS / Рассылки',     notes: '' },
  { id: 'loyalty',       labelHe: 'מועדון נאמנות',    labelRu: 'Программа лояльности', notes: '' },
  { id: 'subscriptions', labelHe: 'מנויים',            labelRu: 'Абонементы',         notes: '' },
  { id: 'branches',      labelHe: 'סניפים',            labelRu: 'Филиалы',            notes: '' },
]

const COUNTRIES_HE = ['ישראל','ארה"ב','רוסיה','אוקראינה','גרמניה','צרפת','בריטניה','אחר']
const COUNTRIES_RU = ['Израиль','США','Россия','Украина','Германия','Франция','Великобритания','Другое']

interface Props {
  open: boolean
  onClose: () => void
}

export function DemoOrderModal({ open, onClose }: Props) {
  const { language } = useLanguage()
  const l = language === 'he'
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState<OrderForm>({
    firstName: '', lastName: '', birthDate: '', street: '', city: '',
    country: '', email: '', notes: '', agreed: false,
  })
  const [plan, setPlan] = useState<'base' | 'pro' | 'custom' | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [modules, setModules] = useState<ModuleConfig[]>(MODULES.map(m => ({ ...m })))
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const isIsrael = form.country === (l ? 'ישראל' : 'Израиль')
  const selectedCount = modules.filter(m => m.id !== 'payments' && m.notes !== '__unselected__').length
  // track selected custom modules via a set
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set())

  const setupBase = isIsrael ? 500 : 500
  const setupCustom = isIsrael ? 1500 : 1500
  const discountApplied = selectedModules.size >= 5
  const setupPrice = plan === 'custom'
    ? Math.round(setupCustom * (discountApplied ? 0.85 : 1))
    : setupBase

  useEffect(() => {
    if (!open) { setStep(1); setSubmitted(false); setPlan(null) }
  }, [open])

  if (!open) return null

  const field = (key: keyof OrderForm, label: string, type = 'text', required = true) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
      <input type={type} value={form[key] as string} required={required}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all placeholder:text-slate-300"
        placeholder={label}
      />
    </div>
  )

  const canProceed = form.firstName && form.lastName && form.email && form.country && form.agreed

  const handleSubmit = async () => {
    if (!plan) return
    setSubmitting(true)
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `🛒 Заказ Trinity CRM — ${plan.toUpperCase()} | ${form.firstName} ${form.lastName}`,
          message: `
Имя: ${form.firstName} ${form.lastName}
Email: ${form.email}
Дата рождения: ${form.birthDate}
Адрес: ${form.street}, ${form.city}, ${form.country}
Пакет: ${plan}${plan === 'custom' ? ` (модули: ${Array.from(selectedModules).join(', ')})` : ''}
Стоимость сетапа: ₪${setupPrice}
Скидка 15%: ${discountApplied ? 'да' : 'нет'}
Заметки: ${form.notes}
          `.trim(),
          from: form.email,
        }),
      })
    } catch {}
    setSubmitting(false)
    setSubmitted(true)
  }

  // ─── STEP 1: Personal info ─────────────────────────────────────────────────
  const Step1 = () => (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {field('firstName', l ? 'שם פרטי' : 'Имя')}
        {field('lastName',  l ? 'שם משפחה' : 'Фамилия')}
      </div>
      {field('birthDate', l ? 'תאריך לידה' : 'Дата рождения', 'date', false)}
      {field('street', l ? 'רחוב' : 'Улица', 'text', false)}
      <div className="grid grid-cols-2 gap-3">
        {field('city', l ? 'עיר' : 'Город', 'text', false)}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {l ? 'מדינה' : 'Страна'} *
          </label>
          <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all">
            <option value="">— {l ? 'בחר' : 'Выбрать'} —</option>
            {(l ? COUNTRIES_HE : COUNTRIES_RU).map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      {field('email', 'Email', 'email')}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {l ? 'הערות לאדמין' : 'Заметки для администратора'}
        </label>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all resize-none placeholder:text-slate-300"
          placeholder={l ? 'הערות נוספות...' : 'Дополнительные пожелания...'}
        />
      </div>
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${form.agreed ? 'bg-amber-500 border-amber-500' : 'border-slate-300 group-hover:border-amber-400'}`}
          onClick={() => setForm(f => ({ ...f, agreed: !f.agreed }))}>
          {form.agreed && <Check size={12} className="text-white" strokeWidth={3}/>}
        </div>
        <span className="text-xs text-slate-500 leading-relaxed">
          {l ? 'אני מסכים/ה לתנאי השימוש ולמדיניות הפרטיות של Trinity CRM ולאיסוף נתוניי האישיים.'
             : 'Я соглашаюсь с условиями использования и политикой конфиденциальности Trinity CRM, а также с обработкой моих персональных данных.'}
        </span>
      </label>
    </div>
  )

  // ─── STEP 2: Plan picker ───────────────────────────────────────────────────
  const PlanCard = ({ id, icon, title, price, priceNote, features, accent, disabled, badge }: {
    id: 'base' | 'pro' | 'custom', icon: React.ReactNode, title: string, price: string,
    priceNote?: string, features: string[], accent: string, disabled?: boolean, badge?: string
  }) => (
    <div onClick={() => !disabled && (setPlan(id), id === 'custom' ? setCustomOpen(true) : setCustomOpen(false))}
      className={`relative rounded-2xl border-2 p-4 cursor-pointer transition-all duration-300 ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-[1.02] hover:shadow-lg'} ${plan === id ? `border-${accent}-400 bg-${accent}-50 shadow-lg shadow-${accent}-100` : 'border-slate-200 bg-white hover:border-slate-300'}`}>
      {badge && <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-${accent}-500 to-${accent}-400 text-white text-xs font-bold px-3 py-0.5 rounded-full whitespace-nowrap`}>{badge}</div>}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-${accent}-400 to-${accent}-600 flex items-center justify-center flex-shrink-0 shadow`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-slate-800 text-sm">{title}</span>
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-xl font-extrabold text-${accent}-600`}>{price}</span>
            {priceNote && <span className="text-xs text-slate-400">{priceNote}</span>}
          </div>
          <ul className="mt-2 space-y-0.5">
            {features.map(f => (
              <li key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
                <Check size={10} className={`text-${accent}-500 flex-shrink-0`} strokeWidth={3}/>
                {f}
              </li>
            ))}
          </ul>
        </div>
        {plan === id && <div className={`w-5 h-5 rounded-full bg-${accent}-500 flex items-center justify-center flex-shrink-0 mt-0.5`}><Check size={10} className="text-white" strokeWidth={3}/></div>}
      </div>
    </div>
  )

  // ─── Custom modules picker ────────────────────────────────────────────────
  const CustomPicker = () => (
    <div className="mt-3 bg-slate-50 rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        {l ? 'בחר מודולים' : 'Выберите модули'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {MODULES.map(mod => {
          const isPayments = mod.id === 'payments'
          const isDisabledPayments = isPayments && !isIsrael
          const selected = selectedModules.has(mod.id)
          return (
            <div key={mod.id}>
              <label className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${isDisabledPayments ? 'opacity-40 cursor-not-allowed' : selected ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-amber-300'}`}>
                <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? 'bg-amber-500 border-amber-500' : 'border-slate-300'}`}
                  onClick={() => !isDisabledPayments && setSelectedModules(prev => {
                    const n = new Set(prev)
                    n.has(mod.id) ? n.delete(mod.id) : n.add(mod.id)
                    return n
                  })}>
                  {selected && <Check size={10} className="text-white" strokeWidth={3}/>}
                </div>
                <span className="text-xs font-medium text-slate-700">{l ? mod.labelHe : mod.labelRu}</span>
                {isDisabledPayments && <Lock size={10} className="text-slate-400 ml-auto"/>}
              </label>
            </div>
          )
        })}
      </div>
      {selectedModules.size > 0 && (
        <div className="mt-3 space-y-2">
          {Array.from(selectedModules).map(id => {
            const mod = MODULES.find(m => m.id === id)!
            return (
              <div key={id} className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-amber-600">{l ? mod.labelHe : mod.labelRu}</label>
                <input type="text" placeholder={l ? 'הערות / בקשות מיוחדות...' : 'Пожелания по настройке...'}
                  className="w-full bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                />
              </div>
            )
          })}
        </div>
      )}
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

  const Step2 = () => (
    <div className="flex flex-col gap-3">
      <PlanCard id="base" icon={<Package size={18} className="text-white"/>}
        title={l ? 'בייס' : 'Base'} price="₪199" priceNote={l ? '/חודש' : '/мес'} accent="blue"
        badge={l ? 'פופולרי' : 'Популярный'}
        features={l
          ? ['לקוחות','ביקורים / תורים','יומן ומשימות','מלאי','סטאפ ₪500']
          : ['Клиенты','Визиты / Записи','Дневник и задачи','Склад','Сетап ₪500']}
      />
      <PlanCard id="pro" icon={<Zap size={18} className="text-white"/>}
        title="Pro" price="₪349" priceNote={l ? '/חודש' : '/мес'} accent="amber"
        badge={l ? 'מומלץ' : 'Рекомендован'}
        features={l
          ? ['הכל מ-Base','הזמנה אונליין','אנליטיקה ודוחות','SMS ותזכורות','סטאפ ₪500']
          : ['Всё из Base','Онлайн-запись','Статистика и отчёты','SMS и напоминания','Сетап ₪500']}
      />
      <PlanCard id="custom" icon={<Settings2 size={18} className="text-white"/>}
        title={l ? 'הגדרה אישית' : 'Инд. настройка'} price={l ? 'לפי בחירה' : 'По выбору'}
        priceNote={l ? '+ סטאפ ₪1500' : '+ сетап ₪1500'} accent="purple"
        features={l
          ? ['בחר מודולים לפי הצורך','הגדרות מותאמות אישית','תמיכה מועדפת','הנחה 15% ל-5+ מודולים']
          : ['Выберите нужные модули','Индивидуальная конфигурация','Приоритетная поддержка','Скидка 15% от 5+ модулей']}
      />
      {plan === 'custom' && <CustomPicker/>}

      {/* Payments add-on note */}
      <div className={`flex items-start gap-2 p-3 rounded-xl border text-xs ${isIsrael ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
        <Lock size={12} className="flex-shrink-0 mt-0.5"/>
        <span>
          {l
            ? 'מערכת תשלומים (קבלת כרטיסי אשראי, קבלות, תשלומים חוזרים) — לבעלי עסקים בישראל בלבד. המחיר נקבע באופן אישי.'
            : 'Платёжная система (приём карт, квитанции, рекуррентные платежи) — только для бизнесов в Израиле. Стоимость — индивидуально.'}
          {!isIsrael && ` (${l ? 'זמין לישראל בלבד' : 'Доступно только для Израиля'})`}
        </span>
      </div>

      {plan && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-medium">{l ? 'תוכנית:' : 'Пакет:'}</span>
            <span className="font-bold text-slate-800">{plan === 'base' ? 'Base ₪199/מס' : plan === 'pro' ? 'Pro ₪349/מס' : l ? 'הגדרה אישית' : 'Инд. настройка'}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-slate-600 font-medium">{l ? 'סטאפ חד פעמי:' : 'Единовременный сетап:'}</span>
            <span className="font-bold text-amber-600">₪{setupPrice}{discountApplied ? ` (−15%)` : ''}</span>
          </div>
        </div>
      )}
    </div>
  )

  // ─── Success screen ────────────────────────────────────────────────────────
  if (submitted) return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
          <Check size={36} className="text-white" strokeWidth={2.5}/>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{l ? 'תודה!' : 'Спасибо!'}</h2>
        <p className="text-slate-500 text-sm mb-6">
          {l ? 'הבקשה שלך התקבלה. ניצור איתך קשר תוך 24 שעות.' : 'Ваша заявка получена. Мы свяжемся с вами в течение 24 часов.'}
        </p>
        <a href="https://wa.me/972544858586" target="_blank" rel="noopener noreferrer"
          className="block w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-2xl transition-all hover:scale-[1.02] shadow-lg shadow-green-200 text-sm mb-3">
          💬 WhatsApp
        </a>
        <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          {l ? 'סגור' : 'Закрыть'}
        </button>
      </div>
    </div>
  )

  // ─── Modal shell ───────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => e.target === overlayRef.current && onClose()} ref={overlayRef}>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        style={{ animation: 'modal-pop 0.35s cubic-bezier(0.34,1.3,0.64,1) both' }}>

        {/* Header */}
        <div className="relative overflow-hidden flex-shrink-0">
          <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400"/>
          <div className="px-6 pt-5 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {step === 1 ? (l ? '📋 פרטי הזמנה' : '📋 Оформление заказа') : (l ? '📦 בחר תוכנית' : '📦 Выбор пакета')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {l ? `שלב ${step} מתוך 2` : `Шаг ${step} из 2`}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all">
              <X size={16} className="text-slate-500"/>
            </button>
          </div>
          {/* Progress */}
          <div className="mx-6 mb-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500"
              style={{ width: step === 1 ? '50%' : '100%' }}/>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 pb-4">
          {step === 1 ? <Step1/> : <Step2/>}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-slate-100 flex gap-3">
          {step === 2 && (
            <button onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-all">
              <ChevronLeft size={16}/> {l ? 'חזרה' : 'Назад'}
            </button>
          )}
          <button disabled={step === 1 ? !canProceed : (!plan || (plan === 'custom' && selectedModules.size === 0)) || submitting}
            onClick={() => step === 1 ? setStep(2) : handleSubmit()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all hover:scale-[1.02] disabled:hover:scale-100 shadow-lg shadow-amber-200">
            {submitting ? <span className="animate-spin">⟳</span> :
              step === 1 ? <>{l ? 'הבא' : 'Далее'} <ChevronRight size={16}/></> :
              <>{l ? 'שלח הזמנה' : 'Отправить заявку'} <Sparkles size={14}/></>}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes modal-pop {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}

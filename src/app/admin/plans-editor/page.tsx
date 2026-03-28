'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Package, Plus, Trash2, Save, Loader2, Check, X, GripVertical,
  ChevronRight, Settings2, Eye, EyeOff, AlertCircle, Languages,
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LandingPlan {
  key: string
  name_he: string;    name_ru: string
  subtitle_he: string; subtitle_ru: string
  price_he: string;   price_ru: string
  period_he: string;  period_ru: string
  badge_he: string;   badge_ru: string
  color: string
  features_he: string[]
  features_ru: string[]
  cta_he: string;     cta_ru: string
  is_active: boolean
  is_popular: boolean
}

interface PricingConfig {
  landing_plans: LandingPlan[]
  demo_setup_base: number
  demo_module_price: number
  demo_discount_threshold: number
  demo_discount_pct: number
}

type LangTab = 'ru' | 'he'

// ─── Color config ─────────────────────────────────────────────────────────────
const COLORS = [
  { key: 'blue',   dot: 'bg-blue-500',   header: 'bg-blue-600 text-white',   ring: 'ring-blue-400' },
  { key: 'amber',  dot: 'bg-amber-500',  header: 'bg-amber-500 text-white',  ring: 'ring-amber-400' },
  { key: 'purple', dot: 'bg-purple-600', header: 'bg-purple-700 text-white', ring: 'ring-purple-400' },
  { key: 'green',  dot: 'bg-green-500',  header: 'bg-green-600 text-white',  ring: 'ring-green-400' },
  { key: 'navy',   dot: 'bg-slate-800',  header: 'bg-slate-900 text-white',  ring: 'ring-slate-500' },
  { key: 'red',    dot: 'bg-red-500',    header: 'bg-red-600 text-white',    ring: 'ring-red-400' },
]

function getColor(key: string) {
  return COLORS.find(c => c.key === key) ?? COLORS[0]
}

function emptyPlan(): LandingPlan {
  return {
    key: `plan_${Date.now()}`,
    name_he: 'תוכנית חדשה', name_ru: 'Новый план',
    subtitle_he: '', subtitle_ru: '',
    price_he: '₪0', price_ru: '₪0',
    period_he: '/חודש', period_ru: '/мес',
    badge_he: '', badge_ru: '',
    color: 'blue',
    features_he: [], features_ru: [],
    cta_he: 'בחרו', cta_ru: 'Выбрать',
    is_active: true, is_popular: false,
  }
}

// ─── FeatureList — dynamic field array ───────────────────────────────────────
function FeatureList({
  items, onChange, dir = 'ltr', placeholder,
}: {
  items: string[]
  onChange: (v: string[]) => void
  dir?: 'ltr' | 'rtl'
  placeholder?: string
}) {
  const add = () => onChange([...items, ''])
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const update = (i: number, val: string) =>
    onChange(items.map((item, idx) => (idx === i ? val : item)))

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <GripVertical size={14} className="text-slate-300 flex-shrink-0 cursor-grab" />
          <input
            dir={dir}
            value={item}
            onChange={e => update(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          />
          <button
            onClick={() => remove(i)}
            className="w-6 h-6 rounded-md bg-red-50 hover:bg-red-100 flex items-center justify-center transition-all flex-shrink-0"
          >
            <X size={11} className="text-red-400" />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-semibold transition-colors py-1"
      >
        <Plus size={13} /> {dir === 'rtl' ? 'הוסף' : 'Добавить фичу'}
      </button>
    </div>
  )
}

// ─── PlanRow — compact list item ─────────────────────────────────────────────
function PlanRow({
  plan, index, selected, onSelect, onToggleActive, onMoveUp, onMoveDown, isFirst, isLast,
}: {
  plan: LandingPlan; index: number; selected: boolean
  onSelect: () => void; onToggleActive: () => void
  onMoveUp: () => void; onMoveDown: () => void
  isFirst: boolean; isLast: boolean
}) {
  const color = getColor(plan.color)
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all
        ${selected ? 'border-amber-400 bg-amber-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}
      onClick={onSelect}
    >
      {/* Drag handle / order */}
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <button
          onClick={e => { e.stopPropagation(); onMoveUp() }}
          disabled={isFirst}
          className="w-5 h-4 flex items-center justify-center text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors"
        >▲</button>
        <button
          onClick={e => { e.stopPropagation(); onMoveDown() }}
          disabled={isLast}
          className="w-5 h-4 flex items-center justify-center text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors"
        >▼</button>
      </div>

      {/* Color dot */}
      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${color.dot}`} />

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 text-sm truncate">{plan.name_ru}</span>
          {plan.name_he && (
            <span className="text-xs text-slate-400 truncate" dir="rtl">{plan.name_he}</span>
          )}
          {plan.is_popular && (
            <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">★ Popular</span>
          )}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">
          {plan.price_ru}{plan.period_ru && ` ${plan.period_ru}`}
          {' · '}
          <span className={plan.is_active ? 'text-green-600' : 'text-red-400'}>
            {plan.is_active ? 'Активен' : 'Выключен'}
          </span>
        </div>
      </div>

      {/* Toggle active */}
      <button
        onClick={e => { e.stopPropagation(); onToggleActive() }}
        className={`w-8 h-5 rounded-full transition-colors flex-shrink-0 relative ${plan.is_active ? 'bg-green-400' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${plan.is_active ? 'left-3' : 'left-0.5'}`} />
      </button>

      {/* Arrow */}
      <ChevronRight size={16} className={`flex-shrink-0 transition-transform ${selected ? 'text-amber-500 rotate-90' : 'text-slate-300'}`} />
    </div>
  )
}

// ─── Side Drawer — plan editor ────────────────────────────────────────────────
function PlanDrawer({
  plan, onUpdate, onClose, onDelete,
}: {
  plan: LandingPlan
  onUpdate: (field: keyof LandingPlan, val: any) => void
  onClose: () => void
  onDelete: () => void
}) {
  const [langTab, setLangTab] = useState<LangTab>('ru')
  const color = getColor(plan.color)

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )

  const Inp = ({
    value, onChange, placeholder, dir = 'ltr', type = 'text',
  }: {
    value: string; onChange: (v: string) => void
    placeholder?: string; dir?: 'ltr' | 'rtl'; type?: string
  }) => (
    <input
      type={type} value={value} dir={dir} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
    />
  )

  const isHe = langTab === 'he'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-4 ${color.header}`}>
        <div className="flex items-center gap-2">
          <Settings2 size={16} />
          <span className="font-bold text-sm">{isHe ? plan.name_he : plan.name_ru}</span>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all">
          <X size={14} />
        </button>
      </div>

      {/* Lang tabs */}
      <div className="flex border-b border-slate-100 px-5 pt-3 pb-0 gap-1 bg-white">
        {(['ru', 'he'] as LangTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setLangTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
              langTab === tab
                ? 'border-amber-400 text-amber-600 bg-amber-50'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Languages size={13} />
            {tab === 'ru' ? 'Русский' : 'עברית'}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-slate-50">
        {/* Name + Subtitle */}
        <Field label={isHe ? 'שם התוכנית' : 'Название плана'}>
          <Inp
            value={isHe ? plan.name_he : plan.name_ru}
            onChange={v => onUpdate(isHe ? 'name_he' : 'name_ru', v)}
            dir={isHe ? 'rtl' : 'ltr'}
          />
        </Field>
        <Field label={isHe ? 'כותרת משנה' : 'Подзаголовок'}>
          <Inp
            value={isHe ? plan.subtitle_he : plan.subtitle_ru}
            onChange={v => onUpdate(isHe ? 'subtitle_he' : 'subtitle_ru', v)}
            dir={isHe ? 'rtl' : 'ltr'}
            placeholder={isHe ? 'לעסקים קטנים...' : 'Для малого бизнеса...'}
          />
        </Field>

        {/* Price + Period */}
        <div className="grid grid-cols-2 gap-3">
          <Field label={isHe ? 'מחיר' : 'Цена'}>
            <Inp
              value={isHe ? plan.price_he : plan.price_ru}
              onChange={v => onUpdate(isHe ? 'price_he' : 'price_ru', v)}
              placeholder="₪199"
            />
          </Field>
          <Field label={isHe ? 'תקופה' : 'Период'}>
            <Inp
              value={isHe ? plan.period_he : plan.period_ru}
              onChange={v => onUpdate(isHe ? 'period_he' : 'period_ru', v)}
              placeholder={isHe ? '/חודש' : '/мес'}
            />
          </Field>
        </div>

        {/* Badge + CTA */}
        <div className="grid grid-cols-2 gap-3">
          <Field label={isHe ? 'תג (badge)' : 'Бейдж'}>
            <Inp
              value={isHe ? plan.badge_he : plan.badge_ru}
              onChange={v => onUpdate(isHe ? 'badge_he' : 'badge_ru', v)}
              dir={isHe ? 'rtl' : 'ltr'}
              placeholder={isHe ? 'פופולרי' : 'Популярный'}
            />
          </Field>
          <Field label="CTA кнопка">
            <Inp
              value={isHe ? plan.cta_he : plan.cta_ru}
              onChange={v => onUpdate(isHe ? 'cta_he' : 'cta_ru', v)}
              dir={isHe ? 'rtl' : 'ltr'}
              placeholder={isHe ? 'בחרו' : 'Выбрать'}
            />
          </Field>
        </div>

        {/* Features */}
        <Field label={isHe ? 'יתרונות / פיצ\'רים' : 'Фичи / преимущества'}>
          <FeatureList
            items={isHe ? plan.features_he : plan.features_ru}
            onChange={v => onUpdate(isHe ? 'features_he' : 'features_ru', v)}
            dir={isHe ? 'rtl' : 'ltr'}
            placeholder={isHe ? 'הוסף יתרון...' : 'Добавить фичу...'}
          />
        </Field>

        {/* Color (язык-независимо) */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <Field label="Цвет карточки">
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c.key}
                  onClick={() => onUpdate('color', c.key)}
                  className={`w-7 h-7 rounded-full ${c.dot} transition-transform hover:scale-110 ${
                    plan.color === c.key ? `ring-2 ring-offset-2 ${c.ring} scale-110` : ''
                  }`}
                />
              ))}
            </div>
          </Field>

          {/* Switches */}
          <div className="space-y-2">
            {[
              { field: 'is_active' as const, label: 'Активен (показывать на лендинге)' },
              { field: 'is_popular' as const, label: '★ Популярный (выделить)' },
            ].map(({ field, label }) => (
              <label key={field} className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => onUpdate(field, !plan[field])}
                  className={`relative w-10 h-5 rounded-full transition-colors ${plan[field] ? 'bg-amber-400' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${plan[field] ? 'left-5' : 'left-0.5'}`} />
                </div>
                <span className="text-sm text-slate-600">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-all"
        >
          <Trash2 size={14} /> Удалить план
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-all"
        >
          <Check size={14} /> Готово
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlansEditorPage() {
  const { language } = useLanguage()
  const l = language === 'he'
  const [config, setConfig] = useState<PricingConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/admin/pricing-config')
      .then(r => r.json())
      .then(data => {
        // Миграция: добавляем is_popular если нет
        if (data?.landing_plans) {
          data.landing_plans = data.landing_plans.map((p: any) => ({
            is_popular: false, ...p,
          }))
        }
        setConfig(data)
      })
      .catch(() => toast.error(l ? 'שגיאה בטעינה' : 'Ошибка загрузки'))
  }, [])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const updatePlan = useCallback((idx: number, field: keyof LandingPlan, val: any) => {
    setConfig(prev => {
      if (!prev) return prev
      const plans = [...prev.landing_plans]
      plans[idx] = { ...plans[idx], [field]: val }
      return { ...prev, landing_plans: plans }
    })
  }, [])

  const addPlan = () => {
    if (!config) return
    const newPlan = emptyPlan()
    setConfig({ ...config, landing_plans: [...config.landing_plans, newPlan] })
    setSelectedIdx(config.landing_plans.length)
  }

  const deletePlan = (idx: number) => {
    if (!config) return
    if (!confirm('Удалить план?')) return
    setConfig({ ...config, landing_plans: config.landing_plans.filter((_, i) => i !== idx) })
    setSelectedIdx(null)
  }

  const movePlan = (idx: number, dir: 'up' | 'down') => {
    if (!config) return
    const plans = [...config.landing_plans]
    const target = dir === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= plans.length) return
    ;[plans[idx], plans[target]] = [plans[target], plans[idx]]
    setConfig({ ...config, landing_plans: plans })
    setSelectedIdx(target)
  }

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/pricing-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error()
      toast.success(l ? '✓ נשמר — הלנדינג עודכן' : '✓ Сохранено — лендинг обновлён')
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    } catch {
      toast.error(l ? 'שגיאה' : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (!config) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  const plans = config.landing_plans
  const selectedPlan = selectedIdx !== null ? plans[selectedIdx] : null

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-purple-600" />
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {l ? 'עורך כרטיסי תוכניות' : 'Редактор планов'}
            </h1>
            <p className="text-xs text-slate-400">
              {l ? 'שינויים מסנכרנים אוטומטית עם הלנדינג' : 'Изменения синхронизируются с лендингом мгновенно'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/landing"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
          >
            <Eye size={14} /> {l ? 'תצוגה מקדימה' : 'Предпросмотр'}
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
              savedFlash
                ? 'bg-green-500 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            {saving
              ? <Loader2 size={15} className="animate-spin" />
              : savedFlash
                ? <Check size={15} />
                : <Save size={15} />}
            {saving
              ? (l ? 'שומר...' : 'Сохраняю...')
              : savedFlash
                ? (l ? 'נשמר!' : 'Сохранено!')
                : (l ? 'שמור' : 'Сохранить')}
          </button>
        </div>
      </div>

      {/* ── Body: List + Drawer ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className="w-full md:w-[400px] flex-shrink-0 flex flex-col overflow-hidden border-r border-slate-100">
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {plans.length} {l ? 'תוכניות' : 'планов'}
            </span>
            <button
              onClick={addPlan}
              className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-bold transition-colors"
            >
              <Plus size={14} /> {l ? 'הוסף תוכנית' : 'Добавить план'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {plans.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">
                <Package className="w-8 h-8 mx-auto mb-3 opacity-30" />
                {l ? 'אין תוכניות עדיין' : 'Нет планов. Добавьте первый!'}
              </div>
            )}
            {plans.map((plan, idx) => (
              <PlanRow
                key={plan.key}
                plan={plan}
                index={idx}
                selected={selectedIdx === idx}
                onSelect={() => setSelectedIdx(selectedIdx === idx ? null : idx)}
                onToggleActive={() => updatePlan(idx, 'is_active', !plan.is_active)}
                onMoveUp={() => movePlan(idx, 'up')}
                onMoveDown={() => movePlan(idx, 'down')}
                isFirst={idx === 0}
                isLast={idx === plans.length - 1}
              />
            ))}
            {/* Empty add button */}
            <button
              onClick={addPlan}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 text-slate-400 rounded-xl hover:border-amber-300 hover:text-amber-500 transition-all text-sm font-medium"
            >
              <Plus size={15} /> {l ? 'הוסף כרטיס' : 'Добавить карточку'}
            </button>
          </div>
        </div>

        {/* Side Drawer */}
        <div className={`flex-1 overflow-hidden transition-all duration-200 ${selectedPlan ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {selectedPlan && selectedIdx !== null && (
            <PlanDrawer
              plan={selectedPlan}
              onUpdate={(field, val) => updatePlan(selectedIdx, field, val)}
              onClose={() => setSelectedIdx(null)}
              onDelete={() => deletePlan(selectedIdx)}
            />
          )}
          {!selectedPlan && (
            <div className="h-full flex items-center justify-center text-slate-300">
              <div className="text-center">
                <Settings2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{l ? 'בחר תוכנית לעריכה' : 'Выберите план для редактирования'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Alert: revalidation note ── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-6 py-2 bg-blue-50 border-t border-blue-100 text-xs text-blue-600">
        <AlertCircle size={13} />
        {l
          ? 'שמירה מעדכנת אוטומטית את הלנדינג ואת מודל ההזמנה של הדמו ללא צורך בדיפלוי'
          : 'После сохранения лендинг и DemoOrderModal получают свежие данные мгновенно (revalidateTag)'}
      </div>
    </div>
  )
}

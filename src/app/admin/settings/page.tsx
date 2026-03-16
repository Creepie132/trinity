'use client'

import { useState, useEffect } from 'react'
import { Settings, Package, Sliders, Save, Loader2, Plus, Trash2, GripVertical, Check } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

// ── Types ────────────────────────────────────────────────────────────────────
interface LandingPlan {
  key: string
  name_he: string
  name_ru: string
  subtitle_he: string
  subtitle_ru: string
  price_he: string
  price_ru: string
  period_he: string
  period_ru: string
  badge_he: string
  badge_ru: string
  color: string
  features_he: string[]
  features_ru: string[]
  cta_he: string
  cta_ru: string
  is_active: boolean
}

interface PricingConfig {
  landing_plans: LandingPlan[]
  demo_setup_base: number
  demo_module_price: number
  demo_discount_threshold: number
  demo_discount_pct: number
}

// ── Color palette ─────────────────────────────────────────────────────────────
const COLORS = [
  { key: 'gray',   bg: 'bg-gray-400'   },
  { key: 'blue',   bg: 'bg-blue-500'   },
  { key: 'amber',  bg: 'bg-amber-500'  },
  { key: 'purple', bg: 'bg-purple-600' },
  { key: 'green',  bg: 'bg-green-500'  },
  { key: 'red',    bg: 'bg-red-500'    },
]

const HEADER_PREVIEW: Record<string, string> = {
  gray:   'bg-gray-100 text-gray-900',
  blue:   'bg-blue-600 text-white',
  amber:  'bg-amber-500 text-white',
  purple: 'bg-purple-700 text-white',
  green:  'bg-green-600 text-white',
  red:    'bg-red-600 text-white',
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{children}</label>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>
}

function Inp({ value, onChange, placeholder, type = 'text' }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white transition-all"
    />
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const { language } = useLanguage()
  const l = language === 'he'
  const [activeTab, setActiveTab] = useState<'plans' | 'demo'>('plans')
  const [config, setConfig] = useState<PricingConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    fetch('/api/admin/pricing-config')
      .then(r => r.json())
      .then(d => setConfig(d))
      .catch(() => toast.error(l ? 'שגיאה בטעינה' : 'Ошибка загрузки'))
  }, [])

  const updatePlan = (idx: number, field: keyof LandingPlan, value: any) => {
    if (!config) return
    const plans = [...config.landing_plans]
    plans[idx] = { ...plans[idx], [field]: value }
    setConfig({ ...config, landing_plans: plans })
  }

  const updatePlanFeatures = (idx: number, lang: 'he' | 'ru', text: string) => {
    const arr = text.split('\n').map(s => s.trim()).filter(Boolean)
    updatePlan(idx, lang === 'he' ? 'features_he' : 'features_ru', arr)
  }

  const addPlan = () => {
    if (!config) return
    const newPlan: LandingPlan = {
      key: `plan_${Date.now()}`,
      name_he: 'תוכנית חדשה', name_ru: 'Новый план',
      subtitle_he: '', subtitle_ru: '',
      price_he: '₪0', price_ru: '₪0',
      period_he: '/חודש', period_ru: '/мес',
      badge_he: '', badge_ru: '',
      color: 'blue',
      features_he: [], features_ru: [],
      cta_he: 'בחרו', cta_ru: 'Выбрать',
      is_active: true,
    }
    setConfig({ ...config, landing_plans: [...config.landing_plans, newPlan] })
  }

  const removePlan = (idx: number) => {
    if (!config) return
    setConfig({ ...config, landing_plans: config.landing_plans.filter((_, i) => i !== idx) })
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
      toast.success(l ? '✓ נשמר בהצלחה' : '✓ Сохранено')
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    } catch {
      toast.error(l ? 'שגיאה בשמירה' : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (!config) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  // Demo live preview calc
  const SAMPLE_MODULES = 3
  const SAMPLE_MODULES_DISC = config.demo_discount_threshold
  const preview_monthly_base = SAMPLE_MODULES * config.demo_module_price
  const preview_setup_base = config.demo_setup_base
  const preview_monthly_disc = SAMPLE_MODULES_DISC * config.demo_module_price
  const preview_setup_disc = Math.round(config.demo_setup_base * (1 - config.demo_discount_pct / 100))

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-7 h-7 text-slate-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{l ? 'הגדרות מערכת' : 'Настройки системы'}</h1>
          <p className="text-sm text-slate-500">{l ? 'ניהול כרטיסי תמחור ופרמטרי דמו' : 'Управление карточками тарифов и параметрами демо'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative border-b border-slate-200">
        <div className="flex gap-6">
          {[
            { key: 'plans', icon: Package, label_he: 'כרטיסי לנדינג', label_ru: 'Карточки лендинга' },
            { key: 'demo',  icon: Sliders, label_he: 'פרמטרי דמו',    label_ru: 'Параметры демо' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'plans' | 'demo')}
              className={`relative flex items-center gap-2 pb-3 text-sm font-semibold transition-colors ${
                activeTab === tab.key ? 'text-amber-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={16} />
              {l ? tab.label_he : tab.label_ru}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full tab-underline" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* TAB: Landing Plans */}
      {activeTab === 'plans' && (
        <div className="tab-content space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {config.landing_plans.map((plan, idx) => (
              <div
                key={plan.key}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:scale-[1.005] transition-all duration-200 overflow-hidden"
              >
                {/* Card Header Preview */}
                <div className={`px-5 py-3 flex items-center justify-between ${HEADER_PREVIEW[plan.color] ?? 'bg-gray-100 text-gray-900'}`}>
                  <div className="flex items-center gap-2">
                    <GripVertical size={16} className="opacity-40 cursor-grab" />
                    <span className="font-bold">{l ? (plan.name_he || 'חדש') : (plan.name_ru || 'Новый')}</span>
                    {(l ? plan.badge_he : plan.badge_ru) && (
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{l ? plan.badge_he : plan.badge_ru}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <div
                        onClick={() => updatePlan(idx, 'is_active', !plan.is_active)}
                        className={`relative w-8 h-4 rounded-full transition-colors ${plan.is_active ? 'bg-green-400' : 'bg-white/30'}`}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${plan.is_active ? 'left-4' : 'left-0.5'}`} />
                      </div>
                      <span className="text-xs opacity-80">{plan.is_active ? (l ? 'פעיל' : 'Активен') : (l ? 'כבוי' : 'Выкл')}</span>
                    </label>
                    <button onClick={() => removePlan(idx)} className="opacity-50 hover:opacity-100 hover:text-red-300 transition-opacity">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4">
                  {/* Color picker */}
                  <div className="flex items-center gap-2">
                    <Label>{l ? 'צבע' : 'Цвет'}</Label>
                    <div className="flex gap-1.5 ms-2">
                      {COLORS.map(c => (
                        <button key={c.key} onClick={() => updatePlan(idx, 'color', c.key)}
                          className={`w-5 h-5 rounded-full ${c.bg} transition-transform hover:scale-110 ${
                            plan.color === c.key ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : ''
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Names */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={l ? 'שם עברית' : 'Назв. (ивр.)'}><Inp value={plan.name_he} onChange={v => updatePlan(idx, 'name_he', v)} /></Field>
                    <Field label={l ? 'שם רוסית' : 'Назв. (рус.)'}><Inp value={plan.name_ru} onChange={v => updatePlan(idx, 'name_ru', v)} /></Field>
                    <Field label={l ? 'כותרת משנה עב' : 'Подзаг. (ивр.)'}><Inp value={plan.subtitle_he} onChange={v => updatePlan(idx, 'subtitle_he', v)} /></Field>
                    <Field label={l ? 'כותרת משנה רו' : 'Подзаг. (рус.)'}><Inp value={plan.subtitle_ru} onChange={v => updatePlan(idx, 'subtitle_ru', v)} /></Field>
                  </div>

                  {/* Price */}
                  <div className="grid grid-cols-4 gap-2">
                    <Field label={l ? 'מחיר עב' : 'Цена (ивр.)'}><Inp value={plan.price_he} onChange={v => updatePlan(idx, 'price_he', v)} placeholder="₪249" /></Field>
                    <Field label={l ? 'תקופה עב' : 'Период (ивр.)'}><Inp value={plan.period_he} onChange={v => updatePlan(idx, 'period_he', v)} placeholder="/חודש" /></Field>
                    <Field label={l ? 'מחיר רו' : 'Цена (рус.)'}><Inp value={plan.price_ru} onChange={v => updatePlan(idx, 'price_ru', v)} placeholder="₪249" /></Field>
                    <Field label={l ? 'תקופה רו' : 'Период (рус.)'}><Inp value={plan.period_ru} onChange={v => updatePlan(idx, 'period_ru', v)} placeholder="/мес" /></Field>
                  </div>

                  {/* Badge + CTA */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={l ? 'תג עברית' : 'Бейдж (ивр.)'}><Inp value={plan.badge_he} onChange={v => updatePlan(idx, 'badge_he', v)} placeholder={l ? 'מומלץ' : '...'} /></Field>
                    <Field label={l ? 'תג רוסית' : 'Бейдж (рус.)'}><Inp value={plan.badge_ru} onChange={v => updatePlan(idx, 'badge_ru', v)} placeholder="Рекомендован" /></Field>
                    <Field label="CTA (ивр.)"><Inp value={plan.cta_he} onChange={v => updatePlan(idx, 'cta_he', v)} /></Field>
                    <Field label="CTA (рус.)"><Inp value={plan.cta_ru} onChange={v => updatePlan(idx, 'cta_ru', v)} /></Field>
                  </div>

                  {/* Features */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={l ? 'יתרונות עברית (שורה=יתרון)' : 'Фичи иврит (1 строка=1 фича)'}>
                      <textarea
                        value={plan.features_he.join('\n')}
                        onChange={e => updatePlanFeatures(idx, 'he', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none transition-all"
                        dir="rtl"
                      />
                    </Field>
                    <Field label={l ? 'יתרונות רוסית' : 'Фичи русский'}>
                      <textarea
                        value={plan.features_ru.join('\n')}
                        onChange={e => updatePlanFeatures(idx, 'ru', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none transition-all"
                        dir="ltr"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addPlan}
            className="flex items-center gap-2 px-5 py-3 border-2 border-dashed border-slate-300 text-slate-500 rounded-2xl hover:border-amber-400 hover:text-amber-600 transition-all hover:scale-[1.01] w-full justify-center text-sm font-semibold">
            <Plus size={16} />
            {l ? 'הוסף כרטיס' : 'Добавить карточку'}
          </button>
        </div>
      )}

      {/* TAB: Demo Pricing */}
      {activeTab === 'demo' && (
        <div className="tab-content space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Setup base */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-2 hover:shadow-md transition-shadow">
              <Label>{l ? 'בסיס דמי הגדרה' : 'База стоимости настройки'}</Label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-bold">₪</span>
                <input
                  type="number" min={0}
                  value={config.demo_setup_base}
                  onChange={e => setConfig({ ...config, demo_setup_base: Number(e.target.value) })}
                  className="flex-1 px-3 py-3 text-xl font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <p className="text-xs text-slate-400">{l ? 'תשלום חד פעמי לפני הנחה' : 'Единоразовая оплата до скидки'}</p>
            </div>

            {/* Module price */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-2 hover:shadow-md transition-shadow">
              <Label>{l ? 'מחיר מודול לחודש' : 'Цена модуля в месяц'}</Label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-bold">₪</span>
                <input
                  type="number" min={0}
                  value={config.demo_module_price}
                  onChange={e => setConfig({ ...config, demo_module_price: Number(e.target.value) })}
                  className="flex-1 px-3 py-3 text-xl font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <p className="text-xs text-slate-400">{l ? 'לכל מודול שנבחר' : 'За каждый выбранный модуль'}</p>
            </div>

            {/* Discount threshold */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-2 hover:shadow-md transition-shadow">
              <Label>{l ? 'סף הנחה (מספר מודולים)' : 'Порог скидки (кол-во модулей)'}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1}
                  value={config.demo_discount_threshold}
                  onChange={e => setConfig({ ...config, demo_discount_threshold: Number(e.target.value) })}
                  className="flex-1 px-3 py-3 text-xl font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <span className="text-slate-500 font-bold text-sm">{l ? 'מודולים+' : 'модулей+'}</span>
              </div>
              <p className="text-xs text-slate-400">{l ? 'מספר מינימלי לקבלת הנחה' : 'Минимум для получения скидки'}</p>
            </div>

            {/* Discount pct */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-2 hover:shadow-md transition-shadow">
              <Label>{l ? 'אחוז הנחה' : 'Процент скидки'}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={0} max={100}
                  value={config.demo_discount_pct}
                  onChange={e => setConfig({ ...config, demo_discount_pct: Number(e.target.value) })}
                  className="flex-1 px-3 py-3 text-xl font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <span className="text-slate-500 font-bold">%</span>
              </div>
              <p className="text-xs text-slate-400">{l ? 'הנחה על דמי ההגדרה' : 'Скидка на стоимость настройки'}</p>
            </div>
          </div>

          {/* Live preview */}
          <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-2xl p-6 text-white space-y-4">
            <p className="text-sm font-semibold text-white/60 uppercase tracking-wide">{l ? 'תצוגה מקדימה' : 'Предпросмотр'}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-4 space-y-2">
                <p className="text-xs text-white/60">{l ? `${SAMPLE_MODULES} מודולים (ללא הנחה)` : `${SAMPLE_MODULES} модуля (без скидки)`}</p>
                <p className="text-lg font-bold">₪{preview_monthly_base}<span className="text-white/60 font-normal text-sm">{l ? '/חודש' : '/мес'}</span></p>
                <p className="text-sm text-white/80">{l ? `הגדרה: ₪${preview_setup_base}` : `Настройка: ₪${preview_setup_base}`}</p>
              </div>
              <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl p-4 space-y-2">
                <p className="text-xs text-amber-300">{l ? `${SAMPLE_MODULES_DISC}+ מודולים (עם הנחה 🎉)` : `${SAMPLE_MODULES_DISC}+ модулей (со скидкой 🎉)`}</p>
                <p className="text-lg font-bold">₪{preview_monthly_disc}<span className="text-white/60 font-normal text-sm">{l ? '/חודש' : '/мес'}</span></p>
                <p className="text-sm">
                  <span className="line-through text-white/40">₪{preview_setup_base}</span>
                  {' '}<span className="text-amber-300 font-bold">₪{preview_setup_disc}</span>
                  {' '}<span className="text-xs text-amber-400">(-{config.demo_discount_pct}%)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-6 py-4 bg-white/90 backdrop-blur border-t border-slate-200 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md
            ${savedFlash ? 'bg-green-500 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> :
           savedFlash ? <Check size={16} /> :
           <Save size={16} />}
          {saving ? (l ? 'שומר...' : 'Сохраняю...') :
           savedFlash ? (l ? 'נשמר!' : 'Сохранено!') :
           (l ? 'שמור שינויים' : 'Сохранить изменения')}
        </button>
      </div>

      <style jsx global>{`
        .tab-content { animation: tabFadeIn 0.2s ease both; }
        @keyframes tabFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tab-underline { animation: underlineSlide 0.2s ease both; }
        @keyframes underlineSlide {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>
    </div>
  )
}

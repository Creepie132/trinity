'use client'

import { useState, useEffect } from 'react'
import { Package, Plus, Trash2, Save, Loader2, Check, GripVertical } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

interface LandingPlan {
  key: string
  name_he: string; name_ru: string
  subtitle_he: string; subtitle_ru: string
  price_he: string; price_ru: string
  period_he: string; period_ru: string
  badge_he: string; badge_ru: string
  color: string
  features_he: string[]; features_ru: string[]
  cta_he: string; cta_ru: string
  is_active: boolean
}

interface PricingConfig {
  landing_plans: LandingPlan[]
  demo_setup_base: number
  demo_module_price: number
  demo_discount_threshold: number
  demo_discount_pct: number
}

const COLORS = [
  { key: 'gray',   bg: 'bg-gray-400',   preview: 'bg-gray-600 text-white' },
  { key: 'blue',   bg: 'bg-blue-500',   preview: 'bg-blue-600 text-white' },
  { key: 'amber',  bg: 'bg-amber-500',  preview: 'bg-amber-500 text-white' },
  { key: 'purple', bg: 'bg-purple-600', preview: 'bg-purple-700 text-white' },
  { key: 'green',  bg: 'bg-green-500',  preview: 'bg-green-600 text-white' },
  { key: 'red',    bg: 'bg-red-500',    preview: 'bg-red-600 text-white' },
]

const HEADER_PREVIEW: Record<string, string> = {
  gray:'bg-gray-100 text-gray-900', blue:'bg-blue-600 text-white',
  amber:'bg-amber-500 text-white', purple:'bg-purple-700 text-white',
  green:'bg-green-600 text-white', red:'bg-red-600 text-white',
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{children}</label>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>
}
function Inp({ value, onChange, placeholder, type = 'text' }: { value: string|number; onChange: (v:string)=>void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white transition-all" />
  )
}

export default function PlansEditorPage() {
  const { language } = useLanguage()
  const l = language === 'he'
  const [config, setConfig] = useState<PricingConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    fetch('/api/admin/pricing-config').then(r=>r.json()).then(setConfig)
      .catch(()=>toast.error(l?'שגיאה בטעינה':'Ошибка загрузки'))
  }, [])

  const updatePlan = (idx: number, field: keyof LandingPlan, value: any) => {
    if (!config) return
    const plans = [...config.landing_plans]
    plans[idx] = { ...plans[idx], [field]: value }
    setConfig({ ...config, landing_plans: plans })
  }

  const updateFeatures = (idx: number, lang: 'he'|'ru', text: string) => {
    const arr = text.split('\n').map(s=>s.trim()).filter(Boolean)
    updatePlan(idx, lang==='he'?'features_he':'features_ru', arr)
  }

  const addPlan = () => {
    if (!config) return
    const p: LandingPlan = {
      key:`plan_${Date.now()}`, name_he:'תוכנית חדשה', name_ru:'Новый план',
      subtitle_he:'', subtitle_ru:'', price_he:'₪0', price_ru:'₪0',
      period_he:'/חודש', period_ru:'/мес', badge_he:'', badge_ru:'',
      color:'blue', features_he:[], features_ru:[], cta_he:'בחרו', cta_ru:'Выбрать', is_active:true,
    }
    setConfig({ ...config, landing_plans: [...config.landing_plans, p] })
  }

  const removePlan = (idx: number) => {
    if (!config) return
    setConfig({ ...config, landing_plans: config.landing_plans.filter((_,i)=>i!==idx) })
  }

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/pricing-config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error()
      toast.success(l?'✓ נשמר':'✓ Сохранено')
      setSavedFlash(true); setTimeout(()=>setSavedFlash(false), 1500)
    } catch { toast.error(l?'שגיאה':'Ошибка') }
    finally { setSaving(false) }
  }

  if (!config) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Package className="w-7 h-7 text-purple-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{l?'עורך כרטיסי תוכניות':'Редактор карточек планов'}</h1>
          <p className="text-sm text-slate-500">{l?'ניהול כרטיסי תמחור בלנדינג':'Управление тарифными карточками на лендинге'}</p>
        </div>
      </div>

      {/* Plan count + add */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{l?`${config.landing_plans.length} תוכניות`:`${config.landing_plans.length} планов`}</span>
        <button onClick={addPlan}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-all hover:scale-[1.02] active:scale-[0.98]">
          <Plus size={16}/>{l?'הוסף תוכנית':'Добавить план'}
        </button>
      </div>

      {/* Plan cards grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {config.landing_plans.map((plan, idx) => (
          <div key={plan.key}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:scale-[1.002] transition-all duration-200 overflow-hidden">

            {/* Card header preview */}
            <div className={`px-5 py-3 flex items-center justify-between ${HEADER_PREVIEW[plan.color]??'bg-gray-100 text-gray-900'}`}>
              <div className="flex items-center gap-2">
                <GripVertical size={16} className="opacity-40 cursor-grab" />
                <span className="font-bold">{l?(plan.name_he||'חדש'):(plan.name_ru||'Новый')}</span>
                {(l?plan.badge_he:plan.badge_ru) && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    {l?plan.badge_he:plan.badge_ru}
                  </span>
                )}
                <span className="text-sm opacity-80 font-bold ms-2">{l?plan.price_he:plan.price_ru}</span>
              </div>
              <div className="flex items-center gap-3">
                <div onClick={()=>updatePlan(idx,'is_active',!plan.is_active)}
                  className={`relative w-8 h-4 rounded-full cursor-pointer transition-colors ${plan.is_active?'bg-green-400':'bg-white/30'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${plan.is_active?'left-4':'left-0.5'}`}/>
                </div>
                <span className="text-xs opacity-70">{plan.is_active?(l?'פעיל':'Вкл'):(l?'כבוי':'Выкл')}</span>
                <button onClick={()=>removePlan(idx)} className="opacity-50 hover:opacity-100 hover:text-red-300 transition-opacity ml-2">
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>

            {/* Card body */}
            <div className="p-5 space-y-4">
              {/* Color */}
              <div className="flex items-center gap-3">
                <Label>{l?'צבע':'Цвет'}</Label>
                <div className="flex gap-1.5 ms-2">
                  {COLORS.map(c=>(
                    <button key={c.key} onClick={()=>updatePlan(idx,'color',c.key)}
                      className={`w-5 h-5 rounded-full ${c.bg} transition-transform hover:scale-110 ${plan.color===c.key?'ring-2 ring-offset-1 ring-slate-400 scale-110':''}`}/>
                  ))}
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-2 gap-3">
                <Field label={l?'שם עברית':'Назв. (ивр.)'}><Inp value={plan.name_he} onChange={v=>updatePlan(idx,'name_he',v)}/></Field>
                <Field label={l?'שם רוסית':'Назв. (рус.)'}><Inp value={plan.name_ru} onChange={v=>updatePlan(idx,'name_ru',v)}/></Field>
                <Field label={l?'כותרת משנה עב':'Подзаг. (ивр.)'}><Inp value={plan.subtitle_he} onChange={v=>updatePlan(idx,'subtitle_he',v)}/></Field>
                <Field label={l?'כותרת משנה רו':'Подзаг. (рус.)'}><Inp value={plan.subtitle_ru} onChange={v=>updatePlan(idx,'subtitle_ru',v)}/></Field>
              </div>

              {/* Price + period */}
              <div className="grid grid-cols-4 gap-2">
                <Field label={l?'מחיר עב':'Цена (ивр.)'}><Inp value={plan.price_he} onChange={v=>updatePlan(idx,'price_he',v)} placeholder="₪249"/></Field>
                <Field label={l?'תקופה עב':'Период (ивр.)'}><Inp value={plan.period_he} onChange={v=>updatePlan(idx,'period_he',v)} placeholder="/חודש"/></Field>
                <Field label={l?'מחיר רו':'Цена (рус.)'}><Inp value={plan.price_ru} onChange={v=>updatePlan(idx,'price_ru',v)} placeholder="₪249"/></Field>
                <Field label={l?'תקופה רו':'Период (рус.)'}><Inp value={plan.period_ru} onChange={v=>updatePlan(idx,'period_ru',v)} placeholder="/мес"/></Field>
              </div>

              {/* Badge + CTA */}
              <div className="grid grid-cols-2 gap-3">
                <Field label={l?'תג עב':'Бейдж (ивр.)'}><Inp value={plan.badge_he} onChange={v=>updatePlan(idx,'badge_he',v)} placeholder={l?'מומלץ':'...'}/></Field>
                <Field label={l?'תג רו':'Бейдж (рус.)'}><Inp value={plan.badge_ru} onChange={v=>updatePlan(idx,'badge_ru',v)} placeholder="Рекомендован"/></Field>
                <Field label="CTA (ивр.)"><Inp value={plan.cta_he} onChange={v=>updatePlan(idx,'cta_he',v)}/></Field>
                <Field label="CTA (рус.)"><Inp value={plan.cta_ru} onChange={v=>updatePlan(idx,'cta_ru',v)}/></Field>
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 gap-3">
                <Field label={l?'יתרונות עב (שורה=יתרון)':'Фичи иврит (строка=фича)'}>
                  <textarea value={plan.features_he.join('\n')} onChange={e=>updateFeatures(idx,'he',e.target.value)}
                    rows={4} dir="rtl"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none"/>
                </Field>
                <Field label={l?'יתרונות רו':'Фичи русский'}>
                  <textarea value={plan.features_ru.join('\n')} onChange={e=>updateFeatures(idx,'ru',e.target.value)}
                    rows={4} dir="ltr"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none"/>
                </Field>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add plan button */}
      <button onClick={addPlan}
        className="flex items-center gap-2 px-5 py-3 border-2 border-dashed border-slate-300 text-slate-500 rounded-2xl hover:border-amber-400 hover:text-amber-600 transition-all hover:scale-[1.01] w-full justify-center text-sm font-semibold">
        <Plus size={16}/>{l?'הוסף כרטיס':'Добавить карточку'}
      </button>

      {/* Sticky save */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-6 py-4 bg-white/90 backdrop-blur border-t border-slate-200 flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md ${savedFlash?'bg-green-500 text-white':'bg-amber-500 hover:bg-amber-600 text-white'}`}>
          {saving?<Loader2 size={16} className="animate-spin"/>:savedFlash?<Check size={16}/>:<Save size={16}/>}
          {saving?(l?'שומר...':'Сохраняю...'):savedFlash?(l?'נשמר!':'Сохранено!'):(l?'שמור שינויים':'Сохранить изменения')}
        </button>
      </div>
    </div>
  )
}

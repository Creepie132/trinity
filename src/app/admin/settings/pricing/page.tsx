'use client'

import { useState, useEffect } from 'react'
import { Sliders, Save, Loader2, Check, ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import Link from 'next/link'

interface PricingConfig {
  landing_plans: any[]
  demo_setup_base: number
  demo_module_price: number
  demo_discount_threshold: number
  demo_discount_pct: number
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{children}</label>
}

export default function AdminPricingPage() {
  const { language } = useLanguage()
  const l = language === 'he'
  const [config, setConfig] = useState<PricingConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    fetch('/api/admin/pricing-config').then(r=>r.json()).then(setConfig)
      .catch(()=>toast.error(l?'שגיאה בטעינה':'Ошибка загрузки'))
  }, [])

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

  const prev_monthly_base = 3 * config.demo_module_price
  const prev_setup_base   = config.demo_setup_base
  const prev_monthly_disc = config.demo_discount_threshold * config.demo_module_price
  const prev_setup_disc   = Math.round(config.demo_setup_base * (1 - config.demo_discount_pct / 100))

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/admin/settings" className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <Sliders className="w-7 h-7 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{l?'פרמטרי תמחור דמו':'Параметры ценообразования демо'}</h1>
          <p className="text-sm text-slate-500">{l?'הגדרת מחירי המודולים וההנחות':'Настройка цен модулей и скидок'}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label>{l?'בסיס דמי הגדרה':'База стоимости настройки'}</Label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">₪</span>
              <input type="number" min={0} value={config.demo_setup_base}
                onChange={e=>setConfig({...config, demo_setup_base: Number(e.target.value)})}
                className="flex-1 px-3 py-3 text-xl font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <p className="text-xs text-slate-400">{l?'תשלום חד פעמי לפני הנחה':'Единоразовая оплата до скидки'}</p>
          </div>

          <div className="space-y-1.5">
            <Label>{l?'מחיר מודול לחודש':'Цена модуля в месяц'}</Label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">₪</span>
              <input type="number" min={0} value={config.demo_module_price}
                onChange={e=>setConfig({...config, demo_module_price: Number(e.target.value)})}
                className="flex-1 px-3 py-3 text-xl font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <p className="text-xs text-slate-400">{l?'לכל מודול שנבחר':'За каждый выбранный модуль'}</p>
          </div>

          <div className="space-y-1.5">
            <Label>{l?'סף הנחה (מספר מודולים)':'Порог скидки (кол-во модулей)'}</Label>
            <div className="flex items-center gap-2">
              <input type="number" min={1} value={config.demo_discount_threshold}
                onChange={e=>setConfig({...config, demo_discount_threshold: Number(e.target.value)})}
                className="flex-1 px-3 py-3 text-xl font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <span className="text-slate-500 font-bold text-sm">{l?'מודולים+':'мод.+'}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{l?'אחוז הנחה':'Процент скидки'}</Label>
            <div className="flex items-center gap-2">
              <input type="number" min={0} max={100} value={config.demo_discount_pct}
                onChange={e=>setConfig({...config, demo_discount_pct: Number(e.target.value)})}
                className="flex-1 px-3 py-3 text-xl font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <span className="text-slate-500 font-bold">%</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-2xl p-5 text-white space-y-3">
          <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">{l?'תצוגה מקדימה':'Предпросмотр'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-3 space-y-1">
              <p className="text-xs text-white/60">{l?'3 מודולים (ללא הנחה)':'3 модуля (без скидки)'}</p>
              <p className="text-lg font-bold">₪{prev_monthly_base}<span className="text-white/60 font-normal text-sm">{l?'/חודש':'/мес'}</span></p>
              <p className="text-sm text-white/80">{l?`הגדרה: ₪${prev_setup_base}`:`Настройка: ₪${prev_setup_base}`}</p>
            </div>
            <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl p-3 space-y-1">
              <p className="text-xs text-amber-300">{l?`${config.demo_discount_threshold}+ מודולים 🎉`:`${config.demo_discount_threshold}+ модулей 🎉`}</p>
              <p className="text-lg font-bold">₪{prev_monthly_disc}<span className="text-white/60 font-normal text-sm">{l?'/חודש':'/мес'}</span></p>
              <p className="text-sm">
                <span className="line-through text-white/40">₪{prev_setup_base}</span>
                {' '}<span className="text-amber-300 font-bold">₪{prev_setup_disc}</span>
                {' '}<span className="text-xs text-amber-400">(-{config.demo_discount_pct}%)</span>
              </p>
            </div>
          </div>
        </div>
      </div>

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

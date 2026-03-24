'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { ArrowLeft, Map, Settings, ChevronLeft } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Courier {
  id: number
  name: string
  initials: string
  status: 'active' | 'idle' | 'break'
  orders: number
  avgTime: number
  earn: number
  rate: number
  history: number[]
  order: { from: string; to: string; min: number } | null
}

// ─── Initial data ─────────────────────────────────────────────────────────────
const INITIAL_COURIERS: Courier[] = [
  { id: 1, name: 'דניאל כהן',  initials: 'דכ', status: 'active', orders: 14, avgTime: 18, earn: 280, rate: 20,
    history: [16, 19, 14, 22, 18, 17, 20], order: { from: 'הרצל 22', to: 'בן גוריון 45', min: 14 } },
  { id: 2, name: 'יוסי לוי',   initials: 'יל', status: 'active', orders: 11, avgTime: 22, earn: 220, rate: 20,
    history: [24, 21, 19, 25, 20, 23, 22], order: { from: 'רוטשילד 8', to: 'ז\'בוטינסקי 15', min: 8 } },
  { id: 3, name: 'אמיר ברק',   initials: 'אב', status: 'active', orders: 9,  avgTime: 20, earn: 180, rate: 20,
    history: [18, 22, 20, 19, 21, 23, 20], order: { from: 'ויצמן 3', to: 'הנשיא 30', min: 5 } },
  { id: 4, name: 'מיכאל גל',  initials: 'מג', status: 'break',  orders: 7,  avgTime: 25, earn: 140, rate: 20,
    history: [28, 25, 23, 26, 24, 27, 25], order: null },
]

const STATUS_COLOR: Record<string, string> = {
  active: '#10b981', idle: '#3b82f6', break: '#f59e0b',
}
const STATUS_BG: Record<string, string> = {
  active: '#d1fae5', idle: '#dbeafe', break: '#fef3c7',
}
const STATUS_TC: Record<string, string> = {
  active: '#065f46', idle: '#1e40af', break: '#78350f',
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1
  const W = 80, H = 28
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((v - min) / range) * H * 0.8 - H * 0.1
    return `${x},${y}`
  }).join(' ')
  const last = data[data.length - 1]
  const lx = W, ly = H - ((last - min) / range) * H * 0.8 - H * 0.1
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <circle cx={lx} cy={ly} r="3" fill={color} />
    </svg>
  )
}

// ─── Settings modal ───────────────────────────────────────────────────────────
function SettingsModal({ couriers, onSave, onClose }: {
  couriers: Courier[]; onSave: (rates: Record<number, number>) => void; onClose: () => void
}) {
  const [vals, setVals] = useState<Record<number, number>>(
    Object.fromEntries(couriers.map(c => [c.id, c.rate]))
  )
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">⚙️ הגדרות שכר</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <p className="text-xs text-gray-500 mb-4">קבע תעריף לכל קורייר (₪ להזמנה)</p>
        <div className="space-y-3">
          {couriers.map(c => (
            <div key={c.id} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{c.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">₪</span>
                <input type="number" value={vals[c.id] ?? 20}
                  onChange={e => setVals(v => ({ ...v, [c.id]: Number(e.target.value) }))}
                  className="w-16 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-center font-bold text-sm bg-white dark:bg-slate-700 dark:text-white"
                />
                <span className="text-gray-400 text-xs">/ הזמנה</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => { onSave(vals); onClose() }}
          className="mt-5 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl py-2.5 font-bold text-sm hover:opacity-90 transition-opacity">
          שמור הגדרות
        </button>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function CourierDemoPage() {
  const { language } = useLanguage()
  const [couriers, setCouriers] = useState<Courier[]>(INITIAL_COURIERS)
  const [showSettings, setShowSettings] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const tickRef = useRef(0)

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current++
      setCouriers(prev => prev.map(c => {
        if (c.status !== 'active') return c
        const newMin = c.order ? (c.order.min % 34) + 1 : null
        return {
          ...c,
          order: c.order && newMin ? { ...c.order, min: newMin } : c.order,
          history: tickRef.current % 8 === 0
            ? [...c.history.slice(1), Math.round(c.avgTime + (Math.random() - 0.5) * 6)]
            : c.history,
          orders: tickRef.current % 12 === 0 ? c.orders + 1 : c.orders,
          earn: tickRef.current % 12 === 0 ? c.earn + c.rate : c.earn,
        }
      }))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleSaveRates = (rates: Record<number, number>) => {
    setCouriers(prev => prev.map(c => ({ ...c, rate: rates[c.id] ?? c.rate })))
  }

  const totalOrders = couriers.reduce((s, c) => s + c.orders, 0)
  const totalEarn   = couriers.reduce((s, c) => s + c.earn, 0)
  const avgTime     = Math.round(couriers.reduce((s, c) => s + c.avgTime, 0) / couriers.length)
  const activeCount = couriers.filter(c => c.status === 'active').length

  const STATUS_LABEL: Record<string, string> = {
    active: 'בדרך 🛵', idle: 'פנוי', break: 'הפסקה ☕',
  }

  return (
    <div className="space-y-5 pb-8" dir="rtl">
      {showSettings && (
        <SettingsModal couriers={couriers} onSave={handleSaveRates} onClose={() => setShowSettings(false)} />
      )}

      {/* ── Header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin/presentations"
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <ChevronLeft className="w-4 h-4 rotate-180" />
          מצגות
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">מערכת קורירים</span>
        <div className="mr-auto flex gap-2">
          <Link href="/admin/presentations/courier/map"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors shadow-md shadow-emerald-500/20">
            <Map className="w-4 h-4" />
            מפה חיה
          </Link>
          <button onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            <Settings className="w-4 h-4" />
            הגדרות שכר
          </button>
        </div>
      </div>

      {/* ── Demo badge ── */}
      <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5">
        <span className="text-amber-600 text-sm font-medium">🎯 מצב דמו — הנתונים מדומים לצורך הצגה ללקוח</span>
        <span className="mr-auto flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
          עדכון חי
        </span>
      </div>

      {/* ── KPI Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'פעילים', value: `${activeCount}/${couriers.length}`, icon: '🛵', color: 'from-emerald-500 to-teal-600' },
          { label: 'הזמנות היום', value: String(totalOrders), icon: '📦', color: 'from-blue-500 to-indigo-600' },
          { label: 'זמן ממוצע', value: `${avgTime} דק\'`, icon: '⏱', color: 'from-amber-500 to-orange-500' },
          { label: 'שכר לשלם', value: `₪${totalEarn}`, icon: '💰', color: 'from-violet-500 to-purple-600' },
        ].map((s, i) => (
          <div key={i} className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${s.color} text-white shadow-lg`}>
            <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/10 blur-xl" />
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-white/70 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Courier Cards ── */}
      <div className="space-y-3">
        {couriers.map(c => {
          const isSelected = selected === c.id
          return (
            <div key={c.id}
              onClick={() => setSelected(isSelected ? null : c.id)}
              className={`rounded-2xl border-2 bg-white dark:bg-slate-800 p-4 cursor-pointer transition-all duration-200
                ${isSelected
                  ? 'border-blue-400 shadow-lg shadow-blue-100 dark:shadow-blue-900/20'
                  : 'border-transparent shadow-sm hover:border-gray-200 dark:hover:border-slate-600'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: `linear-gradient(135deg, #1e3a8a, ${STATUS_COLOR[c.status]})` }}>
                      {c.initials}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800"
                      style={{ background: STATUS_COLOR[c.status] }} />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">{c.name}</div>
                    <div className="text-xs font-medium mt-0.5" style={{ color: STATUS_COLOR[c.status] }}>
                      {STATUS_LABEL[c.status]}
                    </div>
                  </div>
                </div>
                <Sparkline data={c.history} color={STATUS_COLOR[c.status]} />
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { label: 'הזמנות', value: String(c.orders) },
                  { label: 'זמן ממוצע', value: `${c.avgTime}\'` },
                  { label: 'שכר היום', value: `₪${c.earn}`, green: true },
                ].map((m, i) => (
                  <div key={i} className={`rounded-xl p-2.5 text-center ${m.green ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-gray-50 dark:bg-slate-700/50'}`}>
                    <div className={`font-bold text-lg ${m.green ? 'text-emerald-600' : 'text-gray-900 dark:text-gray-100'}`}>{m.value}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>

              {c.order && (
                <div className="mt-3 bg-blue-50 dark:bg-blue-950/30 border-r-4 border-blue-400 rounded-xl p-3">
                  <div className="text-xs font-bold text-blue-600 mb-1">הזמנה פעילה</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{c.order.from} ← {c.order.to}</div>
                  <div className="text-sm font-bold text-red-500 mt-1">⏱ {c.order.min} דקות בדרך</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Salary Summary ── */}
      <div className="rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">סיכום שכר יומי</h3>
        <div className="space-y-2">
          {couriers.map(c => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-slate-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">{c.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{c.orders} הזמנות × ₪{c.rate}</span>
                <span className="font-bold text-emerald-600">₪{c.earn}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center pt-3 mt-1 border-t-2 border-slate-800 dark:border-white">
          <span className="font-bold text-gray-900 dark:text-gray-100">סה&quot;כ לשלם</span>
          <span className="text-xl font-bold text-indigo-600">₪{totalEarn}</span>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { Map, Settings, ChevronLeft, Trophy, CreditCard, X } from 'lucide-react'

interface Courier {
  id: number; name: string; initials: string
  status: 'active' | 'idle' | 'break'
  orders: number; avgTime: number; earn: number; rate: number
  history: number[]
  order: { from: string; to: string; startedAt: number } | null
}

const INITIAL_COURIERS: Courier[] = [
  { id: 1, name: 'דניאל כהן', initials: 'דכ', status: 'active', orders: 14, avgTime: 18, earn: 280, rate: 20,
    history: [16, 19, 14, 22, 18, 17, 20], order: { from: 'הרצל 22', to: 'בן גוריון 45', startedAt: Date.now() - 14 * 60000 } },
  { id: 2, name: 'יוסי לוי', initials: 'יל', status: 'active', orders: 11, avgTime: 22, earn: 220, rate: 20,
    history: [24, 21, 19, 25, 20, 23, 22], order: { from: 'רוטשילד 8', to: "ז'בוטינסקי 15", startedAt: Date.now() - 8 * 60000 } },
  { id: 3, name: 'אמיר ברק', initials: 'אב', status: 'active', orders: 9, avgTime: 20, earn: 180, rate: 20,
    history: [18, 22, 20, 19, 21, 23, 20], order: { from: 'ויצמן 3', to: 'הנשיא 30', startedAt: Date.now() - 5 * 60000 } },
  { id: 4, name: 'מיכאל גל', initials: 'מג', status: 'break', orders: 7, avgTime: 25, earn: 140, rate: 20,
    history: [28, 25, 23, 26, 24, 27, 25], order: null },
]

const DAILY_GOAL = 20
const STATUS_COLOR: Record<string, string> = { active: '#10b981', idle: '#3b82f6', break: '#f59e0b' }
const STATUS_LABEL: Record<string, string> = { active: 'בדרך 🛵', idle: 'פנוי', break: 'הפסקה ☕' }

// ─── Animated counter ─────────────────────────────────────────────────────────
function CountUp({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    const start = prev.current, end = value, dur = 600, t0 = performance.now()
    prev.current = value
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(start + (end - start) * ease))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value])
  return <>{prefix}{display}{suffix}</>
}

// ─── Live timer ───────────────────────────────────────────────────────────────
function LiveTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - startedAt) / 1000))
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => clearInterval(id)
  }, [startedAt])
  const m = Math.floor(elapsed / 60), s = elapsed % 60
  const isLong = m >= 25
  return (
    <span className={`font-bold tabular-nums transition-colors ${isLong ? 'text-red-500' : 'text-blue-600'}`}>
      {m}:{s.toString().padStart(2, '0')}
    </span>
  )
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1
  const W = 72, H = 24
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((v - min) / range) * H * 0.8 - H * 0.1
    return `${x},${y}`
  }).join(' ')
  const last = data[data.length - 1]
  const lx = W, ly = H - ((last - min) / range) * H * 0.8 - H * 0.1
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#grad-${color.replace('#','')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={lx} cy={ly} r="3.5" fill={color} stroke="white" strokeWidth="1.5"/>
    </svg>
  )
}

// ─── Payment modal ────────────────────────────────────────────────────────────
function PaymentModal({ courier, onClose }: { courier: Courier; onClose: () => void }) {
  const [done, setDone] = useState(false)
  const amount = courier.earn
  if (done) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 text-center shadow-2xl animate-bounce-in max-w-xs w-full mx-4">
        <div className="text-6xl mb-3">✅</div>
        <div className="text-xl font-black text-gray-900">תשלום התקבל!</div>
        <div className="text-gray-500 mt-1 text-sm">₪{amount} שולם ל{courier.name}</div>
        <button onClick={onClose} className="mt-5 w-full bg-emerald-600 text-white rounded-2xl py-3 font-bold hover:bg-emerald-700 transition-colors">סגור</button>
      </div>
    </div>
  )
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm"
              style={{ background: `linear-gradient(135deg, #1e3a8a, ${STATUS_COLOR[courier.status]})` }}>
              {courier.initials}
            </div>
            <div>
              <div className="font-bold text-gray-900 dark:text-gray-100">{courier.name}</div>
              <div className="text-xs text-gray-400">{courier.orders} הזמנות היום</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5"/></button>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white mb-5">
          <div className="text-xs text-slate-400 mb-1">כרטיס אשראי</div>
          <div className="font-mono tracking-widest text-sm">4532 •••• •••• 7821</div>
          <div className="mt-4 text-3xl font-black">₪{amount}</div>
          <div className="text-xs text-slate-400 mt-1">שכר יומי — {courier.orders} × ₪{courier.rate}</div>
        </div>
        <button onClick={() => setDone(true)}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl py-3.5 font-black text-base hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-emerald-200">
          💳 גבה תשלום
        </button>
      </div>
    </div>
  )
}

// ─── Settings modal ───────────────────────────────────────────────────────────
function SettingsModal({ couriers, onSave, onClose }: {
  couriers: Courier[]; onSave: (r: Record<number, number>) => void; onClose: () => void
}) {
  const [vals, setVals] = useState<Record<number, number>>(Object.fromEntries(couriers.map(c => [c.id, c.rate])))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">⚙️ הגדרות שכר</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
        </div>
        <div className="space-y-3 mb-5">
          {couriers.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: STATUS_COLOR[c.status] }}>{c.initials}</div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{c.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 text-sm font-bold">₪</span>
                <input type="number" value={vals[c.id] ?? 20} onChange={e => setVals(v => ({ ...v, [c.id]: Number(e.target.value) }))}
                  className="w-16 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-center font-bold text-sm bg-white dark:bg-slate-600 dark:text-white"/>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => { onSave(vals); onClose() }}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl py-2.5 font-bold text-sm hover:opacity-90 transition-opacity">
          שמור הגדרות
        </button>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CourierDemoPage() {
  const { language } = useLanguage()
  const [couriers, setCouriers] = useState<Courier[]>(INITIAL_COURIERS)
  const [showSettings, setShowSettings] = useState(false)
  const [payFor, setPayFor] = useState<Courier | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const tickRef = useRef(0)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current++
      setCouriers(prev => prev.map(c => {
        if (c.status !== 'active') return c
        return {
          ...c,
          history: tickRef.current % 8 === 0
            ? [...c.history.slice(1), Math.round(c.avgTime + (Math.random() - 0.5) * 6)]
            : c.history,
          orders: tickRef.current % 15 === 0 ? c.orders + 1 : c.orders,
          earn: tickRef.current % 15 === 0 ? c.earn + c.rate : c.earn,
          order: c.order ? {
            ...c.order,
            startedAt: tickRef.current % 20 === 0 ? Date.now() : c.order.startedAt,
          } : null,
        }
      }))
    }, 2000)
    return () => clearInterval(id)
  }, [])

  const handleSaveRates = useCallback((rates: Record<number, number>) => {
    setCouriers(prev => prev.map(c => ({ ...c, rate: rates[c.id] ?? c.rate })))
  }, [])

  const totalOrders = couriers.reduce((s, c) => s + c.orders, 0)
  const totalEarn = couriers.reduce((s, c) => s + c.earn, 0)
  const avgTime = Math.round(couriers.reduce((s, c) => s + c.avgTime, 0) / couriers.length)
  const activeCount = couriers.filter(c => c.status === 'active').length
  const topCourier = [...couriers].sort((a, b) => b.orders - a.orders)[0]
  const goalPct = Math.min(100, Math.round((totalOrders / (DAILY_GOAL * couriers.length)) * 100))

  return (
    <div className="space-y-4 pb-8" dir="rtl">
      {showSettings && <SettingsModal couriers={couriers} onSave={handleSaveRates} onClose={() => setShowSettings(false)} />}
      {payFor && <PaymentModal courier={payFor} onClose={() => setPayFor(null)} />}

      {/* ── Breadcrumb + actions ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin/presentations" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft className="w-4 h-4 rotate-180"/>מצגות
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">מערכת קורירים</span>
        <div className="mr-auto flex gap-2">
          <Link href="/admin/presentations/courier/map"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all shadow-md shadow-emerald-500/20 hover:shadow-lg hover:-translate-y-0.5">
            <Map className="w-4 h-4"/>מפה חיה
          </Link>
          <button onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 hover:-translate-y-0.5 transition-all">
            <Settings className="w-4 h-4"/>הגדרות שכר
          </button>
        </div>
      </div>

      {/* ── Demo banner ── */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3">
        <span className="text-lg">🎯</span>
        <span className="text-amber-700 dark:text-amber-400 text-sm font-medium">מצב דמו — הנתונים מדומים לצורך הצגה ללקוח</span>
        <div className="mr-auto flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"/>עדכון חי
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'פעילים', value: activeCount, suffix: `/${couriers.length}`, icon: '🛵', from: 'from-emerald-500', to: 'to-teal-600', shadow: 'shadow-emerald-200' },
          { label: 'הזמנות היום', value: totalOrders, icon: '📦', from: 'from-blue-500', to: 'to-indigo-600', shadow: 'shadow-blue-200' },
          { label: 'זמן ממוצע', value: avgTime, suffix: " דק'", icon: '⏱', from: 'from-amber-500', to: 'to-orange-500', shadow: 'shadow-amber-200' },
          { label: 'שכר לשלם', value: totalEarn, prefix: '₪', icon: '💰', from: 'from-violet-500', to: 'to-purple-600', shadow: 'shadow-violet-200' },
        ].map((s, i) => (
          <div key={i}
            className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${s.from} ${s.to} text-white shadow-lg ${s.shadow} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
            style={{ animationDelay: `${i * 80}ms`, opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(12px)', transition: 'opacity 0.4s, transform 0.4s' }}>
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 blur-2xl"/>
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-2xl font-black tabular-nums">
              <CountUp value={s.value} prefix={s.prefix} suffix={s.suffix}/>
            </div>
            <div className="text-xs text-white/70 mt-0.5 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Goal progress + Top courier ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Daily goal */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">יעד יומי — {DAILY_GOAL * couriers.length} הזמנות</span>
            <span className="text-sm font-black text-indigo-600">{goalPct}%</span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
              style={{ width: `${goalPct}%` }}/>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{totalOrders} הושלמו</span>
            <span>{Math.max(0, DAILY_GOAL * couriers.length - totalOrders)} נותרו</span>
          </div>
        </div>
        {/* Top courier */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-amber-500"/>
            <span className="text-sm font-bold text-amber-800 dark:text-amber-300">קורייר מוביל היום</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm"
              style={{ background: `linear-gradient(135deg, #1e3a8a, ${STATUS_COLOR[topCourier.status]})` }}>
              {topCourier.initials}
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-900 dark:text-gray-100">{topCourier.name}</div>
              <div className="text-xs text-amber-700 dark:text-amber-400">{topCourier.orders} הזמנות · ₪{topCourier.earn}</div>
            </div>
            <div className="text-2xl">🥇</div>
          </div>
        </div>
      </div>

      {/* ── Courier cards ── */}
      <div className="space-y-3">
        {couriers.map((c, idx) => {
          const isOpen = expanded === c.id
          return (
            <div key={c.id}
              className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-all duration-300 hover:shadow-md"
              style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(16px)', transition: `opacity 0.5s ${idx * 80}ms, transform 0.5s ${idx * 80}ms, box-shadow 0.2s` }}>

              {/* Card header — always visible */}
              <div className="p-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : c.id)}>
                <div className="flex items-center gap-3">
                  {/* Avatar with status ring */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-md"
                      style={{ background: `linear-gradient(135deg, #1e3a8a, ${STATUS_COLOR[c.status]})` }}>
                      {c.initials}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${c.status === 'active' ? 'animate-pulse' : ''}`}
                      style={{ background: STATUS_COLOR[c.status] }}/>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 dark:text-gray-100 text-base">{c.name}</div>
                    <div className="text-xs font-semibold mt-0.5" style={{ color: STATUS_COLOR[c.status] }}>
                      {STATUS_LABEL[c.status]}
                    </div>
                  </div>

                  <Sparkline data={c.history} color={STATUS_COLOR[c.status]}/>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-gray-50 dark:bg-slate-700/60 rounded-xl p-2.5 text-center">
                    <div className="font-black text-xl text-gray-900 dark:text-gray-100 tabular-nums">{c.orders}</div>
                    <div className="text-xs text-gray-400 mt-0.5">הזמנות</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700/60 rounded-xl p-2.5 text-center">
                    <div className="font-black text-xl text-gray-900 dark:text-gray-100">{c.avgTime}'</div>
                    <div className="text-xs text-gray-400 mt-0.5">זמן ממוצע</div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-2.5 text-center">
                    <div className="font-black text-xl text-emerald-600 tabular-nums">₪{c.earn}</div>
                    <div className="text-xs text-gray-400 mt-0.5">שכר היום</div>
                  </div>
                </div>
              </div>

              {/* Expanded section — active order + pay button */}
              {isOpen && (
                <div className="border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/30 p-4 space-y-3">
                  {c.order ? (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-400">📦 הזמנה פעילה</span>
                        <LiveTimer startedAt={c.order.startedAt}/>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {c.order.from} <span className="text-blue-400 mx-1">←</span> {c.order.to}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-gray-400 py-2">אין הזמנה פעילה כרגע</div>
                  )}
                  <button
                    onClick={() => setPayFor(c)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-md shadow-emerald-200/60">
                    <CreditCard className="w-4 h-4"/>קבל תשלום ₪{c.earn}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Salary summary ── */}
      <div className="rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <span className="text-lg">💸</span>סיכום שכר יומי
        </h3>
        <div className="space-y-2">
          {couriers.map(c => (
            <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-slate-700 last:border-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: STATUS_COLOR[c.status] }}>{c.initials}</div>
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{c.name}</span>
              <span className="text-xs text-gray-400">{c.orders} × ₪{c.rate}</span>
              <span className="font-black text-emerald-600 tabular-nums">₪{c.earn}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center pt-4 mt-2 border-t-2 border-gray-900 dark:border-gray-200">
          <span className="font-black text-gray-900 dark:text-gray-100">סה&quot;כ לשלם</span>
          <span className="text-2xl font-black text-indigo-600 tabular-nums">
            <CountUp value={totalEarn} prefix="₪"/>
          </span>
        </div>
      </div>
    </div>
  )
}

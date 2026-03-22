'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  FunnelChart, Funnel, LabelList, Cell,
} from 'recharts'

// ── Types ────────────────────────────────────────────────────────────────────
interface KPI {
  totalRevenue: number; totalCommission: number; netProfit: number
  conversionRate: number; totalDeals: number; wonDeals: number
}
interface FunnelStage {
  id: string; name: string; name_he: string; color: string
  position: number; is_won: boolean; is_lost: boolean; count: number
}
interface WorkerStat {
  user_id: string; email: string; active_deals: number
  won_deals: number; total_revenue: number; commission: number
  conversion: number; total_deals: number
}
interface Bottleneck {
  id: string; title: string; amount: number; stage_name: string
  days_stuck: number; assigned_to: string; worker_email: string
}
interface ActivityEntry {
  id: string; action: string; entity_type: string; entity_id: string
  user_email: string; old_data: any; new_data: any; created_at: string
}
interface StatsData {
  hasWorkers: boolean; period: string
  kpi: KPI; funnel: FunnelStage[]; workerStats: WorkerStat[]
  bottlenecks: Bottleneck[]; activityLog: ActivityEntry[]
}

type Period = 'today' | 'week' | 'month'

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
}
function initials(email: string) {
  return email.split('@')[0].slice(0, 2).toUpperCase()
}
const AV_COLORS = [
  'from-purple-400 to-indigo-500', 'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',  'from-pink-400 to-rose-500',
  'from-blue-400 to-cyan-500',
]
function avColor(s: string) { return AV_COLORS[s.charCodeAt(0) % AV_COLORS.length] }

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon }: {
  label: string; value: string; sub?: string; color: string; icon: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 bg-white/70 backdrop-blur-sm border border-white/60 shadow-lg hover:shadow-xl transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center text-white text-xl shadow-md`}>
          {icon}
        </div>
        <div className="w-16 h-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <svg viewBox="0 0 64 32" className="w-full h-full">
            <polyline points="0,28 16,18 32,22 48,10 64,4" fill="none" stroke="currentColor" strokeWidth="2.5"/>
          </svg>
        </div>
      </div>
      <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Period Tabs ───────────────────────────────────────────────────────────────
function PeriodTabs({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const tabs: { key: Period; label: string }[] = [
    { key: 'today', label: 'היום' },
    { key: 'week',  label: 'שבוע' },
    { key: 'month', label: 'חודש' },
  ]
  return (
    <div className="flex gap-1.5 p-1 rounded-xl bg-white/60 border border-white/50 backdrop-blur-sm w-fit">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            value === t.key
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/60'
          }`}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-base shadow-md">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

// ── Funnel Bar Chart ──────────────────────────────────────────────────────────
function FunnelViz({ data }: { data: FunnelStage[] }) {
  const active = data.filter(s => !s.is_lost)
  if (!active.length) return (
    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">אין נתונים</div>
  )
  const max = Math.max(...active.map(s => s.count), 1)
  return (
    <div className="space-y-2">
      {active.map(s => {
        const pct = Math.round((s.count / max) * 100)
        return (
          <div key={s.id} className="flex items-center gap-3 group">
            <div className="w-28 text-xs text-gray-600 font-medium text-end truncate shrink-0">
              {s.name_he || s.name}
            </div>
            <div className="flex-1 h-8 bg-gray-100 rounded-xl overflow-hidden relative">
              <div
                className="h-full rounded-xl flex items-center px-3 transition-all duration-500"
                style={{
                  width: `${Math.max(pct, 4)}%`,
                  backgroundColor: s.is_won ? '#10b981' : (s.color || '#6366f1'),
                }}
              >
                {pct > 20 && (
                  <span className="text-white text-xs font-bold">{s.count}</span>
                )}
              </div>
              {pct <= 20 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-600">{s.count}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OwnerOfficePage() {
  const { role } = useAuth()
  const router   = useRouter()
  const [period, setPeriod]   = useState<Period>('month')
  const [data,   setData]     = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'overview' | 'workers' | 'bottlenecks' | 'log'>('overview')

  // Access guard — owner only
  useEffect(() => {
    if (role && role !== 'owner') router.replace('/worker')
  }, [role, router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/owner/worker-stats?period=${period}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  if (role && role !== 'owner') return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/30 to-indigo-50/20 p-4 md:p-6" dir="rtl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">🏢 קבינט מנהל</h1>
          <p className="text-sm text-gray-500 mt-0.5">מעקב ביצועים ופיננסים — מבט מהמנהל</p>
        </div>
        <PeriodTabs value={period} onChange={setPeriod} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white/60 border border-white/50 backdrop-blur-sm mb-6 w-fit overflow-x-auto">
        {([
          { key: 'overview',    label: '📊 סקירה'    },
          { key: 'workers',     label: '👥 עובדים'   },
          { key: 'bottlenecks', label: '🔴 עצירות'   },
          { key: 'log',         label: '📋 יומן'     },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              tab === t.key
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-800 hover:bg-white/60'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-white/50 animate-pulse border border-white/60"/>
          ))}
        </div>
      )}

      {!loading && data && !data.hasWorkers && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="text-6xl">👤</div>
          <p className="text-xl font-bold text-gray-700">אין עובדים פעילים</p>
          <p className="text-sm text-gray-400">הוסף עובדים לארגון כדי לראות נתונים</p>
        </div>
      )}

      {!loading && data?.hasWorkers && (
        <>
          {/* ── TAB: Overview ─────────────────────────────────────────────── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard icon="💰" label="סה״כ הכנסות" color="bg-gradient-to-br from-emerald-500 to-teal-600"
                  value={fmt(data.kpi.totalRevenue)}
                  sub={`${data.kpi.wonDeals} עסקאות סגורות`}/>
                <KpiCard icon="🤝" label="עמלות לתשלום (30%)" color="bg-gradient-to-br from-amber-500 to-orange-600"
                  value={fmt(data.kpi.totalCommission)}
                  sub="מסך ה-Setup Fees"/>
                <KpiCard icon="📈" label="רווח נקי" color="bg-gradient-to-br from-indigo-500 to-purple-600"
                  value={fmt(data.kpi.netProfit)}
                  sub="אחרי עמלות"/>
                <KpiCard icon="🎯" label="יחס המרה" color="bg-gradient-to-br from-pink-500 to-rose-600"
                  value={`${data.kpi.conversionRate}%`}
                  sub={`מתוך ${data.kpi.totalDeals} עסקאות`}/>
              </div>

              {/* Funnel */}
              <div className="rounded-2xl p-5 bg-white/70 backdrop-blur-sm border border-white/60 shadow-lg">
                <SectionHeader icon="🔽" title="משפך מכירות" sub="התפלגות לפי שלב"/>
                <FunnelViz data={data.funnel}/>
              </div>

              {/* Bar chart — revenue per worker */}
              <div className="rounded-2xl p-5 bg-white/70 backdrop-blur-sm border border-white/60 shadow-lg">
                <SectionHeader icon="📊" title="הכנסות לפי עובד"/>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.workerStats} layout="vertical" margin={{ right: 20 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `₪${v.toLocaleString()}`}/>
                    <YAxis type="category" dataKey="email" tick={{ fontSize: 11 }} width={120}
                      tickFormatter={e => e.split('@')[0].slice(0, 14)}/>
                    <Tooltip formatter={(v: any) => fmt(v)} labelFormatter={l => l.split('@')[0]}/>
                    <Bar dataKey="total_revenue" fill="#6366f1" radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 11, formatter: (v: any) => v > 0 ? fmt(v) : '' }}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── TAB: Workers ──────────────────────────────────────────────── */}
          {tab === 'workers' && (
            <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 shadow-lg overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <SectionHeader icon="👥" title="לוח מוביל — עובדים" sub="ביצועים לפי תקופה"/>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 text-gray-500 text-xs font-semibold">
                      {['עובד','עסקאות פעילות','עסקאות שנסגרו','סה״כ הכנסות','עמלה','המרה'].map(h => (
                        <th key={h} className="px-4 py-3 text-end">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...data.workerStats].sort((a, b) => b.total_revenue - a.total_revenue).map((w, i) => (
                      <tr key={w.user_id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${avColor(w.email)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                              {initials(w.email)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{w.email.split('@')[0]}</p>
                              <p className="text-[10px] text-gray-400">{w.email}</p>
                            </div>
                            {i === 0 && <span className="text-base">🏆</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-end font-semibold text-indigo-600">{w.active_deals}</td>
                        <td className="px-4 py-3 text-end font-semibold text-emerald-600">{w.won_deals}</td>
                        <td className="px-4 py-3 text-end font-bold text-gray-900">{fmt(w.total_revenue)}</td>
                        <td className="px-4 py-3 text-end text-amber-600 font-semibold">{fmt(w.commission)}</td>
                        <td className="px-4 py-3 text-end">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            w.conversion >= 50 ? 'bg-emerald-100 text-emerald-700'
                            : w.conversion >= 25 ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-600'
                          }`}>{w.conversion}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TAB: Bottlenecks ──────────────────────────────────────────── */}
          {tab === 'bottlenecks' && (
            <div className="space-y-3">
              <div className="rounded-2xl p-5 bg-white/70 backdrop-blur-sm border border-white/60 shadow-lg">
                <SectionHeader icon="🚨" title="עסקאות תקועות" sub="לא עברו שלב מעל 3 ימים"/>
              </div>
              {data.bottlenecks.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 text-gray-400">
                  <span className="text-5xl">✅</span>
                  <p className="font-semibold">אין עסקאות תקועות!</p>
                </div>
              ) : data.bottlenecks.map(b => (
                <div key={b.id} className={`rounded-2xl p-4 border-2 bg-white/70 backdrop-blur-sm shadow-sm transition-all ${
                  b.days_stuck >= 7 ? 'border-red-300 bg-red-50/50' : 'border-amber-200 bg-amber-50/30'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{b.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{b.stage_name}</span>
                        <span className="text-xs text-gray-500">{b.worker_email.split('@')[0]}</span>
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <p className={`text-lg font-black ${b.days_stuck >= 7 ? 'text-red-600' : 'text-amber-600'}`}>
                        {b.days_stuck} ימים
                      </p>
                      {b.amount > 0 && <p className="text-xs text-gray-500">{fmt(b.amount)}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TAB: Activity Log ─────────────────────────────────────────── */}
          {tab === 'log' && (
            <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 shadow-lg overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <SectionHeader icon="📋" title="יומן פעילות" sub="שינויי סטטוס ועמלות בזמן אמת"/>
              </div>
              <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
                {data.activityLog.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-gray-400 text-sm">אין פעולות לתקופה זו</div>
                ) : data.activityLog.map(e => {
                  const isSetupFee = e.new_data?.setup_fee !== undefined
                  const isStage    = e.new_data?.stage_id  !== undefined
                  return (
                    <div key={e.id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-sm shrink-0 mt-0.5">
                        {isSetupFee ? '💰' : isStage ? '🔄' : '✏️'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">
                          {isSetupFee ? `עמלה: ${fmt(Number(e.old_data?.setup_fee ?? 0))} → ${fmt(Number(e.new_data?.setup_fee ?? 0))}`
                            : isStage ? 'שינוי שלב'
                            : e.action}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{e.user_email?.split('@')[0]}</p>
                      </div>
                      <p className="text-[11px] text-gray-400 shrink-0">
                        {new Date(e.created_at).toLocaleString('he-IL', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

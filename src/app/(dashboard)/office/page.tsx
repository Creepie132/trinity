'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

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
  days_stuck: number; worker_email: string
}
interface ActivityEntry {
  id: string; action: string; user_email: string
  old_data: any; new_data: any; created_at: string
}
interface StatsData {
  hasWorkers: boolean; period: string
  kpi: KPI; funnel: FunnelStage[]; workerStats: WorkerStat[]
  bottlenecks: Bottleneck[]; activityLog: ActivityEntry[]
}
type Period = 'today' | 'week' | 'month'
type TabKey = 'overview' | 'workers' | 'bottlenecks' | 'log'

const T = {
  ru: {
    title: 'Кабинет руководителя', sub: 'Мониторинг эффективности и финансов',
    today: 'Сегодня', week: 'Неделя', month: 'Месяц',
    tabOverview: '📊 Сводка', tabWorkers: '👥 Работники',
    tabBottlenecks: '🚨 Зависшие', tabLog: '📋 Журнал',
    revenue: 'Общая выручка', commissions: 'Комиссии (30%)',
    netProfit: 'Чистая прибыль', conversion: 'Конверсия',
    closedDeals: 'закр. сделок', fromSetupFees: 'от Setup Fees',
    afterCommissions: 'после комиссий', fromDeals: 'из',
    funnel: 'Воронка продаж', funnelSub: 'Количество сделок по стадиям',
    revenueChart: 'Выручка по продавцам', noData: 'Нет данных',
    leaderboard: 'Таблица лидеров', leaderboardSub: 'Показатели за период',
    worker: 'Продавец', activeDeals: 'Акт.', wonDeals: 'Закр.',
    totalRevenue: 'Выручка', commission: 'Комиссия', conversionPct: 'Conv.',
    bottlenecksTitle: 'Зависшие сделки', bottlenecksSub: 'Стадия не менялась > 3 дней',
    noBottlenecks: 'Зависших сделок нет — всё движется!',
    days: 'дн.', logTitle: 'Журнал изменений', logSub: 'Смена стадий и сумм в реальном времени',
    noLog: 'Нет активности за период', noWorkers: 'Нет активных работников',
    noWorkersSub: 'Добавьте работников в организацию',
    stageChange: 'Смена стадии', feeChange: 'Комиссия',
    allTime: 'Все данные',
  },
  he: {
    title: 'קבינט מנהל', sub: 'מעקב ביצועים ופיננסים',
    today: 'היום', week: 'שבוע', month: 'חודש',
    tabOverview: '📊 סקירה', tabWorkers: '👥 עובדים',
    tabBottlenecks: '🚨 עצירות', tabLog: '📋 יומן',
    revenue: 'סה״כ הכנסות', commissions: 'עמלות (30%)',
    netProfit: 'רווח נקי', conversion: 'המרה',
    closedDeals: 'עסקאות סגורות', fromSetupFees: 'מ-Setup Fees',
    afterCommissions: 'אחרי עמלות', fromDeals: 'מתוך',
    funnel: 'משפך מכירות', funnelSub: 'כמות עסקאות לפי שלב',
    revenueChart: 'הכנסות לפי עובד', noData: 'אין נתונים',
    leaderboard: 'לוח מוביל', leaderboardSub: 'ביצועים לפי תקופה',
    worker: 'עובד', activeDeals: 'פעיל', wonDeals: 'סגור',
    totalRevenue: 'הכנסות', commission: 'עמלה', conversionPct: 'המרה',
    bottlenecksTitle: 'עסקאות תקועות', bottlenecksSub: 'לא עברו שלב מעל 3 ימים',
    noBottlenecks: 'אין עסקאות תקועות — הכל זז!',
    days: 'ימים', logTitle: 'יומן שינויים', logSub: 'שינויי שלב וסכומים',
    noLog: 'אין פעולות לתקופה זו', noWorkers: 'אין עובדים פעילים',
    noWorkersSub: 'הוסף עובדים לארגון',
    stageChange: 'שינוי שלב', feeChange: 'עמלה',
    allTime: 'כל הנתונים',
  },
}

function fmt(n: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
}
function initials(email: string) { return email.split('@')[0].slice(0, 2).toUpperCase() }
const AV_COLORS = ['from-purple-500 to-indigo-600','from-emerald-500 to-teal-600','from-amber-500 to-orange-600','from-pink-500 to-rose-600','from-blue-500 to-cyan-600']
function avColor(s: string) { return AV_COLORS[s.charCodeAt(0) % AV_COLORS.length] }

// ── Animated counter ──────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target === 0) { setVal(0); return }
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setVal(target); clearInterval(timer) }
      else setVal(Math.round(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return val
}

// ── KPI Card with animation ───────────────────────────────────────────────────
function KpiCard({ label, value, rawValue, sub, gradient, icon, delay = 0 }: {
  label: string; value: string; rawValue: number; sub?: string
  gradient: string; icon: string; delay?: number
}) {
  const [visible, setVisible] = useState(false)
  const animated = useCountUp(visible ? rawValue : 0)
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t) }, [delay])

  const displayValue = rawValue > 1000
    ? fmt(animated)
    : rawValue > 0 && rawValue <= 100
      ? `${animated}%`
      : String(animated)

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 bg-white border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{ transition: `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms, box-shadow 0.2s` }}>
      {/* Gradient accent top */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} rounded-t-2xl`}/>
      {/* Icon */}
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-2xl shadow-lg mb-4`}>{icon}</div>
      {/* Value */}
      <p className="text-2xl font-black text-gray-900 leading-none tabular-nums">{displayValue}</p>
      <p className="text-xs font-semibold text-gray-500 mt-1.5 uppercase tracking-wide">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      {/* Subtle bg pattern */}
      <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-gradient-to-br opacity-5" style={{ background: 'currentColor' }}/>
    </div>
  )
}

// ── Funnel ────────────────────────────────────────────────────────────────────
function FunnelViz({ data, lang }: { data: FunnelStage[]; lang: string }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t) }, [])
  const active = data.filter(s => !s.is_lost)
  const max = Math.max(...active.map(s => s.count), 1)
  if (!active.length) return <p className="text-center text-gray-400 py-8 text-sm">{lang === 'he' ? 'אין נתונים' : 'Нет данных'}</p>
  return (
    <div className="space-y-2.5">
      {active.map((s, i) => {
        const pct = Math.max((s.count / max) * 100, s.count > 0 ? 8 : 2)
        const label = lang === 'he' ? (s.name_he || s.name) : s.name
        const bg = s.is_won ? '#10b981' : (s.color || '#6366f1')
        return (
          <div key={s.id} className="flex items-center gap-3 group">
            <div className="w-28 text-xs text-gray-500 font-medium text-end truncate shrink-0">{label}</div>
            <div className="flex-1 h-9 bg-gray-100 rounded-xl overflow-hidden relative">
              <div className="h-full rounded-xl flex items-center px-3"
                style={{
                  width: animated ? `${pct}%` : '0%',
                  backgroundColor: bg,
                  transition: `width 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 80}ms`,
                  opacity: s.count === 0 ? 0.25 : 1,
                }}>
                {s.count > 0 && <span className="text-white text-xs font-bold">{s.count}</span>}
              </div>
              {s.count === 0 && (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">0</span>
              )}
            </div>
            <div className="w-8 text-right shrink-0">
              <span className="text-xs font-bold text-gray-600">{s.count}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function Section({ icon, title, sub, children }: { icon: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-md overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md text-base">{icon}</div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OwnerOfficePage() {
  const { role } = useAuth()
  const { language } = useLanguage()
  const router = useRouter()
  const t = T[language === 'he' ? 'he' : 'ru']
  const isRTL = language === 'he'

  const [period, setPeriod] = useState<Period>('month')
  const [data, setData]     = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState<TabKey>('overview')

  useEffect(() => {
    if (role && role !== 'owner') router.replace('/worker/dashboard')
  }, [role, router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/owner/worker-stats?period=${period}`)
      if (res.ok) setData(await res.json())
      else console.error('API error', res.status)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [period])

  useEffect(() => { load() }, [load])

  if (role && role !== 'owner') return null

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: t.tabOverview },
    { key: 'workers',  label: t.tabWorkers  },
    { key: 'bottlenecks', label: t.tabBottlenecks },
    { key: 'log',      label: t.tabLog      },
  ]
  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: t.today },
    { key: 'week',  label: t.week  },
    { key: 'month', label: t.month },
  ]

  return (
    <div className="min-h-screen bg-gray-50/80 p-4 md:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white text-2xl shadow-lg">🏢</div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900">{t.title}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{t.sub}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 rounded-xl bg-white border border-gray-200 shadow-sm">
            {periods.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  period === p.key ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800'
                }`}>{p.label}</button>
            ))}
          </div>
          <button onClick={load} disabled={loading}
            className="w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-all disabled:opacity-40">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white border border-gray-200 shadow-sm mb-6 w-fit overflow-x-auto">
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              tab === tb.key ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}>{tb.label}</button>
        ))}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 rounded-2xl bg-white border border-gray-100 animate-pulse shadow-sm"/>
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-white border border-gray-100 animate-pulse shadow-sm"/>
        </div>
      )}

      {/* ── No workers ── */}
      {!loading && data && !data.hasWorkers && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-4xl">👤</div>
          <p className="text-xl font-bold text-gray-700">{t.noWorkers}</p>
          <p className="text-sm text-gray-400">{t.noWorkersSub}</p>
        </div>
      )}

      {/* ── Content ── */}
      {!loading && data?.hasWorkers && (
        <>
          {/* ────── TAB: OVERVIEW ────── */}
          {tab === 'overview' && (
            <div className="space-y-5">
              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon="💰" label={t.revenue} gradient="from-emerald-500 to-teal-600"
                  rawValue={data.kpi.totalRevenue} value={fmt(data.kpi.totalRevenue)}
                  sub={`${data.kpi.wonDeals} ${t.closedDeals}`} delay={0}/>
                <KpiCard icon="🤝" label={t.commissions} gradient="from-amber-500 to-orange-600"
                  rawValue={data.kpi.totalCommission} value={fmt(data.kpi.totalCommission)}
                  sub={t.fromSetupFees} delay={100}/>
                <KpiCard icon="📈" label={t.netProfit} gradient="from-indigo-500 to-purple-600"
                  rawValue={data.kpi.netProfit} value={fmt(data.kpi.netProfit)}
                  sub={t.afterCommissions} delay={200}/>
                <KpiCard icon="🎯" label={t.conversion} gradient="from-pink-500 to-rose-600"
                  rawValue={data.kpi.conversionRate} value={`${data.kpi.conversionRate}%`}
                  sub={`${t.fromDeals} ${data.kpi.totalDeals} сделок`} delay={300}/>
              </div>

              {/* Total deals stat row */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: language === 'he' ? 'סה״כ עסקאות' : 'Всего сделок', val: data.kpi.totalDeals, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: language === 'he' ? 'עסקאות סגורות' : 'Закрытых', val: data.kpi.wonDeals, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: language === 'he' ? 'בתהליך' : 'В процессе', val: data.kpi.totalDeals - data.kpi.wonDeals, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map(s => (
                  <div key={s.label} className={`rounded-2xl ${s.bg} border border-white p-4 text-center`}>
                    <p className={`text-3xl font-black ${s.color}`}>{s.val}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Funnel */}
              <Section icon="🔽" title={t.funnel} sub={t.funnelSub}>
                <FunnelViz data={data.funnel} lang={language}/>
              </Section>

              {/* Bar chart */}
              <Section icon="📊" title={t.revenueChart}>
                {data.workerStats.every(w => w.total_revenue === 0) ? (
                  <div className="flex flex-col items-center py-8 gap-2 text-gray-400">
                    <span className="text-3xl">📭</span>
                    <p className="text-sm">{language === 'he' ? 'אין הכנסות עדיין' : 'Выручки пока нет — сделки в процессе'}</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(120, data.workerStats.length * 52)}>
                    <BarChart data={data.workerStats} layout="vertical" margin={{ right: 70, left: 8, top: 4, bottom: 4 }}>
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                        tickFormatter={v => v > 0 ? `₪${(v/1000).toFixed(0)}K` : '₪0'}/>
                      <YAxis type="category" dataKey="email" tick={{ fontSize: 11, fill: '#6b7280' }} width={110} axisLine={false} tickLine={false}
                        tickFormatter={e => e.split('@')[0].slice(0, 14)}/>
                      <Tooltip
                        formatter={(v: any) => [fmt(Number(v)), language === 'he' ? 'הכנסות' : 'Выручка']}
                        labelFormatter={l => String(l).split('@')[0]}
                        contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}/>
                      <Bar dataKey="total_revenue" radius={[0,8,8,0]} maxBarSize={40}>
                        {data.workerStats.map((_, i) => (
                          <Cell key={i} fill={['#6366f1','#8b5cf6','#a78bfa','#c4b5fd'][i % 4]}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Section>
            </div>
          )}

          {/* ────── TAB: WORKERS ────── */}
          {tab === 'workers' && (
            <Section icon="👥" title={t.leaderboard} sub={t.leaderboardSub}>
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm min-w-[540px]" dir={isRTL ? 'rtl' : 'ltr'}>
                  <thead>
                    <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {[t.worker, t.activeDeals, t.wonDeals, t.totalRevenue, t.commission, t.conversionPct].map(h => (
                        <th key={h} className="pb-3 text-start font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...data.workerStats].sort((a,b) => b.total_deals - a.total_deals).map((w,i) => (
                      <tr key={w.user_id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avColor(w.email)} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>{initials(w.email)}</div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{w.email.split('@')[0]}</p>
                              <p className="text-[10px] text-gray-400">{w.email}</p>
                            </div>
                            {i === 0 && data.workerStats.length > 1 && <span className="ms-1">🏆</span>}
                          </div>
                        </td>
                        <td className="py-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-sm">{w.active_deals}</span>
                        </td>
                        <td className="py-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm">{w.won_deals}</span>
                        </td>
                        <td className="py-3.5 font-bold text-gray-900">{fmt(w.total_revenue)}</td>
                        <td className="py-3.5 text-amber-600 font-semibold">{fmt(w.commission)}</td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-16">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${w.conversion}%` }}/>
                            </div>
                            <span className={`text-xs font-bold ${w.conversion >= 50 ? 'text-emerald-600' : w.conversion >= 25 ? 'text-amber-600' : 'text-gray-500'}`}>{w.conversion}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* ────── TAB: BOTTLENECKS ────── */}
          {tab === 'bottlenecks' && (
            <div className="space-y-3">
              {data.bottlenecks.length === 0 ? (
                <div className="flex flex-col items-center py-20 gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-3xl">✅</div>
                  <p className="font-bold text-gray-700">{t.noBottlenecks}</p>
                </div>
              ) : data.bottlenecks.map(b => (
                <div key={b.id} className={`rounded-2xl p-4 border-2 bg-white shadow-sm transition-all hover:shadow-md ${
                  b.days_stuck >= 7 ? 'border-red-200' : b.days_stuck >= 5 ? 'border-amber-200' : 'border-gray-200'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{b.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{b.stage_name}</span>
                        <span className="text-xs text-gray-400">{b.worker_email.split('@')[0]}</span>
                      </div>
                    </div>
                    <div className={`shrink-0 text-center px-3 py-2 rounded-xl ${b.days_stuck >= 7 ? 'bg-red-50' : 'bg-amber-50'}`}>
                      <p className={`text-xl font-black ${b.days_stuck >= 7 ? 'text-red-600' : 'text-amber-600'}`}>{b.days_stuck}</p>
                      <p className={`text-[10px] font-semibold ${b.days_stuck >= 7 ? 'text-red-400' : 'text-amber-400'}`}>{t.days}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ────── TAB: LOG ────── */}
          {tab === 'log' && (
            <Section icon="📋" title={t.logTitle} sub={t.logSub}>
              {data.activityLog.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-3 text-gray-400">
                  <span className="text-3xl">📭</span>
                  <p className="text-sm">{t.noLog}</p>
                </div>
              ) : (
                <div className="space-y-1 -mx-5 max-h-[55vh] overflow-y-auto">
                  {data.activityLog.map((e, i) => {
                    const isSetupFee = e.new_data?.setup_fee !== undefined
                    const isStage    = e.new_data?.stage_id  !== undefined
                    return (
                      <div key={e.id} className={`flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 mt-0.5 ${isSetupFee ? 'bg-amber-50' : 'bg-indigo-50'}`}>
                          {isSetupFee ? '💰' : isStage ? '🔄' : '✏️'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">
                            {isSetupFee
                              ? `${t.feeChange}: ${fmt(Number(e.old_data?.setup_fee ?? 0))} → ${fmt(Number(e.new_data?.setup_fee ?? 0))}`
                              : isStage ? t.stageChange : e.action}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{e.user_email?.split('@')[0]}</p>
                        </div>
                        <p className="text-[11px] text-gray-400 shrink-0 tabular-nums">
                          {new Date(e.created_at).toLocaleString(language === 'he' ? 'he-IL' : 'ru-RU', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>
          )}
        </>
      )}
    </div>
  )
}

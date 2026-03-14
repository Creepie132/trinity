'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useBranch } from '@/contexts/BranchContext'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  TrendingUp, Users, Calendar, DollarSign, Settings2,
  BarChart2, PieChart as PieIcon, Activity, Award, RefreshCw
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface StatsData {
  clients: { value: number; change: number }
  visits: { value: number; change: number }
  revenue: { value: number; change: number }
  avgCheck: { value: number; change: number }
}
interface RevenuePoint { date: string; day: string; amount: number }
interface VisitPoint { date: string; dateLabel: string; count: number }
interface ServiceItem { name: string; count: number; fill: string }
interface StaffItem { email: string; visits_count: number; revenue: number; average_check: number }
interface ReportsData {
  staff: StaffItem[]
  services: ServiceItem[]
  clients: { new_clients: number; returning_clients: number; avg_interval_days: number }
  totals: { total_revenue: number; total_visits: number }
}

// ─── Widget config ────────────────────────────────────────────────────────────
const ALL_WIDGETS = [
  { id: 'kpi',      labelHe: 'כרטיסי KPI',       labelRu: 'KPI карточки',          icon: Activity },
  { id: 'revenue',  labelHe: 'גרף הכנסות',        labelRu: 'График выручки',         icon: TrendingUp },
  { id: 'visits',   labelHe: 'גרף ביקורים',       labelRu: 'График визитов',         icon: Calendar },
  { id: 'services', labelHe: 'שירותים מובילים',   labelRu: 'Топ услуги',             icon: PieIcon },
  { id: 'staff',    labelHe: 'ביצועי צוות',       labelRu: 'Сотрудники',             icon: Award },
  { id: 'clients',  labelHe: 'לקוחות חוזרים',    labelRu: 'Клиенты',               icon: Users },
]
const STORAGE_KEY = 'trinity_analytics_widgets'
const PERIOD_KEY  = 'trinity_analytics_period'

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-4 py-2.5 text-sm">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold" style={{ color: p.color || '#6366f1' }}>
          {prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{suffix}
        </p>
      ))}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, change, color }: {
  icon: any; label: string; value: string; change: number; color: string
}) => {
  const isPos = change >= 0
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 mb-0.5 truncate">{label}</p>
        <p className="text-xl font-bold text-slate-800 truncate">{value}</p>
      </div>
      <div className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
        isPos ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
      }`}>
        {isPos ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
      </div>
    </div>
  )
}

// ─── Widget wrapper ───────────────────────────────────────────────────────────
const Widget = ({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 ${className}`}>
    <h3 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wide">{title}</h3>
    {children}
  </div>
)

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { activeOrgId: orgId } = useBranch()
  const { language } = useLanguage()
  const locale = language === 'he' ? 'he' : 'ru'
  const isHe = locale === 'he'

  // Period
  const [period, setPeriod] = useState<7 | 30 | 90>(30)

  // Widget visibility
  const [visible, setVisible] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return Object.fromEntries(ALL_WIDGETS.map(w => [w.id, true]))
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : Object.fromEntries(ALL_WIDGETS.map(w => [w.id, true]))
    } catch { return Object.fromEntries(ALL_WIDGETS.map(w => [w.id, true])) }
  })
  const [showConfig, setShowConfig] = useState(false)

  // Data
  const [stats, setStats]     = useState<StatsData | null>(null)
  const [revenue, setRevenue] = useState<RevenuePoint[]>([])
  const [visits, setVisits]   = useState<VisitPoint[]>([])
  const [reports, setReports] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)

  // Persist visibility
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visible))
  }, [visible])

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    const from = new Date(); from.setDate(from.getDate() - period)
    const fromStr = from.toISOString().split('T')[0]
    const toStr   = new Date().toISOString().split('T')[0]

    try {
      const [statsRes, revenueRes, visitsRes, reportsRes] = await Promise.all([
        fetch(`/api/dashboard/stats?org_id=${orgId}`),
        fetch(`/api/dashboard/revenue?org_id=${orgId}&days=${period}`),
        fetch(`/api/dashboard/visits-chart?org_id=${orgId}&days=${period}`),
        fetch(`/api/dashboard/reports?org_id=${orgId}&from=${fromStr}T00:00:00Z&to=${toStr}T23:59:59Z`),
      ])
      if (statsRes.ok)   setStats(await statsRes.json())
      if (revenueRes.ok) setRevenue(await revenueRes.json())
      if (visitsRes.ok)  setVisits(await visitsRes.json())
      if (reportsRes.ok) setReports(await reportsRes.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [orgId, period])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleWidget = (id: string) => setVisible(v => ({ ...v, [id]: !v[id] }))

  // Labels
  const L = {
    title:      isHe ? 'אנליטיקה' : 'Аналитика',
    configure:  isHe ? 'הגדרות' : 'Настройка',
    period7:    isHe ? '7 ימים' : '7 дней',
    period30:   isHe ? '30 ימים' : '30 дней',
    period90:   isHe ? '90 ימים' : '90 дней',
    refresh:    isHe ? 'רענן' : 'Обновить',
    kpiClients: isHe ? 'סה"כ לקוחות' : 'Всего клиентов',
    kpiVisits:  isHe ? 'ביקורים החודש' : 'Визитов в месяце',
    kpiRevenue: isHe ? 'הכנסות החודש' : 'Выручка в месяце',
    kpiAvg:     isHe ? 'ממוצע לביקור' : 'Средний чек',
    revenueTitle:  isHe ? 'הכנסות לפי יום' : 'Выручка по дням',
    visitsTitle:   isHe ? 'ביקורים לפי יום' : 'Визиты по дням',
    servicesTitle: isHe ? 'שירותים מובילים' : 'Топ услуги',
    staffTitle:    isHe ? 'ביצועי צוות' : 'Сотрудники',
    clientsTitle:  isHe ? 'לקוחות' : 'Клиенты',
    newClients:    isHe ? 'חדשים' : 'Новые',
    returning:     isHe ? 'חוזרים' : 'Вернувшиеся',
    noData:        isHe ? 'אין נתונים' : 'Нет данных',
    visitsCount:   isHe ? 'ביקורים' : 'Визиты',
    revenue_lbl:   isHe ? 'הכנסות ₪' : 'Выручка ₪',
  }

  // Pie colors
  const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6" dir={isHe ? 'rtl' : 'ltr'}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{L.title}</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {([7, 30, 90] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  period === p ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}>
                {p === 7 ? L.period7 : p === 30 ? L.period30 : L.period90}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 shadow-sm transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {L.refresh}
          </button>

          {/* Configure widgets */}
          <button onClick={() => setShowConfig(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium shadow-sm transition border ${
              showConfig ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}>
            <Settings2 className="w-4 h-4" />
            {L.configure}
          </button>
        </div>
      </div>

      {/* ── Widget configurator ── */}
      {showConfig && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {ALL_WIDGETS.map(w => {
              const Icon = w.icon
              const on = visible[w.id] !== false
              return (
                <button key={w.id} onClick={() => toggleWidget(w.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                    on
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                  }`}>
                  <Icon className="w-4 h-4" />
                  {isHe ? w.labelHe : w.labelRu}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-pulse">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl h-24 border border-slate-100" />
          ))}
        </div>
      )}

      {/* ── KPI Cards ── */}
      {!loading && visible.kpi !== false && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard icon={Users}       label={L.kpiClients} value={stats.clients.value.toLocaleString()} change={stats.clients.change} color="bg-indigo-500" />
          <KpiCard icon={Calendar}    label={L.kpiVisits}  value={stats.visits.value.toLocaleString()}  change={stats.visits.change}  color="bg-violet-500" />
          <KpiCard icon={DollarSign}  label={L.kpiRevenue} value={`₪${stats.revenue.value.toLocaleString()}`} change={stats.revenue.change} color="bg-emerald-500" />
          <KpiCard icon={TrendingUp}  label={L.kpiAvg}     value={`₪${stats.avgCheck.value.toLocaleString()}`} change={stats.avgCheck.change} color="bg-amber-500" />
        </div>
      )}

      {/* ── Revenue Chart ── */}
      {!loading && visible.revenue !== false && revenue.length > 0 && (
        <Widget title={L.revenueTitle} className="mb-6">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenue} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={45}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip content={<CustomTooltip prefix="₪" />} />
              <Area type="monotone" dataKey="amountDisplay" name={L.revenue_lbl}
                stroke="#6366f1" strokeWidth={2.5} fill="url(#revGrad)"
                dot={false} activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }}
                isAnimationActive animationDuration={800} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        </Widget>
      )}

      {/* ── Visits Chart ── */}
      {!loading && visible.visits !== false && visits.length > 0 && (
        <Widget title={L.visitsTitle} className="mb-6">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={visits} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={period <= 7 ? 28 : period <= 30 ? 12 : 6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                interval={period <= 7 ? 0 : period <= 30 ? 4 : 9} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name={L.visitsCount} radius={[6,6,0,0]}
                fill="#8b5cf6"
                isAnimationActive animationDuration={700} animationEasing="ease-out">
                {visits.map((_, i) => (
                  <Cell key={i} fill={`hsl(${258 - i * 1.5}, 78%, ${62 - i * 0.3}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Widget>
      )}

      {/* ── Services + Clients row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* Top Services */}
        {!loading && visible.services !== false && reports?.services && reports.services.length > 0 && (
          <Widget title={L.servicesTitle}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={reports.services} dataKey="count" nameKey="name"
                  cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} strokeWidth={0}
                  isAnimationActive animationBegin={100} animationDuration={900} animationEasing="ease-out">
                  {reports.services.map((entry, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v} ${isHe ? 'ביקורים' : 'визитов'}`, '']} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </Widget>
        )}

        {/* Clients new vs returning */}
        {!loading && visible.clients !== false && reports?.clients && (
          <Widget title={L.clientsTitle}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={[
                    { name: L.newClients,  value: reports.clients.new_clients },
                    { name: L.returning,   value: reports.clients.returning_clients },
                  ]}
                  dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={4} strokeWidth={0}
                  isAnimationActive animationBegin={200} animationDuration={900} animationEasing="ease-out">
                  <Cell fill="#06b6d4" />
                  <Cell fill="#6366f1" />
                </Pie>
                <Tooltip formatter={(v: any, name) => [`${v}`, name]} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
            {reports.clients.avg_interval_days > 0 && (
              <p className="text-center text-xs text-slate-400 mt-2">
                {isHe
                  ? `ממוצע ${reports.clients.avg_interval_days} ימים בין ביקורים`
                  : `Средний интервал ${reports.clients.avg_interval_days} дн. между визитами`}
              </p>
            )}
          </Widget>
        )}
      </div>

      {/* ── Staff performance ── */}
      {!loading && visible.staff !== false && reports?.staff && reports.staff.length > 0 && (
        <Widget title={L.staffTitle} className="mb-6">
          <div className="space-y-3">
            {reports.staff.sort((a, b) => b.revenue - a.revenue).map((s, i) => {
              const maxRev = reports.staff[0]?.revenue || 1
              const pct = Math.round((s.revenue / maxRev) * 100)
              const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']
              const color = colors[i % colors.length]
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: color }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-slate-700 truncate">{s.email}</p>
                      <p className="text-xs text-slate-400 flex-shrink-0 ms-2">
                        {s.visits_count} {isHe ? 'ביק׳' : 'визитов'} · ₪{Math.round(s.revenue).toLocaleString()}
                      </p>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Widget>
      )}

      {/* Empty state */}
      {!loading && Object.values(visible).every(v => !v) && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <BarChart2 className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">{isHe ? 'כל הוויג\'טים מוסתרים' : 'Все виджеты скрыты'}</p>
          <button onClick={() => setShowConfig(true)}
            className="mt-3 text-indigo-500 text-sm hover:underline">
            {L.configure}
          </button>
        </div>
      )}

    </div>
  )
}

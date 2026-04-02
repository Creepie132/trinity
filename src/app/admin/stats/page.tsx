'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'
import {
  TrendingUp, Globe, MousePointer, MessageCircle, UserPlus,
  RefreshCw, Search, BarChart3, ArrowUpRight, Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

// ── Types ─────────────────────────────────────────────────────────────────────
interface SourceRow {
  source: string
  views: number
  demo_clicks: number
  wa_clicks: number
  reg_starts: number
  conversion_pct: number
}

interface DayRow {
  day: string
  views: number
  conversions: number
}

interface GoogleReport {
  total_google_views: number
  google_demo_clicks: number
  google_wa_clicks: number
  google_reg_starts: number
  google_conversion_pct: number
  total_all_views: number
  google_share_pct: number
}

interface StatsData {
  bySource: SourceRow[]
  byDay: DayRow[]
  googleReport: GoogleReport | null
  days: number
  generatedAt: string
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
  google:    '#4285F4',
  direct:    '#6366f1',
  facebook:  '#1877F2',
  instagram: '#E1306C',
  whatsapp:  '#25D366',
  telegram:  '#2AABEE',
  referral:  '#f59e0b',
  yandex:    '#FF0000',
  linkedin:  '#0A66C2',
  tiktok:    '#010101',
}
const DEFAULT_COLOR = '#94a3b8'

const SOURCE_LABELS: Record<string, string> = {
  google: 'Google', direct: 'Direct', facebook: 'Facebook',
  instagram: 'Instagram', whatsapp: 'WhatsApp', telegram: 'Telegram',
  referral: 'Referral', yandex: 'Yandex', linkedin: 'LinkedIn', tiktok: 'TikTok',
}

// ── Mini stat card ────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, color, highlight,
}: {
  label: string; value: string | number; sub?: string
  icon: any; color: string; highlight?: boolean
}) {
  return (
    <div className={cn(
      'rounded-2xl p-5 border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
      highlight
        ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800'
        : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800',
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="p-2.5 rounded-xl" style={{ background: color + '22' }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </div>
  )
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
const DayTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg px-4 py-2.5 text-sm">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="font-bold text-indigo-600">👁 {payload[0]?.value} просмотров</p>
      {payload[1] && <p className="font-bold text-emerald-600">✅ {payload[1].value} регистраций</p>}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StatsPage() {
  const { language } = useLanguage()
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [refreshing, setRefreshing] = useState(false)

  const isRu = language === 'ru'

  const S = {
    title:          isRu ? 'Трафик лендинга' : 'תנועה לדף הנחיתה',
    subtitle:       isRu ? 'Откуда приходят посетители и как конвертируются' : 'מאיפה מגיעים המבקרים ואיך הם ממירים',
    refresh:        isRu ? 'Обновить' : 'עדכן',
    totalViews:     isRu ? 'Просмотров' : 'צפיות',
    regStarts:      isRu ? 'Регистраций' : 'הרשמות',
    waClicks:       isRu ? 'Кликов WhatsApp' : 'לחיצות WhatsApp',
    demoClicks:     isRu ? 'Кликов Демо' : 'לחיצות Demo',
    bySource:       isRu ? 'По источникам' : 'לפי מקור',
    byDay:          isRu ? 'Динамика по дням' : 'דינמיקה לפי יום',
    googleReport:   isRu ? 'Google — детальный отчёт' : 'Google — דוח מפורט',
    conversion:     isRu ? 'Конверсия' : 'המרה',
    googleShare:    isRu ? 'Доля Google' : 'נתח Google',
    noData:         isRu ? 'Нет данных за выбранный период' : 'אין נתונים לתקופה הנבחרת',
    days30:         isRu ? '30 дней' : '30 יום',
    days7:          isRu ? '7 дней' : '7 ימים',
    days90:         isRu ? '90 дней' : '90 יום',
  }

  const fetchData = useCallback(async (d: number) => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/admin/traffic-stats?days=${d}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData(days) }, [days, fetchData])

  // Суммарные KPI
  const totalViews   = data?.bySource.reduce((s, r) => s + Number(r.views), 0) ?? 0
  const totalReg     = data?.bySource.reduce((s, r) => s + Number(r.reg_starts), 0) ?? 0
  const totalWa      = data?.bySource.reduce((s, r) => s + Number(r.wa_clicks), 0) ?? 0
  const totalDemo    = data?.bySource.reduce((s, r) => s + Number(r.demo_clicks), 0) ?? 0
  const overallConv  = totalViews > 0 ? ((totalReg / totalViews) * 100).toFixed(2) : '0'

  const Skeleton = ({ className }: { className?: string }) => (
    <div className={cn('animate-pulse bg-gray-100 dark:bg-gray-800 rounded-2xl', className)} />
  )

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-500" />
            {S.title}
          </h1>
          <p className="text-gray-400 text-sm mt-1">{S.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          {([7, 30, 90] as const).map(d => (
            <button key={d}
              onClick={() => setDays(d)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                days === d
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
              )}>
              {d === 7 ? S.days7 : d === 30 ? S.days30 : S.days90}
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={() => fetchData(days)} disabled={refreshing}
            className="gap-2 border-gray-200 hover:border-indigo-300 hover:text-indigo-600">
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            {S.refresh}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label={S.totalViews}   value={totalViews.toLocaleString('he-IL')}
            sub={`${overallConv}% ${S.conversion}`} icon={Globe}          color="#6366f1" />
          <StatCard label={S.regStarts}    value={totalReg.toLocaleString('he-IL')}
            icon={UserPlus}       color="#10b981" />
          <StatCard label={S.waClicks}     value={totalWa.toLocaleString('he-IL')}
            icon={MessageCircle}  color="#25D366" />
          <StatCard label={S.demoClicks}   value={totalDemo.toLocaleString('he-IL')}
            icon={MousePointer}   color="#f59e0b" />
        </div>
      )}

      {/* Google Report Block */}
      {!loading && data?.googleReport && (
        <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-blue-100 dark:bg-blue-900/50 rounded-xl p-2">
              <Search className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="font-bold text-blue-900 dark:text-blue-200 text-base">{S.googleReport}</h2>
            <span className="ml-auto text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
              {S.googleShare}: {data.googleReport.google_share_pct}%
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { l: isRu ? 'Просмотров из Google' : 'צפיות מ-Google',  v: data.googleReport.total_google_views,  icon: Globe,         c: '#4285F4' },
              { l: isRu ? 'Клики Демо'           : 'לחיצות Demo',      v: data.googleReport.google_demo_clicks,   icon: MousePointer,  c: '#f59e0b' },
              { l: isRu ? 'Клики WhatsApp'        : 'לחיצות WhatsApp', v: data.googleReport.google_wa_clicks,     icon: MessageCircle, c: '#25D366' },
              { l: isRu ? 'Регистраций'           : 'הרשמות',          v: data.googleReport.google_reg_starts,    icon: UserPlus,      c: '#10b981' },
              { l: isRu ? 'Конверсия в рег.'      : 'המרה להרשמה',     v: `${data.googleReport.google_conversion_pct}%`, icon: TrendingUp, c: '#6366f1' },
            ].map(({ l, v, icon: Ic, c }) => (
              <div key={l} className="bg-white/70 dark:bg-gray-900/50 rounded-xl p-3 text-center">
                <div className="flex justify-center mb-1">
                  <Ic className="w-4 h-4" style={{ color: c }} />
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{v}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-tight">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* By Day chart */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-1.5">
              <Calendar className="w-4 h-4 text-indigo-500" />
            </div>
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{S.byDay}</h2>
          </div>
          {loading ? <Skeleton className="h-52 w-full" /> : (
            data?.byDay && data.byDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.byDay.map(d => ({ ...d, day: d.day.slice(5) }))}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<DayTooltip />} />
                  <Area type="monotone" dataKey="views"       stroke="#6366f1" strokeWidth={2} fill="url(#trafficGrad)" dot={false} />
                  <Area type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} fill="url(#convGrad)"    dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-300 text-sm">{S.noData}</div>
            )
          )}
        </div>

        {/* By Source pie */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-1.5">
              <Globe className="w-4 h-4 text-amber-500" />
            </div>
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{S.bySource}</h2>
          </div>
          {loading ? <Skeleton className="h-52 w-full" /> : (
            data?.bySource && data.bySource.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.bySource} dataKey="views" nameKey="source"
                    cx="50%" cy="50%" outerRadius={80} strokeWidth={2}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${SOURCE_LABELS[name ?? ''] ?? name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {data.bySource.map((row) => (
                      <Cell key={row.source}
                        fill={SOURCE_COLORS[row.source] ?? DEFAULT_COLOR}
                        stroke="#fff" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) =>
                    [v.toLocaleString('he-IL'), SOURCE_LABELS[name] ?? name]
                  } />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-300 text-sm">{S.noData}</div>
            )
          )}
        </div>
      </div>

      {/* Source table */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-2 mb-5">
          <div className="bg-violet-50 dark:bg-violet-900/30 rounded-lg p-1.5">
            <TrendingUp className="w-4 h-4 text-violet-500" />
          </div>
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{S.bySource}</h2>
        </div>
        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-100 dark:border-gray-800">
                <th className="text-start pb-3 font-medium">{isRu ? 'Источник' : 'מקור'}</th>
                <th className="text-end pb-3 font-medium">{isRu ? 'Просмотры' : 'צפיות'}</th>
                <th className="text-end pb-3 font-medium">Demo</th>
                <th className="text-end pb-3 font-medium">WhatsApp</th>
                <th className="text-end pb-3 font-medium">{isRu ? 'Рег.' : 'הרשמה'}</th>
                <th className="text-end pb-3 font-medium">{isRu ? 'Конв.' : 'המרה'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {data?.bySource?.map(row => (
                <tr key={row.source} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: SOURCE_COLORS[row.source] ?? DEFAULT_COLOR }} />
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {SOURCE_LABELS[row.source] ?? row.source}
                      </span>
                      {row.source === 'google' && (
                        <Search className="w-3 h-3 text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                  </td>
                  <td className="text-end text-gray-700 dark:text-gray-300 tabular-nums">{Number(row.views).toLocaleString('he-IL')}</td>
                  <td className="text-end text-amber-600 tabular-nums">{Number(row.demo_clicks)}</td>
                  <td className="text-end text-green-600 tabular-nums">{Number(row.wa_clicks)}</td>
                  <td className="text-end text-indigo-600 tabular-nums font-medium">{Number(row.reg_starts)}</td>
                  <td className="text-end">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                      Number(row.conversion_pct) > 5  ? 'bg-emerald-100 text-emerald-700' :
                      Number(row.conversion_pct) > 1  ? 'bg-amber-100 text-amber-700'    :
                                                         'bg-gray-100 text-gray-500'
                    )}>
                      <ArrowUpRight className="w-3 h-3" />
                      {row.conversion_pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

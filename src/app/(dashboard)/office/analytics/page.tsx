'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from 'recharts'
import { TrendingUp, ShoppingBag, DollarSign, BarChart2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// ─── Beautymania org_id ───────────────────────────────────────
const BM_ORG_ID = '1e77c781-3848-4b16-a623-693de123c6bc'

// ─── Source → цвет и иконка ──────────────────────────────────
const SOURCE_META: Record<string, { color: string; icon: string; label: string }> = {
  google:    { color: '#4285F4', icon: '🔍', label: 'Google (SEO)' },
  instagram: { color: '#E1306C', icon: '📸', label: 'Instagram' },
  facebook:  { color: '#1877F2', icon: '👥', label: 'Facebook' },
  tiktok:    { color: '#010101', icon: '🎵', label: 'TikTok' },
  whatsapp:  { color: '#25D366', icon: '💬', label: 'WhatsApp' },
  twitter:   { color: '#1DA1F2', icon: '🐦', label: 'Twitter/X' },
  direct:    { color: '#6366F1', icon: '🔗', label: 'Прямые заходы' },
  bing:      { color: '#0078D4', icon: '🔎', label: 'Bing' },
  yandex:    { color: '#FF0000', icon: '🔴', label: 'Yandex' },
}
function getMeta(source: string) {
  return SOURCE_META[source.toLowerCase()] ?? { color: '#9CA3AF', icon: '📡', label: source }
}

type Period = '7d' | '30d' | '90d' | 'all'
const PERIOD_LABELS: Record<Period, string> = {
  '7d': '7 дней', '30d': '30 дней', '90d': '90 дней', 'all': 'Всё время',
}

interface TrafficRow {
  source: string
  orders_count: number
  total_revenue: number
  avg_order: number
}

function fmt(n: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
}

export default function TrafficAnalyticsPage() {
  const { language } = useLanguage()
  const { role } = useAuth()
  const supabase = createSupabaseBrowserClient()
  const [period, setPeriod] = useState<Period>('30d')
  const isRTL = language === 'he'

  // Вычисляем даты из периода
  const { fromDate, toDate } = (() => {
    const to = new Date()
    const from = new Date()
    if (period === '7d')  from.setDate(to.getDate() - 7)
    if (period === '30d') from.setDate(to.getDate() - 30)
    if (period === '90d') from.setDate(to.getDate() - 90)
    if (period === 'all') from.setFullYear(2024, 0, 1)
    return {
      fromDate: from.toISOString().split('T')[0],
      toDate:   to.toISOString().split('T')[0],
    }
  })()

  const { data: rows = [], isLoading } = useQuery<TrafficRow[]>({
    queryKey: ['traffic-attribution', period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_traffic_revenue', {
        p_org_id: BM_ORG_ID,
        p_from:   fromDate,
        p_to:     toDate,
      })
      if (error) throw error
      return (data ?? []) as TrafficRow[]
    },
    staleTime: 5 * 60 * 1000,
  })

  const totalRevenue = rows.reduce((s, r) => s + Number(r.total_revenue), 0)
  const totalOrders  = rows.reduce((s, r) => s + Number(r.orders_count), 0)
  const topSource    = rows[0]

  // Для Recharts
  const chartData = rows.map(r => ({
    name:  getMeta(r.source).label,
    raw:   r.source,
    value: Number(r.total_revenue),
    count: Number(r.orders_count),
    avg:   Number(r.avg_order),
    color: getMeta(r.source).color,
  }))

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50/80 p-3 md:p-6" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/office"
            className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-indigo-500" />
              {language === 'he' ? 'אנליטיקת תנועה — Beautymania' : 'SEO-аналитика — Beautymania'}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {language === 'he' ? 'הכנסות לפי מקור תנועה' : 'Выручка по источникам трафика'}
            </p>
          </div>
        </div>
        {/* Period picker */}
        <div className="flex gap-1 p-1 rounded-xl bg-white border border-gray-200 shadow-sm">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800'
              }`}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-gray-100 animate-pulse shadow-sm" />
          ))}
        </div>
      )}

      {/* No data */}
      {!isLoading && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl">📊</div>
          <p className="font-bold text-gray-600">
            {language === 'he' ? 'אין נתוני הזמנות עדיין' : 'Заказов с атрибуцией пока нет'}
          </p>
          <p className="text-sm text-gray-400 text-center max-w-xs">
            {language === 'he'
              ? 'נתונים יופיעו לאחר ביצוע הזמנות דרך האתר'
              : 'Данные появятся после поступления заказов с сайта Beautymania'}
          </p>
        </div>
      )}

      {/* Content */}
      {!isLoading && rows.length > 0 && (
        <div className="space-y-6">

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total revenue */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-5 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-2xl" />
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-gray-900">{fmt(totalRevenue)}</p>
              <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">
                {language === 'he' ? 'סה״כ הכנסות' : 'Общая выручка'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{PERIOD_LABELS[period]}</p>
            </div>

            {/* Total orders */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-5 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-2xl" />
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-gray-900">{totalOrders}</p>
              <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">
                {language === 'he' ? 'סה״כ הזמנות' : 'Всего заказов'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{PERIOD_LABELS[period]}</p>
            </div>

            {/* Top source */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-5 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-2xl" />
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3 text-xl">
                {topSource ? getMeta(topSource.source).icon : '📡'}
              </div>
              <p className="text-2xl font-black text-gray-900">
                {topSource ? getMeta(topSource.source).label : '—'}
              </p>
              <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">
                {language === 'he' ? 'מקור מוביל' : 'Топ источник'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {topSource ? `${fmt(topSource.total_revenue)} · ${topSource.orders_count} ${language === 'he' ? 'הזמנות' : 'заказов'}` : '—'}
              </p>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Bar chart — выручка по источникам */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm">💰</div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {language === 'he' ? 'הכנסות לפי מקור' : 'Выручка по источнику'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {language === 'he' ? 'רק הזמנות שולמו' : 'Только оплаченные заказы'}
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 52)}>
                <BarChart data={chartData} layout="vertical"
                  margin={{ right: 16, left: 8, top: 4, bottom: 4 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => v > 0 ? `₪${(v/1000).toFixed(0)}K` : '₪0'} />
                  <YAxis type="category" dataKey="name" width={120}
                    tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: any, _: any, props: any) => [
                      fmt(Number(v)),
                      language === 'he' ? 'הכנסות' : 'Выручка',
                    ]}
                    labelFormatter={(label: any) => String(label)}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={36}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart — доля заказов */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-sm">🥧</div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {language === 'he' ? 'חלוקת הזמנות' : 'Распределение заказов'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {language === 'he' ? 'לפי מקור תנועה' : 'По источнику трафика'}
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={chartData} dataKey="count" nameKey="name"
                    cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any, name: any) => [
                      `${v} ${language === 'he' ? 'הזמנות' : 'заказов'}`, name
                    ]}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" iconSize={10}
                    formatter={(value) => <span className="text-xs text-gray-600">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detail table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-500 to-gray-700 flex items-center justify-center text-white text-sm">📋</div>
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {language === 'he' ? 'פירוט לפי מקור' : 'Детализация по источнику'}
                </p>
                <p className="text-xs text-gray-400">
                  {language === 'he' ? 'כולל ממוצע להזמנה' : 'Включая средний чек'}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-gray-100">
                    {[
                      language === 'he' ? 'מקור' : 'Источник',
                      language === 'he' ? 'הזמנות' : 'Заказов',
                      language === 'he' ? 'הכנסות' : 'Выручка',
                      language === 'he' ? 'ממוצע להזמנה' : 'Средний чек',
                      language === 'he' ? 'נתח' : 'Доля',
                    ].map(h => (
                      <th key={h} className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(row => {
                    const meta   = getMeta(row.source)
                    const share  = totalRevenue > 0 ? Math.round((Number(row.total_revenue) / totalRevenue) * 100) : 0
                    return (
                      <tr key={row.source} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                              style={{ background: meta.color + '20' }}>
                              {meta.icon}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{meta.label}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{row.source}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm">
                            {row.orders_count}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-gray-900 text-sm">
                          {fmt(Number(row.total_revenue))}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">
                          {fmt(Number(row.avg_order))}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-20">
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${share}%`, backgroundColor: meta.color }} />
                            </div>
                            <span className="text-xs font-bold text-gray-500 tabular-nums w-8 text-end">
                              {share}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

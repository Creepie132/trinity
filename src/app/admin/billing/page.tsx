'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import {
  TrendingUp, TrendingDown, DollarSign, Users, BarChart3,
  Loader2, RefreshCw, Calendar, Infinity, Crown, Clock,
  ArrowUpRight, Sparkles,
} from 'lucide-react'

interface MrrData {
  mrr: number; arr: number; arpu: number
  activeCount: number; freeCount: number; totalCount: number
  months: { month: string; revenue: number; projected: boolean }[]
  recentPayments: { org_id: string; amount: number; status: string; created_at: string }[]
  orgBreakdown: {
    id: string; name: string; status: string
    billing_amount: number | null; subscription_expires_at: string | null
    owner_email: string; last_seen_at: string | null; created_at: string
  }[]
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  manual: 'bg-blue-50 text-blue-700 border-blue-200',
  trial:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  expired:'bg-red-50 text-red-600 border-red-200',
  none:   'bg-gray-50 text-gray-500 border-gray-200',
}

const STATUS_LABELS: Record<string, { ru: string; he: string }> = {
  active:  { ru: 'Активна',       he: 'פעיל' },
  manual:  { ru: 'Ручной доступ', he: 'גישה ידנית' },
  trial:   { ru: 'Пробный',       he: 'ניסיון' },
  expired: { ru: 'Истекла',       he: 'פג תוקף' },
  none:    { ru: 'Нет доступа',   he: 'ללא גישה' },
}

function formatMonth(key: string, lang: 'he' | 'ru') {
  const [y, m] = key.split('-')
  const date = new Date(Number(y), Number(m) - 1, 1)
  return date.toLocaleDateString(lang === 'he' ? 'he-IL' : 'ru-RU', { month: 'short', year: '2-digit' })
}

export default function BillingPage() {
  const { language } = useLanguage()
  const l = language === 'he'
  const [data, setData] = useState<MrrData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch('/api/admin/mrr')
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      toast.error(l ? 'שגיאה' : 'Ошибка загрузки')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  if (!data) return null

  const maxRevenue = Math.max(...data.months.map(m => m.revenue), 1)
  const mrrGrowth = data.months.length >= 2
    ? ((data.months[5].revenue - data.months[4].revenue) / Math.max(data.months[4].revenue, 1)) * 100
    : 0

  return (
    <div className="space-y-6 pb-16">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-500" />
            {l ? 'אנליטיקה פיננסית' : 'Финансовая аналитика'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {l ? 'MRR, ARR ומדדי הכנסה' : 'MRR, ARR и метрики дохода'}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {l ? 'רענן' : 'Обновить'}
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* MRR */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-indigo-100 text-xs font-medium uppercase tracking-wide">MRR</span>
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold">₪{data.mrr.toLocaleString()}</p>
          <div className={`flex items-center gap-1 mt-1 text-xs ${mrrGrowth >= 0 ? 'text-green-200' : 'text-red-200'}`}>
            {mrrGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {mrrGrowth === 0
              ? (l ? 'בסיס' : 'Базовый')
              : `${mrrGrowth > 0 ? '+' : ''}${mrrGrowth.toFixed(0)}%`}
          </div>
        </div>

        {/* ARR */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">ARR</span>
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">₪{data.arr.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">{l ? 'הכנסה שנתית' : 'Годовой доход'}</p>
        </div>

        {/* ARPU */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">ARPU</span>
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">₪{data.arpu}</p>
          <p className="text-xs text-gray-400 mt-1">{l ? 'ממוצע לחשבון' : 'Средний чек'}</p>
        </div>

        {/* Клиенты */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">
              {l ? 'לקוחות' : 'Клиенты'}
            </span>
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.activeCount}</p>
          <p className="text-xs text-gray-400 mt-1">
            {data.freeCount > 0 ? `+${data.freeCount} ∞ ` : ''}{l ? 'פעילים' : 'платящих'}
          </p>
        </div>
      </div>


      {/* ── MRR Chart ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            {l ? 'MRR לפי חודש' : 'MRR по месяцам'}
          </h2>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
            {l ? '6 חודשים' : '6 месяцев'}
          </span>
        </div>
        <div className="flex items-end gap-2 h-36">
          {data.months.map((m, i) => {
            const height = maxRevenue > 0 ? Math.max((m.revenue / maxRevenue) * 100, m.revenue > 0 ? 8 : 2) : 2
            const isCurrent = i === data.months.length - 1
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                <div className="relative w-full flex items-end justify-center" style={{ height: '112px' }}>
                  {m.revenue > 0 && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap">
                        ₪{m.revenue.toLocaleString()}
                      </div>
                    </div>
                  )}
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      isCurrent
                        ? 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                        : m.projected
                        ? 'bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600'
                        : 'bg-indigo-100 dark:bg-indigo-900/40'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className={`text-xs ${isCurrent ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
                  {formatMonth(m.month, language)}
                </span>
              </div>
            )
          })}
        </div>
        {data.months.every(m => m.projected) && (
          <p className="text-xs text-gray-400 text-center mt-3 bg-gray-50 rounded-lg py-2">
            {l ? 'אין היסטוריית תשלומים עדיין — מציג MRR נוכחי' : 'История платежей пуста — показан текущий MRR'}
          </p>
        )}
      </div>

      {/* ── Org Revenue Table ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 dark:border-slate-700 flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-500" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            {l ? 'פירוט לפי ארגון' : 'Разбивка по организациям'}
          </h2>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 dark:border-slate-700 text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left px-5 py-3">{l ? 'ארגון' : 'Организация'}</th>
                <th className="text-left px-5 py-3">{l ? 'סטטוס' : 'Статус'}</th>
                <th className="text-right px-5 py-3">{l ? 'חיוב חודשי' : 'MRR'}</th>
                <th className="text-right px-5 py-3">{l ? 'חיוב שנתי' : 'ARR'}</th>
                <th className="text-left px-5 py-3">{l ? 'חיוב הבא' : 'Следующий платёж'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
              {data.orgBreakdown.map(org => (
                <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{org.name}</p>
                    <p className="text-xs text-gray-400">{org.owner_email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[org.status] || STATUS_COLORS.none}`}>
                      {l ? STATUS_LABELS[org.status]?.he : STATUS_LABELS[org.status]?.ru}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {org.billing_amount != null ? (
                      <span className="font-semibold text-gray-900 dark:text-gray-100">₪{org.billing_amount}</span>
                    ) : (
                      <span className="text-emerald-600 font-bold text-lg leading-none">∞</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {org.billing_amount != null ? (
                      <span className="text-sm text-gray-500">₪{(org.billing_amount * 12).toLocaleString()}</span>
                    ) : (
                      <span className="text-emerald-500 text-sm">∞</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-500">
                      {org.subscription_expires_at
                        ? new Date(org.subscription_expires_at).toLocaleDateString(l ? 'he-IL' : 'ru-RU')
                        : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-50 dark:divide-slate-700">
          {data.orgBreakdown.map(org => (
            <div key={org.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{org.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[org.status] || STATUS_COLORS.none}`}>
                  {l ? STATUS_LABELS[org.status]?.he : STATUS_LABELS[org.status]?.ru}
                </span>
              </div>
              <div className="text-right flex-shrink-0">
                {org.billing_amount != null ? (
                  <>
                    <p className="font-bold text-gray-900 dark:text-gray-100">₪{org.billing_amount}<span className="text-xs text-gray-400 font-normal">/{l ? 'חודש' : 'мес'}</span></p>
                    <p className="text-xs text-gray-400">₪{(org.billing_amount * 12).toLocaleString()}/{l ? 'שנה' : 'год'}</p>
                  </>
                ) : (
                  <span className="text-emerald-600 font-bold text-2xl leading-none">∞</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Total row */}
        <div className="px-5 py-3.5 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {l ? 'סה"כ MRR' : 'Итого MRR'}
          </span>
          <div className="text-right">
            <span className="font-bold text-indigo-600 text-lg">₪{data.mrr.toLocaleString()}</span>
            <span className="text-xs text-gray-400 ml-2">→ ₪{data.arr.toLocaleString()}/{l ? 'שנה' : 'год'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

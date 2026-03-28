'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface RevenueLog {
  id: string
  setup_fee: number
  commission_amount: number
  entered_at: string
  deal: { id: string; title: string } | null
  client: { id: string; first_name: string; last_name: string } | null
}

interface ReportsData {
  month_fee:         number
  month_commission:  number
  month_count:       number
  total_fee:         number
  total_commission:  number
  total_count:       number
  prev_commission:   number
  percent_change:    number | null
  logs:              RevenueLog[]
  period:            { year: number; month: number }
}

function fmt(n: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
}

function monthName(m: number, lang: string) {
  return new Date(2024, m - 1, 1).toLocaleString(lang === 'he' ? 'he-IL' : 'ru-RU', { month: 'long' })
}

function timeStr(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === 'he' ? 'he-IL' : 'ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function initials(f: string, l: string) { return ((f[0] ?? '') + (l[0] ?? '')).toUpperCase() }
const AV = ['from-purple-400 to-indigo-500','from-emerald-400 to-teal-500','from-amber-400 to-orange-500','from-pink-400 to-rose-500','from-blue-400 to-cyan-500']
function avColor(name: string) { return AV[name.charCodeAt(0) % AV.length] }

export default function WorkerReportsPage() {
  const { language, dir } = useLanguage()
  const isHe = language === 'he'
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      // Load commission summary + logs in parallel
      const [commRes, logsRes] = await Promise.all([
        fetch('/api/worker/commission'),
        fetch('/api/worker/revenue-logs'),
      ])
      if (!commRes.ok) throw new Error('Failed to load')
      const comm = await commRes.json()
      const logs = logsRes.ok ? await logsRes.json() : { logs: [] }

      setData({
        month_fee:        comm.month_total_fee     ?? 0,
        month_commission: comm.month_commission    ?? 0,
        month_count:      comm.count               ?? 0,
        total_fee:        comm.total_fee           ?? 0,
        total_commission: comm.total_commission    ?? 0,
        total_count:      comm.total_count         ?? 0,
        prev_commission:  comm.prev_month_commission ?? 0,
        percent_change:   comm.percent_change,
        logs:             logs.logs ?? [],
        period:           comm.period ?? { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const trend = data?.percent_change == null ? null : data.percent_change >= 0 ? 'up' : 'down'

  return (
    <div className="min-h-full p-4 lg:p-6 space-y-5" dir={dir}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">{isHe ? '💰 דוח הכנסות' : '💰 Отчёт по доходам'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isHe ? 'עמלות ורכישות שלך' : 'Твои комиссии и сделки'}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="p-2.5 rounded-2xl bg-white/70 border border-white/60 text-gray-400 hover:text-gray-600 shadow-sm transition-all disabled:opacity-40 active:scale-95">
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
      </div>

      {error && <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* This month commission */}
        <div className="col-span-2 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-5 text-white shadow-xl shadow-emerald-200/60 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }}/>
          <div className="relative">
            <div className="flex items-start justify-between mb-2">
              <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">
                {isHe ? 'עמלה החודש' : 'Комиссия в этом месяце'} — {monthName(data?.period.month ?? new Date().getMonth()+1, language)}
              </p>
              {trend && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend === 'up' ? 'bg-white/20' : 'bg-red-400/40'}`}>
                  {trend === 'up' ? '▲' : '▼'} {Math.abs(data?.percent_change ?? 0)}%
                </span>
              )}
            </div>
            <p className="text-4xl font-black">
              {loading ? '...' : fmt(data?.month_commission ?? 0)}
            </p>
            <p className="text-emerald-100 text-sm mt-1">
              {isHe
                ? `מ-${fmt(data?.month_fee ?? 0)} עלות הקמה · ${data?.month_count ?? 0} עסקאות`
                : `из ${fmt(data?.month_fee ?? 0)} setup fee · ${data?.month_count ?? 0} сделок`}
            </p>
          </div>
        </div>

        {/* Total all time */}
        <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 shadow-lg p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{isHe ? 'סה"כ עמלות' : 'Всего комиссий'}</p>
          <p className="text-2xl font-black text-indigo-600">{loading ? '...' : fmt(data?.total_commission ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-1">{data?.total_count ?? 0} {isHe ? 'עסקאות' : 'сделок'}</p>
        </div>

        {/* Prev month */}
        <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 shadow-lg p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            {isHe ? 'חודש קודם' : 'Прошлый месяц'}
          </p>
          <p className="text-2xl font-black text-gray-700">{loading ? '...' : fmt(data?.prev_commission ?? 0)}</p>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
            <div className={`h-1.5 rounded-full transition-all ${(data?.month_commission ?? 0) >= (data?.prev_commission ?? 1) ? 'bg-emerald-500' : 'bg-amber-400'}`}
              style={{ width: `${Math.min(data?.prev_commission ? Math.round(((data?.month_commission ?? 0) / data.prev_commission) * 100) : 0, 100)}%` }}/>
          </div>
        </div>
      </div>

      {/* Deals log */}
      <div className="rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100/80 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">{isHe ? '📋 היסטוריית עסקאות' : '📋 История сделок'}</h3>
          <span className="text-xs text-gray-400">{data?.logs.length ?? 0} {isHe ? 'רשומות' : 'записей'}</span>
        </div>

        {loading ? (
          <div className="space-y-px">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-50 animate-pulse mx-4 my-2 rounded-xl" style={{ animationDelay: `${i*100}ms` }}/>)}
          </div>
        ) : !data?.logs.length ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <span className="text-4xl">📭</span>
            <p className="text-sm text-gray-400">{isHe ? 'עדיין אין עסקאות שהושלמו' : 'Завершённых сделок пока нет'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.logs.map(log => {
              const clientName = log.client
                ? `${log.client.first_name} ${log.client.last_name}`.trim()
                : (isHe ? 'לא ידוע' : 'Неизвестно')
              const color = avColor(clientName)
              return (
                <div key={log.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm`}>
                    {initials(log.client?.first_name ?? '?', log.client?.last_name ?? '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{clientName}</p>
                    <p className="text-xs text-gray-400 truncate">{log.deal?.title}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-sm font-black text-emerald-600">{fmt(log.commission_amount)}</span>
                    <span className="text-[10px] text-gray-400">{timeStr(log.entered_at, language)}</span>
                  </div>
                  <div className="shrink-0 text-center">
                    <p className="text-[10px] text-gray-400">{isHe ? 'הקמה' : 'Setup'}</p>
                    <p className="text-xs font-bold text-gray-600">{fmt(log.setup_fee)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Motivational footer */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100/80 p-4 flex items-center gap-4">
        <span className="text-3xl">🎯</span>
        <div>
          <p className="font-bold text-amber-800 text-sm">{isHe ? 'המשך כך!' : 'Так держать!'}</p>
          <p className="text-xs text-amber-600 mt-0.5">
            {isHe
              ? `${data?.total_count ?? 0} עסקאות הושלמו עד כה · ${fmt(data?.total_commission ?? 0)} הרווחת`
              : `${data?.total_count ?? 0} сделок закрыто · заработано ${fmt(data?.total_commission ?? 0)}`}
          </p>
        </div>
      </div>
    </div>
  )
}

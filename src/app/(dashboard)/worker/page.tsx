'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import Link from 'next/link'

// ─── Types (matching /api/worker/dashboard response) ─────────────────────────

interface BurningTask {
  id: string
  title: string
  due_date: string
  client_name: string | null
  urgency: 'overdue' | 'today'
}

interface KpiData {
  amount: number
  target_amount: number | null
  target_deals: number | null
  currency: string
  percent: number | null
  period: { year: number; month: number }
}

interface FunnelStage {
  name: string
  color: string
  count: number
  position: number
}

interface ActivityItem {
  id: string
  type: string
  title: string
  body: string | null
  created_at: string
}

interface DashboardData {
  burning_tasks: BurningTask[]
  kpi: KpiData
  funnel: FunnelStage[]
  my_clients_count: number
  my_active_deals: number
  activity_feed: ActivityItem[]
  settings: { phone_mask_enabled: boolean; can_view_reports: boolean }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, currency = 'ILS') {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(n)
}

function monthName(month: number, lang: string) {
  const date = new Date(2024, month - 1, 1)
  return date.toLocaleString(lang === 'he' ? 'he-IL' : 'ru-RU', { month: 'long' })
}

function timeAgo(iso: string, lang: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (lang === 'he') {
    if (mins < 1)   return 'עכשיו'
    if (mins < 60)  return `לפני ${mins} דק'`
    if (hours < 24) return `לפני ${hours} ש'`
    return `לפני ${days} ימים`
  }
  if (mins < 1)   return 'только что'
  if (mins < 60)  return `${mins} мин назад`
  if (hours < 24) return `${hours} ч назад`
  return `${days} дн назад`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
        <div className="h-3 bg-gray-100 rounded w-4/6" />
      </div>
    </div>
  )
}

function MyStatsWidget({
  clientsCount,
  activeDeals,
  lang,
}: {
  clientsCount: number
  activeDeals: number
  lang: string
}) {
  const isHe = lang === 'he'
  const stats = [
    {
      icon: '👤',
      label: isHe ? 'לקוחות מוקצים' : 'Моих клиентов',
      value: clientsCount,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
    {
      icon: '⚙️',
      label: isHe ? 'עסקאות בתהליך' : 'В работе сейчас',
      value: activeDeals,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`${s.bg} rounded-2xl px-5 py-4 flex flex-col gap-1`}
        >
          <span className="text-xl">{s.icon}</span>
          <span className={`text-3xl font-bold ${s.color}`}>{s.value}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

function BurningTasksWidget({ tasks, lang }: { tasks: BurningTask[]; lang: string }) {
  const isHe = lang === 'he'
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-2">
        {isHe ? 'אין משימות דחופות 🎉' : 'Нет срочных задач 🎉'}
      </p>
    )
  }
  return (
    <ul className="space-y-2">
      {tasks.map(t => (
        <li key={t.id} className="flex items-start gap-3">
          <span className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${
            t.urgency === 'overdue' ? 'bg-red-500' : 'bg-amber-400'
          }`} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
            {t.client_name && (
              <p className="text-xs text-gray-400 truncate">{t.client_name}</p>
            )}
          </div>
          <span className={`ms-auto shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
            t.urgency === 'overdue'
              ? 'bg-red-50 text-red-600'
              : 'bg-amber-50 text-amber-600'
          }`}>
            {t.urgency === 'overdue'
              ? (isHe ? 'פג תוקף' : 'Просрочено')
              : (isHe ? 'היום'    : 'Сегодня')}
          </span>
        </li>
      ))}
    </ul>
  )
}

function KpiWidget({ kpi, lang }: { kpi: KpiData; lang: string }) {
  const isHe    = lang === 'he'
  const percent  = kpi.percent ?? 0
  const barWidth = Math.min(percent, 100)
  const month    = monthName(kpi.period.month, lang)

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold text-gray-900">
          {fmt(kpi.amount, kpi.currency)}
        </span>
        {kpi.target_amount && (
          <span className="text-sm text-gray-400">
            {isHe ? `יעד: ${fmt(kpi.target_amount, kpi.currency)}`
                  : `план: ${fmt(kpi.target_amount, kpi.currency)}`}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-700 ${
            percent >= 100 ? 'bg-emerald-500' :
            percent >= 60  ? 'bg-blue-500'    : 'bg-amber-400'
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      <p className="text-xs text-gray-400">
        {isHe ? `${month} — ${percent}% מהיעד` : `${month} — ${percent}% от плана`}
      </p>
    </div>
  )
}

function FunnelWidget({ stages, lang }: { stages: FunnelStage[]; lang: string }) {
  const isHe = lang === 'he'
  const max  = Math.max(...stages.map(s => s.count), 1)

  if (stages.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        {isHe ? 'אין עסקאות פתוחות' : 'Нет открытых сделок'}
      </p>
    )
  }
  return (
    <div className="space-y-2">
      {stages.map(s => (
        <div key={s.name} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-24 truncate shrink-0">{s.name}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${Math.round((s.count / max) * 100)}%`,
                backgroundColor: s.color,
              }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-6 text-right shrink-0">
            {s.count}
          </span>
        </div>
      ))}
    </div>
  )
}

function ActivityFeedWidget({ items, lang }: { items: ActivityItem[]; lang: string }) {
  const isHe = lang === 'he'
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        {isHe ? 'אין פעילות אחרונה' : 'Нет последней активности'}
      </p>
    )
  }
  return (
    <ul className="space-y-3">
      {items.map(item => (
        <li key={item.id} className="flex gap-3">
          <div className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-xs">
            {item.type === 'call'    ? '📞' :
             item.type === 'note'    ? '📝' :
             item.type === 'email'   ? '✉️' :
             item.type === 'whatsapp'? '💬' : '⚡'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-800 font-medium truncate">{item.title}</p>
            {item.body && (
              <p className="text-xs text-gray-400 truncate">{item.body}</p>
            )}
          </div>
          <span className="shrink-0 text-xs text-gray-300">
            {timeAgo(item.created_at, lang)}
          </span>
        </li>
      ))}
    </ul>
  )
}

// ─── Widget card wrapper ──────────────────────────────────────────────────────

function Widget({
  title, action, children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkerDashboardPage() {
  const { language } = useLanguage()
  const isHe = language === 'he'

  const [data,    setData]    = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/worker/dashboard', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-gray-50 p-4 md:p-6"
      dir={isHe ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isHe ? 'לוח הבקרה שלי' : 'Мой дашборд'}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/worker/pipeline"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            {isHe ? 'פייפליין' : 'Пайплайн'} →
          </Link>
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
            title={isHe ? 'רענן' : 'Обновить'}
          >
            ↻
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {isHe ? `שגיאה: ${error}` : `Ошибка: ${error}`}
        </div>
      )}

      {/* Skeleton */}
      {loading && !data && (
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard /><SkeletonCard />
          <SkeletonCard /><SkeletonCard />
        </div>
      )}

      {/* Dashboard grid */}
      {data && (
        <div className="grid gap-4 md:grid-cols-2">

          {/* 0. My Stats — spans both columns */}
          <div className="md:col-span-2">
            <MyStatsWidget
              clientsCount={data.my_clients_count}
              activeDeals={data.my_active_deals}
              lang={language}
            />
          </div>

          {/* 1. Burning Tasks */}
          <Widget
            title={isHe ? '🔥 משימות דחופות' : '🔥 Срочные задачи'}
            action={
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                data.burning_tasks.length > 0
                  ? 'bg-red-50 text-red-500'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {data.burning_tasks.length}
              </span>
            }
          >
            <BurningTasksWidget tasks={data.burning_tasks} lang={language} />
          </Widget>

          {/* 2. KPI */}
          <Widget title={isHe ? '📊 ביצועים חודשיים' : '📊 Выполнение плана'}>
            <KpiWidget kpi={data.kpi} lang={language} />
          </Widget>

          {/* 3. Funnel */}
          <Widget
            title={isHe ? '📈 משפך מכירות' : '📈 Воронка продаж'}
            action={
              <Link
                href="/worker/pipeline"
                className="text-xs text-indigo-500 hover:text-indigo-700"
              >
                {isHe ? 'לפייפליין ←' : '→ в пайплайн'}
              </Link>
            }
          >
            <FunnelWidget stages={data.funnel} lang={language} />
          </Widget>

          {/* 4. Activity Feed */}
          <Widget title={isHe ? '⚡ פעילות אחרונה' : '⚡ Последняя активность'}>
            <ActivityFeedWidget items={data.activity_feed} lang={language} />
          </Widget>

        </div>
      )}
    </div>
  )
}

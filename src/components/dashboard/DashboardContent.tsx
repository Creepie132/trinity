'use client'

import { useEffect, useState, useRef, ReactNode, useCallback } from 'react'
import { Users, Calendar, TrendingUp, Receipt, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useProducts } from '@/hooks/useProducts'
import { useLanguage } from '@/contexts/LanguageContext'
import { TodayVisitsWidget } from './TodayVisitsWidget'
import { TodayTasksWidget } from './TodayTasksWidget'
import { RevenueChartWidget } from './RevenueChartWidget'
import { IncomeExpensesWidget } from './IncomeExpensesWidget'
import FABMenu from './FABMenu'
import { VisitDetailModal } from '@/components/visits/VisitDetailModal'
import { useModalStore } from '@/store/useModalStore'
import { WorkShiftWidget } from './WorkShiftWidget'
import { useBranch } from '@/contexts/BranchContext'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
const OnboardingWizard = dynamic(() => import('@/components/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })), { ssr: false })
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { DashboardAutoTour } from '@/components/demo/DashboardAutoTour'

interface DashboardContentProps { orgId: string }

interface StatsData {
  clients: { value: number; change: number }
  visits: { value: number; change: number }
  revenue: { value: number; change: number }
  avgCheck: { value: number; change: number }
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    if (target === prev.current) return
    const start = prev.current
    const diff = target - start
    const startTime = performance.now()
    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(start + diff * ease))
      if (progress < 1) requestAnimationFrame(tick)
      else prev.current = target
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return value
}

function LowStockAlert({ locale }: { locale: string }) {
  const { data: products = [] } = useProducts()
  const l = locale === 'he'
  const lowStock = products.filter((p: any) => p.quantity > 0 && p.min_quantity > 0 && p.quantity <= p.min_quantity)
  const outOfStock = products.filter((p: any) => (p.quantity || 0) === 0)
  const total = lowStock.length + outOfStock.length
  if (total === 0) return null
  return (
    <Link href="/inventory" className="flex items-center gap-3 mb-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-4 py-3 hover:shadow-md hover:border-amber-300 transition-all group">
      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
        <AlertTriangle size={16} className="text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">{l ? `⚠️ ${total} מוצרים מסתיימים!` : `⚠️ ${total} товаров заканчивается!`}</p>
        <p className="text-xs text-amber-600 truncate">
          {lowStock.slice(0, 3).map((p: any) => p.name).join(', ')}
          {total > 3 ? (l ? ` ועוד ${total - 3}...` : ` и ещё ${total - 3}...`) : ''}
        </p>
      </div>
      <span className="text-xs text-amber-600 font-medium flex-shrink-0">{l ? 'לפרטים →' : 'Подробнее →'}</span>
    </Link>
  )
}

interface KpiCardProps {
  title: string; value: number; prefix?: string
  icon: ReactNode; gradient: string; iconBg: string
  delay?: number; trend?: number
  onClick?: () => void
  periodLabel?: string
}

function KpiCard({ title, value, prefix = '', icon, gradient, iconBg, delay = 0, trend, onClick, periodLabel }: KpiCardProps) {
  const animated = useCountUp(value, 1000)
  const [visible, setVisible] = useState(false)
  const [pressed, setPressed] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t) }, [delay])

  const handleClick = () => {
    if (!onClick) return
    setPressed(true)
    setTimeout(() => setPressed(false), 200)
    onClick()
  }

  return (
    <div
      onClick={handleClick}
      className={`relative overflow-hidden rounded-2xl p-4 shadow-sm transition-all duration-500 ${gradient}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
        ${onClick ? 'cursor-pointer active:scale-95 hover:shadow-md hover:brightness-110' : ''}
        ${pressed ? 'scale-95 brightness-110' : ''}
      `}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
      <div className="absolute -right-1 -bottom-6 w-14 h-14 rounded-full bg-white/5" />
      <div className="relative flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-white/80 uppercase tracking-wide">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>{icon}</div>
      </div>
      <p className="relative text-3xl font-bold text-white tracking-tight">{prefix}{animated.toLocaleString()}</p>
      <div className="relative mt-2 flex items-center justify-between gap-1">
        {trend !== undefined ? (
          <div className="flex items-center gap-1">
            <span className={`text-xs font-semibold ${trend >= 0 ? 'text-white/90' : 'text-white/60'}`}>{trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%</span>
            <span className="text-xs text-white/50">vs прошлый период</span>
          </div>
        ) : <div />}
        {periodLabel && (
          <span className="text-[10px] font-bold text-white/60 bg-white/10 px-2 py-0.5 rounded-full border border-white/10 animate-in fade-in duration-300">
            {periodLabel}
          </span>
        )}
      </div>
      {onClick && (
        <div className="absolute bottom-2 right-2 opacity-30">
          <span className="text-[9px] text-white">↻</span>
        </div>
      )}
    </div>
  )
}

function ActivityStrip({ visitsToday, visitsDone, tasksOpen, tasksUrgent, revenueToday, locale }: {
  visitsToday: number; visitsDone: number; tasksOpen: number
  tasksUrgent: number; revenueToday: number; locale: string
}) {
  const l = locale === 'he'
  const items = [
    {
      icon: '📅',
      value: visitsToday,
      // главная подпись — короткая, всегда читаема
      label: l ? 'визит...' : 'визит...',
      labelFull: l ? 'ביקורים היום' : 'Визиты',
      // sub — прогресс завершённых
      sub: `${visitsDone}/${visitsToday} ${l ? 'הושלמו' : 'завершено'}`,
      color: 'bg-blue-50 border-blue-100',
      valueColor: 'text-blue-700',
    },
    {
      icon: '✅',
      value: tasksOpen,
      labelFull: l ? 'משימות' : 'Задачи',
      sub: tasksUrgent > 0 ? `${tasksUrgent} ${l ? 'דחוף' : 'срочных'}` : (l ? 'פתוחות' : 'открыто'),
      color: tasksUrgent > 0 ? 'bg-red-50 border-red-100' : 'bg-purple-50 border-purple-100',
      valueColor: tasksUrgent > 0 ? 'text-red-700' : 'text-purple-700',
    },
    {
      icon: '💰',
      value: revenueToday,
      prefix: '₪',
      labelFull: l ? 'הכנסות' : 'Доход',
      sub: l ? 'היום' : 'сегодня',
      color: 'bg-emerald-50 border-emerald-100',
      valueColor: 'text-emerald-700',
    },
  ]
  return (
    <div className="grid grid-cols-3 gap-2 mb-5">
      {items.map((item: any, i) => (
        <div key={i} className={`flex flex-col items-center justify-center gap-0.5 px-2 py-3 rounded-xl border ${item.color} transition-all text-center`}>
          {/* Иконка */}
          <span className="text-xl leading-none mb-0.5">{item.icon}</span>
          {/* Значение — крупно, никогда не обрезается */}
          <p className={`text-base font-extrabold leading-tight ${item.valueColor}`}>
            {item.prefix || ''}{item.value.toLocaleString()}
          </p>
          {/* Лейбл — короткий */}
          <p className="text-[11px] font-semibold text-gray-500 leading-tight">{item.labelFull}</p>
          {/* Под-строка — прогресс или срочных */}
          {item.sub && (
            <p className="text-[10px] text-gray-400 leading-tight">{item.sub}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function GreetingHeader({ ownerName, todayVisitsCount, locale }: { ownerName: string; todayVisitsCount: number; locale: string }) {
  const l = locale === 'he'
  const hour = new Date().getHours()
  const greeting = l ? (hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב') : (hour < 12 ? 'Доброе утро' : hour < 17 ? 'Добрый день' : 'Добрый вечер')
  const firstName = ownerName?.split(' ')[0] || ''
  const today = new Date().toLocaleDateString(l ? 'he-IL' : 'ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div className="mb-5 flex items-start justify-between flex-wrap gap-2">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{greeting}{firstName ? `, ${firstName}` : ''} 👋</h2>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">{today}</p>
      </div>
      {todayVisitsCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-100">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-sm font-medium text-blue-700">{l ? `${todayVisitsCount} ביקורים היום` : `${todayVisitsCount} визитов сегодня`}</span>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function DashboardContent({ orgId: _orgIdProp }: DashboardContentProps) {
  const { language } = useLanguage()
  const locale = language
  const { openModal } = useModalStore()
  const { activeOrgId } = useBranch()
  const { orgId: authOrgId } = useAuth()
  const router = useRouter()

  const orgId = _orgIdProp || activeOrgId || authOrgId
  const [isDemoMode, setIsDemoMode] = useState(false)

  // ── Периоды для Дохода и Среднего чека ──
  const PERIODS = [1, 7, 30, 90] as const
  type Period = typeof PERIODS[number]
  const [revenuePeriod, setRevenuePeriod] = useState<Period>(30)
  const [avgCheckPeriod, setAvgCheckPeriod] = useState<Period>(30)

  const periodLabel = useCallback((days: Period, l: boolean) => {
    if (days === 1)  return l ? 'היום' : 'Сегодня'
    if (days === 7)  return l ? '7 ימים' : '7 дней'
    if (days === 30) return l ? 'חודש' : 'Месяц'
    return l ? '90 ימים' : '90 дней'
  }, [])

  const nextPeriod = (cur: Period): Period => {
    const idx = PERIODS.indexOf(cur)
    return PERIODS[(idx + 1) % PERIODS.length]
  }
  const STALE_STATS    = isDemoMode ? 10 * 60_000 : 2 * 60_000
  const STALE_VISITS   = isDemoMode ? 10 * 60_000 : 60_000
  const STALE_REVENUE  = isDemoMode ? 15 * 60_000 : 5 * 60_000
  const STALE_TASKS    = isDemoMode ? 10 * 60_000 : 60_000

  // Периодные данные для Дохода
  const { data: revenuePeriodStats } = useQuery({
    queryKey: ['dashboard-stats-period', orgId, revenuePeriod],
    enabled: !!orgId && revenuePeriod !== 30,
    staleTime: STALE_STATS,
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stats?org_id=${orgId}&days=${revenuePeriod}`)
      if (!res.ok) return null
      return res.json()
    },
  })

  // Периодные данные для Среднего чека
  const { data: avgCheckPeriodStats } = useQuery({
    queryKey: ['dashboard-stats-period', orgId, avgCheckPeriod],
    enabled: !!orgId && avgCheckPeriod !== 30,
    staleTime: STALE_STATS,
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stats?org_id=${orgId}&days=${avgCheckPeriod}`)
      if (!res.ok) return null
      return res.json()
    },
  })
  const supabase = createSupabaseBrowserClient()
  const [selectedVisit, setSelectedVisit] = useState<any>(null)

  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding-check', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const { data: org, error } = await supabase.from('organizations').select('name, features').eq('id', orgId).single()
      if (error || !org) return { showOnboarding: false, organizationName: '', ownerName: '' }
      return {
        // Never show onboarding for demo/trial orgs — they are pre-configured
        showOnboarding: !org.features?.onboarding_completed && !org.features?.is_demo && !(org.features as any)?.is_trial,
        organizationName: org.name || '',
        ownerName: (org.features as any)?.business_info?.owner_name || '',
      }
    },
  })

  useEffect(() => {
    if ((onboardingData as any)?.isDemoOrg) setIsDemoMode(true)
  }, [(onboardingData as any)?.isDemoOrg])

  const { data: stats } = useQuery<StatsData>({
    queryKey: ['dashboard-stats', orgId],
    enabled: !!orgId,
    staleTime: STALE_STATS,
    gcTime: STALE_STATS * 2,
    retry: false,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stats?org_id=${orgId}`)
      if (!res.ok) throw new Error('stats fetch failed')
      return res.json()
    },
  })

  const { data: todayVisits = [] } = useQuery({
    queryKey: ['dashboard-today', orgId],
    enabled: !!orgId,
    staleTime: STALE_VISITS,
    gcTime: STALE_VISITS * 2,
    retry: false,
    queryFn: async () => {
      const res = await fetch('/api/dashboard/today')
      if (!res.ok) return []
      return res.json()
    },
  })

  const { data: revenueData = [] } = useQuery({
    queryKey: ['dashboard-revenue', orgId],
    enabled: !!orgId,
    staleTime: STALE_REVENUE,
    gcTime: STALE_REVENUE * 2,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/revenue?org_id=${orgId}&days=7`)
      if (!res.ok) return []
      return res.json()
    },
  })

  const { data: todayTasksRaw = [] } = useQuery({
    queryKey: ['dashboard-tasks', orgId],
    enabled: !!orgId,
    staleTime: STALE_TASKS,
    gcTime: STALE_TASKS * 2,
    retry: false,
    queryFn: async () => {
      const res = await fetch('/api/tasks?status=open')
      if (!res.ok) return []
      return res.json()
    },
  })

  // Та же логика что и в дневнике (getBucket) — показываем задачи bucket 'today' и 'burning'
  const todayTasks = (todayTasksRaw as any[]).filter((t: any) => {
    if (!t.title) return false
    if (t.status === 'completed' || t.status === 'cancelled' || t.status === 'done') return false
    const due = t.due_date ? new Date(t.due_date) : null
    const now = new Date()
    const todayStr = now.toLocaleDateString()
    const tomorrowStr = new Date(now.getTime() + 86400000).toLocaleDateString()
    // urgent — всегда показываем
    if (t.priority === 'urgent') return true
    // просрочено — показываем
    if (due && due.toLocaleDateString() !== todayStr && due < now) return true
    // high + сегодня — показываем
    if (t.priority === 'high' && due && due.toLocaleDateString() === todayStr) return true
    // сегодня
    if (due && due.toLocaleDateString() === todayStr) return true
    // завтра — дневник тоже показывает в "СЕГОДНЯ"
    if (due && due.toLocaleDateString() === tomorrowStr) return true
    // high без даты — дневник кладёт в 'today'
    if (t.priority === 'high' && !due) return true
    // in_progress — дневник кладёт в 'today'
    if (t.status === 'in_progress') return true
    // без даты и не high — не показываем (иначе всё подряд попадёт)
    return false
  }).slice(0, 5)

  async function updateVisitStatus(visitId: string, status: string) {
    await fetch(`/api/visits/${visitId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    setSelectedVisit(null)
  }

  const revenueToday = (revenueData as any[])[(revenueData as any[]).length - 1]?.amount || 0

  // ⚡ Каркас рендерится МГНОВЕННО — без полноэкранного блокирующего скелетона.
  // KPI-карточки анимируются от 0 до реального значения — это и есть их loading state.
  const l = locale === 'he'
  // Пока stats не пришли — используем нули; KpiCard покажет анимацию countUp от 0
  const s: StatsData = stats ?? {
    clients:  { value: 0, change: 0 },
    visits:   { value: 0, change: 0 },
    revenue:  { value: 0, change: 0 },
    avgCheck: { value: 0, change: 0 },
  }

  return (
    <>
      {/* ▼ id="demo-step-dashboard" — якорь для тура driver.js */}
      <div id="demo-step-dashboard" className="p-4 md:p-6">
        <GreetingHeader ownerName={onboardingData?.ownerName || ''} todayVisitsCount={todayVisits.length} locale={locale} />
        <ActivityStrip visitsToday={todayVisits.length} visitsDone={(todayVisits as any[]).filter((v: any) => v.status === 'completed').length} tasksOpen={todayTasks.length} tasksUrgent={todayTasks.filter((t: any) => t.priority === 'urgent').length} revenueToday={revenueToday} locale={locale} />
        <LowStockAlert locale={locale} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <KpiCard
            title={l ? 'לקוחות' : 'Клиенты'}
            value={s.clients.value}
            icon={<Users size={18} className="text-white" />}
            gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            iconBg="bg-white/20" delay={0}
            onClick={() => router.push('/clients')}
          />
          <KpiCard
            title={l ? 'ביקורים החודש' : 'Визиты за месяц'}
            value={s.visits.value}
            icon={<Calendar size={18} className="text-white" />}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            iconBg="bg-white/20" delay={80}
            onClick={() => router.push('/visits')}
          />
          <KpiCard
            title={l ? 'הכנסות' : 'Доход'}
            value={revenuePeriod !== 30 && revenuePeriodStats ? revenuePeriodStats.revenue.value : s.revenue.value}
            prefix="₪"
            icon={<TrendingUp size={18} className="text-white" />}
            gradient="bg-gradient-to-br from-amber-500 to-orange-500"
            iconBg="bg-white/20" delay={160}
            trend={revenuePeriod !== 30 && revenuePeriodStats ? Math.round(revenuePeriodStats.revenue.change) : (s.revenue.change !== 0 ? Math.round(s.revenue.change) : undefined)}
            onClick={() => setRevenuePeriod(p => nextPeriod(p))}
            periodLabel={periodLabel(revenuePeriod, l)}
          />
          <KpiCard
            title={l ? 'צ׳ק ממוצע' : 'Средний чек'}
            value={avgCheckPeriod !== 30 && avgCheckPeriodStats ? avgCheckPeriodStats.avgCheck.value : s.avgCheck.value}
            prefix="₪"
            icon={<Receipt size={18} className="text-white" />}
            gradient="bg-gradient-to-br from-purple-500 to-violet-600"
            iconBg="bg-white/20" delay={240}
            trend={avgCheckPeriod !== 30 && avgCheckPeriodStats ? Math.round(avgCheckPeriodStats.avgCheck.change) : (s.avgCheck.change !== 0 ? Math.round(s.avgCheck.change) : undefined)}
            onClick={() => setAvgCheckPeriod(p => nextPeriod(p))}
            periodLabel={periodLabel(avgCheckPeriod, l)}
          />
        </div>

        <div className="space-y-5">
          <WorkShiftWidget />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TodayVisitsWidget visits={todayVisits} locale={locale} onVisitClick={setSelectedVisit} />
            <TodayTasksWidget tasks={todayTasks} locale={locale} orgId={orgId} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RevenueChartWidget data={revenueData} locale={locale} />
            <IncomeExpensesWidget locale={locale} />
          </div>

        </div>
      </div>

      <div className="lg:hidden"><FABMenu /></div>

      {selectedVisit && (
        <VisitDetailModal visit={selectedVisit} isOpen={!!selectedVisit} onClose={() => setSelectedVisit(null)} locale={locale === 'he' ? 'he' : 'ru'} clientName={selectedVisit.clients ? `${selectedVisit.clients.first_name || ''} ${selectedVisit.clients.last_name || ''}`.trim() : selectedVisit.clientName || ''} clientPhone={selectedVisit.clients?.phone || ''}
          onStart={() => updateVisitStatus(selectedVisit.id, 'in_progress')} onComplete={() => updateVisitStatus(selectedVisit.id, 'completed')} onCancel={() => updateVisitStatus(selectedVisit.id, 'cancelled')}
          onEdit={() => { openModal('visit-unified', { mode: 'edit', visit: selectedVisit }); setSelectedVisit(null) }} />
      )}

      {onboardingData?.showOnboarding && orgId && (
        <OnboardingWizard open={true} organizationName={onboardingData.organizationName} />
      )}

      {/* Авто-тур для демо-витрины — запускается по localStorage-флагу */}
      <DashboardAutoTour />
    </>
  )
}

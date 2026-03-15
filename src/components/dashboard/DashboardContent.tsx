'use client'

import { useEffect, useState, useRef, ReactNode } from 'react'
import { Users, Calendar, TrendingUp, Receipt, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useProducts } from '@/hooks/useProducts'
import { useLanguage } from '@/contexts/LanguageContext'
import { TodayVisitsWidget } from './TodayVisitsWidget'
import { TodayTasksWidget } from './TodayTasksWidget'
import { RevenueChartWidget } from './RevenueChartWidget'
import { IncomeExpensesWidget } from './IncomeExpensesWidget'
import { QuickActionsPanel } from './QuickActionsPanel'
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

interface DashboardContentProps { orgId: string }

interface StatsData {
  clients: { value: number; change: number }
  visits: { value: number; change: number }
  revenue: { value: number; change: number }
  avgCheck: { value: number; change: number }
}

// ─── CountUp hook ──────────────────────────────────────────────────────────────
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

// ─── Low Stock Alert ──────────────────────────────────────────────────────────
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
        <p className="text-sm font-semibold text-amber-800">
          {l ? `⚠️ ${total} מוצרים מסתיימים!` : `⚠️ ${total} товаров заканчивается!`}
        </p>
        <p className="text-xs text-amber-600 truncate">
          {lowStock.slice(0, 3).map((p: any) => p.name).join(', ')}
          {total > 3 ? (l ? ` ועוד ${total - 3}...` : ` и ещё ${total - 3}...`) : ''}
        </p>
      </div>
      <span className="text-xs text-amber-600 font-medium flex-shrink-0">{l ? 'לפרטים →' : 'Подробнее →'}</span>
    </Link>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  title: string; value: number; prefix?: string
  icon: ReactNode; gradient: string; iconBg: string
  delay?: number; trend?: number
}

function KpiCard({ title, value, prefix = '', icon, gradient, iconBg, delay = 0, trend }: KpiCardProps) {
  const animated = useCountUp(value, 1000)
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t) }, [delay])
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 shadow-sm transition-all duration-500 ${gradient} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
      <div className="absolute -right-1 -bottom-6 w-14 h-14 rounded-full bg-white/5" />
      <div className="relative flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-white/80 uppercase tracking-wide">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>{icon}</div>
      </div>
      <p className="relative text-3xl font-bold text-white tracking-tight">{prefix}{animated.toLocaleString()}</p>
      {trend !== undefined && (
        <div className="relative mt-2 flex items-center gap-1">
          <span className={`text-xs font-semibold ${trend >= 0 ? 'text-white/90' : 'text-white/60'}`}>{trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%</span>
          <span className="text-xs text-white/50">vs прошлый месяц</span>
        </div>
      )}
    </div>
  )
}

// ─── Activity Strip ───────────────────────────────────────────────────────────
function ActivityStrip({ visitsToday, visitsDone, tasksOpen, tasksUrgent, revenueToday, locale }: {
  visitsToday: number; visitsDone: number; tasksOpen: number
  tasksUrgent: number; revenueToday: number; locale: string
}) {
  const l = locale === 'he'
  const items = [
    { icon: '📅', value: visitsToday, label: l ? 'ביקורים היום' : 'визитов сегодня', sub: visitsToday > 0 ? `${visitsDone}/${visitsToday} ${l ? 'הושלמו' : 'завершено'}` : null, color: 'bg-blue-50 border-blue-100', valueColor: 'text-blue-700' },
    { icon: '✅', value: tasksOpen, label: l ? 'משימות פתוחות' : 'задач открыто', sub: tasksUrgent > 0 ? `${tasksUrgent} ${l ? 'דחוף' : 'срочных'}` : null, color: tasksUrgent > 0 ? 'bg-red-50 border-red-100' : 'bg-purple-50 border-purple-100', valueColor: tasksUrgent > 0 ? 'text-red-700' : 'text-purple-700' },
    { icon: '💰', value: revenueToday, label: l ? 'הכנסות היום' : 'доход сегодня', prefix: '₪', sub: null, color: 'bg-emerald-50 border-emerald-100', valueColor: 'text-emerald-700' },
  ]
  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      {items.map((item: any, i) => (
        <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${item.color} transition-all`}>
          <span className="text-lg">{item.icon}</span>
          <div className="min-w-0">
            <p className={`text-sm font-bold ${item.valueColor} leading-tight`}>{item.prefix}{item.value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 truncate">{item.label}</p>
            {item.sub && <p className="text-xs font-medium text-gray-500">{item.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Greeting ─────────────────────────────────────────────────────────────────
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

  // ВАЖНО: _orgIdProp — activeOrgId с сервера (источник истины при первом рендере).
  // activeOrgId из useBranch() может быть null пока BranchContext не инициализирован.
  // Используем _orgIdProp как приоритет — он совпадает с ключом в HydrationBoundary cache.
  // После инициализации BranchContext activeOrgId возьмёт управление (смена филиала).
  const orgId = _orgIdProp || activeOrgId || authOrgId
  const supabase = createSupabaseBrowserClient()

  const [selectedVisit, setSelectedVisit] = useState<any>(null)

  // ── 1. Onboarding check ───────────────────────────────────────────────────
  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding-check', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const { data: org, error } = await supabase.from('organizations').select('name, features').eq('id', orgId).single()
      if (error || !org) return { showOnboarding: false, organizationName: '', ownerName: '' }
      return {
        showOnboarding: !org.features?.onboarding_completed,
        organizationName: org.name || '',
        ownerName: (org.features as any)?.business_info?.owner_name || '',
      }
    },
  })

  // ── 2. KPI stats — server-side aggregated, no raw data transfer ───────────
  const { data: stats, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ['dashboard-stats', orgId],
    enabled: !!orgId,
    staleTime: 2 * 60_000,
    retry: false,
    // placeholderData: keepPreviousData — не мигаем при refetch
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stats?org_id=${orgId}`)
      if (!res.ok) throw new Error('stats fetch failed')
      return res.json()
    },
  })

  // ── 3. Today's visits ─────────────────────────────────────────────────────
  const { data: todayVisits = [] } = useQuery({
    queryKey: ['dashboard-today', orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const res = await fetch('/api/dashboard/today')
      if (!res.ok) return []
      return res.json()
    },
  })

  // ── 4. Revenue chart — 7 days, server-aggregated ──────────────────────────
  const { data: revenueData = [] } = useQuery({
    queryKey: ['dashboard-revenue', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/revenue?org_id=${orgId}&days=7`)
      if (!res.ok) return []
      return res.json()
    },
  })

  // ── 5. Today's tasks — only today's open tasks ────────────────────────────
  const { data: todayTasksRaw = [] } = useQuery({
    queryKey: ['dashboard-tasks', orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const res = await fetch('/api/tasks?status=open')
      if (!res.ok) return []
      return res.json()
    },
  })

  // Filter today's tasks on client — lightweight op on already-small dataset
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const todayEnd = new Date(); todayEnd.setHours(23,59,59,999)
  const todayTasks = (todayTasksRaw as any[]).filter((t: any) => {
    if (!t.due_date && !t.title) return false
    if (t.due_date) { const d = new Date(t.due_date); return d >= todayStart && d <= todayEnd }
    return !!t.client_id
  }).slice(0, 5)

  async function updateVisitStatus(visitId: string, status: string) {
    await fetch(`/api/visits/${visitId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    setSelectedVisit(null)
  }

  const revenueToday = (revenueData as any[])[(revenueData as any[]).length - 1]?.amount || 0

  // Показываем скелетон только если нет данных вообще (не при refetch)
  // Если данные пришли с сервера через HydrationBoundary — stats уже есть, скелетон не нужен
  if (statsLoading && !stats) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-5 h-12 w-64 rounded-xl bg-gray-100 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ background: `hsl(${220 + i * 30}, 60%, 90%)` }} />)}
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5">{[1,2,3].map(i => <div key={i} className="rounded-xl h-16 bg-gray-100 animate-pulse" />)}</div>
      </div>
    )
  }

  const l = locale === 'he'
  const s = stats!

  return (
    <>
      <div className="p-4 md:p-6">
        <GreetingHeader ownerName={onboardingData?.ownerName || ''} todayVisitsCount={todayVisits.length} locale={locale} />
        <ActivityStrip visitsToday={todayVisits.length} visitsDone={(todayVisits as any[]).filter((v: any) => v.status === 'completed').length} tasksOpen={todayTasks.length} tasksUrgent={todayTasks.filter((t: any) => t.priority === 'urgent').length} revenueToday={revenueToday} locale={locale} />
        <LowStockAlert locale={locale} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <KpiCard title={l ? 'לקוחות' : 'Клиенты'} value={s.clients.value} icon={<Users size={18} className="text-white" />} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" iconBg="bg-white/20" delay={0} />
          <KpiCard title={l ? 'ביקורים החודש' : 'Визиты за месяц'} value={s.visits.value} icon={<Calendar size={18} className="text-white" />} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" iconBg="bg-white/20" delay={80} />
          <KpiCard title={l ? 'הכנסות' : 'Доход'} value={s.revenue.value} prefix="₪" icon={<TrendingUp size={18} className="text-white" />} gradient="bg-gradient-to-br from-amber-500 to-orange-500" iconBg="bg-white/20" delay={160} trend={s.revenue.change !== 0 ? Math.round(s.revenue.change) : undefined} />
          <KpiCard title={l ? 'צ׳ק ממוצע' : 'Средний чек'} value={s.avgCheck.value} prefix="₪" icon={<Receipt size={18} className="text-white" />} gradient="bg-gradient-to-br from-purple-500 to-violet-600" iconBg="bg-white/20" delay={240} trend={s.avgCheck.change !== 0 ? Math.round(s.avgCheck.change) : undefined} />
        </div>

        <div className="space-y-5">
          <WorkShiftWidget />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TodayVisitsWidget visits={todayVisits} locale={locale} onVisitClick={setSelectedVisit} />
            <TodayTasksWidget tasks={todayTasks} locale={locale} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RevenueChartWidget data={revenueData} locale={locale} />
            <IncomeExpensesWidget locale={locale} />
          </div>
          <div className="xl:hidden"><QuickActionsPanel locale={locale} /></div>
        </div>
      </div>

      <div className="lg:hidden"><FABMenu /></div>

      {selectedVisit && (
        <VisitDetailModal visit={selectedVisit} isOpen={!!selectedVisit} onClose={() => setSelectedVisit(null)} locale={locale === 'he' ? 'he' : 'ru'} clientName={selectedVisit.clients ? `${selectedVisit.clients.first_name || ''} ${selectedVisit.clients.last_name || ''}`.trim() : selectedVisit.clientName || ''} clientPhone={selectedVisit.clients?.phone || ''}
          onStart={() => updateVisitStatus(selectedVisit.id, 'in_progress')} onComplete={() => updateVisitStatus(selectedVisit.id, 'completed')} onCancel={() => updateVisitStatus(selectedVisit.id, 'cancelled')}
          onEdit={() => { openModal('edit-visit', { visitId: selectedVisit.id, visit: selectedVisit }); setSelectedVisit(null) }} />
      )}

      {onboardingData?.showOnboarding && orgId && (
        <OnboardingWizard open={true} organizationName={onboardingData.organizationName} />
      )}
    </>
  )
}

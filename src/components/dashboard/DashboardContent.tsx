'use client'

import { useEffect, useState, useRef, ReactNode } from 'react'
import { Users, Calendar, TrendingUp, Receipt, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useProducts } from '@/hooks/useProducts'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { WidgetCard } from '@/components/ui/WidgetCard'
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
interface StatsData { clients: number; visits: number; revenue: number; avgCheck: number }

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
      // ease-out cubic
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

// ─── KPI Card с градиентом, countup и трендом ─────────────────────────────────
interface KpiCardProps {
  title: string
  value: number
  prefix?: string
  icon: ReactNode
  gradient: string
  iconBg: string
  delay?: number
  trend?: number   // % изменение к пред. месяцу, undefined = не показывать
}

function KpiCard({ title, value, prefix = '', icon, gradient, iconBg, delay = 0, trend }: KpiCardProps) {
  const animated = useCountUp(value, 1000)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 shadow-sm transition-all duration-500
        ${gradient}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Декоративный круг */}
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
      <div className="absolute -right-1 -bottom-6 w-14 h-14 rounded-full bg-white/5" />

      <div className="relative flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-white/80 uppercase tracking-wide">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
      </div>

      <p className="relative text-3xl font-bold text-white tracking-tight">
        {prefix}{animated.toLocaleString()}
      </p>

      {trend !== undefined && (
        <div className="relative mt-2 flex items-center gap-1">
          <span className={`text-xs font-semibold ${trend >= 0 ? 'text-white/90' : 'text-white/60'}`}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
          <span className="text-xs text-white/50">
            {trend >= 0 ? 'vs прошлый месяц' : 'vs прошлый месяц'}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Activity Strip — компактная полоска активности за сегодня ───────────────
function ActivityStrip({ visitsToday, visitsDone, tasksOpen, tasksUrgent, revenueToday, locale }: {
  visitsToday: number; visitsDone: number; tasksOpen: number
  tasksUrgent: number; revenueToday: number; locale: string
}) {
  const l = locale === 'he'
  const items = [
    {
      icon: '📅',
      value: visitsToday,
      label: l ? 'ביקורים היום' : 'визитов сегодня',
      sub: visitsToday > 0 ? `${visitsDone}/${visitsToday} ${l ? 'הושלמו' : 'завершено'}` : null,
      color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800',
      valueColor: 'text-blue-700 dark:text-blue-300',
    },
    {
      icon: '✅',
      value: tasksOpen,
      label: l ? 'משימות פתוחות' : 'задач открыто',
      sub: tasksUrgent > 0 ? `${tasksUrgent} ${l ? 'דחוף' : 'срочных'}` : null,
      color: tasksUrgent > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' : 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800',
      valueColor: tasksUrgent > 0 ? 'text-red-700 dark:text-red-300' : 'text-purple-700 dark:text-purple-300',
    },
    {
      icon: '💰',
      value: revenueToday,
      label: l ? 'הכנסות היום' : 'доход сегодня',
      prefix: '₪',
      sub: null,
      color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800',
      valueColor: 'text-emerald-700 dark:text-emerald-300',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      {items.map((item, i) => (
        <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${item.color} transition-all`}>
          <span className="text-lg">{item.icon}</span>
          <div className="min-w-0">
            <p className={`text-sm font-bold ${item.valueColor} leading-tight`}>
              {item.prefix}{item.value.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 truncate">{item.label}</p>
            {item.sub && <p className="text-xs font-medium text-gray-500">{item.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Greeting ─────────────────────────────────────────────────────────────────
function GreetingHeader({ ownerName, todayVisitsCount, locale }: {
  ownerName: string; todayVisitsCount: number; locale: string
}) {
  const l = locale === 'he'
  const hour = new Date().getHours()
  const greeting = l
    ? hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב'
    : hour < 12 ? 'Доброе утро' : hour < 17 ? 'Добрый день' : 'Добрый вечер'

  const firstName = ownerName?.split(' ')[0] || ''
  const today = new Date().toLocaleDateString(l ? 'he-IL' : 'ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className="mb-5 flex items-start justify-between flex-wrap gap-2">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {greeting}{firstName ? `, ${firstName}` : ''} 👋
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 capitalize">{today}</p>
      </div>
      {todayVisitsCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {l ? `${todayVisitsCount} ביקורים היום` : `${todayVisitsCount} визитов сегодня`}
          </span>
        </div>
      )}
    </div>
  )
}


const parseArray = (data: any): any[] => {
  if (Array.isArray(data)) return data
  if (data?.data && Array.isArray(data.data)) return data.data
  for (const key of Object.keys(data || {})) {
    if (Array.isArray(data[key])) return data[key]
  }
  return []
}

export function DashboardContent({ orgId: _orgIdProp }: DashboardContentProps) {
  const { language } = useLanguage()
  const locale = language
  const router = useRouter()
  const { openModal } = useModalStore()
  const { activeOrgId } = useBranch()
  const { orgId: authOrgId } = useAuth()
  const orgId = activeOrgId || authOrgId || _orgIdProp
  const supabase = createSupabaseBrowserClient()

  // Onboarding check
  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding-check', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const { data: org, error } = await supabase
        .from('organizations')
        .select('name, features')
        .eq('id', orgId)
        .single()
      if (error || !org) return { showOnboarding: false, organizationName: '', ownerName: '' }
      return {
        showOnboarding: !org.features?.onboarding_completed,
        organizationName: org.name || '',
        ownerName: (org.features as any)?.business_info?.owner_name || '',
      }
    },
  })

  const [selectedVisit, setSelectedVisit] = useState<any>(null)
  const [stats, setStats] = useState<StatsData>({ clients: 0, visits: 0, revenue: 0, avgCheck: 0 })
  const [prevStats, setPrevStats] = useState<StatsData>({ clients: 0, visits: 0, revenue: 0, avgCheck: 0 })
  const [loading, setLoading] = useState(true)
  const [todayVisits, setTodayVisits] = useState<any[]>([])
  const [todayTasks, setTodayTasks] = useState<any[]>([])
  const [revenueData, setRevenueData] = useState<{ date: string; amount: number }[]>([])

  useEffect(() => {
    const loadStats = async () => {
      try {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1)

        const branchHeaders: Record<string, string> = {}
        if (orgId) branchHeaders['X-Branch-Org-Id'] = orgId

        const [clientsRes, visitsRes, paymentsRes, todayVisitsRes, tasksRes] = await Promise.all([
          fetch('/api/clients', { headers: branchHeaders }),
          fetch('/api/visits', { headers: branchHeaders }),
          fetch('/api/payments', { headers: branchHeaders }),
          fetch('/api/dashboard/today'),
          fetch('/api/tasks', { headers: branchHeaders }),
        ])

        const safeParse = async (r: Response) => {
          if (!r.ok) return []
          try { return await r.json() } catch { return [] }
        }

        const [clientsData, visitsData, paymentsData, todayVisitsData, tasksData] = await Promise.all([
          safeParse(clientsRes), safeParse(visitsRes), safeParse(paymentsRes),
          safeParse(todayVisitsRes), safeParse(tasksRes),
        ])

        const clientsArr = parseArray(clientsData)
        const visitsArr = parseArray(visitsData)
        const paymentsArr = parseArray(paymentsData)
        const todayVisitsArr = Array.isArray(todayVisitsData) ? todayVisitsData : []
        const tasksArr = parseArray(tasksData)

        // Текущий месяц
        const monthVisits = visitsArr.filter((v: any) => {
          const d = new Date(v.scheduled_at)
          return d >= monthStart && v.status !== 'cancelled'
        })
        const monthPayments = paymentsArr.filter((p: any) => {
          const d = new Date(p.created_at || p.paid_at)
          return d >= monthStart && (p.status === 'completed' || p.status === 'success')
        })
        const revenue = monthPayments.reduce((s: number, p: any) => s + (p.amount || p.price || 0), 0)
        const avgCheck = monthPayments.length > 0 ? Math.round(revenue / monthPayments.length) : 0

        // Прошлый месяц для тренда
        const prevPayments = paymentsArr.filter((p: any) => {
          const d = new Date(p.created_at || p.paid_at)
          return d >= prevMonthStart && d < monthStart && (p.status === 'completed' || p.status === 'success')
        })
        const prevRevenue = prevPayments.reduce((s: number, p: any) => s + (p.amount || p.price || 0), 0)
        const prevAvg = prevPayments.length > 0 ? Math.round(prevRevenue / prevPayments.length) : 0

        setStats({ clients: clientsArr.length, visits: monthVisits.length, revenue, avgCheck })
        setPrevStats({ clients: clientsArr.length, visits: monthVisits.length, revenue: prevRevenue, avgCheck: prevAvg })
        setTodayVisits(todayVisitsArr)

        const todayTasksFiltered = tasksArr.filter((t: any) => {
          if (t.status === 'completed' || t.status === 'cancelled') return false
          // Фильтруем системные/технические задачи без реальных due_date
          if (!t.due_date && !t.title) return false
          if (t.due_date) {
            const d = new Date(t.due_date)
            return d >= todayStart && d < todayEnd
          }
          // Показываем просроченные и без даты только если есть связь с клиентом
          return !!t.client_id
        })
        setTodayTasks(todayTasksFiltered.slice(0, 5))

        // График 7 дней
        const revenueByDay = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() - (6 - i))
          const dateStr = d.toISOString().split('T')[0]
          const dayTotal = paymentsArr
            .filter((p: any) => new Date(p.created_at).toISOString().split('T')[0] === dateStr && (p.status === 'completed' || p.status === 'success'))
            .reduce((s: number, p: any) => s + (p.amount || p.price || 0), 0)
          return { date: dateStr, amount: dayTotal }
        })
        setRevenueData(revenueByDay)
        setLoading(false)
      } catch (error) {
        console.error('Dashboard load error:', error)
        setLoading(false)
      }
    }
    loadStats()
  }, [orgId, locale])

  async function updateVisitStatus(visitId: string, status: string) {
    await fetch(`/api/visits/${visitId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setSelectedVisit(null)
    setTodayVisits(prev => prev.map(v => v.id === visitId ? { ...v, status } : v))
  }


  // Тренды в %
  const revenueTrend = prevStats.revenue > 0
    ? Math.round(((stats.revenue - prevStats.revenue) / prevStats.revenue) * 100)
    : undefined
  const avgTrend = prevStats.avgCheck > 0
    ? Math.round(((stats.avgCheck - prevStats.avgCheck) / prevStats.avgCheck) * 100)
    : undefined

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-5 h-12 w-64 rounded-xl bg-gray-100 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-2xl h-28 animate-pulse"
              style={{ background: `hsl(${220 + i * 30}, 60%, 90%)` }} />
          ))}
        </div>
      </div>
    )
  }

  const l = locale === 'he'

  return (
    <>
      <div className="p-4 md:p-6">

        {/* ── Приветствие ── */}
        <GreetingHeader
          ownerName={onboardingData?.ownerName || ''}
          todayVisitsCount={todayVisits.length}
          locale={locale}
        />

        {/* ── Activity Strip — быстрый обзор дня ── */}
        <ActivityStrip
          visitsToday={todayVisits.length}
          visitsDone={todayVisits.filter(v => v.status === 'completed').length}
          tasksOpen={todayTasks.length}
          tasksUrgent={todayTasks.filter(t => t.priority === 'urgent').length}
          revenueToday={revenueData[revenueData.length - 1]?.amount || 0}
          locale={locale}
        />

        {/* ── Low Stock Alert ── */}
        <LowStockAlert locale={locale} />

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <KpiCard
            title={l ? 'לקוחות' : 'Клиенты'}
            value={stats.clients}
            icon={<Users size={18} className="text-white" />}
            gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            iconBg="bg-white/20"
            delay={0}
          />
          <KpiCard
            title={l ? 'ביקורים החודש' : 'Визиты за месяц'}
            value={stats.visits}
            icon={<Calendar size={18} className="text-white" />}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            iconBg="bg-white/20"
            delay={80}
          />
          <KpiCard
            title={l ? 'הכנסות' : 'Доход'}
            value={stats.revenue}
            prefix="₪"
            icon={<TrendingUp size={18} className="text-white" />}
            gradient="bg-gradient-to-br from-amber-500 to-orange-500"
            iconBg="bg-white/20"
            delay={160}
            trend={revenueTrend}
          />
          <KpiCard
            title={l ? 'צ׳ק ממוצע' : 'Средний чек'}
            value={stats.avgCheck}
            prefix="₪"
            icon={<Receipt size={18} className="text-white" />}
            gradient="bg-gradient-to-br from-purple-500 to-violet-600"
            iconBg="bg-white/20"
            delay={240}
            trend={avgTrend}
          />
        </div>

        {/* ── Основная сетка — без правой колонки, она в layout ── */}
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
          {/* Быстрые действия — на мобиле и средних экранах */}
          <div className="xl:hidden">
            <QuickActionsPanel locale={locale} />
          </div>
        </div>
      </div>

      <div className="lg:hidden"><FABMenu /></div>

      {selectedVisit && (
        <VisitDetailModal
          visit={selectedVisit}
          isOpen={!!selectedVisit}
          onClose={() => setSelectedVisit(null)}
          locale={locale === 'he' ? 'he' : 'ru'}
          clientName={selectedVisit.clients
            ? `${selectedVisit.clients.first_name || ''} ${selectedVisit.clients.last_name || ''}`.trim()
            : selectedVisit.clientName || ''}
          clientPhone={selectedVisit.clients?.phone || ''}
          onStart={() => updateVisitStatus(selectedVisit.id, 'in_progress')}
          onComplete={() => updateVisitStatus(selectedVisit.id, 'completed')}
          onCancel={() => updateVisitStatus(selectedVisit.id, 'cancelled')}
          onEdit={() => {
            openModal('edit-visit', { visitId: selectedVisit.id, visit: selectedVisit })
            setSelectedVisit(null)
          }}
        />
      )}

      {onboardingData?.showOnboarding && orgId && (
        <OnboardingWizard open={true} organizationName={onboardingData.organizationName} />
      )}
    </>
  )
}

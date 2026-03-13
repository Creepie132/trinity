'use client'

import { useEffect, useState, ReactNode } from 'react'
import { Users, Calendar, TrendingUp, Receipt } from 'lucide-react'
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

interface DashboardContentProps {
  orgId: string
}

interface StatsData {
  clients: number
  visits: number
  revenue: number
  avgCheck: number
}

function KpiCard({ 
  title, 
  value, 
  icon, 
  color 
}: { 
  title: string
  value: string | number
  icon: ReactNode
  color: string 
}) {
  return (
    <WidgetCard className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-400">{title}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </WidgetCard>
  )
}

// Moved outside component to avoid function declaration inside blocks
const parseArray = (data: any): any[] => {
  if (Array.isArray(data)) return data
  if (data?.data && Array.isArray(data.data)) return data.data
  const keys = Object.keys(data || {})
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key]
  }
  return []
}

export function DashboardContent({ orgId: _orgIdProp }: DashboardContentProps) {
  const { language } = useLanguage()
  const locale = language
  const router = useRouter()
  const { openModal } = useModalStore()
  
  // Always use activeOrgId from BranchContext so switching branch works
  const { activeOrgId } = useBranch()
  const { orgId: authOrgId } = useAuth()
  const orgId = activeOrgId || authOrgId || _orgIdProp

  const supabase = createSupabaseBrowserClient()

  // Check if onboarding is needed
  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding-check', orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: org } = await supabase
        .from('organizations')
        .select('name, features')
        .eq('id', orgId)
        .single()
      const onboardingCompleted = org?.features?.onboarding_completed ?? false
      return {
        showOnboarding: !onboardingCompleted,
        organizationName: org?.name || '',
      }
    },
  })

  const [selectedVisit, setSelectedVisit] = useState<any>(null)

  const [stats, setStats] = useState<StatsData>({
    clients: 0,
    visits: 0,
    revenue: 0,
    avgCheck: 0
  })
  
  const [loading, setLoading] = useState(true)
  const [todayVisits, setTodayVisits] = useState<any[]>([])
  const [todayTasks, setTodayTasks] = useState<any[]>([])
  const [revenueData, setRevenueData] = useState<{ date: string; amount: number }[]>([])

  useEffect(() => {
    const loadStats = async () => {
      try {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const todayEnd = new Date(todayStart)
        todayEnd.setDate(todayEnd.getDate() + 1)

        console.log('=== DASHBOARD DEBUG ===')
        
        const branchHeaders: Record<string, string> = {}
        if (orgId) branchHeaders['X-Branch-Org-Id'] = orgId

        const [clientsRes, visitsRes, paymentsRes, todayVisitsRes, tasksRes] = await Promise.all([
          fetch('/api/clients', { headers: branchHeaders }),
          fetch('/api/visits', { headers: branchHeaders }),
          fetch('/api/payments', { headers: branchHeaders }),
          fetch(`/api/dashboard/today?org_id=${orgId}`),
          fetch('/api/tasks', { headers: branchHeaders }),
        ])

        const safeParse = async (response: Response, name: string) => {
          try {
            console.log(`${name} status:`, response.status)
            if (!response.ok) {
              console.error(`Сбой API ${name}: Сервер вернул статус ${response.status}`)
              return []
            }
            const data = await response.json()
            console.log(`${name} data:`, typeof data, Array.isArray(data), JSON.stringify(data)?.slice(0, 200))
            return data
          } catch (error) {
            console.error(`Критическая ошибка загрузки ${name}:`, error)
            return []
          }
        }

        const clientsData = await safeParse(clientsRes, 'Clients')
        const visitsData = await safeParse(visitsRes, 'Visits')
        const paymentsData = await safeParse(paymentsRes, 'Payments')
        const todayVisitsData = await safeParse(todayVisitsRes, 'Today visits')
        const tasksData = await safeParse(tasksRes, 'Tasks')

        const clientsArr = parseArray(clientsData)
        const visitsArr = parseArray(visitsData)
        const paymentsArr = parseArray(paymentsData)
        const todayVisitsArr = Array.isArray(todayVisitsData) ? todayVisitsData : []
        const tasksArr = parseArray(tasksData)
        
        console.log('Parsed: clients=', clientsArr.length, 'visits=', visitsArr.length, 'payments=', paymentsArr.length, 'todayVisits=', todayVisitsArr.length, 'tasks=', tasksArr.length)

        const monthVisits = visitsArr.filter((v: any) => {
          const visitDate = new Date(v.scheduled_at)
          return visitDate >= monthStart && v.status !== 'cancelled'
        })

        const monthPayments = paymentsArr.filter((p: any) => {
          const paymentDate = new Date(p.created_at || p.paid_at)
          return paymentDate >= monthStart && (p.status === 'completed' || p.status === 'success')
        })
        
        const revenue = monthPayments.reduce((sum: number, p: any) => 
          sum + (p.amount || p.price || 0), 0
        )

        const avgCheck = monthPayments.length > 0 
          ? Math.round(revenue / monthPayments.length) 
          : 0

        const statsToSet = {
          clients: clientsArr.length,
          visits: monthVisits.length,
          revenue,
          avgCheck,
        }
        
        setStats(statsToSet)
        setTodayVisits(todayVisitsArr)

        const todayTasksFiltered = tasksArr.filter((t: any) => {
          if (t.status === 'completed' || t.status === 'cancelled') return false
          if (!t.due_date) return true
          const taskDate = new Date(t.due_date)
          return taskDate >= todayStart && taskDate < todayEnd
        })
        setTodayTasks(todayTasksFiltered.slice(0, 5))

        const revenueByDay: { date: string; amount: number }[] = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const dateStr = d.toISOString().split('T')[0]
          
          const dayTotal = paymentsArr
            .filter((p: any) => {
              const pDate = new Date(p.created_at).toISOString().split('T')[0]
              return pDate === dateStr && (p.status === 'completed' || p.status === 'success')
            })
            .reduce((sum: number, p: any) => sum + (p.amount || p.price || 0), 0)
          
          revenueByDay.push({ date: dateStr, amount: dayTotal })
        }
        setRevenueData(revenueByDay)
        setLoading(false)
        console.log('=== DASHBOARD DEBUG END ===')
      } catch (error) {
        console.error('Error loading dashboard stats:', error)
        setLoading(false)
      }
    }

    loadStats()
  }, [orgId, locale])

  async function updateVisitStatus(visitId: string, status: string) {
    await fetch(`/api/visits/${visitId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setSelectedVisit(null)
    setTodayVisits(prev => prev.map(v => v.id === visitId ? { ...v, status } : v))
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-4 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard 
            title={locale === 'he' ? 'לקוחות' : 'Клиенты'} 
            value={stats.clients}
            icon={<Users size={20} />}
            color="bg-blue-50 text-blue-600"
          />
          <KpiCard 
            title={locale === 'he' ? 'ביקורים החודש' : 'Визиты за месяц'} 
            value={stats.visits}
            icon={<Calendar size={20} />}
            color="bg-emerald-50 text-emerald-600"
          />
          <KpiCard 
            title={locale === 'he' ? 'הכנסות' : 'Доход'} 
            value={`₪${stats.revenue.toLocaleString()}`}
            icon={<TrendingUp size={20} />}
            color="bg-amber-50 text-amber-600"
          />
          <KpiCard 
            title={locale === 'he' ? 'צ׳ק ממוצע' : 'Средний чек'} 
            value={`₪${stats.avgCheck}`}
            icon={<Receipt size={20} />}
            color="bg-purple-50 text-purple-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_280px] gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Work Shift Widget — shown for all users */}
            <WorkShiftWidget />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TodayVisitsWidget visits={todayVisits} locale={locale} onVisitClick={setSelectedVisit} />
              <TodayTasksWidget tasks={todayTasks} locale={locale} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RevenueChartWidget data={revenueData} locale={locale} />
              <IncomeExpensesWidget locale={locale} />
            </div>
          </div>
          <div className="hidden lg:block">
            <QuickActionsPanel locale={locale} />
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <FABMenu />
      </div>

      {selectedVisit && (
        <VisitDetailModal
          visit={selectedVisit}
          isOpen={!!selectedVisit}
          onClose={() => setSelectedVisit(null)}
          locale={locale === 'he' ? 'he' : 'ru'}
          clientName={
            selectedVisit.clients
              ? `${selectedVisit.clients.first_name || ''} ${selectedVisit.clients.last_name || ''}`.trim()
              : selectedVisit.clientName || ''
          }
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

      {/* Onboarding */}
      {onboardingData?.showOnboarding && orgId && (
        <OnboardingWizard
          open={true}
          organizationName={onboardingData.organizationName}
        />
      )}
    </>
  )
}
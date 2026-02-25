'use client'

import { useEffect, useState, ReactNode } from 'react'
import { Users, Calendar, TrendingUp, Receipt } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { TodayVisitsWidget } from './TodayVisitsWidget'
import { TodayTasksWidget } from './TodayTasksWidget'
import { RevenueChartWidget } from './RevenueChartWidget'
import { IncomeExpensesWidget } from './IncomeExpensesWidget'
import { QuickActionsPanel } from './QuickActionsPanel'
import FABMenu from './FABMenu'

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
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-400">{title}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

export function DashboardContent({ orgId }: DashboardContentProps) {
  const { language } = useLanguage()
  const locale = language
  
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
    async function loadStats() {
      try {
        // Date ranges
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const todayEnd = new Date(todayStart)
        todayEnd.setDate(todayEnd.getDate() + 1)

        // Fetch all data in parallel
        const [clientsRes, visitsRes, paymentsRes, todayVisitsRes, tasksRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/visits'),
          fetch('/api/payments'),
          fetch(`/api/visits?date=${todayStart.toISOString()}`),
          fetch('/api/tasks'),
        ])

        const clientsData = await clientsRes.json()
        const visitsData = await visitsRes.json()
        const paymentsData = await paymentsRes.json()
        const todayVisitsData = await todayVisitsRes.json()
        const tasksData = await tasksRes.json()

        // Ensure arrays
        const clientsArr = Array.isArray(clientsData) ? clientsData : clientsData?.data || []
        const visitsArr = Array.isArray(visitsData) ? visitsData : visitsData?.data || []
        const paymentsArr = Array.isArray(paymentsData) ? paymentsData : paymentsData?.data || []
        const todayVisitsArr = Array.isArray(todayVisitsData) ? todayVisitsData : todayVisitsData?.data || []
        const tasksArr = Array.isArray(tasksData) ? tasksData : tasksData?.data || []

        // Calculate stats
        const totalClients = clientsArr.length

        // Visits this month
        const monthVisits = visitsArr.filter((v: any) => {
          const visitDate = new Date(v.scheduled_at)
          return visitDate >= monthStart && v.status !== 'cancelled'
        })

        // Revenue this month
        const monthPayments = paymentsArr.filter((p: any) => {
          const paymentDate = new Date(p.created_at || p.paid_at)
          return paymentDate >= monthStart && (p.status === 'completed' || p.status === 'success')
        })
        
        const revenue = monthPayments.reduce((sum: number, p: any) => 
          sum + (p.amount || p.price || 0), 0
        )

        // Average check
        const avgCheck = monthPayments.length > 0 
          ? Math.round(revenue / monthPayments.length) 
          : 0

        setStats({
          clients: clientsArr.length,
          visits: monthVisits.length,
          revenue,
          avgCheck,
        })

        // Today's visits
        setTodayVisits(todayVisitsArr.slice(0, 5))

        // Today's tasks
        const todayTasksFiltered = tasksArr.filter((t: any) => {
          if (!t.due_date) return false
          const taskDate = new Date(t.due_date)
          return taskDate >= todayStart && taskDate < todayEnd
        })
        setTodayTasks(todayTasksFiltered.slice(0, 5))

        // Revenue chart data (last 7 days)
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
      } catch (error) {
        console.error('Error loading dashboard stats:', error)
        setLoading(false)
      }
    }

    loadStats()
  }, [orgId, locale])

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
        {/* KPI карточки — верхний ряд */}
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

        {/* Основной контент — 3 колонки на десктопе */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_280px] gap-6">
          {/* Левая + центральная зона */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ряд 2: Визиты сегодня + Задачи сегодня */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TodayVisitsWidget visits={todayVisits} locale={locale} />
              <TodayTasksWidget tasks={todayTasks} locale={locale} />
            </div>

            {/* Ряд 3: Графики */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RevenueChartWidget data={revenueData} locale={locale} />
              <IncomeExpensesWidget locale={locale} />
            </div>
          </div>

          {/* Правая колонка — Quick Actions */}
          <div className="hidden lg:block">
            <QuickActionsPanel locale={locale} />
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <FABMenu />
    </>
  )
}

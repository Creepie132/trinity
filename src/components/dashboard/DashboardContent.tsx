'use client'

import { useEffect, useState, ReactNode } from 'react'
import { Users, Calendar, TrendingUp, Receipt, UserPlus, CreditCard, ListPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { WidgetCard } from '@/components/ui/WidgetCard'
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

export function DashboardContent({ orgId }: DashboardContentProps) {
  const { language } = useLanguage()
  const locale = language
  const router = useRouter()
  
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

        console.log('=== DASHBOARD DEBUG ===')
        
        // Fetch all data in parallel
        const [clientsRes, visitsRes, paymentsRes, todayVisitsRes, tasksRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/visits'),
          fetch('/api/payments'),
          fetch(`/api/dashboard/today?org_id=${orgId}`),
          fetch('/api/tasks'),
        ])

        // Helper: отказоустойчивый парсинг ответа
        async function safeParse(response: Response, name: string) {
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

        // Клиенты
        const clientsData = await safeParse(clientsRes, 'Clients')

        // Визиты
        const visitsData = await safeParse(visitsRes, 'Visits')

        // Платежи
        const paymentsData = await safeParse(paymentsRes, 'Payments')

        // Сегодняшние визиты
        const todayVisitsData = await safeParse(todayVisitsRes, 'Today visits')

        // Задачи
        const tasksData = await safeParse(tasksRes, 'Tasks')

        // Universal array parser
        function parseArray(data: any): any[] {
          if (Array.isArray(data)) return data
          if (data?.data && Array.isArray(data.data)) return data.data
          // Проверь первый ключ объекта
          const keys = Object.keys(data || {})
          for (const key of keys) {
            if (Array.isArray(data[key])) return data[key]
          }
          return []
        }

        // Parse arrays
        const clientsArr = parseArray(clientsData)
        const visitsArr = parseArray(visitsData)
        const paymentsArr = parseArray(paymentsData)
        const todayVisitsArr = Array.isArray(todayVisitsData) ? todayVisitsData : []
        const tasksArr = parseArray(tasksData)
        
        console.log('Parsed: clients=', clientsArr.length, 'visits=', visitsArr.length, 'payments=', paymentsArr.length, 'todayVisits=', todayVisitsArr.length, 'tasks=', tasksArr.length)

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

        const statsToSet = {
          clients: clientsArr.length,
          visits: monthVisits.length,
          revenue,
          avgCheck,
        }
        
        setStats(statsToSet)
        console.log('Stats set:', statsToSet)

        // Today's visits
        setTodayVisits(todayVisitsArr)
        console.log('Today visits set:', todayVisitsArr.length)

        // Today's tasks
        const todayTasksFiltered = tasksArr.filter((t: any) => {
          if (!t.due_date) return false
          const taskDate = new Date(t.due_date)
          return taskDate >= todayStart && taskDate < todayEnd
        })
        setTodayTasks(todayTasksFiltered.slice(0, 5))
        console.log('Today tasks set:', todayTasksFiltered.length)

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
        console.log('Revenue data set:', revenueByDay.length, 'days')

        setLoading(false)
        console.log('=== DASHBOARD DEBUG END ===')
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

        {/* Quick Actions — мобильная версия */}
        <div className="lg:hidden flex gap-3 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
          <button 
            onClick={() => router.push('/clients?action=new')} 
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm text-sm font-medium"
          >
            <UserPlus size={16} className="text-blue-600" />
            {locale === 'he' ? 'לקוח +' : 'Клиент +'}
          </button>
          <button 
            onClick={() => router.push('/payments?action=new')} 
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm text-sm font-medium"
          >
            <CreditCard size={16} className="text-emerald-600" />
            {locale === 'he' ? 'מכירה +' : 'Продажа +'}
          </button>
          <button 
            onClick={() => router.push('/diary?action=new')} 
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm text-sm font-medium"
          >
            <ListPlus size={16} className="text-amber-600" />
            {locale === 'he' ? 'משימה +' : 'Задача +'}
          </button>
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

      {/* Floating Action Button - only mobile */}
      <div className="lg:hidden">
        <FABMenu />
      </div>
    </>
  )
}

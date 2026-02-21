'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { useDashboardStats, useRevenueByMonth, useVisitsByMonth, useTopClients } from '@/hooks/useStats'
import { useLowStockProducts } from '@/hooks/useProducts'
import { useBookings } from '@/hooks/useBookings'
import { useFeatures } from '@/hooks/useFeatures'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
  Users,
  Calendar,
  DollarSign,
  UserX,
  Clock,
  Package,
  Inbox,
  TrendingUp,
  BarChart3,
  UsersRound,
  Cake
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import AdBanner from '@/components/ads/AdBanner'
import BirthdayPopup from '@/components/birthdays/BirthdayPopup'
import { useTodayBirthdays } from '@/hooks/useBirthdays'
import { OnboardingWizard } from '@/components/OnboardingWizard'
import { useQuery } from '@tanstack/react-query'

type WidgetId =
  | 'visits_month'
  | 'total_clients'
  | 'inactive_clients'
  | 'revenue_month'
  | 'today_bookings'
  | 'low_stock'
  | 'pending_bookings'
  | 'avg_visit'
  | 'birthdays_today'

const DEFAULT_WIDGETS: WidgetId[] = [
  'visits_month',
  'total_clients',
  'inactive_clients',
  'revenue_month',
  'birthdays_today'
]

export default function DashboardPage() {
  const { t } = useLanguage()
  const { orgId } = useAuth()
  const router = useRouter()
  const features = useFeatures()
  const supabase = createSupabaseBrowserClient()

  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: lowStockProducts } = useLowStockProducts()
  const { pendingCount } = useBookings(orgId)
  const { data: revenueData } = useRevenueByMonth()
  const { data: visitsData } = useVisitsByMonth()
  const { data: topClients } = useTopClients()
  const { data: birthdayClients = [] } = useTodayBirthdays()

  const [widgets, setWidgets] = useState<WidgetId[]>(DEFAULT_WIDGETS)
  const [widgetsLoaded, setWidgetsLoaded] = useState(false)
  const [showCharts, setShowCharts] = useState({
    revenue: true,
    visits: true,
    topClients: true
  })
  const [showBirthdayPopup, setShowBirthdayPopup] = useState(false)

  // Check if onboarding is needed
  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding-check', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      if (!orgId) return { showOnboarding: false, organizationName: '' }

      // Check organization features
      const { data: org } = await supabase
        .from('organizations')
        .select('name, features')
        .eq('id', orgId)
        .single()

      // Check if services exist
      const { data: services, count } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)

      const onboardingCompleted = org?.features?.onboarding_completed ?? false
      const hasServices = (count || 0) > 0

      return {
        showOnboarding: !onboardingCompleted || !hasServices,
        organizationName: org?.name || '',
      }
    },
  })

  // Check organization status
  useEffect(() => {
    if (!features.isLoading && !features.isActive) {
      router.push('/blocked')
    }
  }, [features.isActive, features.isLoading, router])

  // Load widget and chart settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!orgId) return

      try {
        const { data } = await supabase
          .from('organizations')
          .select('settings')
          .eq('id', orgId)
          .single()

        if (data?.settings?.dashboard_widgets) {
          let savedWidgets = data.settings.dashboard_widgets
          
          // Auto-migration: add birthdays_today if not present
          if (!savedWidgets.includes('birthdays_today')) {
            savedWidgets = [...savedWidgets, 'birthdays_today']
          }
          
          setWidgets(savedWidgets)
        } else {
          setWidgets(DEFAULT_WIDGETS)
        }
        
        if (data?.settings?.dashboard_charts) {
          setShowCharts(data.settings.dashboard_charts)
        }
      } catch (error) {
        console.error('Error loading dashboard settings:', error)
      } finally {
        setWidgetsLoaded(true)
      }
    }

    loadSettings()
  }, [orgId, supabase])

  // Check if should show birthday popup
  useEffect(() => {
    if (birthdayClients.length > 0 && widgetsLoaded) {
      const today = new Date().toISOString().split('T')[0]
      const lastShown = localStorage.getItem('birthday_popup_date')
      
      if (lastShown !== today) {
        setShowBirthdayPopup(true)
      }
    }
  }, [birthdayClients, widgetsLoaded])

  const widgetConfig = {
    visits_month: {
      icon: Calendar,
      color: 'green',
      link: '/visits',
      getValue: () => stats?.visitsThisMonth || 0,
      label: t('dashboard.visitsMonth')
    },
    total_clients: {
      icon: Users,
      color: 'blue',
      link: '/clients',
      getValue: () => stats?.totalClients || 0,
      label: t('dashboard.totalClients')
    },
    inactive_clients: {
      icon: UserX,
      color: 'orange',
      link: '/clients?filter=inactive',
      getValue: () => stats?.inactiveClients || 0,
      label: t('dashboard.inactiveClients')
    },
    revenue_month: {
      icon: DollarSign,
      color: 'purple',
      link: '/payments',
      getValue: () => `₪${stats?.revenueThisMonth?.toFixed(2) || '0.00'}`,
      label: t('dashboard.revenueMonth')
    },
    today_bookings: {
      icon: Clock,
      color: 'cyan',
      link: '/visits?date=today',
      getValue: () => 0, // TODO: implement today bookings count
      label: t('dashboard.todayBookings')
    },
    low_stock: {
      icon: Package,
      color: 'red',
      link: '/inventory?filter=low-stock',
      getValue: () => lowStockProducts?.length || 0,
      label: t('dashboard.lowStock')
    },
    pending_bookings: {
      icon: Inbox,
      color: 'yellow',
      link: '/visits?tab=bookings&status=pending',
      getValue: () => pendingCount,
      label: t('dashboard.pendingBookings')
    },
    avg_visit: {
      icon: TrendingUp,
      color: 'indigo',
      link: '/stats',
      getValue: () => `₪${stats?.avgVisitValue?.toFixed(2) || '0.00'}`,
      label: t('dashboard.avgVisit')
    },
    birthdays_today: {
      icon: Cake,
      color: 'pink',
      link: '#',
      getValue: () => birthdayClients.length || 0,
      label: t('dashboard.birthdaysToday'),
      onClick: () => birthdayClients.length > 0 && setShowBirthdayPopup(true)
    }
  }

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; icon: string }> = {
      blue: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-600 dark:text-blue-400',
        icon: 'bg-blue-100 dark:bg-blue-900/40'
      },
      green: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-600 dark:text-green-400',
        icon: 'bg-green-100 dark:bg-green-900/40'
      },
      purple: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        text: 'text-purple-600 dark:text-purple-400',
        icon: 'bg-purple-100 dark:bg-purple-900/40'
      },
      orange: {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        text: 'text-orange-600 dark:text-orange-400',
        icon: 'bg-orange-100 dark:bg-orange-900/40'
      },
      cyan: {
        bg: 'bg-cyan-50 dark:bg-cyan-900/20',
        text: 'text-cyan-600 dark:text-cyan-400',
        icon: 'bg-cyan-100 dark:bg-cyan-900/40'
      },
      red: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-600 dark:text-red-400',
        icon: 'bg-red-100 dark:bg-red-900/40'
      },
      yellow: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        text: 'text-yellow-600 dark:text-yellow-400',
        icon: 'bg-yellow-100 dark:bg-yellow-900/40'
      },
      indigo: {
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        text: 'text-indigo-600 dark:text-indigo-400',
        icon: 'bg-indigo-100 dark:bg-indigo-900/40'
      },
      pink: {
        bg: 'bg-pink-50 dark:bg-pink-900/20',
        text: 'text-pink-600 dark:text-pink-400',
        icon: 'bg-pink-100 dark:bg-pink-900/40'
      }
    }
    return colors[color] || colors.blue
  }

  if (statsLoading || !widgetsLoaded) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-square bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('dashboard.welcome')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {widgets.slice(0, window.innerWidth < 768 ? 6 : 8).map((widgetId, index) => {
          const config = widgetConfig[widgetId]
          if (!config) return null

          const Icon = config.icon
          const colors = getColorClasses(config.color)

          const WidgetCard = (
            <Card
              className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 aspect-square"
              style={{
                animation: `fadeInScale 0.4s ease-out ${index * 0.1}s both`
              }}
              onClick={(config as any).onClick}
            >
              <CardContent className="p-4 h-full flex flex-col items-center justify-between text-center">
                {/* Icon */}
                <div className={`${colors.icon} p-3 rounded-full`}>
                  <Icon className={`w-6 h-6 md:w-8 md:h-8 ${colors.text}`} />
                </div>

                {/* Value */}
                <div className={`text-2xl md:text-3xl font-bold ${colors.text}`}>
                  {config.getValue()}
                </div>

                {/* Label */}
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {config.label}
                </p>
              </CardContent>
            </Card>
          )

          return (config as any).onClick ? (
            <div key={widgetId}>{WidgetCard}</div>
          ) : (
            <Link key={widgetId} href={config.link}>
              {WidgetCard}
            </Link>
          )
        })}
      </div>

      {/* Charts Section */}
      {(showCharts.revenue || showCharts.visits || showCharts.topClients) && (
        <div className="space-y-6">
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            {showCharts.revenue && revenueData && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 animate-fadeInUp">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
                    <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('stats.revenueByMonth')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={300} className="min-h-[250px]">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#9ca3af" 
                      style={{ fontSize: '12px' }}
                      className="dark:stroke-gray-400"
                    />
                    <YAxis 
                      stroke="#9ca3af" 
                      style={{ fontSize: '12px' }}
                      className="dark:stroke-gray-400"
                    />
                    <Tooltip
                      formatter={(value: any) => [`₪${value.toFixed(2)}`, t('payments.amount')]}
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                        color: '#111827'
                      }}
                      wrapperClassName="dark:[&>div]:bg-gray-900 dark:[&>div]:text-white"
                      cursor={{ stroke: '#fbbf24', strokeWidth: 2, strokeDasharray: '5 5' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#f59e0b" 
                      strokeWidth={3}
                      fill="url(#colorAmount)"
                      animationBegin={0}
                      animationDuration={1200}
                      dot={{ 
                        fill: '#f59e0b', 
                        stroke: 'white', 
                        strokeWidth: 2, 
                        r: 4 
                      }}
                      activeDot={{ 
                        r: 6,
                        fill: '#f59e0b',
                        stroke: 'white',
                        strokeWidth: 2
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Visits Chart */}
            {showCharts.visits && visitsData && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('stats.visitsByMonth')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={300} className="min-h-[250px]">
                  <BarChart data={visitsData}>
                    <defs>
                      <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                        <stop offset="100%" stopColor="#d97706" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#9ca3af" 
                      style={{ fontSize: '12px' }}
                      className="dark:stroke-gray-400"
                    />
                    <YAxis 
                      stroke="#9ca3af" 
                      style={{ fontSize: '12px' }}
                      className="dark:stroke-gray-400"
                    />
                    <Tooltip
                      formatter={(value: any) => [value, t('clients.visits')]}
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                        color: '#111827'
                      }}
                      wrapperClassName="dark:[&>div]:bg-gray-900 dark:[&>div]:text-white"
                    />
                    <Bar 
                      dataKey="count" 
                      fill="url(#colorVisits)" 
                      radius={[8, 8, 0, 0]}
                      animationBegin={0}
                      animationDuration={1200}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top Clients Chart - Full Width */}
          {showCharts.topClients && topClients && topClients.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
                  <UsersRound className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('stats.topClients')}</h3>
              </div>
              <ResponsiveContainer width="100%" height={300} className="min-h-[250px]">
                <BarChart data={topClients} layout="vertical">
                  <defs>
                    {topClients.map((_, index) => {
                      const colors = ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e']
                      return (
                        <linearGradient key={`topGradient-${index}`} id={`topGradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={colors[index % colors.length]} stopOpacity={1} />
                          <stop offset="100%" stopColor={colors[index % colors.length]} stopOpacity={0.7} />
                        </linearGradient>
                      )
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis 
                    type="number" 
                    stroke="#9ca3af" 
                    style={{ fontSize: '12px' }}
                    className="dark:stroke-gray-400"
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={150} 
                    stroke="#9ca3af" 
                    style={{ fontSize: '12px' }}
                    className="dark:stroke-gray-400"
                  />
                  <Tooltip
                    formatter={(value: any) => [`₪${value.toFixed(2)}`, t('stats.totalPayments')]}
                    contentStyle={{ 
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      color: '#111827'
                    }}
                    wrapperClassName="dark:[&>div]:bg-gray-900 dark:[&>div]:text-white"
                  />
                  <Bar 
                    dataKey="amount" 
                    radius={[0, 8, 8, 0]}
                    animationBegin={0}
                    animationDuration={1200}
                  >
                    {topClients.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#topGradient-${index})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Ad Banner */}
      <AdBanner category="dashboard" />

      {/* Birthday Popup */}
      {showBirthdayPopup && birthdayClients.length > 0 && (
        <BirthdayPopup
          clients={birthdayClients}
          onClose={() => setShowBirthdayPopup(false)}
        />
      )}

      {/* Onboarding Wizard */}
      {onboardingData?.showOnboarding && (
        <OnboardingWizard
          open={true}
          organizationName={onboardingData.organizationName}
        />
      )}

      <style jsx global>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}

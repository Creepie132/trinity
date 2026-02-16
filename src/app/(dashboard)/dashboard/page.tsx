'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { useDashboardStats } from '@/hooks/useStats'
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
  TrendingUp
} from 'lucide-react'
import AdBanner from '@/components/ads/AdBanner'

type WidgetId =
  | 'visits_month'
  | 'total_clients'
  | 'inactive_clients'
  | 'revenue_month'
  | 'today_bookings'
  | 'low_stock'
  | 'pending_bookings'
  | 'avg_visit'

const DEFAULT_WIDGETS: WidgetId[] = [
  'visits_month',
  'total_clients',
  'inactive_clients',
  'revenue_month'
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

  const [widgets, setWidgets] = useState<WidgetId[]>(DEFAULT_WIDGETS)
  const [widgetsLoaded, setWidgetsLoaded] = useState(false)

  // Check organization status
  useEffect(() => {
    if (!features.isLoading && !features.isActive) {
      router.push('/blocked')
    }
  }, [features.isActive, features.isLoading, router])

  // Load widget settings
  useEffect(() => {
    const loadWidgets = async () => {
      if (!orgId) return

      try {
        const { data } = await supabase
          .from('organizations')
          .select('settings')
          .eq('id', orgId)
          .single()

        if (data?.settings?.dashboard_widgets) {
          setWidgets(data.settings.dashboard_widgets)
        }
      } catch (error) {
        console.error('Error loading dashboard widgets:', error)
      } finally {
        setWidgetsLoaded(true)
      }
    }

    loadWidgets()
  }, [orgId])

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
        {widgets.slice(0, window.innerWidth < 768 ? 4 : 8).map((widgetId, index) => {
          const config = widgetConfig[widgetId]
          if (!config) return null

          const Icon = config.icon
          const colors = getColorClasses(config.color)

          return (
            <Link key={widgetId} href={config.link}>
              <Card
                className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 aspect-square"
                style={{
                  animation: `fadeInScale 0.4s ease-out ${index * 0.1}s both`
                }}
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
            </Link>
          )
        })}
      </div>

      {/* Ad Banner */}
      <AdBanner />

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

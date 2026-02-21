'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { useFeatures } from '@/hooks/useFeatures'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { Users, Calendar, DollarSign, TrendingUp } from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { OnboardingWizard } from '@/components/OnboardingWizard'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function DashboardPage() {
  const { orgId } = useAuth()
  const router = useRouter()
  const features = useFeatures()
  const supabase = createSupabaseBrowserClient()

  // Check organization status
  useEffect(() => {
    if (!features.isLoading && !features.isActive) {
      router.push('/blocked')
    }
  }, [features.isActive, features.isLoading, router])

  // Check if onboarding is needed
  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding-check', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      if (!orgId) return { showOnboarding: false, organizationName: '' }

      const { data: org } = await supabase
        .from('organizations')
        .select('name, features')
        .eq('id', orgId)
        .single()

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

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/stats?org_id=${orgId}`)
      return response.json()
    },
  })

  // Fetch revenue chart data
  const { data: revenueData = [] } = useQuery({
    queryKey: ['dashboard-revenue', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/revenue?org_id=${orgId}&days=7`)
      return response.json()
    },
  })

  // Fetch visits chart data
  const { data: visitsData = [] } = useQuery({
    queryKey: ['dashboard-visits', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/visits-chart?org_id=${orgId}&days=30`)
      return response.json()
    },
  })

  // Fetch top services
  const { data: topServices = [] } = useQuery({
    queryKey: ['dashboard-top-services', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/top-services?org_id=${orgId}`)
      return response.json()
    },
  })

  if (statsLoading || features.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Загрузка...</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Клиентов',
      value: stats?.totalClients || 0,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Визитов за месяц',
      value: stats?.visitsThisMonth || 0,
      icon: Calendar,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10',
      iconColor: 'text-green-500',
    },
    {
      title: 'Выручка за месяц',
      value: `₪${(stats?.revenueThisMonth || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
    },
    {
      title: 'Средний чек',
      value: `₪${(stats?.averageCheck || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
    },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Обзор вашего бизнеса
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card
              key={index}
              className="bg-[#111827] border-gray-800 hover:border-gray-700 transition-all duration-200 hover:shadow-lg"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">{card.title}</p>
                    <p className="text-3xl font-bold text-white">{card.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${card.bgColor}`}>
                    <Icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="bg-[#111827] border-gray-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Выручка за последние 7 дней
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: any) => [`₪${value}`, 'Выручка']}
                />
                <Bar dataKey="amount" fill="url(#revenueGradient)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Visits Chart */}
        <Card className="bg-[#111827] border-gray-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Визиты за последние 30 дней
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={visitsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="dateLabel" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: any) => [value, 'Визитов']}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Services Chart */}
      {topServices.length > 0 && (
        <Card className="bg-[#111827] border-gray-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Топ-5 услуг за месяц
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topServices} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="name" type="category" width={150} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: any) => [value, 'Визитов']}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {topServices.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Onboarding Wizard */}
      {onboardingData?.showOnboarding && (
        <OnboardingWizard
          open={true}
          organizationName={onboardingData.organizationName}
        />
      )}
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDashboardStats, useRevenueByMonth, useVisitsByMonth, useTopClients } from '@/hooks/useStats'
import { Users, Calendar, DollarSign, UserX, TrendingUp, BarChart3, UsersRound } from 'lucide-react'
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts'
import { useRouter } from 'next/navigation'
import { useFeatures } from '@/hooks/useFeatures'
import { useLanguage } from '@/contexts/LanguageContext'

export default function StatsPage() {
  const router = useRouter()
  const features = useFeatures()
  const { t } = useLanguage()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: revenueData, isLoading: revenueLoading } = useRevenueByMonth()
  const { data: visitsData, isLoading: visitsLoading } = useVisitsByMonth()
  const { data: topClients, isLoading: topLoading } = useTopClients()

  // Check feature access and organization status
  useEffect(() => {
    if (!features.isLoading) {
      if (!features.isActive) {
        router.push('/blocked')
      } else if (!features.hasAnalytics) {
        router.push('/dashboard')
      }
    }
  }, [features.hasAnalytics, features.isActive, features.isLoading, router])

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('stats.title')}</h1>
        <p className="text-gray-600 mt-1">{t('stats.subtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="space-y-3 md:space-y-0">
        {/* Mobile: Grid 2x2 */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md aspect-square flex flex-col items-center justify-between p-4 text-center"
            style={{ animation: 'fadeInScale 0.4s ease-out 0s both' }}
          >
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats?.totalClients || 0}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{t('dashboard.totalClients')}</div>
          </div>

          <div 
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md aspect-square flex flex-col items-center justify-between p-4 text-center"
            style={{ animation: 'fadeInScale 0.4s ease-out 0.1s both' }}
          >
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
              <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats?.visitsThisMonth || 0}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{t('dashboard.visitsMonth')}</div>
          </div>

          <div 
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md aspect-square flex flex-col items-center justify-between p-4 text-center"
            style={{ animation: 'fadeInScale 0.4s ease-out 0.2s both' }}
          >
            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full">
              <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              ₪{stats?.revenueThisMonth.toFixed(2) || '0.00'}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{t('dashboard.revenueMonth')}</div>
          </div>

          <div 
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md aspect-square flex flex-col items-center justify-between p-4 text-center"
            style={{ animation: 'fadeInScale 0.4s ease-out 0.3s both' }}
          >
            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full">
              <UserX className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats?.inactiveClients || 0}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{t('dashboard.inactiveClients')}</div>
          </div>
        </div>

        {/* Desktop: Original layout */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('dashboard.totalClients')}</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">
                    {stats?.totalClients || 0}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('dashboard.visitsMonth')}</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {stats?.visitsThisMonth || 0}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('dashboard.revenueMonth')}</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">
                    ₪{stats?.revenueThisMonth.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('dashboard.inactiveClients')}</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">
                    {stats?.inactiveClients || 0}
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <UserX className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{t('dashboard.inactiveNote')}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 animate-fadeInUp">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('stats.revenueByMonth')}</h3>
          </div>
          {revenueLoading ? (
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320} className="min-h-[250px]">
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
          )}
        </div>

        {/* Visits Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
              <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('stats.visitsByMonth')}</h3>
          </div>
          {visitsLoading ? (
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320} className="min-h-[250px]">
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
          )}
        </div>
      </div>

      {/* Top Clients Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
            <UsersRound className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('stats.topClients')}</h3>
        </div>
        {topLoading ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
          </div>
        ) : topClients && topClients.length > 0 ? (
          <ResponsiveContainer width="100%" height={320} className="min-h-[250px]">
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
        ) : (
          <div className="h-80 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">{t('stats.noData')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

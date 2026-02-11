'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDashboardStats, useRevenueByMonth, useVisitsByMonth, useTopClients } from '@/hooks/useStats'
import { Users, Calendar, DollarSign, UserX } from 'lucide-react'
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
  Legend,
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('stats.revenueByMonth')}</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <div className="h-80 flex items-center justify-center">
                <p className="text-gray-500">{t('common.loading')}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any) => [`₪${value.toFixed(2)}`, t('payments.amount')]}
                    labelStyle={{ direction: 'rtl' }}
                  />
                  <Bar dataKey="amount" fill="#9333ea" name={t('stats.revenue')} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Visits Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('stats.visitsByMonth')}</CardTitle>
          </CardHeader>
          <CardContent>
            {visitsLoading ? (
              <div className="h-80 flex items-center justify-center">
                <p className="text-gray-500">{t('common.loading')}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={visitsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any) => [value, t('clients.visits')]}
                    labelStyle={{ direction: 'rtl' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#16a34a"
                    strokeWidth={2}
                    name={t('clients.visits')}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Clients Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('stats.topClients')}</CardTitle>
        </CardHeader>
        <CardContent>
          {topLoading ? (
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-500">{t('common.loading')}</p>
            </div>
          ) : topClients && topClients.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topClients} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip
                  formatter={(value: any) => [`₪${value.toFixed(2)}`, t('stats.totalPayments')]}
                  labelStyle={{ direction: 'rtl' }}
                />
                <Bar dataKey="amount" fill="#2563eb" name={t('payments.amount')} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-500">{t('stats.noData')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

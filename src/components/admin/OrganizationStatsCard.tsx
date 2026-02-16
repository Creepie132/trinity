'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { Users, CreditCard, Calendar, TrendingUp, Clock, DollarSign } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface OrganizationStatsCardProps {
  orgId: string
}

type Period = 'day' | 'week' | 'month' | 'year'

export function OrganizationStatsCard({ orgId }: OrganizationStatsCardProps) {
  const { t, language } = useLanguage()
  const [period, setPeriod] = useState<Period>('month')

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin-org-stats', orgId, period],
    queryFn: async () => {
      const response = await fetch(`/api/admin/organizations/${orgId}/stats?period=${period}`)
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }
      return response.json()
    },
    enabled: !!orgId,
  })

  const periodLabels: Record<Period, { he: string; ru: string }> = {
    day: { he: 'יום', ru: 'День' },
    week: { he: 'שבוע', ru: 'Неделя' },
    month: { he: 'חודש', ru: 'Месяц' },
    year: { he: 'שנה', ru: 'Год' },
  }

  const getPeriodLabel = (p: Period) => {
    return language === 'he' ? periodLabels[p].he : periodLabels[p].ru
  }

  if (error) {
    return (
      <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
        <CardContent className="p-6">
          <p className="text-red-600 dark:text-red-400">
            {language === 'he' ? 'שגיאה בטעינת נתונים' : 'Ошибка загрузки данных'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Period Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {language === 'he' ? 'תקופה:' : 'Период:'}
        </span>
        <div className="flex gap-2 flex-wrap">
          {(['day', 'week', 'month', 'year'] as Period[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p)}
              className="min-w-[70px]"
            >
              {getPeriodLabel(p)}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {t('common.loading')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Total Clients */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Users className="w-4 h-4 text-white" />
                </div>
                {language === 'he' ? 'סך הכל לקוחות' : 'Всего клиентов'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats?.stats?.totalClients || 0}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {language === 'he' ? 'כל הזמנים' : 'Все время'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Visits Count */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                {language === 'he' ? 'ביקורים' : 'Визиты'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats?.stats?.visitsCount || 0}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {getPeriodLabel(period)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Payments Count */}
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <div className="p-2 bg-amber-500 rounded-lg">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                {language === 'he' ? 'מכירות' : 'Продажи'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {stats?.stats?.paymentsCount || 0}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {getPeriodLabel(period)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                {language === 'he' ? 'הכנסות' : 'Доход'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  ₪{(stats?.stats?.totalRevenue || 0).toLocaleString()}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {getPeriodLabel(period)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Period Info */}
      {stats && !isLoading && (
        <Card className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>
                {language === 'he' 
                  ? `נתונים מ-${new Date(stats.startDate).toLocaleDateString('he-IL')} עד ${new Date(stats.endDate).toLocaleDateString('he-IL')}`
                  : `Данные с ${new Date(stats.startDate).toLocaleDateString('ru-RU')} до ${new Date(stats.endDate).toLocaleDateString('ru-RU')}`
                }
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

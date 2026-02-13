'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useDashboardStats } from '@/hooks/useStats'
import { Users, Calendar, DollarSign, UserX, ArrowLeft } from 'lucide-react'
import AdBanner from '@/components/ads/AdBanner'
import { useFeatures } from '@/hooks/useFeatures'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Home() {
  const { data: stats, isLoading } = useDashboardStats()
  const features = useFeatures()
  const router = useRouter()
  const { layout } = useTheme()
  const { t } = useLanguage()

  // Check if organization is blocked
  useEffect(() => {
    if (!features.isLoading && !features.isActive) {
      router.push('/blocked')
    }
  }, [features.isActive, features.isLoading, router])

  return (
    <div className="space-y-6 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('dashboard.welcome')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Stats Cards with Ad Banner */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Stats Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Always show: Total Clients */}
            <Card className="stat-card bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 min-h-[128px]">
              <CardContent className={layout === 'compact' ? 'p-4' : 'p-6'}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-gray-600 dark:text-gray-400 ${layout === 'compact' ? 'text-xs' : 'text-sm'}`}>
                      {t('dashboard.totalClients')}
                    </p>
                    <p className={`font-bold text-theme-primary mt-1 stat-value ${
                      layout === 'modern' ? 'text-4xl' : layout === 'compact' ? 'text-2xl' : 'text-3xl'
                    }`}>
                      {stats?.totalClients || 0}
                    </p>
                  </div>
                  <div className={`bg-theme-primary bg-opacity-10 dark:bg-opacity-20 rounded-full stat-icon ${
                    layout === 'modern' ? 'p-4 shadow-md' : layout === 'compact' ? 'p-2' : 'p-3'
                  }`}>
                    <Users className={`text-theme-primary ${
                      layout === 'modern' ? 'w-7 h-7' : layout === 'compact' ? 'w-5 h-5' : 'w-6 h-6'
                    }`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Always show: Visits This Month */}
            <Card className="stat-card bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 min-h-[128px]">
              <CardContent className={layout === 'compact' ? 'p-4' : 'p-6'}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-gray-600 dark:text-gray-400 ${layout === 'compact' ? 'text-xs' : 'text-sm'}`}>
                      {t('dashboard.visitsMonth')}
                    </p>
                    <p className={`font-bold text-green-600 dark:text-green-400 mt-1 stat-value ${
                      layout === 'modern' ? 'text-4xl' : layout === 'compact' ? 'text-2xl' : 'text-3xl'
                    }`}>
                      {stats?.visitsThisMonth || 0}
                    </p>
                  </div>
                  <div className={`bg-green-100 dark:bg-green-900/20 rounded-full stat-icon ${
                    layout === 'modern' ? 'p-4 shadow-md' : layout === 'compact' ? 'p-2' : 'p-3'
                  }`}>
                    <Calendar className={`text-green-600 dark:text-green-400 ${
                      layout === 'modern' ? 'w-7 h-7' : layout === 'compact' ? 'w-5 h-5' : 'w-6 h-6'
                    }`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Show only if hasPayments */}
            {features.hasPayments && (
              <Card className="stat-card bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 min-h-[128px]">
                <CardContent className={layout === 'compact' ? 'p-4' : 'p-6'}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-gray-600 dark:text-gray-400 ${layout === 'compact' ? 'text-xs' : 'text-sm'}`}>
                        {t('dashboard.revenueMonth')}
                      </p>
                      <p className={`font-bold text-purple-600 dark:text-purple-400 mt-1 stat-value ${
                        layout === 'modern' ? 'text-4xl' : layout === 'compact' ? 'text-2xl' : 'text-3xl'
                      }`}>
                        ₪{stats?.revenueThisMonth.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <div className={`bg-purple-100 dark:bg-purple-900/20 rounded-full stat-icon ${
                      layout === 'modern' ? 'p-4 shadow-md' : layout === 'compact' ? 'p-2' : 'p-3'
                    }`}>
                      <DollarSign className={`text-purple-600 dark:text-purple-400 ${
                        layout === 'modern' ? 'w-7 h-7' : layout === 'compact' ? 'w-5 h-5' : 'w-6 h-6'
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Show only if hasAnalytics */}
            {features.hasAnalytics && (
              <Card className="stat-card bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 min-h-[128px]">
                <CardContent className={layout === 'compact' ? 'p-4' : 'p-6'}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-gray-600 dark:text-gray-400 ${layout === 'compact' ? 'text-xs' : 'text-sm'}`}>
                        {t('dashboard.inactiveClients')}
                      </p>
                      <p className={`font-bold text-orange-600 dark:text-orange-400 mt-1 stat-value ${
                        layout === 'modern' ? 'text-4xl' : layout === 'compact' ? 'text-2xl' : 'text-3xl'
                      }`}>
                        {stats?.inactiveClients || 0}
                      </p>
                    </div>
                    <div className={`bg-orange-100 dark:bg-orange-900/20 rounded-full stat-icon ${
                      layout === 'modern' ? 'p-4 shadow-md' : layout === 'compact' ? 'p-2' : 'p-3'
                    }`}>
                      <UserX className={`text-orange-600 dark:text-orange-400 ${
                        layout === 'modern' ? 'w-7 h-7' : layout === 'compact' ? 'w-5 h-5' : 'w-6 h-6'
                      }`} />
                    </div>
                  </div>
                  <p className={`text-gray-500 dark:text-gray-400 mt-2 ${layout === 'compact' ? 'text-xs' : 'text-xs'}`}>
                    {t('dashboard.inactiveNote')}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Ad Banner */}
          <div className="lg:w-[300px]">
            <AdBanner category={features.category} />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('dashboard.quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/clients">
            <Button variant="outline" className="w-full justify-between border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              <span>{t('nav.clients')}</span>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <Link href="/payments">
            <Button variant="outline" className="w-full justify-between border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              <span>{t('nav.payments')}</span>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <Link href="/sms">
            <Button variant="outline" className="w-full justify-between border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              <span>{t('nav.sms')}</span>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <Link href="/stats">
            <Button variant="outline" className="w-full justify-between border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              <span>{t('nav.stats')}</span>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
        <h2 className="text-xl font-semibold mb-4 text-blue-900 dark:text-blue-300">{t('dashboard.gettingStarted')}</h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>{t('dashboard.step1')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>{t('dashboard.step2')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>{t('dashboard.step3')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>{t('dashboard.step4')}</span>
          </li>
        </ul>
      </div>

      {/* View Full Stats Link */}
      <div className="text-center">
        <Link href="/stats">
          <Button size="lg">
            {t('dashboard.viewFullStats')}
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

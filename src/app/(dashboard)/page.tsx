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

export default function Home() {
  const { data: stats, isLoading } = useDashboardStats()
  const features = useFeatures()
  const router = useRouter()

  // Check if organization is blocked
  useEffect(() => {
    if (!features.isLoading && !features.isActive) {
      router.push('/blocked')
    }
  }, [features.isActive, features.isLoading, router])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          ברוכים הבאים ל-Trinity
        </h1>
        <p className="text-gray-600 mt-2">
          מערכת ניהול לקוחות, תשלומים והודעות SMS
        </p>
      </div>

      {/* Stats Cards with Ad Banner */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">טוען נתונים...</div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Stats Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Always show: Total Clients */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">סה״כ לקוחות</p>
                    <p className="text-3xl font-bold text-theme-primary mt-1">
                      {stats?.totalClients || 0}
                    </p>
                  </div>
                  <div className="bg-theme-primary bg-opacity-10 p-3 rounded-full">
                    <Users className="w-6 h-6 text-theme-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Always show: Visits This Month */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">ביקורים החודש</p>
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

            {/* Show only if hasPayments */}
            {features.hasPayments && (
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">הכנסות החודש</p>
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
            )}

            {/* Show only if hasAnalytics */}
            {features.hasAnalytics && (
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">לקוחות לא פעילים</p>
                      <p className="text-3xl font-bold text-orange-600 mt-1">
                        {stats?.inactiveClients || 0}
                      </p>
                    </div>
                    <div className="bg-orange-100 p-3 rounded-full">
                      <UserX className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">30+ ימים ללא ביקור</p>
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
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">פעולות מהירות</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/clients">
            <Button variant="outline" className="w-full justify-between">
              <span>לקוחות</span>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <Link href="/payments">
            <Button variant="outline" className="w-full justify-between">
              <span>תשלומים</span>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <Link href="/sms">
            <Button variant="outline" className="w-full justify-between">
              <span>הודעות SMS</span>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <Link href="/stats">
            <Button variant="outline" className="w-full justify-between">
              <span>סטטיסטיקה</span>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h2 className="text-xl font-semibold mb-4 text-blue-900">התחלה מהירה</h2>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>הוסף לקוחות חדשים בעמוד "לקוחות"</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>צור קישורי תשלום בעמוד "תשלומים"</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>שלח הודעות SMS ללקוחות בעמוד "הודעות SMS"</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>עקוב אחר הנתונים והגרפים בעמוד "סטטיסטיקה"</span>
          </li>
        </ul>
      </div>

      {/* View Full Stats Link */}
      <div className="text-center">
        <Link href="/stats">
          <Button size="lg">
            צפה בסטטיסטיקה מלאה
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

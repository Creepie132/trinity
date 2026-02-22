'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import Link from 'next/link'

interface TodayVisit {
  id: string
  time: string
  clientName: string
  notes: string | null
  status: string
}

interface TodayBlockClientProps {
  visits: TodayVisit[]
}

export default function TodayBlockClient({ visits }: TodayBlockClientProps) {
  const { language } = useLanguage()

  // Format today's date based on user's language
  const today = new Date()
  const dateLocale = language === 'he' ? 'he-IL' : 'ru-RU'
  const formattedDate = today.toLocaleDateString(dateLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const translations = {
    he: {
      today: 'היום',
      completed: 'הושלם',
      scheduled: 'מתוכנן',
      cancelled: 'בוטל',
      pending: 'ממתין',
      showAll: 'הצג הכל',
      noVisits: 'אין תורים להיום 🎉',
    },
    ru: {
      today: 'Сегодня',
      completed: 'Завершён',
      scheduled: 'Запланирован',
      cancelled: 'Отменён',
      pending: 'Ожидает',
      showAll: 'Показать все',
      noVisits: 'Нет записей на сегодня 🎉',
    },
  }

  const t = translations[language]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">✅ {t.completed}</Badge>
      case 'scheduled':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">📅 {t.scheduled}</Badge>
      case 'cancelled':
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20 text-xs">❌ {t.cancelled}</Badge>
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">⏳ {t.pending}</Badge>
    }
  }

  return (
    <Card className="bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-start">
          <Calendar className="w-4 h-4 text-amber-500" />
          {t.today}, {formattedDate}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {visits && visits.length > 0 ? (
          <div className="space-y-2">
            {visits.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-start"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="font-mono text-sm text-gray-700 dark:text-gray-300 w-12 flex-shrink-0">
                    {visit.time}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {visit.clientName}
                    </p>
                    {visit.notes && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {visit.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {getStatusBadge(visit.status)}
                </div>
              </div>
            ))}
            {visits.length === 5 && (
              <Link
                href="/visits"
                className="block text-start text-sm text-blue-600 dark:text-blue-400 hover:underline pt-2"
              >
                {t.showAll} →
              </Link>
            )}
          </div>
        ) : (
          <div className="py-8 text-start">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {t.noVisits}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

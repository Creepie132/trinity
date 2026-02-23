'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { DashboardHeader } from './DashboardHeader'
import { useDemoMode } from '@/hooks/useDemoMode'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'

interface DashboardWrapperProps {
  userName: string
  orgId: string
  children: React.ReactNode
}

export function DashboardWrapper({ userName, orgId, children }: DashboardWrapperProps) {
  const { language, dir } = useLanguage()
  const { isDemo, daysLeft, clientLimit } = useDemoMode()

  // Fetch clients count for DEMO users
  const { data: clientsCount } = useQuery({
    queryKey: ['clients-count', orgId],
    enabled: isDemo && !!orgId,
    queryFn: async () => {
      const response = await fetch('/api/clients/count')
      const data = await response.json()
      return data.count || 0
    },
  })

  return (
    <div className="space-y-6 p-6" dir={dir}>
      {/* DEMO Banner */}
      {isDemo && daysLeft !== null && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              DEMO
            </span>
            <p className="text-red-700 dark:text-red-300 text-sm font-medium">
              {language === 'he'
                ? `גרסת הדגמה — נותרו ${daysLeft} ימים. שדרג לגרסה המלאה!`
                : `Демо-режим — осталось ${daysLeft} дней. Перейдите на полную версию!`}
            </p>
            {/* Clients counter with progress bar */}
            {clientsCount !== undefined && (
              <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700">
                <span className="text-amber-800 dark:text-amber-300 text-xs font-semibold whitespace-nowrap">
                  {language === 'he'
                    ? `לקוחות: ${clientsCount}/${clientLimit}`
                    : `Клиенты: ${clientsCount}/${clientLimit}`}
                </span>
                <div className="w-32 h-2 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 dark:bg-amber-400 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(100, (clientsCount / clientLimit) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <a
            href="https://wa.me/972544858586"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-red-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-600 transition whitespace-nowrap"
          >
            {language === 'he' ? 'שדרג עכשיו' : 'Обновить'}
          </a>
        </div>
      )}

      {/* Header with localized greeting and proper text alignment */}
      <DashboardHeader userName={userName} />
      
      {children}
    </div>
  )
}

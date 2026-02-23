'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { DashboardHeader } from './DashboardHeader'
import { useDemoMode } from '@/hooks/useDemoMode'

interface DashboardWrapperProps {
  userName: string
  orgId: string
  children: React.ReactNode
}

export function DashboardWrapper({ userName, orgId, children }: DashboardWrapperProps) {
  const { language, dir } = useLanguage()
  const { isDemo, daysLeft } = useDemoMode()

  return (
    <div className="space-y-6 p-6" dir={dir}>
      {/* DEMO Banner */}
      {isDemo && daysLeft !== null && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              DEMO
            </span>
            <p className="text-red-700 dark:text-red-300 text-sm font-medium">
              {language === 'he'
                ? `גרסת הדגמה — נותרו ${daysLeft} ימים. שדרג לגרסה המלאה!`
                : `Демо-режим — осталось ${daysLeft} дней. Перейдите на полную версию!`}
            </p>
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

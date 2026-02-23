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
        <div className="bg-gradient-to-r from-red-500 to-amber-500 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded">DEMO</span>
                <span className="text-sm font-medium">
                  {language === 'he'
                    ? `${daysLeft} ימים נותרו`
                    : `${daysLeft} дней осталось`}
                </span>
              </div>
              {/* Clients counter with progress bar */}
              {clientsCount !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-80">
                    {language === 'he'
                      ? `${clientsCount}/${clientLimit} לקוחות`
                      : `${clientsCount}/${clientLimit} клиентов`}
                  </span>
                  <div className="w-16 h-1.5 bg-white/30 rounded-full">
                    <div
                      className="h-full bg-white rounded-full"
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
              className="bg-white text-red-600 text-xs font-bold px-3 py-2 rounded-lg hover:bg-gray-100 transition"
            >
              {language === 'he' ? 'שדרג' : 'Upgrade'}
            </a>
          </div>
        </div>
      )}

      {/* Header with localized greeting and proper text alignment */}
      <DashboardHeader userName={userName} />
      
      {children}
    </div>
  )
}

'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { DashboardHeader } from './DashboardHeader'

interface DashboardWrapperProps {
  userName: string
  orgId: string
  children: React.ReactNode
}

export function DashboardWrapper({ userName, orgId, children }: DashboardWrapperProps) {
  const { language, dir } = useLanguage()

  return (
    <div className="space-y-6 p-6" dir={dir}>
      {/* Header with localized greeting and proper text alignment */}
      <DashboardHeader userName={userName} />
      
      {children}
    </div>
  )
}

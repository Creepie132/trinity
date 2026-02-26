'use client'

import { ComingSoon } from '@/components/ui/ComingSoon'
import { useLanguage } from '@/contexts/LanguageContext'

export default function AnalyticsPage() {
  const { language } = useLanguage()
  
  const title = language === 'he' ? 'דוחות' : 'Отчёты'
  
  return <ComingSoon title={title} />
}

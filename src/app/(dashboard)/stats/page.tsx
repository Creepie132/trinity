'use client'

import { ComingSoon } from '@/components/ui/ComingSoon'
import { useLanguage } from '@/contexts/LanguageContext'

export default function StatsPage() {
  const { language } = useLanguage()
  
  const title = language === 'he' ? 'סטטיסטיקה' : 'Статистика'
  
  return <ComingSoon title={title} />
}

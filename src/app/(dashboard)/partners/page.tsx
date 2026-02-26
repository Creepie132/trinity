'use client'

import { ComingSoon } from '@/components/ui/ComingSoon'
import { useLanguage } from '@/contexts/LanguageContext'

export default function PartnersPage() {
  const { language } = useLanguage()
  
  const title = language === 'he' ? 'הצעות שותפים' : 'Предложения партнёров'
  
  return <ComingSoon title={title} />
}

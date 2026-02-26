'use client'

import { ComingSoon } from '@/components/ui/ComingSoon'
import { useLanguage } from '@/contexts/LanguageContext'

export default function SmsPage() {
  const { language } = useLanguage()
  
  const title = language === 'he' ? 'הודעות SMS' : 'SMS-сообщения'
  
  return <ComingSoon title={title} />
}

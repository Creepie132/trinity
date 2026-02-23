'use client'

import { Handshake } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function PartnersPage() {
  const { language } = useLanguage()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <Handshake size={48} className="text-amber-500 mb-4" />
      <h1 className="text-2xl font-bold mb-2">
        {language === 'he' ? 'הצעות שותפים' : 'Партнёрские предложения'}
      </h1>
      <p className="text-muted-foreground">
        {language === 'he' ? 'בקרוב...' : 'Скоро...'}
      </p>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useModalStore } from '@/store/useModalStore'

interface DraftSaleIndicatorProps {
  clientId: string
  client: any
  locale: 'he' | 'ru'
}

export function DraftSaleIndicator({ clientId, client, locale }: DraftSaleIndicatorProps) {
  const [hasDraft, setHasDraft] = useState(false)
  const { openModal } = useModalStore()

  useEffect(() => {
    const draftKey = `draft_sale_${clientId}`
    const draft = localStorage.getItem(draftKey)
    setHasDraft(!!draft)
  }, [clientId])

  if (!hasDraft) return null

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    openModal('client-sale', { client, locale })
  }

  return (
    <button
      onClick={handleClick}
      className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition"
      title={locale === 'he' ? 'יש עסקה שמורה' : 'Есть сохранённая сделка'}
    >
      <ShoppingCart className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    </button>
  )
}

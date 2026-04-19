'use client'

/**
 * DemoSectionBanner — красный баннер для разделов с лимитами в демо-режиме.
 * Показывает: использованных / доступных записей.
 * Место: прямо под заголовком страницы.
 */

import { AlertCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDemoMode } from '@/hooks/useDemoMode'

interface DemoSectionBannerProps {
  section: 'clients' | 'visits_active' | 'visits_total' | 'inventory' | 'diary'
  used: number
}

const LIMITS = {
  clients:      10,
  visits_active: 3,
  visits_total:  15,
  inventory:     5,
  diary:         5,
}

const T = {
  ru: {
    clients:       (u: number, l: number) => `Демо: добавлено ${u} из ${l} клиентов`,
    visits_active: (u: number, l: number) => `Демо: активных визитов ${u} из ${l}`,
    visits_total:  (u: number, l: number) => `Демо: всего визитов ${u} из ${l}`,
    inventory:     (u: number, l: number) => `Демо: добавлено ${u} из ${l} товаров`,
    diary:         (u: number, l: number) => `Демо: записей ${u} из ${l}`,
    hint: 'Для снятия ограничений — свяжитесь с нами',
  },
  he: {
    clients:       (u: number, l: number) => `דמו: נוספו ${u} מתוך ${l} לקוחות`,
    visits_active: (u: number, l: number) => `דמו: תורים פעילים ${u} מתוך ${l}`,
    visits_total:  (u: number, l: number) => `דמו: סה"כ תורים ${u} מתוך ${l}`,
    inventory:     (u: number, l: number) => `דמו: נוספו ${u} מתוך ${l} מוצרים`,
    diary:         (u: number, l: number) => `דמו: רשומות ${u} מתוך ${l}`,
    hint: 'להסרת המגבלות — צרו קשר',
  },
}

export function DemoSectionBanner({ section, used }: DemoSectionBannerProps) {
  const { isDemo } = useDemoMode()
  const { language } = useLanguage()
  if (!isDemo) return null

  const t = T[language as 'ru' | 'he'] ?? T.ru
  const limit = LIMITS[section]
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const isFull = used >= limit
  const isWarning = pct >= 70

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm mb-4 transition-all ${
      isFull
        ? 'bg-red-50 border-red-200 text-red-800'
        : isWarning
          ? 'bg-orange-50 border-orange-200 text-orange-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'
    }`}>
      <AlertCircle size={16} className="flex-shrink-0"/>
      <div className="flex-1 min-w-0">
        <span className="font-semibold">{t[section](used, limit)}</span>
        {/* Progress bar */}
        <div className="mt-1 h-1.5 rounded-full bg-black/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-amber-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="text-xs opacity-70 whitespace-nowrap hidden sm:block">{t.hint}</span>
    </div>
  )
}

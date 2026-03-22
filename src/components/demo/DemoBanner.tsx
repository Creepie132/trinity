'use client'

import { useState } from 'react'
import { Sparkles, X, MessageCircle, Play } from 'lucide-react'
import { useDemoContext } from '@/contexts/DemoContext'

/**
 * DemoBanner — прилипающая полоска сверху в demo-режиме.
 * Показывает кнопки: «Начать тур» и «Хочу такую систему».
 * Не рендерится вне DemoProvider.
 */
export function DemoBanner() {
  const { startTour, isTourActive } = useDemoContext()
  const [dismissed, setDismissed]   = useState(false)

  if (dismissed) return null

  return (
    <div
      role="banner"
      aria-label="Демо-режим Trinity CRM"
      className={`
        relative z-50 w-full
        bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600
        text-white px-4 py-2.5
        flex items-center justify-between gap-3
        shadow-md select-none
        transition-all duration-300
      `}
    >
      {/* Левая часть — иконка + текст + кнопка тура */}
      <div className="flex items-center gap-2.5 text-sm font-medium min-w-0">
        <Sparkles size={16} className="shrink-0 animate-pulse" />
        <span className="truncate">Демо-режим Trinity CRM</span>

        {!isTourActive && (
          <button
            onClick={startTour}
            className="
              hidden sm:inline-flex items-center gap-1.5
              bg-white/20 hover:bg-white/30
              px-3 py-1 rounded-full
              text-xs font-semibold
              transition-colors duration-150
            "
          >
            <Play size={11} />
            Начать тур
          </button>
        )}
      </div>

      {/* Правая часть — CTA + закрыть */}
      <div className="flex items-center gap-2 shrink-0">
        <a
          href="https://wa.me/972544858586"
          target="_blank"
          rel="noopener noreferrer"
          className="
            flex items-center gap-1.5
            bg-white text-amber-700 hover:bg-amber-50
            px-3 py-1.5 rounded-full
            text-xs font-bold
            transition-colors duration-150 shadow-sm
            whitespace-nowrap
          "
        >
          <MessageCircle size={12} />
          <span className="hidden xs:inline">Хочу такую систему</span>
          <span className="xs:hidden">Купить</span>
        </a>

        <button
          onClick={() => setDismissed(true)}
          aria-label="Закрыть демо-баннер"
          className="p-1 rounded-full hover:bg-white/20 transition-colors duration-150"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

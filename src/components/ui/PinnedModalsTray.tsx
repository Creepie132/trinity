'use client'

import { usePinnedModals } from '@/store/usePinnedModals'
import { PinOff, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * PinnedModalsTray — индикатор закреплённых окон.
 * Показывается когда есть хотя бы одно закреплённое окно.
 * Расположен справа внизу, не конфликтует с ImpersonationBanner (центр).
 */
export function PinnedModalsTray() {
  const { pinned, unpin } = usePinnedModals()

  if (pinned.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9998] flex flex-col gap-2 items-end animate-in slide-in-from-bottom-4 duration-200">
      {/* Заголовок */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow text-xs text-gray-500 dark:text-gray-400">
        <Layers className="w-3 h-3" />
        <span>{pinned.length} / 3 закреплено</span>
      </div>

      {/* Список закреплённых */}
      {pinned.map(p => (
        <div
          key={p.id}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-800 shadow-md"
        >
          <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[140px] truncate">
            {p.title}
          </span>
          <button
            onClick={() => unpin(p.id)}
            className="p-1 rounded-full hover:bg-orange-50 dark:hover:bg-orange-900/30 text-orange-400 hover:text-orange-600 transition-colors flex-shrink-0"
            title="Открепить"
          >
            <PinOff className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

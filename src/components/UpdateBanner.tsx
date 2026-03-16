'use client'

import { useServiceWorker } from '@/hooks/useServiceWorker'
import { RefreshCw } from 'lucide-react'

export function UpdateBanner() {
  const { updateAvailable, applyUpdate } = useServiceWorker()

  if (!updateAvailable) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex justify-center px-3 pt-3 animate-slide-down-banner">
      <div className="flex items-center gap-3 bg-indigo-600 text-white rounded-2xl px-4 py-3 shadow-2xl max-w-sm w-full">
        <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin-slow" />
        <p className="text-sm flex-1">גרסה חדשה זמינה</p>
        <button
          onClick={applyUpdate}
          className="flex-shrink-0 bg-white text-indigo-600 text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          עדכן עכשיו
        </button>
      </div>
    </div>
  )
}

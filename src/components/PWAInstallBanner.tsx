'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const DISMISSED_KEY = 'pwa_banner_dismissed_at'
const DISMISS_TTL_DAYS = 30 // показывать снова через 30 дней

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Don't show if dismissed recently (30 days)
    const dismissedAt = localStorage.getItem(DISMISSED_KEY)
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24)
      if (daysSince < DISMISS_TTL_DAYS) return
      // Прошло больше 30 дней — сбрасываем флаг
      localStorage.removeItem(DISMISSED_KEY)
    }

    // Only on mobile devices
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (window.innerWidth < 768)

    if (!isMobile) return

    // Don't show if already installed (standalone mode)
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true

    if (isInstalled) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // On iOS, beforeinstallprompt doesn't fire — show banner anyway after delay
    const iosTimer = setTimeout(() => {
      if (!deferredPrompt && !localStorage.getItem(DISMISSED_KEY)) {
        setShow(true)
      }
    }, 3000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(iosTimer)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        handleDismiss()
      }
    } else {
      // iOS: no programmatic install — just dismiss with instructions
      handleDismiss()
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe">
      <div className="flex items-center gap-3 bg-indigo-600 text-white rounded-2xl px-4 py-3 shadow-2xl">
        {/* App icon */}
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img src="/icons/icon-192.png" alt="Trinity" className="w-9 h-9 rounded-lg" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">
            התקן את Trinity על המסך הבית שלך
          </p>
          <p className="text-xs text-indigo-200 mt-0.5">גישה מהירה תמיד</p>
        </div>

        {/* Install button */}
        <button
          onClick={handleInstall}
          className="flex-shrink-0 bg-white text-indigo-600 text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          התקן
        </button>

        {/* Close */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          aria-label="סגור"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

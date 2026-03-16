'use client'

import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

const DISMISSED_KEY = 'pwa_banner_dismissed_at'
const DISMISS_TTL_DAYS = 7 // показывать снова через 7 дней (было 30 — слишком долго)

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Don't show if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISSED_KEY)
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24)
      if (daysSince < DISMISS_TTL_DAYS) return
      localStorage.removeItem(DISMISSED_KEY)
    }

    // Don't show if already installed (standalone mode)
    const isInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true

    if (isInstalled) return

    // Listen for Chrome/Android install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // On iOS / desktop Safari — beforeinstallprompt never fires.
    // Show the banner after a short delay regardless of device type.
    const fallbackTimer = setTimeout(() => {
      if (!localStorage.getItem(DISMISSED_KEY)) {
        setShow(true)
      }
    }, 4000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(fallbackTimer)
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
      // iOS / Desktop: scroll to download section on landing, or just dismiss
      const downloadSection = document.getElementById('download')
      if (downloadSection) {
        downloadSection.scrollIntoView({ behavior: 'smooth' })
      }
      handleDismiss()
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-safe animate-slide-up-banner">
      <div className="flex items-center gap-3 bg-indigo-600 text-white rounded-2xl px-4 py-3 shadow-2xl max-w-lg mx-auto">
        {/* App icon */}
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img src="/icons/icon-192.png" alt="Trinity" className="w-9 h-9 rounded-lg" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">
            התקן את Trinity
          </p>
          <p className="text-xs text-indigo-200 mt-0.5">גישה מהירה מהמסך הבית</p>
        </div>

        {/* Install button */}
        <button
          onClick={handleInstall}
          className="flex-shrink-0 bg-white text-indigo-600 text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
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

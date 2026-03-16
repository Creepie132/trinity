'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, Smartphone, Monitor, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface InstallCardsProps {
  language: 'he' | 'ru'
  t: {
    download: {
      ios: { title: string }
      android: { title: string }
      desktop: { title: string }
    }
  }
}

// Global store for beforeinstallprompt — captured as early as possible
let _globalPrompt: BeforeInstallPromptEvent | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    _globalPrompt = e as BeforeInstallPromptEvent
    // Dispatch custom event so any mounted component can react
    window.dispatchEvent(new Event('pwa-prompt-ready'))
  })
}

export function InstallCards({ language, t }: InstallCardsProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installSuccess, setInstallSuccess] = useState(false)
  // 'pending' = still waiting, 'available' = prompt ready, 'unavailable' = not supported
  const [promptState, setPromptState] = useState<'pending' | 'available' | 'unavailable'>('pending')
  const [showIosHint, setShowIosHint] = useState(false)

  const isIos = typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent)

  useEffect(() => {
    // Already installed?
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    ) {
      setIsInstalled(true)
      setPromptState('unavailable')
      return
    }

    // iOS never fires beforeinstallprompt — mark unavailable immediately
    if (isIos) {
      setPromptState('unavailable')
      return
    }

    // Check if global prompt was already captured before component mounted
    if (_globalPrompt) {
      setDeferredPrompt(_globalPrompt)
      setPromptState('available')
      return
    }

    // Listen for the event
    const onPromptReady = () => {
      if (_globalPrompt) {
        setDeferredPrompt(_globalPrompt)
        setPromptState('available')
      }
    }
    window.addEventListener('pwa-prompt-ready', onPromptReady)

    // After 5 seconds with no prompt — mark as unavailable
    // (browser decided not to offer install: already installed, recently dismissed, non-Chrome, etc.)
    const fallbackTimer = setTimeout(() => {
      setPromptState(prev => prev === 'pending' ? 'unavailable' : prev)
    }, 5000)

    return () => {
      window.removeEventListener('pwa-prompt-ready', onPromptReady)
      clearTimeout(fallbackTimer)
    }
  }, [isIos])

  const handleInstall = useCallback(async () => {
    const prompt = deferredPrompt || _globalPrompt
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      _globalPrompt = null
      setDeferredPrompt(null)
      setInstallSuccess(true)
      setPromptState('unavailable')
    }
  }, [deferredPrompt])

  const he = language === 'he'

  const labels = {
    installBtn:    he ? 'התקן עכשיו'            : 'Установить сейчас',
    installed:     he ? '✓ מותקן'                : '✓ Установлено',
    iosBtn:        he ? 'הוראות התקנה'           : 'Инструкция по установке',
    iosHintTitle:  he ? 'התקנה ב-iPhone / iPad'  : 'Установка на iPhone / iPad',
    iosStep1:      he ? 'פתח Safari ועבור ל-ambersol.co.il' : 'Откройте ambersol.co.il в Safari',
    iosStep2:      he ? 'לחץ על כפתור השיתוף ↑ בתחתית המסך' : 'Нажмите кнопку "Поделиться" ↑ внизу',
    iosStep3:      he ? 'בחר "הוסף למסך הבית" → לחץ "הוסף"' : 'Выберите "На экран Домой" → "Добавить"',
    iosClose:      he ? 'סגור'                   : 'Закрыть',
    loading:       he ? 'בודק...'                : 'Проверка...',
    notAvail:      he ? 'כבר מותקן או לא נתמך'  : 'Уже установлено или не поддерживается',
    notAvailHint:  he ? 'נסה ב-Chrome עם HTTPS'  : 'Попробуйте Chrome + HTTPS',
  }

  // Pending state — spinner while waiting for beforeinstallprompt
  const PendingBtn = ({ color }: { color: string }) => (
    <div className={`w-full py-3.5 px-5 bg-${color}-50 text-${color}-400 rounded-xl text-sm text-center flex items-center justify-center gap-2`}>
      <div className={`w-4 h-4 border-2 border-${color}-300 border-t-transparent rounded-full animate-spin`} />
      {labels.loading}
    </div>
  )

  // Unavailable state
  const UnavailableBlock = () => (
    <div className="w-full py-3 px-5 bg-gray-100 text-gray-500 rounded-xl text-sm text-center">
      <p className="font-medium">{isInstalled || installSuccess ? labels.installed : labels.notAvail}</p>
      {!isInstalled && !installSuccess && <p className="text-xs mt-0.5">{labels.notAvailHint}</p>}
    </div>
  )

  const InstallBtn = ({ color, label }: { color: string; label: string }) => (
    <button
      onClick={handleInstall}
      className={`w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-${color}-600 text-white rounded-xl font-semibold text-sm hover:bg-${color}-700 transition-all hover:scale-[1.02] active:scale-95 shadow-md`}
    >
      <Download className="w-4 h-4" />
      {label}
    </button>
  )

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* ── iOS ── */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-gray-800 hover:shadow-xl transition-shadow flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-800" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900">{t.download.ios.title}</h3>
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <div className="bg-gray-50 rounded-xl p-4 mb-5 text-center">
              <Share className="w-8 h-8 text-blue-500 mx-auto mb-1" />
              <p className="text-xs text-gray-500">{he ? 'Safari → שיתוף → הוסף למסך הבית' : 'Safari → Поделиться → На экран Домой'}</p>
            </div>
            <button
              onClick={() => setShowIosHint(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-700 transition-all hover:scale-[1.02] active:scale-95 shadow-md"
            >
              <Download className="w-4 h-4" />
              {labels.iosBtn}
            </button>
          </div>
        </div>

        {/* ── Android ── */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-green-500 hover:shadow-xl transition-shadow flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{t.download.android.title}</h3>
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <div className="bg-gray-50 rounded-xl p-4 mb-5 text-center">
              <Smartphone className="w-8 h-8 text-green-500 mx-auto mb-1" />
              <p className="text-xs text-gray-500">{he ? 'Chrome → תפריט ⋮ → הוסף למסך הבית' : 'Chrome → Меню ⋮ → На гл. экран'}</p>
            </div>
            {promptState === 'pending'     && <PendingBtn color="green" />}
            {promptState === 'available'   && <InstallBtn color="green" label={labels.installBtn} />}
            {promptState === 'unavailable' && <UnavailableBlock />}
          </div>
        </div>

        {/* ── Desktop ── */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-blue-500 hover:shadow-xl transition-shadow flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Monitor className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{t.download.desktop.title}</h3>
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <div className="bg-gray-50 rounded-xl p-4 mb-5 text-center">
              <Download className="w-8 h-8 text-blue-500 mx-auto mb-1" />
              <p className="text-xs text-gray-500">{he ? 'Chrome → אייקון ⊕ בשורת הכתובת' : 'Chrome → иконка ⊕ в адресной строке'}</p>
            </div>
            {promptState === 'pending'     && <PendingBtn color="blue" />}
            {promptState === 'available'   && <InstallBtn color="blue" label={labels.installBtn} />}
            {promptState === 'unavailable' && <UnavailableBlock />}
          </div>
        </div>
      </div>

      {/* iOS hint modal */}
      {showIosHint && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowIosHint(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-5 text-center">{labels.iosHintTitle}</h3>
            <div className="space-y-4">
              {[labels.iosStep1, labels.iosStep2, labels.iosStep3].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</span>
                  <p className="text-gray-700 text-sm leading-relaxed pt-0.5">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 bg-blue-50 rounded-xl p-3 flex items-center gap-3">
              <Share className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700">{he ? 'הכפתור נמצא בסרגל הכלים התחתון של Safari ↓' : 'Кнопка находится в нижней панели Safari ↓'}</p>
            </div>
            <button
              onClick={() => setShowIosHint(false)}
              className="w-full mt-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
            >
              {labels.iosClose}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

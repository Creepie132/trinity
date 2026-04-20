'use client'

import { Bell, X, BellOff } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useLanguage } from '@/contexts/LanguageContext'

// ─── I18N для компонента ─────────────────────────────────────────────────────
// Локально, т.к. здесь 5 строк — нет смысла тащить в глобальный словарь.
const I18N = {
  he: {
    enableTitle:       'הפעל התראות',
    enableSubtitle:    'קבל עדכונים על תורים ותשלומים',
    allow:             'אפשר',
    allowShort:        '...',
    close:             'סגור',
    unsupported:       'התראות לא נתמכות בדפדפן זה',
    pushLabel:         'התראות Push',
    blocked:           'התראות חסומות',
    blockedHint:       'אפשר בהגדרות הדפדפן',
    onHint:            'פעיל — לחץ לכיבוי',
    offHint:           'כבוי — לחץ להפעלה',
  },
  ru: {
    enableTitle:       'Включить уведомления',
    enableSubtitle:    'Получайте обновления о записях и платежах',
    allow:             'Разрешить',
    allowShort:        '...',
    close:             'Закрыть',
    unsupported:       'Уведомления не поддерживаются в этом браузере',
    pushLabel:         'Push-уведомления',
    blocked:           'Уведомления заблокированы',
    blockedHint:       'Разрешите в настройках браузера',
    onHint:            'Включены — нажмите чтобы выключить',
    offHint:           'Выключены — нажмите чтобы включить',
  },
} as const

/**
 * PushNotificationPrompt
 * Показывается через 3 сек после входа — НЕ сразу, чтобы не пугать.
 * Появляется снизу (как PWAInstallBanner), с анимацией.
 *
 * Локализация: через useLanguage() — иврит (RTL) и русский (LTR).
 */
export function PushNotificationPrompt() {
  const { showPrompt, permissionState, isLoading, subscribe, dismissPrompt } =
    usePushNotifications()
  const { language, dir } = useLanguage()
  const t = I18N[language]

  // Не показываем если: не нужен, уже разрешено/запрещено, нет поддержки
  if (!showPrompt) return null
  if (permissionState === 'granted' || permissionState === 'denied') return null
  if (permissionState === 'unsupported') return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-3 pb-safe animate-slide-up-banner">
      <div
        className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl
                   px-4 py-3 shadow-2xl max-w-lg mx-auto"
        style={{ boxShadow: '0 8px 32px rgba(99,102,241,0.18)' }}
        dir={dir}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
        >
          <Bell className="w-5 h-5 text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug">
            {t.enableTitle}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {t.enableSubtitle}
          </p>
        </div>

        {/* Allow button */}
        <button
          onClick={subscribe}
          disabled={isLoading}
          className="flex-shrink-0 text-white text-sm font-bold px-4 py-2 rounded-xl
                     transition-all active:scale-95 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
        >
          {isLoading ? t.allowShort : t.allow}
        </button>

        {/* Dismiss */}
        <button
          onClick={dismissPrompt}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label={t.close}
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  )
}

/**
 * PushNotificationToggle
 * Маленький toggle для настроек — показывает статус и позволяет вкл/выкл.
 * Локализация: через useLanguage().
 */
export function PushNotificationToggle() {
  const { permissionState, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushNotifications()
  const { language, dir } = useLanguage()
  const t = I18N[language]

  if (permissionState === 'unsupported') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400" dir={dir}>
        <BellOff className="w-4 h-4" />
        <span>{t.unsupported}</span>
      </div>
    )
  }

  const isOn = permissionState === 'granted' && isSubscribed

  return (
    <button
      onClick={isOn ? unsubscribe : subscribe}
      disabled={isLoading || permissionState === 'denied'}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                 hover:bg-gray-50 transition-colors disabled:opacity-50"
      dir={dir}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                    ${isOn ? 'bg-indigo-100' : 'bg-gray-100'}`}
      >
        <Bell className={`w-4 h-4 ${isOn ? 'text-indigo-600' : 'text-gray-400'}`} />
      </div>

      <div className={`flex-1 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
        <p className="text-sm font-medium text-gray-900">
          {permissionState === 'denied' ? t.blocked : t.pushLabel}
        </p>
        <p className="text-xs text-gray-500">
          {permissionState === 'denied'
            ? t.blockedHint
            : isOn
            ? t.onHint
            : t.offHint}
        </p>
      </div>
      {/* Toggle visual */}
      {permissionState !== 'denied' && (
        <div
          className={`w-11 h-6 rounded-full transition-colors flex-shrink-0
                      ${isOn ? 'bg-indigo-500' : 'bg-gray-200'}`}
        >
          <div
            className="w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform"
            style={{ transform: isOn ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </div>
      )}
    </button>
  )
}

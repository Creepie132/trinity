'use client'

import { useEffect, useRef } from 'react'

interface TrackOptions {
  /** Тип события: view | demo_click | pricing_click | wa_click | register_start */
  event_type?: string
  /** Явный источник (необязательно — auto-detect по referrer) */
  source?: string
}

/**
 * useTrafficTracker — fire-and-forget трекинг для публичных страниц.
 *
 * Особенности производительности:
 * - Вызывается один раз через `requestIdleCallback` (не блокирует первый рендер)
 * - Использует `navigator.sendBeacon` когда доступен (не задерживает unload)
 * - Защита от двойного трека через ref-флаг (React StrictMode)
 * - Не бросает ошибок — полный silenced failure
 *
 * @example
 * // В page.tsx (client component):
 * useTrafficTracker()           // авто-трек 'view' при загрузке
 *
 * // Трек клика вручную:
 * const track = useTrafficTracker({ autoTrack: false })
 * track('demo_click')
 */
export function useTrafficTracker(opts: TrackOptions & { autoTrack?: boolean } = {}) {
  const { event_type = 'view', source, autoTrack = true } = opts
  const trackedRef = useRef(false)

  const send = (evType: string, extra?: Partial<TrackOptions>) => {
    try {
      const payload = JSON.stringify({
        event_type: evType,
        source: extra?.source ?? source ?? 'direct',
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        path: typeof window !== 'undefined' ? window.location.pathname : '/',
      })

      // Предпочитаем sendBeacon — не блокирует unload страницы
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }))
      } else {
        // Fallback fetch с keepalive
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {/* silenced */})
      }
    } catch {
      /* silenced — трекинг никогда не ломает UI */
    }
  }

  useEffect(() => {
    if (!autoTrack) return
    if (trackedRef.current) return
    trackedRef.current = true

    // requestIdleCallback — ждём когда браузер не занят (не блокируем LCP)
    const schedule = typeof requestIdleCallback !== 'undefined'
      ? (fn: () => void) => requestIdleCallback(fn, { timeout: 3000 })
      : (fn: () => void) => setTimeout(fn, 500)

    schedule(() => send(event_type))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Возвращаем функцию для ручного трека кликов
  return (evType: string, extra?: Partial<TrackOptions>) => send(evType, extra)
}

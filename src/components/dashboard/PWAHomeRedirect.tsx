'use client'

/**
 * PWAHomeRedirect
 * ───────────────
 * Инжектится в /dashboard. При открытии PWA из иконки телефона
 * (standalone-режим + пустой document.referrer) редиректит юзера на
 * его preference (default_landing_page), если она отличается от dashboard.
 *
 * Зачем это нужно (а не только /pwa-start):
 *   1. PWA, установленные ДО появления /pwa-start в manifest.json, хранят
 *      старый start_url = /dashboard в системе. Chrome обновляет start_url
 *      асинхронно, не гарантированно, это может занять недели.
 *   2. manifest.json кэшируется агрессивно (неделя + service worker).
 *   3. Пользователям не переустанавливать PWA вручную.
 *
 * Алгоритм:
 *   A. Мы в браузере — рендерим null, ничего не делаем.
 *   B. НЕ standalone (обычный веб-Chrome) — ничего не делаем.
 *   C. document.referrer непустой и совпадает с origin — юзер кликнул
 *      "Дашборд" из меню или пришёл с другой страницы → оставляем на дашборде.
 *   D. Уже редиректили в этой сессии (флаг sessionStorage) — не зацикливаемся.
 *   E. Иначе: fetch preferences → если landing !== dashboard → router.replace.
 *
 * Важно:
 *   - Используется router.replace (не push) — чтобы кнопка "Назад" не
 *     возвращала на дашборд после редиректа.
 *   - Флаг sessionStorage сбрасывается при закрытии PWA — при следующем
 *     открытии снова сработает.
 *   - Никаких spinner/loading — дашборд успеет прогрузиться на долю секунды,
 *     потом произойдёт замена URL. Для юзера это визуально незаметно при
 *     быстром сетевом ответе preferences.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const SESSION_FLAG = 'trinity_pwa_home_redirected_v1'

export function PWAHomeRedirect() {
  const router = useRouter()

  useEffect(() => {
    // A. SSR guard
    if (typeof window === 'undefined') return

    // B. Только PWA standalone
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari специфика
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (!isStandalone) return

    // C. Клик из меню / переход внутри приложения — не трогаем
    if (document.referrer && document.referrer !== '') {
      try {
        const ref = new URL(document.referrer)
        if (ref.origin === window.location.origin) return
      } catch {
        // не смогли распарсить реферер — считаем external, продолжаем
      }
    }

    // D. В этой сессии уже редиректили — не зацикливаемся
    try {
      if (sessionStorage.getItem(SESSION_FLAG) === '1') return
    } catch {
      // приватный режим, sessionStorage недоступен — без флага, продолжаем
    }

    // E. Запрашиваем preference и редиректим
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/mobile/preferences', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })
        if (!res.ok || cancelled) return

        const data = (await res.json()) as { default_landing_page?: string }
        const landing = data.default_landing_page

        // Ставим флаг сразу, чтобы даже если что-то пойдёт не так
        // (юзер сам кликнет по dashboard в меню) — больше не редиректили
        try {
          sessionStorage.setItem(SESSION_FLAG, '1')
        } catch {
          /* noop */
        }

        if (!landing || landing === 'dashboard') return

        // Резолвим path — импорт динамический, чтобы не тянуть в SSR-бандл
        const { pathFromLandingId, DEFAULT_LANDING_PATH } = await import(
          '@/lib/landing-pages'
        )
        const target = pathFromLandingId(landing)
        if (target === DEFAULT_LANDING_PATH || cancelled) return

        router.replace(target)
      } catch {
        // Любая ошибка — тихо остаёмся на дашборде
      }
    })()

    return () => {
      cancelled = true
    }
  }, [router])

  return null
}

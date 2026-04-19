'use client'

/**
 * PWAHomeGate
 * ───────────
 * Оборачивает контент /dashboard. Блокирует рендер до принятия решения:
 * остаёмся на дашборде или редиректимся на user landing preference.
 *
 * Решение принимается СИНХРОННО при первом рендере — читаем кэш landing
 * из localStorage (пишется useLandingPage при каждом fetch/mutate).
 * Если в кэше есть не-dashboard значение И мы в PWA standalone с пустым
 * реферером — НЕ рендерим дашборд вообще, только пустой фон, параллельно
 * триггерим router.replace на целевой path.
 *
 * Это устраняет 4-5 секундное мелькание дашборда перед редиректом —
 * пользователь видит либо целевую страницу сразу (если кэш есть),
 * либо пустой экран ~200мс пока сеть отвечает на /api/mobile/preferences
 * (первый запуск PWA без кэша).
 *
 * Решение через sessionStorage-флаг защищает от зацикливания:
 * после редиректа в этой сессии guard больше не срабатывает, даже если
 * юзер вручную кликнет «Дашборд» в меню.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { pathFromLandingId, DEFAULT_LANDING_ID } from '@/lib/landing-pages'
import { LANDING_LS_KEY } from '@/hooks/useLandingPage'

const SESSION_FLAG = 'trinity_pwa_home_redirected_v1'

type Decision = 'pending' | 'show-dashboard' | 'redirect'

/** Определяет, в PWA-режиме standalone или нет */
function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  // iOS Safari специфика
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

/** true = это первое открытие PWA (не переход изнутри приложения) */
function isFreshPWAOpen(): boolean {
  if (typeof document === 'undefined') return false
  if (!document.referrer) return true
  try {
    const ref = new URL(document.referrer)
    return ref.origin !== window.location.origin
  } catch {
    return true
  }
}

/** Фоновый fetch preferences — обновляет localStorage для следующих запусков */
function refreshLandingCacheInBackground() {
  fetch('/api/mobile/preferences', {
    credentials: 'include',
    cache: 'no-store',
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { default_landing_page?: string } | null) => {
      if (data?.default_landing_page) {
        try {
          localStorage.setItem(LANDING_LS_KEY, data.default_landing_page)
        } catch {
          /* noop */
        }
      }
    })
    .catch(() => {
      /* сеть отвалилась — оставляем старый кэш */
    })
}

/** Синхронное решение: редиректить или нет, на основе localStorage-кэша */
function syncDecision(): { decide: Decision; target?: string } {
  if (typeof window === 'undefined') return { decide: 'pending' }

  // Не PWA → рендерим дашборд
  if (!isStandalonePWA()) return { decide: 'show-dashboard' }

  // PWA, но переход изнутри (клик «Дашборд» в меню) → рендерим дашборд
  if (!isFreshPWAOpen()) return { decide: 'show-dashboard' }

  // Уже редиректили в этой сессии → рендерим дашборд (защита от цикла)
  try {
    if (sessionStorage.getItem(SESSION_FLAG) === '1') return { decide: 'show-dashboard' }
  } catch {
    /* sessionStorage недоступен — идём дальше */
  }

  // Читаем кэш landing из localStorage
  let cached: string | null = null
  try {
    cached = localStorage.getItem(LANDING_LS_KEY)
  } catch {
    cached = null
  }

  if (cached && cached !== DEFAULT_LANDING_ID) {
    const target = pathFromLandingId(cached)
    if (target !== '/dashboard') return { decide: 'redirect', target }
  }

  // Кэш пуст ИЛИ равен 'dashboard' → ждём fetch чтобы убедиться
  return { decide: 'pending' }
}

export function PWAHomeGate({ children }: { children: ReactNode }) {
  const router = useRouter()

  // Синхронный init — читаем решение ещё до первого рендера детей.
  // Это ключевой момент: если решили 'redirect', DashboardContent вообще
  // не монтируется, не триггерит свои fetch'и.
  const [decision, setDecision] = useState<Decision>(() => {
    if (typeof window === 'undefined') return 'show-dashboard' // SSR guard
    return syncDecision().decide
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const sync = syncDecision()

    if (sync.decide === 'redirect' && sync.target) {
      try {
        sessionStorage.setItem(SESSION_FLAG, '1')
      } catch {
        /* noop */
      }
      setDecision('redirect')
      router.replace(sync.target)
      // Обновим кэш в фоне — вдруг сервер сменил значение
      refreshLandingCacheInBackground()
      return
    }

    if (sync.decide === 'show-dashboard') {
      setDecision('show-dashboard')
      return
    }

    // 'pending' — кэша нет, ждём fetch
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/mobile/preferences', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (cancelled) return
        if (!res.ok) {
          setDecision('show-dashboard')
          return
        }
        const data = (await res.json()) as { default_landing_page?: string }
        const landing = data.default_landing_page

        // Обновляем кэш для следующих запусков
        try {
          if (landing) localStorage.setItem(LANDING_LS_KEY, landing)
        } catch {
          /* noop */
        }

        if (!landing || landing === DEFAULT_LANDING_ID) {
          if (!cancelled) setDecision('show-dashboard')
          return
        }

        const target = pathFromLandingId(landing)
        if (target === '/dashboard') {
          if (!cancelled) setDecision('show-dashboard')
          return
        }

        try {
          sessionStorage.setItem(SESSION_FLAG, '1')
        } catch {
          /* noop */
        }
        if (!cancelled) {
          setDecision('redirect')
          router.replace(target)
        }
      } catch {
        if (!cancelled) setDecision('show-dashboard')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [router])

  if (decision === 'show-dashboard') {
    return <>{children}</>
  }

  // 'pending' или 'redirect' → пустой экран с нейтральным фоном.
  // Не монтируем DashboardContent → не грузятся виджеты, нет мельтешения.
  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-950"
      aria-hidden="true"
    />
  )
}

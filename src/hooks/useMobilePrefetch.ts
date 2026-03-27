'use client'

/**
 * useMobilePrefetch — prefetch для мобильных устройств.
 *
 * На десктопе работает useHoverPrefetch (onMouseEnter).
 * На тач-экранах hover не существует — нужен другой триггер.
 *
 * Стратегия:
 *  1. При открытии мобильного меню (isOpen=true) — немедленно prefetch
 *     RSC payload всех nav-ссылок через router.prefetch() +
 *     React Query data через prefetchModule() из DashboardShell.
 *  2. onTouchStart на каждой ссылке — ранний prefetch за ~80-150мс
 *     до реального tap (палец касается экрана раньше чем поднимается).
 */

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useBranch } from '@/contexts/BranchContext'

// Все модули которые стоит prefetch при открытии меню
const ALL_MODULES = [
  '/dashboard',
  '/clients',
  '/visits',
  '/sales',
  '/payments',
  '/finances',
  '/inventory',
  '/diary',
  '/analytics',
  '/settings',
] as const

type NavModule = typeof ALL_MODULES[number]

// React Query prefetch map — совпадает с DashboardShell prefetchModule
const RQ_PREFETCH_MAP: Partial<Record<NavModule, (orgId: string) => Promise<void>>> = {
  '/visits': async (orgId) => {
    await fetch('/api/visits/list?dateFilter=week&statusFilter=all&eventTypeFilter=all&page=1&pageSize=30')
      .catch(() => null)
  },
  '/sales': async (orgId) => {
    await fetch('/api/sales').catch(() => null)
  },
  '/payments': async (orgId) => {
    await fetch('/api/payments').catch(() => null)
  },
  '/diary': async () => {
    await fetch('/api/tasks').catch(() => null)
  },
  '/analytics': async (orgId) => {
    await fetch(`/api/dashboard/stats?org_id=${orgId}`).catch(() => null)
  },
}

/**
 * Вызывается при открытии мобильного меню.
 * Prefetch RSC payload + React Query data для всех видимых разделов.
 */
export function useMobileMenuPrefetch(isOpen: boolean) {
  const router = useRouter()
  const qc = useQueryClient()
  const { activeOrgId } = useBranch()
  const didPrefetch = useRef(false)

  useEffect(() => {
    // Prefetch только один раз за сессию — данные живут в кэше 30s+
    if (!isOpen || didPrefetch.current || !activeOrgId) return
    didPrefetch.current = true

    // Небольшая задержка — даём анимации drawer открыться (16ms = 1 frame)
    const t = setTimeout(() => {
      // 1. RSC payload prefetch — Next.js скачивает HTML/JSON страниц в фоне
      ALL_MODULES.forEach(href => {
        try { router.prefetch(href) } catch { /* ignore */ }
      })

      // 2. React Query data prefetch — данные попадают в кэш заранее
      Object.entries(RQ_PREFETCH_MAP).forEach(([href, prefetchFn]) => {
        prefetchFn(activeOrgId).catch(() => null)
      })
    }, 16)

    return () => clearTimeout(t)
  }, [isOpen, activeOrgId, router, qc])
}

/**
 * Возвращает onTouchStart handler для nav-ссылки.
 * При касании (до отпускания пальца) — prefetch RSC + RQ данных.
 * Даёт ~80-150мс форы перед реальным переходом.
 */
export function useTouchPrefetch(href: NavModule | string) {
  const router = useRouter()
  const { activeOrgId } = useBranch()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onTouchStart = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      // RSC prefetch
      try { router.prefetch(href) } catch { /* ignore */ }
      // RQ prefetch
      if (activeOrgId) {
        const prefetchFn = RQ_PREFETCH_MAP[href as NavModule]
        if (prefetchFn) prefetchFn(activeOrgId).catch(() => null)
      }
    }, 0) // Немедленно — touchstart уже даёт фору
  }, [href, router, activeOrgId])

  const onTouchEnd = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return { onTouchStart, onTouchEnd }
}

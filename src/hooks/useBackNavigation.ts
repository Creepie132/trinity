'use client'

/**
 * useBackNavigation — единая система кнопки "Назад" для Trinity CRM
 *
 * Приоритеты (по порядку):
 * 1. Закрыть открытую дочернюю модалку (последнюю в стеке)
 * 2. Вернуться к родительской секции по маппингу (router.push — БЕЗ перезагрузки)
 * 3. Вернуться к предыдущей секции из sessionStorage истории
 * 4. Мы в корне — двойное нажатие за 2 сек = выход из PWA / toast
 *
 * Физическая кнопка "Назад" на Android перехватывается через popstate.
 * Двойное нажатие за 2 сек закрывает PWA (window.close).
 */

import { useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { useModalStore } from '@/store/useModalStore'

// ─── Маппинг: дочерний путь → родительский путь ────────────────────────────
const PARENT_ROUTES: Record<string, string> = {
  // Admin sections → /admin
  '/admin/settings':                '/admin',
  '/admin/organizations':           '/admin',
  '/admin/subscriptions':           '/admin',
  '/admin/billing':                 '/admin',
  '/admin/plans':                   '/admin',
  '/admin/plans-editor':            '/admin',
  '/admin/modules':                 '/admin',
  '/admin/module-pricing':          '/admin',
  '/admin/support':                 '/admin',
  '/admin/ads':                     '/admin',
  '/admin/whatsapp':                '/admin',
  // Admin sub-pages → /admin/settings
  // Dashboard settings sub-pages → /settings
  '/settings/birthday-templates':   '/settings',
  '/settings/booking':              '/settings',
  '/settings/branches':             '/settings',
  '/settings/care-instructions':    '/settings',
  '/settings/customize':            '/settings',
  '/settings/dashboard':            '/settings',
  '/settings/display':              '/settings',
  '/settings/language':             '/settings',
  '/settings/loyalty':              '/settings',
  '/settings/message-templates':    '/settings',
  '/settings/notifications':        '/settings',
  '/settings/payments':             '/settings',
  '/settings/permissions':          '/settings',
  '/settings/service-colors':       '/settings',
  '/settings/services':             '/settings',
  '/settings/templates':            '/settings',
  '/settings/users':                '/settings',
  // Dashboard sections → /dashboard
  '/clients/import':                '/clients',
  '/clients':                       '/dashboard',
  '/payments':                      '/dashboard',
  '/visits':                        '/dashboard',
  '/inventory':                     '/dashboard',
  '/diary':                         '/dashboard',
  '/sms':                           '/dashboard',
  '/sales':                         '/dashboard',
  '/reports':                       '/dashboard',
  '/stats':                         '/dashboard',
  '/analytics':                     '/dashboard',
  '/debts':                         '/dashboard',
  '/audit':                         '/dashboard',
  '/profile':                       '/dashboard',
  '/settings':                      '/dashboard',
  '/partners':                      '/dashboard',
  '/dashboard':                     '/',
}

// ─── Корневые маршруты — "некуда идти назад" ───────────────────────────────
const ROOT_ROUTES = new Set(['/', '/dashboard', '/admin'])

// ─── sessionStorage ключ для истории переходов ─────────────────────────────
const SECTION_HISTORY_KEY = 'trinity_nav_history'
const DOUBLE_BACK_MS = 2000

// ─── Хелпер: найти родительский маршрут ────────────────────────────────────
function findParentRoute(pathname: string): string | null {
  // Точное совпадение в маппинге
  if (PARENT_ROUTES[pathname]) return PARENT_ROUTES[pathname]

  // Динамический сегмент: /admin/organizations/abc123 → /admin/organizations
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length >= 3) {
    const parent = '/' + parts.slice(0, -1).join('/')
    if (PARENT_ROUTES[parent]) return PARENT_ROUTES[parent]
    return parent
  }

  return null
}

// ─── Основной хук ────────────────────────────────────────────────────────────
export function useBackNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const { modals, closeModal } = useModalStore()
  const lastBackRef = useRef<number>(0)
  const prevPathRef = useRef<string>('')

  // Пишем историю переходов в sessionStorage при каждом изменении pathname
  useEffect(() => {
    const prev = prevPathRef.current
    if (prev && prev !== pathname) {
      try {
        const history: string[] = JSON.parse(
          sessionStorage.getItem(SECTION_HISTORY_KEY) || '[]'
        )
        // Не дублируем последнюю запись
        if (history[history.length - 1] !== prev) {
          history.push(prev)
          if (history.length > 30) history.shift()
          sessionStorage.setItem(SECTION_HISTORY_KEY, JSON.stringify(history))
        }
      } catch { /* sessionStorage может быть недоступен (приватный режим) */ }
    }
    prevPathRef.current = pathname
  }, [pathname])

  // ─── Основной обработчик ──────────────────────────────────────────────────
  const handleBack = useCallback(() => {

    // ── Приоритет 1: Закрыть открытую модалку ──────────────────────────────
    const openModals = Array.from(modals.entries())
      .filter(([, state]) => state.isOpen)
      .map(([type]) => type)

    if (openModals.length > 0) {
      closeModal(openModals[openModals.length - 1])
      return
    }

    // ── Приоритет 2: Родительский маршрут по маппингу ──────────────────────
    const parentRoute = findParentRoute(pathname)
    if (parentRoute) {
      router.push(parentRoute)
      return
    }

    // ── Приоритет 3: Предыдущая секция из sessionStorage истории ───────────
    try {
      const history: string[] = JSON.parse(
        sessionStorage.getItem(SECTION_HISTORY_KEY) || '[]'
      )
      if (history.length > 0) {
        const prev = history.pop()!
        sessionStorage.setItem(SECTION_HISTORY_KEY, JSON.stringify(history))
        router.push(prev)
        return
      }
    } catch { /* ignore */ }

    // ── Приоритет 4: Мы в корне — двойное нажатие = выход ─────────────────
    const now = Date.now()
    const isPWA = typeof window !== 'undefined' &&
      window.matchMedia('(display-mode: standalone)').matches

    if (now - lastBackRef.current < DOUBLE_BACK_MS) {
      // Второе нажатие подряд
      if (isPWA) {
        window.close()
      }
      return
    }

    lastBackRef.current = now
    toast.info('לחץ שוב כדי לצאת', {
      duration: DOUBLE_BACK_MS,
      id: 'back-exit-hint',
    })
  }, [pathname, modals, closeModal, router])

  // ─── Перехват физической кнопки "Назад" на Android ───────────────────────
  // Логика: при монтировании добавляем фиктивную запись в browser history.
  // Когда пользователь нажимает физическую кнопку — срабатывает popstate.
  // Мы перехватываем его, восстанавливаем запись (чтобы браузер не ушёл)
  // и вызываем handleBack() — наша логика приоритетов.
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Фиктивная запись — не даём браузеру уйти назад
    window.history.pushState({ trinityBackGuard: true }, '')

    const onPopState = (_e: PopStateEvent) => {
      // Сразу восстанавливаем запись
      window.history.pushState({ trinityBackGuard: true }, '')
      handleBack()
    }

    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
    }
  }, [handleBack])

  return { handleBack }
}

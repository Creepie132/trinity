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

import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { useModalStore } from '@/store/useModalStore'
import { useLandingPage } from './useLandingPage'
import { DEFAULT_LANDING_PATH } from '@/lib/landing-pages'

// ─── Маппинг: дочерний путь → родительский путь ────────────────────────────
// ВАЖНО: корневые секции (/clients, /payments, /visits, /sales, /inventory,
// /diary, /broadcast, /analytics, /finances, /dashboard, /settings и т.д.)
// сюда НЕ входят. Их родителем становится landingPath пользователя
// (вычисляется в buildParentResolver ниже). Это даёт правильное поведение
// кнопки «Назад» независимо от того, какую страницу юзер выбрал главной.
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
  // Dashboard settings sub-pages → /settings
  '/settings/birthday-templates':   '/settings',
  '/settings/booking':              '/settings',
  '/settings/branches':             '/settings',
  '/settings/care-instructions':    '/settings',
  '/settings/customize':            '/settings',
  '/settings/dashboard':            '/settings',
  '/settings/display':              '/settings',
  '/settings/home-page':            '/settings',
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
  // Sub-pages внутри корневых секций
  '/clients/import':                '/clients',
}

// ─── Набор «корневых секций дашборда» ──────────────────────────────────────
// Их родитель = landingPath пользователя. Если одна из них И ЕСТЬ landingPath,
// то она считается конечным корнем (см. isAtLanding ниже).
const DASHBOARD_ROOT_SECTIONS: ReadonlySet<string> = new Set([
  '/dashboard',
  '/clients',
  '/payments',
  '/visits',
  '/inventory',
  '/diary',
  '/sms',
  '/sales',
  '/reports',
  '/stats',
  '/analytics',
  '/finances',
  '/broadcast',
  '/debts',
  '/audit',
  '/profile',
  '/settings',
  '/partners',
])

// ─── Статически-корневые маршруты (нет родителя независимо от landing) ────
// /admin — корень админки, выбранная главная не влияет.
// / — корневой редиректор.
const STATIC_ROOT_ROUTES = new Set(['/', '/admin'])

// ─── sessionStorage ключ для истории переходов ─────────────────────────────
const SECTION_HISTORY_KEY = 'trinity_nav_history'
const DOUBLE_BACK_MS = 2000

// ─── Построитель резолвера с учётом landing пользователя ──────────────────
function buildParentResolver(landingPath: string) {
  return (pathname: string): string | null => {
    // 1. Точное совпадение в статическом маппинге
    if (PARENT_ROUTES[pathname]) return PARENT_ROUTES[pathname]

    // 2. Корневая секция дашборда → landingPath (если не сама landing)
    if (DASHBOARD_ROOT_SECTIONS.has(pathname)) {
      if (pathname === landingPath) return null // уже на главной
      return landingPath
    }

    // 3. Динамический сегмент: /admin/organizations/abc123 → /admin/organizations
    const parts = pathname.split('/').filter(Boolean)
    if (parts.length >= 3) {
      const parent = '/' + parts.slice(0, -1).join('/')
      if (PARENT_ROUTES[parent]) return PARENT_ROUTES[parent]
      return parent
    }

    // 4. Двухсегментный путь внутри корневой секции: /clients/abc → /clients
    if (parts.length === 2) {
      const parent = '/' + parts[0]
      if (DASHBOARD_ROOT_SECTIONS.has(parent)) return parent
    }

    return null
  }
}

// ─── Основной хук ────────────────────────────────────────────────────────────
export function useBackNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const { modals, closeModal } = useModalStore()
  const { landingPath: rawLandingPath } = useLandingPage()
  const lastBackRef = useRef<number>(0)
  const prevPathRef = useRef<string>('')

  // Нормализуем landingPath: пока prefs грузятся — используем дефолт.
  // Никогда не передаём пустую строку, чтобы резолвер не сломался.
  const landingPath = rawLandingPath || DEFAULT_LANDING_PATH

  // Резолвер пересоздаётся только при смене landingPath
  const findParentRoute = useMemo(
    () => buildParentResolver(landingPath),
    [landingPath]
  )

  // Текущая страница — это landing пользователя? Корневая точка навигации.
  const isAtLanding = pathname === landingPath

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
    // Если мы на выбранной главной — пропускаем и переходим к шагу "выход".
    if (!isAtLanding) {
      const parentRoute = findParentRoute(pathname)
      if (parentRoute) {
        router.push(parentRoute)
        return
      }
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
  }, [pathname, modals, closeModal, router, isAtLanding, findParentRoute])

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

  // ─── canGoBack: есть ли открытые модалки, родитель или история ───────────
  const canGoBack = useMemo(() => {
    const hasOpenModal = Array.from(modals.entries()).some(([, s]) => s.isOpen)
    if (hasOpenModal) return true
    // На выбранной главной или статическом корне — стрелку прячем
    if (isAtLanding) return false
    if (STATIC_ROOT_ROUTES.has(pathname)) return false
    if (findParentRoute(pathname)) return true
    try {
      const history: string[] = JSON.parse(
        sessionStorage.getItem(SECTION_HISTORY_KEY) || '[]'
      )
      return history.length > 0
    } catch { return false }
  }, [pathname, modals, isAtLanding, findParentRoute])

  return { handleBack, canGoBack }
}

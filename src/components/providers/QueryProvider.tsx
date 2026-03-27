'use client'

/**
 * QueryProvider — глобальный React Query клиент.
 *
 * Перехват демо-лимитов (403 LIMIT_EXCEEDED) происходит здесь, через
 * MutationCache.onError — это нативный механизм React Query, не трогает
 * window.fetch и не конфликтует с Next.js App Router.
 *
 * Как работает:
 *  1. Любая мутация (useMutation) бросает ошибку или возвращает 403
 *  2. MutationCache.onError получает объект ошибки
 *  3. Если code === 'LIMIT_EXCEEDED' → открываем DemoLimitModal через Context
 *
 * DemoLimitGuardContext подключается снаружи (в DashboardShell),
 * поэтому здесь мы читаем его через ref-callback, избегая circular deps.
 */

import {
  QueryClient,
  QueryClientProvider,
  MutationCache,
  keepPreviousData,
} from '@tanstack/react-query'
import { useEffect, useRef, useState, useContext } from 'react'
import {
  DemoLimitGuardContext,
  ENTITY_TO_SECTION,
  type ModalSection,
} from '@/components/demo/DemoLimitGuard'

// ─── Helper: извлечь LIMIT_EXCEEDED payload из любой ошибки ─────────────────

interface LimitPayload { code: string; entity: string }

function extractLimitPayload(error: unknown): LimitPayload | null {
  if (!error || typeof error !== 'object') return null
  const e = error as Record<string, unknown>

  // LimitExceededError от apiFetch: { name: 'LimitExceededError', code: 'LIMIT_EXCEEDED', entity }
  if (e.name === 'LimitExceededError' && typeof e.entity === 'string') {
    return { code: 'LIMIT_EXCEEDED', entity: e.entity }
  }

  // Прямой объект: { code: 'LIMIT_EXCEEDED', entity: 'clients' }
  if (e.code === 'LIMIT_EXCEEDED' && typeof e.entity === 'string') {
    return { code: 'LIMIT_EXCEEDED', entity: e.entity }
  }

  // Вложенный в .body (ApiError.body): { code: 'LIMIT_EXCEEDED', entity }
  const body = e.body as Record<string, unknown> | undefined
  if (body?.code === 'LIMIT_EXCEEDED' && typeof body.entity === 'string') {
    return { code: 'LIMIT_EXCEEDED', entity: body.entity }
  }

  return null
}

// ─── Inner component: читает Context после монтирования ─────────────────────

function QueryProviderInner({ children, queryClient }: {
  children: React.ReactNode
  queryClient: QueryClient
}) {
  const guardCtx = useContext(DemoLimitGuardContext)

  // Прокидываем ref в queryClient чтобы MutationCache мог вызвать openLimitModal
  // без замыканий на stale-значение контекста
  const guardRef = useRef(guardCtx)
  useEffect(() => { guardRef.current = guardCtx }, [guardCtx])

  // Один раз при монтировании — регистрируем глобальный onError в MutationCache
  useEffect(() => {
    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.type !== 'updated') return
      if (event.mutation.state.status !== 'error') return

      const payload = extractLimitPayload(event.mutation.state.error)
      if (!payload) return

      const section: ModalSection =
        ENTITY_TO_SECTION[payload.entity] ?? 'visits'

      guardRef.current?.openLimitModal(section)
    })

    return unsubscribe
  }, [queryClient])

  return <>{children}</>
}

// ─── Public Provider ──────────────────────────────────────────────────────────

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          // onError здесь пустой — реальный перехват через subscribe в QueryProviderInner.
          // MutationCache нужен явно чтобы иметь доступ к getMutationCache().subscribe().
        }),
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: false,
            throwOnError: false,
            // При фетче новых данных показываем старые — нет skeleton/белых экранов
            placeholderData: keepPreviousData,
          },
          mutations: {
            retry: false,
            throwOnError: false,
          },
        },
      })
  )

  useEffect(() => {
    const handleError = (event: PromiseRejectionEvent) => {
      console.error('[Unhandled Promise Rejection]:', event.reason)
      event.preventDefault()
    }
    window.addEventListener('unhandledrejection', handleError)
    return () => window.removeEventListener('unhandledrejection', handleError)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <QueryProviderInner queryClient={queryClient}>
        {children}
      </QueryProviderInner>
    </QueryClientProvider>
  )
}

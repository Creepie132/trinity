'use client'

import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query'
import { useState, useEffect } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,        // 2 min — данные свежие, не рефетчим без нужды
            gcTime: 10 * 60 * 1000,           // 10 min — кеш живёт в памяти
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: false,
            throwOnError: false,
            // ★ Ключевой параметр: при фетче новых данных показываем СТАРЫЕ,
            //   а не undefined → нет скелетонов/белых экранов при навигации
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
      {children}
    </QueryClientProvider>
  )
}

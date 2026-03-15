'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,   // 2 min — данные свежие, не рефетчим без нужды
            gcTime: 10 * 60 * 1000,      // 10 min — кеш живёт в памяти (было 5min default)
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,   // не рефетчить при восстановлении соединения
            retry: false,
            throwOnError: false,
          },
          mutations: {
            retry: false,
            throwOnError: false,
          },
        },
      })
  )

  useEffect(() => {
    // Global error handler for unhandled promise rejections
    const handleError = (event: PromiseRejectionEvent) => {
      console.error('[Unhandled Promise Rejection]:', event.reason)
      // Prevent the error overlay from showing
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

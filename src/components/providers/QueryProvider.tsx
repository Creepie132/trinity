'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: false, // Don't retry failed queries
            throwOnError: false, // Don't throw errors to error boundary
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

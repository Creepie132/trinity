'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { useAuth } from '@/hooks/useAuth'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LanguageProvider } from '@/contexts/LanguageContext'

/**
 * DashboardLayout — основной макет.
 * Учитывая использование RTL (иврит), Sidebar должен идти ПЕРВЫМ в DOM,
 * чтобы отображаться в ПРАВОЙ части экрана на десктопе.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, orgId, isLoading, refetch } = useAuth()

  useEffect(() => {
    console.log('[DashboardLayout] ===== MOUNTED =====')
    console.log('[DashboardLayout] User:', user?.id ? `Present (${user.id})` : 'Missing')
    console.log('[DashboardLayout] Org ID:', orgId || 'Missing')
    console.log('[DashboardLayout] Loading:', isLoading)

    // ALWAYS force refetch on mount to ensure fresh auth data
    // This is critical when navigating from /admin to /
    console.log('[DashboardLayout] Forcing refetch on mount...')
    refetch()
  }, [])

  useEffect(() => {
    console.log('[DashboardLayout] Auth state changed:', {
      hasUser: !!user,
      userId: user?.id,
      isLoading
    })

    // Don't redirect here - middleware already handles auth checks
    // This was causing logout on navigation
  }, [user, isLoading])

  // Don't block rendering - middleware already protects routes
  // Just render content, useAuth will update when ready
  return (
    <LanguageProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
          {/* Мобильный header */}
          <MobileHeader />

          <div className="flex-1 lg:flex lg:h-screen overflow-hidden">
            
            {/* 1. Sidebar — ТЕПЕРЬ ПЕРВЫЙ В КОДЕ
              В RTL-режиме (как на скриншоте) первый элемент встает СПРАВА.
            */}
            <aside className="hidden lg:block lg:w-72 lg:flex-shrink-0 bg-white dark:bg-slate-900 sticky top-0 h-screen overflow-y-auto">
              <Sidebar />
            </aside>

            {/* 2. Main Content — ТЕПЕРЬ ВТОРОЙ В КОДЕ
              В RTL-режиме он автоматически займет ЛЕВУЮ часть экрана.
            */}
            <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
              <div className="container mx-auto p-4 lg:p-8 max-w-7xl">
                {children}
              </div>
            </main>

          </div>
        </div>
      </ThemeProvider>
    </LanguageProvider>
  )
}

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { useAuth } from '@/hooks/useAuth'

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
  const { user, isLoading, refetch } = useAuth()

  useEffect(() => {
    console.log('[DashboardLayout] Mounted - checking auth...')
    console.log('[DashboardLayout] User:', user?.id ? 'Present' : 'Missing')
    console.log('[DashboardLayout] Loading:', isLoading)

    // Force refetch on mount to ensure fresh auth data
    if (!isLoading && !user) {
      console.log('[DashboardLayout] User missing - forcing refetch...')
      refetch()
    }
  }, [])

  useEffect(() => {
    console.log('[DashboardLayout] Auth state changed:', {
      hasUser: !!user,
      userId: user?.id,
      isLoading
    })

    // If not loading and still no user, redirect to login
    if (!isLoading && !user) {
      console.warn('[DashboardLayout] No user after loading - redirecting to login')
      router.push('/login')
    }
  }, [user, isLoading, router])

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 dark:text-slate-400">טוען...</p>
        </div>
      </div>
    )
  }

  // Don't render if no user
  if (!user) {
    return null
  }

  return (
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
  )
}

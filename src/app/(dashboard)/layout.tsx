'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { GlobalSearch } from '@/components/GlobalSearch'

/**
 * DashboardLayout — основной макет.
 * Учитывая использование RTL (иврит), Sidebar должен идти ПЕРВЫМ в DOM,
 * чтобы отображаться в ПРАВОЙ части экрана на десктопе.
 * 
 * Middleware уже проверяет сессию — layout не дублирует эту логику.
 * Каждая страница сама управляет своей загрузкой.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [searchOpen, setSearchOpen] = useState(false)

  // Ctrl+K / Cmd+K hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <AuthProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
          {/* Мобильный header */}
          <MobileHeader onSearchOpen={() => setSearchOpen(true)} />

          <div className="flex-1 lg:flex lg:h-screen overflow-hidden">
            
            {/* 1. Sidebar — ФИКСИРОВАННЫЙ ПРИ СКРОЛЛЕ
              sticky top-0 h-screen делает его зафиксированным
            */}
            <aside className="hidden lg:block lg:w-72 lg:flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
              <Sidebar onSearchOpen={() => setSearchOpen(true)} />
            </aside>

            {/* 2. Main Content — СКРОЛЛИТСЯ ОТДЕЛЬНО
              overflow-y-auto позволяет контенту скроллиться независимо от sidebar
            */}
            <main className="flex-1 overflow-y-auto h-screen pt-4 lg:pt-6">
              <div className="container mx-auto p-4 lg:p-6 max-w-7xl min-h-screen">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </div>
            </main>

          </div>
        </div>

        {/* Global Search */}
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      </ThemeProvider>
    </AuthProvider>
  )
}

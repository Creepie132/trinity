'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { ThemeProvider } from '@/contexts/ThemeContext'

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
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
        {/* Мобильный header */}
        <MobileHeader />

        <div className="flex-1 lg:flex lg:h-screen overflow-hidden">
          
          {/* 1. Sidebar — ФИКСИРОВАННЫЙ ПРИ СКРОЛЛЕ
            sticky top-0 h-screen делает его зафиксированным
          */}
          <aside className="hidden lg:block lg:w-72 lg:flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
            <Sidebar />
          </aside>

          {/* 2. Main Content — СКРОЛЛИТСЯ ОТДЕЛЬНО
            overflow-y-auto позволяет контенту скроллиться независимо от sidebar
            min-h-screen prevents layout shift
          */}
          <main className="flex-1 overflow-y-auto h-screen pt-16 lg:pt-0">
            <div className="container mx-auto p-4 lg:p-8 max-w-7xl min-h-screen">
              {children}
            </div>
          </main>

        </div>
      </div>
    </ThemeProvider>
  )
}

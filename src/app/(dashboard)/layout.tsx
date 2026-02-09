'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'

/**
 * DashboardLayout — основной макет личного кабинета.
 * Сайдбар перемещен в правую часть экрана для десктопной версии.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      {/* Мобильный header: отображается только на экранах < 1024px.
        Фиксирован сверху, чтобы не перекрываться контентом.
      */}
      <MobileHeader />

      {/* Основной контейнер: на десктопе (lg) используем flex-row.
        В Tailwind по умолчанию элементы идут слева направо.
      */}
      <div className="flex-1 lg:flex lg:h-screen overflow-hidden">
        
        {/* 1. Основной контент (Main Content)
          Занимает всю свободную ширину слева (flex-1).
          overflow-y-auto позволяет прокручивать контент независимо от сайдбара.
        */}
        <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
          <div className="container mx-auto p-4 lg:p-8 max-w-7xl">
            {children}
          </div>
        </main>

        {/* 2. Сайдбар (Sidebar) — теперь СТРОГО СПРАВА
          На экранах >= 1024px он отображается вторым элементом в flex-контейнере.
          Добавлен border-l для визуального разделения с основным контентом.
        */}
        <aside className="hidden lg:block lg:w-72 lg:flex-shrink-0 border-l border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 h-screen overflow-y-auto">
          <Sidebar />
        </aside>

      </div>
    </div>
  )
}

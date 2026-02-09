'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Мобильный header — только на <1024px */}
      <MobileHeader />

      {/* Desktop: flex layout с sidebar справа (RTL) */}
      <div className="rg:flex lg:h-screen">
        {/* Main Content — первым для RTL, занимает всё свободное место */}
        <main className="flex-1 overflow-y-auto lg:pt-0 pt-16">
          <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
            {children}
          </div>
        </main>

        {/* Sidebar — sticky справа на ≥1024px */}
        <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
          <Sidebar />
        </aside>
      </div>
    </div>
  )

}

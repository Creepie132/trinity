'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col lg:flex-row-h-screen bg-gray-50">
      {/* Мобильный header — только на <1024px */}
      <MobileHeader />

      {/* Sidebar — фиксированный справа на ≥1024px */}
      <div className="hidden lg:block lg:w-64 lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content — с отступом справа на десктопе */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
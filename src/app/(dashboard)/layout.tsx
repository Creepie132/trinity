'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      {/* Мобильный header — только на маленьких экранах */}
      <MobileHeader />

      {/* Sidebar — скрыт на мобильном */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-4 md:p-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
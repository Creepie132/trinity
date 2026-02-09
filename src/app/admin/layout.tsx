'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { MobileAdminHeader } from '@/components/layout/MobileAdminHeader'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function checkAdminAccess() {
      try {
        console.log('[Admin Layout] Checking admin access...')
        
        const response = await fetch('/api/admin/check', {
          credentials: 'include', // Include cookies
        })
        const data = await response.json()
        
        console.log('[Admin Layout] Response status:', response.status)
        console.log('[Admin Layout] Response data:', data)

        if (!response.ok || !data.isAdmin) {
          console.log('[Admin Layout] Not admin or error, redirecting to /')
          router.push('/')
          return
        }

        console.log('[Admin Layout] ✅ User is admin!')
        setIsAdmin(true)
      } catch (error) {
        console.error('[Admin Layout] Check error:', error)
        router.push('/')
      } finally {
        setIsChecking(false)
      }
    }

    checkAdminAccess()
  }, [router])

  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
        <div className="text-gray-500 dark:text-gray-400">בודק הרשאות...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Мобильный admin header — только на <1024px */}
      <MobileAdminHeader />

      {/* Desktop: flex layout с sidebar справа (RTL) */}
      <div className="flex-1 lg:flex lg:h-screen overflow-hidden">
        {/* Admin Sidebar — ПЕРВЫЙ для RTL (отображается справа) */}
        <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
          <AdminSidebar />
        </aside>

        {/* Main Content — ВТОРОЙ для RTL (отображается слева) */}
        <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
          <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

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
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-gray-500">בודק הרשאות...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50">
      {/* Мобильный admin header — только на маленьких экранах */}
      <MobileAdminHeader />

      {/* Admin Sidebar — скрыт на мобильном */}
      <div className="hidden md:block">
        <AdminSidebar />
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

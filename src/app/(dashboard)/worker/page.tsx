'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

/**
 * /worker — smart redirect:
 * owner  → /office  (кабинет руководителя — отдельный раздел)
 * user   → /worker/dashboard  (дашборд продавца)
 */
export default function WorkerRoot() {
  const { role } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!role) return
    if (role === 'owner') {
      router.replace('/office')
    } else {
      router.replace('/worker/dashboard')
    }
  }, [role, router])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"/>
    </div>
  )
}

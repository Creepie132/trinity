'use client'

/**
 * /demo/try — точка входа в демо.
 * Теперь просто редиректит на /demo/callback/google (DynamicDemoForm).
 * Google OAuth полностью убран — заменён на форму лида.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'

export default function DemoTryPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/demo/callback/google')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="text-center">
        <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-xl mx-auto mb-4 animate-pulse">
          <Sparkles size={28} className="text-white" />
        </div>
        <p className="text-white/60 text-sm">Trinity CRM...</p>
      </div>
    </div>
  )
}

'use client'

/**
 * /demo/tour — точка входа в интерактивную витрину Trinity CRM.
 *
 * АРХИТЕКТУРА:
 * DemoProvider НЕ может жить снаружи dashboard layout — после router.push()
 * он размонтируется и мок-данные исчезают.
 *
 * РЕШЕНИЕ: Этот экран — только splash + redirect.
 * Тур запускается ВНУТРИ dashboard через ?demo_tour=1 в URL.
 * DashboardContent обнаруживает параметр и вызывает startTour() из localStorage-флага.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'

export default function DemoTourPage() {
  const router = useRouter()

  useEffect(() => {
    // Устанавливаем флаг — DashboardAutoTour подхватит его после mount
    try { localStorage.setItem('trinity_demo_start_tour', '1') } catch {}
    // Редирект на дашборд — dashboard layout не требует auth для demo-org
    const t = setTimeout(() => router.push('/dashboard?demo=1'), 900)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="text-center space-y-4">
        {/* Logo */}
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 bg-amber-500/30 rounded-2xl animate-ping" />
          <div className="relative w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/40">
            <Sparkles size={30} className="text-white" />
          </div>
        </div>

        <div>
          <h1 className="text-white font-bold text-xl tracking-tight">Trinity CRM</h1>
          <p className="text-white/50 text-xs mt-1">by Amber Solutions</p>
        </div>

        <p className="text-white/70 text-sm font-medium">
          Загружаем демо-версию...
        </p>

        {/* Dots */}
        <div className="flex justify-center gap-2 pt-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 180}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

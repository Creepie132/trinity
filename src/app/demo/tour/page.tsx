'use client'

/**
 * /demo/tour — точка входа в интерактивную демку Trinity CRM.
 *
 * Поток:
 *   1. Показывает splash-экран «Загружаем демо...»
 *   2. Рендерит DemoProvider (изолированный QueryClient с мок-данными)
 *   3. Через 800ms перенаправляет на /dashboard
 *   4. Ещё через 600ms запускает 5-шаговый тур (driver.js)
 *
 * DemoBanner всегда виден поверх контента пока активен demo-режим.
 */

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DemoProvider } from '@/contexts/DemoContext'
import { DemoBanner } from '@/components/demo/DemoBanner'
import { DemoTour } from '@/components/demo/DemoTour'
import { useDemoContext } from '@/contexts/DemoContext'
import { Sparkles } from 'lucide-react'

// ─── Inner component — имеет доступ к DemoContext ────────────────────────────
function DemoTourEntry() {
  const { startTour } = useDemoContext()
  const router        = useRouter()
  const didMount      = useRef(false)

  useEffect(() => {
    if (didMount.current) return
    didMount.current = true

    // Сначала редирект на дашборд, потом запуск тура
    const t1 = setTimeout(() => router.push('/dashboard'), 800)
    const t2 = setTimeout(() => startTour(), 1400)

    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [router, startTour])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="text-center space-y-4">
        <div className="w-14 h-14 bg-amber-500 rounded-2xl mx-auto flex items-center justify-center shadow-xl animate-pulse">
          <Sparkles size={28} className="text-white" />
        </div>
        <p className="text-white/80 text-sm font-medium tracking-wide">
          Загружаем демо-версию Trinity CRM...
        </p>
        <div className="flex justify-center gap-1.5 pt-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Page export ─────────────────────────────────────────────────────────────
export default function DemoTourPage() {
  return (
    <DemoProvider>
      {/* Баннер + тур монтируются до редиректа — driver.js успевает загрузиться */}
      <DemoBanner />
      <DemoTour />
      <DemoTourEntry />
    </DemoProvider>
  )
}

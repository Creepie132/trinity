'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, X, ArrowLeft } from 'lucide-react'

interface ImpersonationData {
  orgId: string
  orgName: string
  adminEmail: string
  startedAt: string
}

export function ImpersonationBanner() {
  const router = useRouter()
  const [data, setData] = useState<ImpersonationData | null>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const raw = localStorage.getItem('impersonation_session')
    if (raw) {
      try { setData(JSON.parse(raw)) } catch { localStorage.removeItem('impersonation_session') }
    }
  }, [])

  const handleExit = async () => {
    localStorage.removeItem('impersonation_session')
    // Вернуть activeOrgId обратно к admin org
    const adminOrgId = localStorage.getItem('admin_org_id')
    if (adminOrgId) {
      try {
        await fetch('/api/set-active-branch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId: adminOrgId }),
        })
      } catch {}
      localStorage.removeItem('admin_org_id')
    }
    setData(null)
    router.push('/admin')
    router.refresh()
  }

  if (!data || !visible) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border border-orange-200 dark:border-orange-800
                      bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950
                      backdrop-blur-sm min-w-0 max-w-[90vw]">

        {/* Пульсирующая точка */}
        <div className="relative flex-shrink-0">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping absolute inset-0 opacity-75" />
          <div className="w-2 h-2 bg-orange-500 rounded-full relative" />
        </div>

        {/* Иконка + текст */}
        <Eye className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-orange-500 dark:text-orange-400 font-medium leading-none mb-0.5">
            Режим просмотра
          </span>
          <span className="text-sm font-bold text-orange-900 dark:text-orange-100 truncate max-w-[200px]">
            {data.orgName}
          </span>
        </div>

        {/* Разделитель */}
        <div className="w-px h-8 bg-orange-200 dark:bg-orange-700 flex-shrink-0" />

        {/* Кнопка вернуться в админку */}
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700
                     text-white text-xs font-semibold transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          В Админку
        </button>

        {/* Скрыть баннер (не выходить) */}
        <button
          onClick={() => setVisible(false)}
          className="p-1 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors flex-shrink-0"
          title="Скрыть"
        >
          <X className="w-3.5 h-3.5 text-orange-400" />
        </button>
      </div>
    </div>
  )
}

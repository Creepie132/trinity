'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, X, ArrowLeft, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ImpersonationData {
  orgId: string
  orgName: string
  adminEmail: string
  startedAt: string
}

type Scope = 'clients' | 'visits' | 'payments' | 'sales' | 'inventory'

const SCOPE_LABELS: Record<Scope, { ru: string; he: string }> = {
  clients:   { ru: 'Клиенты',  he: 'לקוחות' },
  visits:    { ru: 'Визиты',   he: 'ביקורים' },
  payments:  { ru: 'Платежи',  he: 'תשלומים' },
  sales:     { ru: 'Продажи',  he: 'מכירות' },
  inventory: { ru: 'Склад',    he: 'מלאי' },
}

function PurgeModal({
  orgName, orgId, onClose,
}: { orgName: string; orgId: string; onClose: () => void }) {
  const ALL_SCOPES: Scope[] = ['clients', 'visits', 'payments', 'sales', 'inventory']
  const [selected, setSelected] = useState<Set<Scope>>(
    new Set<Scope>(ALL_SCOPES)
  )
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, number> | null>(null)
  const [error, setError] = useState('')

  const toggleScope = (s: Scope) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  const handlePurge = async () => {
    if (!password) { setError('Введите пароль'); return }
    if (selected.size === 0) { setError('Выберите хотя бы один раздел'); return }
    setLoading(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/purge-org-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ orgId, scope: Array.from(selected), password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Ошибка'); return }
      setResult(data.deleted)
    } catch { setError('Ошибка сети') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
         onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-5 py-4 flex items-center gap-3">
          <div className="bg-white/20 rounded-lg p-2"><Trash2 className="w-5 h-5 text-white" /></div>
          <div>
            <h2 className="font-bold text-white">Полное удаление данных</h2>
            <p className="text-xs text-white/70 truncate max-w-xs">{orgName}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1 rounded-full hover:bg-white/20">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {result ? (
            <div className="space-y-3">
              <p className="text-green-600 font-semibold text-sm">✅ Данные удалены</p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-1 text-sm">
                {Object.entries(result).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400 capitalize">{k}</span>
                    <span className="font-bold text-red-600">{v} записей</span>
                  </div>
                ))}
              </div>
              <button onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 transition-colors">
                Закрыть
              </button>
            </div>
          ) : (
            <>
              {/* Warning */}
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                  Это необратимая операция. Все выбранные данные будут удалены навсегда.
                  Организация и пользователи останутся.
                </p>
              </div>

              {/* Scope selector */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Что удалить</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(SCOPE_LABELS) as Scope[]).map(s => (
                    <button key={s} onClick={() => toggleScope(s)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        selected.has(s)
                          ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'
                      }`}>
                      <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        selected.has(s) ? 'bg-red-500 border-red-500' : 'border-gray-300'
                      }`}>
                        {selected.has(s) && <X className="w-2.5 h-2.5 text-white" />}
                      </div>
                      {SCOPE_LABELS[s].ru}
                    </button>
                  ))}
                </div>
              </div>

              {/* Password */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Пароль подтверждения</p>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePurge()}
                  placeholder="Введите admin delete password"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl
                             bg-gray-50 dark:bg-gray-800 focus:outline-none focus:border-red-400 transition-colors"
                />
              </div>

              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 transition-colors">
                  Отмена
                </button>
                <button onClick={handlePurge} disabled={loading || selected.size === 0}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50
                             text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {loading ? 'Удаление...' : 'Удалить данные'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function ImpersonationBanner() {
  const router = useRouter()
  const [data, setData] = useState<ImpersonationData | null>(null)
  const [visible, setVisible] = useState(true)
  const [showPurge, setShowPurge] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('impersonation_session')
    if (raw) {
      try { setData(JSON.parse(raw)) } catch { localStorage.removeItem('impersonation_session') }
    }
  }, [])

  const handleExit = async () => {
    const adminOrgId = localStorage.getItem('admin_org_id')
    localStorage.removeItem('impersonation_session')
    localStorage.removeItem('admin_org_id')
    if (adminOrgId) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        await fetch('/api/admin/set-active-org', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ orgId: adminOrgId }),
        })
      } catch {}
    }
    setData(null)
    router.push('/admin')
    router.refresh()
  }

  if (!data || !visible) return null

  return (
    <>
      {showPurge && (
        <PurgeModal orgName={data.orgName} orgId={data.orgId} onClose={() => setShowPurge(false)} />
      )}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border border-orange-200 dark:border-orange-800
                        bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950
                        backdrop-blur-sm min-w-0 max-w-[90vw]">

          <div className="relative flex-shrink-0">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping absolute inset-0 opacity-75" />
            <div className="w-2 h-2 bg-orange-500 rounded-full relative" />
          </div>

          <Eye className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-orange-500 dark:text-orange-400 font-medium leading-none mb-0.5">
              Режим просмотра
            </span>
            <span className="text-sm font-bold text-orange-900 dark:text-orange-100 truncate max-w-[200px]">
              {data.orgName}
            </span>
          </div>

          <div className="w-px h-8 bg-orange-200 dark:border-orange-700 flex-shrink-0" />

          {/* Кнопка очистки данных */}
          <button
            onClick={() => setShowPurge(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700
                       text-white text-xs font-semibold transition-colors flex-shrink-0"
            title="Полное удаление данных организации"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Очистить данные
          </button>

          {/* Кнопка вернуться в админку */}
          <button
            onClick={handleExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700
                       text-white text-xs font-semibold transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            В Админку
          </button>

          <button
            onClick={() => setVisible(false)}
            className="p-1 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors flex-shrink-0"
            title="Скрыть"
          >
            <X className="w-3.5 h-3.5 text-orange-400" />
          </button>
        </div>
      </div>
    </>
  )
}

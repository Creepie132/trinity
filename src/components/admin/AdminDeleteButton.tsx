'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react'
import { useIsImpersonating } from '@/hooks/useIsImpersonating'
import { useBranch } from '@/contexts/BranchContext'
import { toast } from 'sonner'

type RecordType = 'payment' | 'visit' | 'sale' | 'product' | 'client'

const LABELS: Record<RecordType, { ru: string; confirm: string }> = {
  payment: { ru: 'платёж',  confirm: 'Удалить этот платёж?' },
  visit:   { ru: 'визит',   confirm: 'Удалить этот визит?' },
  sale:    { ru: 'продажу', confirm: 'Удалить эту продажу?' },
  product: { ru: 'товар',   confirm: 'Удалить этот товар?' },
  client:  { ru: 'клиента', confirm: 'Удалить клиента и ВСЕ его данные?' },
}

interface Props {
  type: RecordType
  id: string
  onDeleted?: () => void
  /** Дополнительные классы для кнопки */
  className?: string
  /** Компактный режим — только иконка */
  compact?: boolean
}

/**
 * AdminDeleteButton — показывается ТОЛЬКО в режиме impersonation (суперадмин).
 * Удаляет одну запись через /api/admin/delete-record.
 */
export function AdminDeleteButton({ type, id, onDeleted, className = '', compact = false }: Props) {
  const isImpersonating = useIsImpersonating()
  const { activeOrgId } = useBranch()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  // Не рендерим вне режима impersonation
  if (!isImpersonating) return null

  const label = LABELS[type]

  const handleDelete = async () => {
    if (!activeOrgId) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/delete-record', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, orgId: activeOrgId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Ошибка'); return }
      toast.success(`Удалено`)
      setConfirm(false)
      onDeleted?.()
    } catch { toast.error('Ошибка сети') }
    finally { setLoading(false) }
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
        <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
        <span className="text-xs text-red-700 font-medium">{label.confirm}</span>
        <button onClick={handleDelete} disabled={loading}
          className="ml-1 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1 transition-colors">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          Да
        </button>
        <button onClick={() => setConfirm(false)}
          className="p-1 rounded-lg hover:bg-red-100 transition-colors">
          <X className="w-3 h-3 text-red-400" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      title={`Удалить ${label.ru} (admin)`}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 
                  text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors text-xs font-semibold
                  ${className}`}
    >
      <Trash2 className="w-3.5 h-3.5" />
      {!compact && `Удалить ${label.ru}`}
    </button>
  )
}

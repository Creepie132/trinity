'use client'

import { useState, useEffect } from 'react'
import { ArrowRightLeft, Send, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

interface Branch {
  child_org_id: string
  name: string
}

interface TransferProductModalProps {
  data: {
    product: {
      id: string
      name: string
      quantity: number
      unit?: string
      org_id?: string
    }
    locale?: string
  }
  onClose: () => void
}

export function TransferProductModal({ data, onClose }: TransferProductModalProps) {
  const { orgId, role } = useAuth()
  const { product, locale = 'he' } = data

  const [branches, setBranches] = useState<Branch[]>([])
  const [loadingBranches, setLoadingBranches] = useState(true)
  const [selectedBranchOrgId, setSelectedBranchOrgId] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isOwner = role === 'owner'
  const maxQty = product.quantity || 0

  const t = {
    he: {
      title: 'העברת מוצר',
      toBranch: 'לסניף',
      qty: 'כמות',
      note: 'הערה (אופציונלי)',
      transfer: 'העבר עכשיו',
      request: 'שלח בקשה',
      cancel: 'ביטול',
      noStock: 'אין מלאי להעברה',
      noBranches: 'אין סניפים פעילים',
      ownerHint: 'העברה מיידית — המלאי יעודכן אוטומטית',
      staffHint: 'תישלח בקשה לבעל העסק לאישור',
      selectBranch: 'בחר סניף',
      success: 'ההעברה בוצעה בהצלחה',
      successRequest: 'הבקשה נשלחה לאישור',
      errorLoad: 'שגיאה בטעינת הסניפים',
    },
    ru: {
      title: 'Перевод товара',
      toBranch: 'В филиал',
      qty: 'Количество',
      note: 'Заметка (необязательно)',
      transfer: 'Перевести сейчас',
      request: 'Отправить запрос',
      cancel: 'Отмена',
      noStock: 'Нет товара для перевода',
      noBranches: 'Нет активных филиалов',
      ownerHint: 'Мгновенный перевод — остатки обновятся автоматически',
      staffHint: 'Запрос отправится владельцу на подтверждение',
      selectBranch: 'Выберите филиал',
      success: 'Перевод выполнен',
      successRequest: 'Запрос отправлен на подтверждение',
      errorLoad: 'Ошибка загрузки филиалов',
    },
  }
  const tx = t[locale as 'he' | 'ru'] || t.he

  // Загружаем активные филиалы текущей организации
  useEffect(() => {
    if (!orgId) return
    setLoadingBranches(true)

    supabase
      .from('branches')
      .select('child_org_id, name')
      .eq('parent_org_id', orgId)
      .eq('is_active', true)
      .then(({ data: rows, error }) => {
        if (error) {
          toast.error(tx.errorLoad)
        } else {
          setBranches(rows || [])
          if (rows && rows.length > 0) setSelectedBranchOrgId(rows[0].child_org_id)
        }
        setLoadingBranches(false)
      })
  }, [orgId])

  const handleSubmit = async () => {
    if (!selectedBranchOrgId || quantity < 1 || quantity > maxQty) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/transfer-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_org_id: orgId,
          to_org_id: selectedBranchOrgId,
          type: isOwner ? 'direct' : 'request',
          items: [{ product_id: product.id, product_name: product.name, quantity }],
          note: note.trim() || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }

      toast.success(isOwner ? tx.success : tx.successRequest)
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (maxQty === 0) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">{tx.noStock}</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium">
          {tx.cancel}
        </button>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-5" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      {/* Заголовок товара */}
      <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          <ArrowRightLeft className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">{product.name}</p>
          <p className="text-xs text-slate-400">{locale === 'he' ? 'במלאי' : 'В наличии'}: {maxQty} {product.unit || ''}</p>
        </div>
      </div>

      {/* Подсказка owner/staff */}
      <div className={`text-xs px-3 py-2 rounded-lg ${isOwner ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
        {isOwner ? tx.ownerHint : tx.staffHint}
      </div>

      {/* Выбор филиала */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">{tx.toBranch}</label>
        {loadingBranches ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>...</span>
          </div>
        ) : branches.length === 0 ? (
          <p className="text-sm text-slate-400 py-2">{tx.noBranches}</p>
        ) : (
          <select
            value={selectedBranchOrgId}
            onChange={(e) => setSelectedBranchOrgId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {branches.map((b) => (
              <option key={b.child_org_id} value={b.child_org_id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Количество */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
          {tx.qty} (max {maxQty})
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold text-lg hover:bg-slate-200 transition flex items-center justify-center"
          >−</button>
          <input
            type="number"
            min={1}
            max={maxQty}
            value={quantity}
            onChange={(e) => setQuantity(Math.min(maxQty, Math.max(1, Number(e.target.value))))}
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
            className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold text-lg hover:bg-slate-200 transition flex items-center justify-center"
          >+</button>
        </div>
      </div>

      {/* Заметка */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">{tx.note}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Кнопки */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition"
        >
          {tx.cancel}
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedBranchOrgId || branches.length === 0}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
            isOwner ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'
          }`}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isOwner ? (
            <><ArrowRightLeft className="w-4 h-4" />{tx.transfer}</>
          ) : (
            <><Send className="w-4 h-4" />{tx.request}</>
          )}
        </button>
      </div>
    </div>
  )
}

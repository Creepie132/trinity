'use client'

import { useState, useMemo } from 'react'
import Modal from '@/components/ui/Modal'
import { useBranches } from '@/hooks/useBranches'
import { useProducts } from '@/hooks/useProducts'
import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { ArrowRightLeft, Package, Send, Download, Minus, Plus } from 'lucide-react'
import type { Product } from '@/types/inventory'

interface TransferItem {
  product_id: string
  product_name: string
  quantity: number
  unit: string
  available: number
}

interface TransferRequestDialogProps {
  open: boolean
  onClose: () => void
  preloadedProduct?: Product | null
}

const tr = {
  he: {
    title: 'העברת מוצרים',
    tabSend: 'העבר',
    tabRequest: 'בקש',
    toBranch: 'לאיזה סניף?',
    fromBranch: 'מאיזה סניף?',
    products: 'מוצרים',
    selectAll: 'בחר הכל',
    note: 'הערה (אופציונלי)',
    notePlaceholder: 'למה אתה מעביר?',
    send: 'שלח בקשה',
    sending: 'שולח...',
    noBranches: 'אין סניפים פעילים',
    noProducts: 'אין מוצרים',
    selectBranch: 'בחר סניף',
    available: 'זמין',
    qty: 'כמות',
    successSend: 'הבקשה נשלחה',
    successRequest: 'הבקשה נשלחה',
    errorSelect: 'בחר סניף ולפחות מוצר אחד',
  },
  ru: {
    title: 'Перевод товаров',
    tabSend: 'Перевести',
    tabRequest: 'Запросить',
    toBranch: 'В какой филиал?',
    fromBranch: 'Из какого филиала?',
    products: 'Товары',
    selectAll: 'Выбрать все',
    note: 'Заметка (необязательно)',
    notePlaceholder: 'Причина перевода...',
    send: 'Отправить запрос',
    sending: 'Отправка...',
    noBranches: 'Нет активных филиалов',
    noProducts: 'Нет товаров',
    selectBranch: 'Выберите филиал',
    available: 'Доступно',
    qty: 'Кол-во',
    successSend: 'Запрос отправлен',
    successRequest: 'Запрос отправлен',
    errorSelect: 'Выберите филиал и хотя бы один товар',
  },
}

export function TransferRequestDialog({ open, onClose, preloadedProduct }: TransferRequestDialogProps) {
  const { orgId } = useAuth()
  const { mainOrgId } = useBranch()
  const { language } = useLanguage()
  const locale = language === 'he' ? 'he' : 'ru'
  const t = tr[locale]

  const { data: branches = [] } = useBranches()
  const { data: products = [] } = useProducts()

  const [tab, setTab] = useState<'send' | 'request'>('send')
  const [targetBranchOrgId, setTargetBranchOrgId] = useState('')
  const [selectedItems, setSelectedItems] = useState<Record<string, TransferItem>>(() => {
    if (preloadedProduct) {
      return {
        [preloadedProduct.id]: {
          product_id: preloadedProduct.id,
          product_name: preloadedProduct.name,
          quantity: 1,
          unit: preloadedProduct.unit || '',
          available: preloadedProduct.quantity,
        },
      }
    }
    return {}
  })
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  // Active branches to show in selector (not current org)
  const branchOptions = useMemo(() =>
    branches.filter((b) => b.is_active),
    [branches]
  )

  const activeProductCount = Object.values(selectedItems).filter((i) => i.quantity > 0).length
  const canSubmit = targetBranchOrgId && activeProductCount > 0

  function toggleProduct(product: Product) {
    setSelectedItems((prev) => {
      if (prev[product.id]) {
        const next = { ...prev }
        delete next[product.id]
        return next
      }
      return {
        ...prev,
        [product.id]: {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit: product.unit || '',
          available: product.quantity,
        },
      }
    })
  }

  function setItemQty(productId: string, qty: number) {
    setSelectedItems((prev) => {
      if (!prev[productId]) return prev
      const max = prev[productId].available
      return {
        ...prev,
        [productId]: { ...prev[productId], quantity: Math.min(Math.max(1, qty), max) },
      }
    })
  }

  async function handleSubmit() {
    if (!canSubmit || !orgId) return
    setLoading(true)

    const items = Object.values(selectedItems).filter((i) => i.quantity > 0)
    const fromOrgId = tab === 'send' ? orgId : targetBranchOrgId
    const toOrgId = tab === 'send' ? targetBranchOrgId : orgId

    try {
      const res = await fetch('/api/transfer-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_org_id: fromOrgId,
          to_org_id: toOrgId,
          items: items.map(({ product_id, product_name, quantity, unit }) => ({
            product_id, product_name, quantity, unit,
          })),
          note: note.trim() || null,
        }),
      })

      if (!res.ok) {
        const e = await res.json()
        toast.error(e.error)
        return
      }

      toast.success(tab === 'send' ? t.successSend : t.successRequest)
      onClose()
      setSelectedItems({})
      setNote('')
      setTargetBranchOrgId('')
    } catch {
      toast.error('Error')
    } finally {
      setLoading(false)
    }
  }

  if (branchOptions.length === 0) {
    return (
      <Modal open={open} onClose={onClose} title={t.title} width="400px">
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">{t.noBranches}</p>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5" />
          {t.title}
        </div>
      }
      width="520px"
      footer={
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Send className="w-4 h-4" />
          {loading ? t.sending : t.send}
        </button>
      }
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(['send', 'request'] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => { setTab(tabKey); setTargetBranchOrgId(''); setSelectedItems({}) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === tabKey
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {tabKey === 'send' ? <Send className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              {tabKey === 'send' ? t.tabSend : t.tabRequest}
            </button>
          ))}
        </div>

        {/* Branch selector */}
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
            {tab === 'send' ? t.toBranch : t.fromBranch}
          </label>
          <select
            value={targetBranchOrgId}
            onChange={(e) => setTargetBranchOrgId(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t.selectBranch}</option>
            {branchOptions.map((b) => (
              <option key={b.id} value={b.child_org_id}>
                {b.name}{b.address ? ` — ${b.address}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Product list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{t.products}</label>
            {products.length > 0 && (
              <button
                onClick={() => {
                  if (Object.keys(selectedItems).length === products.length) {
                    setSelectedItems(preloadedProduct ? {
                      [preloadedProduct.id]: {
                        product_id: preloadedProduct.id,
                        product_name: preloadedProduct.name,
                        quantity: 1,
                        unit: preloadedProduct.unit || '',
                        available: preloadedProduct.quantity,
                      },
                    } : {})
                  } else {
                    const all: Record<string, TransferItem> = {}
                    products.forEach((p) => {
                      if (p.quantity > 0) {
                        all[p.id] = { product_id: p.id, product_name: p.name, quantity: 1, unit: p.unit || '', available: p.quantity }
                      }
                    })
                    setSelectedItems(all)
                  }
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t.selectAll}
              </button>
            )}
          </div>

          {products.length === 0 ? (
            <p className="text-center text-gray-400 py-4 text-sm">{t.noProducts}</p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {products.map((product) => {
                const selected = !!selectedItems[product.id]
                const item = selectedItems[product.id]
                return (
                  <div
                    key={product.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      selected
                        ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/10'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                    }`}
                    onClick={() => toggleProduct(product)}
                  >
                    {/* Checkbox */}
                    <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                      selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {selected && <div className="w-2 h-2 bg-white rounded-sm" />}
                    </div>

                    <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />

                    {/* Name + available */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t.available}: {product.quantity} {product.unit}
                      </p>
                    </div>

                    {/* Quantity stepper */}
                    {selected && (
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setItemQty(product.id, (item?.quantity ?? 1) - 1)}
                          className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={product.quantity}
                          value={item?.quantity ?? 1}
                          onChange={(e) => setItemQty(product.id, parseInt(e.target.value) || 1)}
                          className="w-10 text-center text-sm font-medium bg-transparent border border-gray-200 dark:border-gray-600 rounded-lg py-0.5"
                        />
                        <button
                          onClick={() => setItemQty(product.id, (item?.quantity ?? 1) + 1)}
                          disabled={(item?.quantity ?? 1) >= product.quantity}
                          className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Note */}
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t.note}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.notePlaceholder}
            rows={2}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>
    </Modal>
  )
}

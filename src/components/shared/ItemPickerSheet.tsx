'use client'

/**
 * ItemPickerSheet — общий bottom-sheet / modal-picker для выбора позиции.
 * Используется в:
 *   - UnifiedSalesDialog (продажи)
 *   - UnifiedVisitDialog (визиты, create-mode)
 *
 * Workflow: choose → service | product | custom → onAdd(item) → onClose()
 *
 * Типизация onAdd намеренно открытая (PickedItem) — каждый диалог маппит
 * её в свою локальную форму (SaleLineItem / VisitLineItem).
 *
 * Важно: duration_minutes передаётся всегда (0 для товаров/произвольных).
 *        Это нужно визитам для подсчёта общей длительности.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/hooks/useServices'
import {
  X, Plus, ChevronLeft, Wrench, Package,
} from 'lucide-react'
import type { Product } from '@/types/inventory'

export interface PickedItem {
  type: 'service' | 'product' | 'custom'
  product_id?: string
  service_id?: string
  product_name: string
  unit_price: number
  quantity: number
  duration_minutes: number
}

export interface ItemPickerSheetProps {
  isOpen: boolean
  onClose: () => void
  isHe: boolean
  onAdd: (item: PickedItem) => void
  allowedTypes?: Array<'service' | 'product' | 'custom'>
}

type PickerStep = 'choose' | 'service' | 'product' | 'custom'

// Стабильная ссылка для default-параметра — inline-литерал в сигнатуре
// пересоздаётся на каждом рендере родителя и роняет useEffect ниже,
// сбрасывая step обратно в 'choose' сразу после клика.
const DEFAULT_ALLOWED_TYPES: Array<'service' | 'product' | 'custom'> = [
  'service', 'product', 'custom',
]

export function ItemPickerSheet({
  isOpen,
  onClose,
  isHe,
  onAdd,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
}: ItemPickerSheetProps) {
  const [step, setStep] = useState<PickerStep>('choose')
  const [search, setSearch] = useState('')
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [mounted, setMounted] = useState(false)

  const { data: services = [], isLoading: svcLoading } = useServices()
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-picker'],
    queryFn: async () => {
      const res = await fetch('/api/products')
      if (!res.ok) return []
      const json = await res.json()
      return (json.products ?? []) as Product[]
    },
  })

  useEffect(() => { setMounted(true) }, [])

  // Стабильный primitive-ключ: защита от нестабильных ссылок у внешних вызовов,
  // которые могут передавать inline-массивы вроде allowedTypes={['service']}.
  const allowedKey = allowedTypes.join(',')

  useEffect(() => {
    if (isOpen) {
      if (allowedTypes.length === 1) {
        setStep(allowedTypes[0])
      } else {
        setStep('choose')
      }
      setSearch(''); setCustomName(''); setCustomPrice('')
    }
    // allowedTypes сознательно не в deps — читаем через замыкание,
    // сравниваем через стабильный allowedKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, allowedKey])

  if (!isOpen || !mounted) return null

  const titles: Record<PickerStep, string> = {
    choose:  isHe ? 'מה להוסיף?' : 'Что добавить?',
    service: isHe ? 'בחר שירות'  : 'Выберите услугу',
    product: isHe ? 'בחר מוצר'   : 'Выберите товар',
    custom:  isHe ? 'פריט חופשי' : 'Произвольная позиция',
  }

  const filteredSvc = (services as unknown as Array<Record<string, unknown>>).filter(s => {
    if (!search) return true
    const name = String(s.name_ru || s.name || '')
    return name.toLowerCase().includes(search.toLowerCase())
  })
  const filteredProd = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()))

  const canGoBackToChoose = allowedTypes.length > 1

  return createPortal(
    <div
      className="fixed inset-0 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', zIndex: 99999 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold">{titles[step]}</h3>
          <button onClick={onClose}><X size={17} className="text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 'choose' && (
            <div className="p-5 space-y-3">
              {allowedTypes.includes('service') && (
                <button
                  onClick={() => setStep('service')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 font-medium text-sm transition-all bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100"
                >
                  <Wrench size={18}/>{isHe ? 'שירות' : 'Услуга'}
                </button>
              )}
              {allowedTypes.includes('product') && (
                <button
                  onClick={() => setStep('product')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 font-medium text-sm transition-all bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                >
                  <Package size={18}/>{isHe ? 'מוצר' : 'Товар'}
                </button>
              )}
              {allowedTypes.includes('custom') && (
                <button
                  onClick={() => setStep('custom')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 font-medium text-sm transition-all bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                >
                  <Plus size={18}/>{isHe ? 'פריט חופשי' : 'Произвольно'}
                </button>
              )}
            </div>
          )}

          {step === 'service' && (
            <div className="flex flex-col h-full">
              <div className="px-4 pt-3 pb-2 space-y-2">
                {canGoBackToChoose && (
                  <button
                    onClick={() => setStep('choose')}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                  >
                    <ChevronLeft size={13}/>{isHe ? 'חזור' : 'Назад'}
                  </button>
                )}
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                  placeholder={isHe ? 'חיפוש...' : 'Поиск...'}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {svcLoading ? (
                  <p className="py-8 text-center text-sm text-gray-400">
                    {isHe ? 'טוען...' : 'Загрузка...'}
                  </p>
                ) : filteredSvc.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">
                    {isHe ? 'לא נמצא' : 'Ничего не найдено'}
                  </p>
                ) : filteredSvc.map((s: Record<string, unknown>) => {
                  const name = isHe ? String(s.name || '') : String(s.name_ru || s.name || '')
                  const price = Number(s.price) || 0
                  const duration = Number(s.duration_minutes) || 0
                  return (
                    <button
                      key={String(s.id)}
                      onClick={() => {
                        onAdd({
                          type: 'service',
                          service_id: String(s.id),
                          product_name: name,
                          quantity: 1,
                          unit_price: price,
                          duration_minutes: duration,
                        })
                        onClose()
                      }}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-violet-50 text-start"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                          <Wrench className="w-4 h-4 text-violet-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{name}</p>
                          {duration ? (
                            <p className="text-[10px] text-gray-400">
                              {duration} {isHe ? "ד'" : 'мин'}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-600 flex-shrink-0 ms-2">₪{price}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 'product' && (
            <div className="flex flex-col h-full">
              <div className="px-4 pt-3 pb-2 space-y-2">
                {canGoBackToChoose && (
                  <button
                    onClick={() => setStep('choose')}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                  >
                    <ChevronLeft size={13}/>{isHe ? 'חזור' : 'Назад'}
                  </button>
                )}
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                  placeholder={isHe ? 'חיפוש...' : 'Поиск...'}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {filteredProd.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">
                    {isHe ? 'לא נמצא' : 'Ничего не найдено'}
                  </p>
                ) : filteredProd.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onAdd({
                        type: 'product',
                        product_id: p.id,
                        product_name: p.name,
                        quantity: 1,
                        unit_price: p.sell_price || 0,
                        duration_minutes: 0,
                      })
                      onClose()
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-amber-50 text-start"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-amber-500" />
                      </div>
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-600 flex-shrink-0 ms-2">₪{p.sell_price || 0}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'custom' && (
            <div className="px-5 pt-3 pb-5 space-y-4">
              {canGoBackToChoose && (
                <button
                  onClick={() => setStep('choose')}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                >
                  <ChevronLeft size={13}/>{isHe ? 'חזור' : 'Назад'}
                </button>
              )}
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                autoFocus
                placeholder={isHe ? 'שם פריט' : 'Название'}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              <div className="relative">
                <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₪</span>
                <input
                  type="number"
                  min={0}
                  value={customPrice}
                  onChange={e => setCustomPrice(e.target.value)}
                  placeholder="0"
                  className="w-full ps-6 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
              <button
                onClick={() => {
                  if (customName.trim()) {
                    onAdd({
                      type: 'custom',
                      product_name: customName.trim(),
                      quantity: 1,
                      unit_price: Number(customPrice) || 0,
                      duration_minutes: 0,
                    })
                    onClose()
                  }
                }}
                disabled={!customName.trim()}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{
                  background: customName.trim()
                    ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                    : '#e2e8f0',
                }}
              >
                {isHe ? 'הוסף' : 'Добавить'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

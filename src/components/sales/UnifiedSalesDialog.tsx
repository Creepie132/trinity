'use client'

/**
 * UnifiedSalesDialog — Master Component для создания продаж Trinity.
 *
 * State machine: 'cart' → 'checkout' → 'success'
 *
 * Защиты:
 *   - isSubmittingRef: логический замок (double-submit guard)
 *   - Все транзакции строго через POST /api/sales (без прямого supabase в клиенте)
 *   - Сервер пересчитывает total независимо от клиента (Zod + superRefine)
 *   - Error banner сохраняет корзину — нет потери данных при сбое сети
 *
 * Вызов:
 *   openModal('sale-unified', { clientId?, clientName?, preloadedItems?, onSuccess? })
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { UnifiedPaymentDialog } from '@/components/payments/UnifiedPaymentDialog'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/contexts/BranchContext'
import { useProducts } from '@/hooks/useProducts'
import { useServices } from '@/hooks/useServices'
import { apiFetch } from '@/lib/api-fetch'
import { toast } from 'sonner'
import {
  ShoppingBag, Plus, X, Percent, Search, ChevronLeft,
  Wrench, Package, Zap, AlertCircle, CheckCircle2, FileText,
  Download, MessageCircle, Wallet,
} from 'lucide-react'
import type { Product } from '@/types/inventory'
import { useGeneratePDF } from '@/lib/pdf/use-generate-pdf'
import type { ProposalData } from '@/lib/pdf/proposal-types'
import { getClientName } from '@/lib/client-utils'
import { useOrganization } from '@/hooks/useOrganization'
import { useSalesSettings } from '@/hooks/useSalesSettings'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SaleLineItem {
  id: string           // local uid only
  product_id?: string  // undefined for services/custom
  product_name: string
  quantity: number
  unit_price: number
  type: 'product' | 'service' | 'custom'
}

export interface PreloadedItem {
  id: string
  name: string
  price: number
}

export interface UnifiedSaleModalData {
  clientId?: string
  clientName?: string
  /** Preloaded services from visit — read-only in cart */
  preloadedItems?: PreloadedItem[]
  /** Preloaded single product (inventory sell) */
  preloadedProduct?: Product
  /** Visit ID to mark completed after sale */
  visitId?: string
  onSuccess?: () => void
}

export interface UnifiedSalesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: UnifiedSaleModalData
}

type Step = 'cart' | 'checkout' | 'success'
type PickerStep = 'choose' | 'service' | 'product' | 'custom'

interface DiscountState { type: 'percent' | 'amount'; value: number }

// ─── Payload validator ────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validateSaleModalData(raw: unknown): UnifiedSaleModalData {
  if (!raw || typeof raw !== 'object') return {}
  const d = raw as Record<string, unknown>
  // Защита: clientId должен быть строго валидным UUID, иначе игнорируем
  const rawClientId = typeof d.clientId === 'string' ? d.clientId : undefined
  const safeClientId = rawClientId && UUID_RE.test(rawClientId) ? rawClientId : undefined
  return {
    clientId:         safeClientId,
    clientName:       typeof d.clientName === 'string' ? d.clientName : undefined,
    preloadedItems:   Array.isArray(d.preloadedItems) ? d.preloadedItems as PreloadedItem[] : undefined,
    preloadedProduct: d.preloadedProduct as Product | undefined,
    visitId:          typeof d.visitId === 'string' ? d.visitId : undefined,
    onSuccess:        typeof d.onSuccess === 'function' ? d.onSuccess as () => void : undefined,
  }
}

function uid() { return Math.random().toString(36).slice(2, 10) }

// ─── ItemPickerSheet ──────────────────────────────────────────────────────────

function ItemPickerSheet({ isOpen, onClose, isHe, onAdd }: {
  isOpen: boolean; onClose: () => void; isHe: boolean
  onAdd: (item: Omit<SaleLineItem, 'id'>) => void
}) {
  const [step, setStep] = useState<PickerStep>('choose')
  const [search, setSearch] = useState('')
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [mounted, setMounted] = useState(false)
  const { data: services = [], isLoading: svcLoading } = useServices()
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-sale-picker'],
    queryFn: async () => {
      const res = await fetch('/api/products')
      if (!res.ok) return []
      const json = await res.json()
      return (json.products ?? []) as Product[]
    },
  })

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (isOpen) { setStep('choose'); setSearch(''); setCustomName(''); setCustomPrice('') }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const titles: Record<PickerStep, string> = {
    choose:  isHe ? 'מה להוסיף?' : 'Что добавить?',
    service: isHe ? 'בחר שירות'  : 'Выберите услугу',
    product: isHe ? 'בחר מוצר'   : 'Выберите товар',
    custom:  isHe ? 'פריט חופשי' : 'Произвольная позиция',
  }

  const filteredSvc = (services as any[]).filter(s =>
    !search || (s.name_ru || s.name || '').toLowerCase().includes(search.toLowerCase()))
  const filteredProd = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()))

  return createPortal(
    <div className="fixed inset-0 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', zIndex: 99999 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold">{titles[step]}</h3>
          <button onClick={onClose}><X size={17} className="text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* Choose */}
          {step === 'choose' && (
            <div className="p-5 space-y-3">
              {([
                { t: 'service' as const, icon: <Wrench size={18}/>,  label: isHe?'שירות':'Услуга',      cls:'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100' },
                { t: 'product' as const, icon: <Package size={18}/>, label: isHe?'מוצר':'Товар',         cls:'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
                { t: 'custom'  as const, icon: <Plus size={18}/>,    label: isHe?'פריט חופשי':'Произвольно', cls:'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
              ]).map(o => (
                <button key={o.t} onClick={() => setStep(o.t)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 font-medium text-sm transition-all ${o.cls}`}>
                  {o.icon}{o.label}
                </button>
              ))}
            </div>
          )}

          {/* Service */}
          {step === 'service' && (
            <div className="flex flex-col h-full">
              <div className="px-4 pt-3 pb-2 space-y-2">
                <button onClick={() => setStep('choose')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                  <ChevronLeft size={13}/>{isHe?'חזור':'Назад'}
                </button>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} autoFocus
                  placeholder={isHe?'חיפוש...':'Поиск...'}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200" />
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {svcLoading
                  ? <p className="py-8 text-center text-sm text-gray-400">{isHe?'טוען...':'Загрузка...'}</p>
                  : filteredSvc.map((s: any) => {
                    const name = isHe ? s.name : (s.name_ru || s.name)
                    return (
                      <button key={s.id}
                        onClick={() => { onAdd({ product_name: name, quantity: 1, unit_price: s.price||0, type: 'service' }); onClose() }}
                        className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-violet-50 text-start">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <Wrench className="w-4 h-4 text-violet-600" />
                          </div>
                          <p className="text-sm font-semibold truncate">{name}</p>
                        </div>
                        <span className="text-sm font-bold text-gray-600 flex-shrink-0 ms-2">₪{s.price||0}</span>
                      </button>
                    )
                  })}
              </div>
            </div>
          )}
          {/* Product */}
          {step === 'product' && (
            <div className="flex flex-col h-full">
              <div className="px-4 pt-3 pb-2 space-y-2">
                <button onClick={() => setStep('choose')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                  <ChevronLeft size={13}/>{isHe?'חזור':'Назад'}
                </button>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} autoFocus
                  placeholder={isHe?'חיפוש...':'Поиск...'}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-200" />
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {filteredProd.map(p => (
                  <button key={p.id}
                    onClick={() => { onAdd({ product_id: p.id, product_name: p.name, quantity: 1, unit_price: p.sell_price||0, type: 'product' }); onClose() }}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-amber-50 text-start">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-amber-500" />
                      </div>
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-600 flex-shrink-0 ms-2">₪{p.sell_price||0}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Custom */}
          {step === 'custom' && (
            <div className="px-5 pt-3 pb-5 space-y-4">
              <button onClick={() => setStep('choose')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                <ChevronLeft size={13}/>{isHe?'חזור':'Назад'}
              </button>
              <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} autoFocus
                placeholder={isHe?'שם פריט':'Название'}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300" />
              <div className="relative">
                <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₪</span>
                <input type="number" min={0} value={customPrice} onChange={e => setCustomPrice(e.target.value)}
                  placeholder="0"
                  className="w-full ps-6 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300" />
              </div>
              <button
                onClick={() => { if (customName.trim()) { onAdd({ product_name: customName.trim(), quantity: 1, unit_price: Number(customPrice)||0, type: 'custom' }); onClose() } }}
                disabled={!customName.trim()}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: customName.trim() ? 'linear-gradient(135deg,#f59e0b,#d97706)' : '#e2e8f0' }}>
                {isHe?'הוסף':'Добавить'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  , document.body)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function UnifiedSalesDialog({ open, onOpenChange, initialData }: UnifiedSalesDialogProps) {
  const { language } = useLanguage()
  const { orgId } = useAuth()
  const { activeOrgId } = useBranch()
  const queryClient = useQueryClient()
  const { data: org } = useOrganization()
  const { data: salesSettings } = useSalesSettings()
  // Если включён режим "всегда оплачено" — сделка создаётся с paid_amount = total
  const alwaysPaid = salesSettings?.sale_always_paid ?? false
  const { download: downloadPDF, uploadAndGetLink, loading: pdfLoading } = useGeneratePDF()

  const isHe = language === 'he'
  const dir  = isHe ? 'rtl' : 'ltr'

  const safeData = validateSaleModalData(initialData)

  // ── State machine ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('cart')

  // ── Cart state ───────────────────────────────────────────────────────────────
  const [items, setItems] = useState<SaleLineItem[]>([])
  const [discount, setDiscount] = useState<DiscountState>({ type: 'percent', value: 0 })
  const [showDiscount, setShowDiscount] = useState(false)
  const [discountInput, setDiscountInput] = useState('')

  // ── Client ───────────────────────────────────────────────────────────────────
  const [clientId, setClientId]     = useState<string | null>(null)
  const [clientLabel, setClientLabel] = useState('')
  const [clientObj, setClientObj]   = useState<any>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<any[]>([])

  // ── Checkout ─────────────────────────────────────────────────────────────────
  const [saleDate, setSaleDate]           = useState(() => new Date().toISOString().slice(0, 10))
  const [saleNotes, setSaleNotes]         = useState('')
  const [showProposal, setShowProposal]   = useState(false)

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading]   = useState(false)
  const [errorMsg, setErrorMsg]     = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [quickOpen, setQuickOpen]   = useState(false)
  const [quickName, setQuickName]   = useState('')
  const [quickPrice, setQuickPrice] = useState('')
  // ── Mobile detection — синхронно при монтировании, без useEffect ─────────────
  // useState(false) + useEffect создаёт race condition на мобильном:
  // при первом рендере компонент думает что он десктоп → рендерит Modal вместо
  // bottom drawer → модал не виден (overflow/z-index) → "ничего не происходит".
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  // ── Double-submit guard ──────────────────────────────────────────────────────
  const isSubmittingRef = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  // ── Products for search ──────────────────────────────────────────────────────
  const { data: allProducts = [] } = useProducts()

  // ── Reset / init on open ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const sd = validateSaleModalData(initialData)
    setErrorMsg(null)
    setStep('cart')
    setDiscount({ type: 'percent', value: 0 })
    setShowDiscount(false)
    setDiscountInput('')
    setSaleDate(new Date().toISOString().slice(0, 10))
    setSaleNotes('')
    setShowProposal(false)
    setClientSearch('')
    setClientResults([])

    // Preloaded product (inventory sell)
    if (sd.preloadedProduct) {
      const p = sd.preloadedProduct
      setItems([{ id: uid(), product_id: p.id, product_name: p.name, quantity: 1, unit_price: p.sell_price, type: 'product' }])
    } else if (sd.preloadedItems?.length) {
      setItems(sd.preloadedItems.map(i => ({ id: uid(), product_name: i.name, quantity: 1, unit_price: i.price, type: 'service' as const })))
      setStep('checkout')
    } else {
      setItems([])
    }

    // Preload client
    if (sd.clientId && sd.clientName) {
      setClientId(sd.clientId)
      setClientLabel(sd.clientName)
    } else {
      setClientId(null)
      setClientLabel('')
      setClientObj(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ── Client search ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (clientSearch.length < 2) { setClientResults([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}`)
        const json = await res.json()
        setClientResults((Array.isArray(json) ? json : json.clients ?? []).slice(0, 8))
      } catch { setClientResults([]) }
    }, 300)
    return () => clearTimeout(t)
  }, [clientSearch])

  // ── Calculations ─────────────────────────────────────────────────────────────
  const subtotal = useMemo(() =>
    items.reduce((s, i) => s + i.quantity * i.unit_price, 0), [items])

  const discountAmt = useMemo(() =>
    discount.type === 'percent'
      ? subtotal * (discount.value / 100)
      : Math.min(discount.value, subtotal),
    [subtotal, discount])

  const total = Math.max(0, subtotal - discountAmt)
  const discountPct = subtotal > 0 ? (discountAmt / subtotal) * 100 : 0

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    if (isSubmittingRef.current) return
    setErrorMsg(null)
    onOpenChange(false)
  }, [onOpenChange])

  const addItem = useCallback((item: Omit<SaleLineItem, 'id'>) => {
    setItems(p => [...p, { ...item, id: uid() }])
  }, [])

  const removeItem = (id: string) => setItems(p => p.filter(i => i.id !== id))

  const updateQty = (id: string, delta: number) =>
    setItems(p => p.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))

  const updatePrice = (id: string, price: number) =>
    setItems(p => p.map(i => i.id === id ? { ...i, unit_price: Math.max(0, price) } : i))

  // ── State для UnifiedPaymentDialog (открывается после сохранения сделки) ────
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [payDialogData, setPayDialogData] = useState<{
    clientId?: string; clientName?: string; clientPhone?: string
    saleId?: string; prefillAmount?: number
  } | null>(null)

  // ── "Оплатить" — сохраняет сделку → открывает UnifiedPaymentDialog ───────────
  const handlePayAndCheckout = useCallback(async () => {
    if (!items.length) {
      toast.error(isHe ? 'הוסף לפחות פריט אחד' : 'Добавьте хотя бы одну позицию')
      return
    }
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const sale = await apiFetch<{ id: string; payment_id: string }>('/api/sales', {
        method: 'POST',
        json: {
          client_id:      clientId || undefined,
          items:          items.map(i => ({
            product_id:   i.product_id || undefined,
            product_name: i.product_name,
            quantity:     i.quantity,
            unit_price:   i.unit_price,
          })),
          paid_amount:    0,
          payment_method: 'cash', // default — реальный метод выбирается в UnifiedPaymentDialog
          sale_date:      saleDate,
          notes:          saleNotes || undefined,
          ...(discount.value > 0 ? { discount_type: discount.type, discount_value: discount.value } : {}),
        },
      })

      if (safeData.visitId) {
        await apiFetch(`/api/visits/${safeData.visitId}/status`, { method: 'PATCH', json: { status: 'completed' } }).catch(() => {})
        queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'visits' })
      }
      if (clientId) { try { localStorage.removeItem(`draft_sale_${clientId}`) } catch {} }
      queryClient.invalidateQueries({ queryKey: ['sales'] })

      // Закрываем диалог сделки и сразу открываем процессор оплат
      onOpenChange(false)
      setPayDialogData({
        clientId:      clientId || undefined,
        clientName:    clientLabel || undefined,
        clientPhone:   clientObj?.phone || undefined,
        saleId:        sale.id,
        prefillAmount: total,
      })
      setPayDialogOpen(true)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (isHe ? 'שגיאה, נסה שוב' : 'Ошибка, попробуйте снова')
      setErrorMsg(msg)
    } finally {
      setIsLoading(false)
      isSubmittingRef.current = false
    }
  }, [items, clientId, clientLabel, clientObj, total, saleDate, saleNotes, discount, safeData, isHe, queryClient, onOpenChange])

  // ── Submit — единственная точка записи ──────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true

    if (!items.length) {
      toast.error(isHe ? 'הוסף לפחות פריט אחד' : 'Добавьте хотя бы одну позицию')
      isSubmittingRef.current = false; return
    }

    setIsLoading(true)
    setErrorMsg(null)

    try {
      const result = await apiFetch<{ id: string; payment_id: string }>('/api/sales', {
        method: 'POST',
        json: {
          client_id:      clientId || undefined,
          items:          items.map(i => ({
            product_id:   i.product_id || undefined,
            product_name: i.product_name,
            quantity:     i.quantity,
            unit_price:   i.unit_price,
          })),
          paid_amount:    total,
          payment_method: 'cash',
          sale_date:      saleDate,
          notes:          saleNotes || undefined,
          ...(discount.value > 0 ? {
            discount_type:  discount.type,
            discount_value: discount.value,
          } : {}),
        },
      })

      // Если визит — отмечаем завершённым
      if (safeData.visitId) {
        await apiFetch(`/api/visits/${safeData.visitId}/status`, {
          method: 'PATCH',
          json: { status: 'completed' },
        }).catch(() => {}) // не критично если не успеет
        queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'visits' })
      }

      // Удаляем черновик из localStorage если был
      if (clientId) {
        try { localStorage.removeItem(`draft_sale_${clientId}`) } catch {}
      }

      // ── Авто-платёж если включён режим "всегда оплачено" ──────────────────
      if (alwaysPaid && total > 0) {
        await apiFetch('/api/payments', {
          method: 'POST',
          json: {
            sale_id:        result.id,
            client_id:      clientId || undefined,
            amount:         total,
            payment_method: 'cash',
            status:         'completed',
          },
        }).catch(e => console.error('[UnifiedSalesDialog] auto-payment error:', e))
      }

      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })

      toast.success(isHe ? 'העסקה נשמרה!' : 'Сделка сохранена!')
      safeData.onSuccess?.()
      setStep('success')

    } catch (err: unknown) {
      // Корзина и данные сохраняются — только показываем banner
      const msg = err instanceof Error ? err.message : (isHe ? 'שגיאה, נסה שוב' : 'Ошибка, попробуйте снова')
      setErrorMsg(msg)
      console.error('[UnifiedSalesDialog] submit error:', err)
    } finally {
      setIsLoading(false)
      isSubmittingRef.current = false
    }
  }, [
    items, clientId, total, saleDate, saleNotes,
    discount, safeData, isHe, queryClient, alwaysPaid,
  ])

  // ── PDF / Proposal ────────────────────────────────────────────────────────────
  const buildProposalData = useCallback((): ProposalData => {
    const buyerName = clientObj ? getClientName(clientObj) : (clientLabel || '')
    return {
      docNumber: `${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      issueDate: new Date().toLocaleDateString('he-IL').replace(/\./g, '/'),
      validDays: 30,
      seller: { name: org?.name || 'Trinity CRM', phone: (org as any)?.phone || '', email: (org as any)?.email || '' },
      buyer:  { name: buyerName, phone: clientObj?.phone || '', email: clientObj?.email || '' },
      items: items.map(i => ({ name: i.product_name, qty: i.quantity, price: i.unit_price })),
      discount: discount.value > 0 ? { type: discount.type, value: discount.value } : undefined,
      vat: 0,
      notes: saleNotes || '',
    }
  }, [org, clientObj, clientLabel, items, discount, saleNotes])

  const handleDownloadPDF = async () => {
    try { await downloadPDF(buildProposalData()) } catch { toast.error('PDF error') }
  }

  const handleSendWhatsApp = async () => {
    const phone = clientObj?.phone
    if (!phone) { toast.error(isHe ? 'אין מספר טלפון' : 'Нет номера телефона'); return }
    try {
      const link = await uploadAndGetLink(buildProposalData())
      const msg  = isHe ? `קישור להצעת המחיר: ${link}` : `Ссылка на коммерческое предложение: ${link}`
      let p = phone.replace(/\D/g, '')
      if (p.startsWith('0')) p = p.slice(1)
      window.open(`https://wa.me/972${p}?text=${encodeURIComponent(msg)}`, '_blank')
    } catch { toast.error('WhatsApp error') }
  }

  // ── Sidebar (Desktop) ─────────────────────────────────────────────────────────
  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Icon */}
      <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
        <div style={{ width:52, height:52, borderRadius:14, background:'linear-gradient(135deg,#f59e0b,#d97706)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(245,158,11,0.35)' }}>
          <ShoppingBag size={22} color="#fff" />
        </div>
      </div>
      {/* Total */}
      {total > 0 ? (
        <div style={{ background:'rgba(52,211,153,0.12)', border:'0.5px solid rgba(52,211,153,0.25)', borderRadius:12, padding:'10px 8px', textAlign:'center', marginBottom:10 }}>
          <div style={{ fontSize:22, fontWeight:800, color:'#34d399', letterSpacing:'-0.5px' }}>₪{total.toLocaleString()}</div>
          <div style={{ fontSize:9, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:3 }}>{isHe?'סה״כ':'Итого'}</div>
        </div>
      ) : (
        <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'10px 8px', textAlign:'center', marginBottom:10 }}>
          <div style={{ fontSize:18, fontWeight:700, color:'rgba(255,255,255,0.15)' }}>₪0</div>
          <div style={{ fontSize:9, fontWeight:600, color:'#475569', textTransform:'uppercase', marginTop:3 }}>{isHe?'סה״כ':'Итого'}</div>
        </div>
      )}
      {items.length > 0 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, marginBottom:10 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#f59e0b' }}/>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>{items.length} {isHe?'פריטים':'поз.'}</span>
        </div>
      )}
      {clientLabel && (
        <div style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 10px', background:'rgba(255,255,255,0.06)', borderRadius:10, marginBottom:10 }}>
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.7)', fontWeight:500 }}>{clientLabel}</span>
        </div>
      )}
      <div style={{ height:'0.5px', background:'rgba(255,255,255,0.08)', margin:'0 0 10px' }}/>
      {step !== 'success' && (
        <>
          {/* Оплатить — только на шаге checkout */}
          {step === 'checkout' && (
            <button onClick={handlePayAndCheckout} disabled={isLoading}
              style={{ padding:'11px 14px', borderRadius:10, border:'none', cursor: isLoading?'not-allowed':'pointer', width:'100%', marginBottom:6, background: !isLoading ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(255,255,255,0.08)', color:'#fff', fontSize:13, fontWeight:700, transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Wallet size={14}/>
              {isLoading ? (isHe?'שומר...':'Сохраняем...') : (isHe?'שלם':'Оплатить')}
              {total > 0 && !isLoading && ` · ₪${total.toLocaleString()}`}
            </button>
          )}
          <button onClick={step === 'cart' ? () => setStep('checkout') : handleSubmit}
            disabled={(step === 'cart' && items.length === 0) || (step === 'checkout' && isLoading)}
            style={{ padding:'11px 14px', borderRadius:10, border:'none', cursor:'pointer', width:'100%', marginBottom:6,
              background: items.length > 0 && !isLoading ? 'linear-gradient(135deg,#4a6fa5,#3b5998)' : 'rgba(255,255,255,0.08)',
              color: items.length > 0 ? '#fff' : 'rgba(255,255,255,0.25)', fontSize:13, fontWeight:700, transition:'all 0.2s',
              // Скрываем "Без оплаты" если alwaysPaid включён
              display: step === 'checkout' && alwaysPaid ? 'none' : undefined,
            }}>
            {isLoading ? (isHe?'שומר...':'Сохраняем...')
              : step === 'cart' ? (isHe?'להמשיך לתשלום →':'К оплате →')
              : (isHe?'שמור ללא תשלום':'Сохранить без оплаты')}
          </button>
          <button onClick={handleClose} style={{ padding:'8px 14px', borderRadius:9, border:'0.5px solid rgba(255,255,255,0.12)', background:'transparent', color:'rgba(255,255,255,0.4)', fontSize:12, cursor:'pointer' }}>
            {isHe?'ביטול':'Отмена'}
          </button>
        </>
      )}
      {step === 'success' && (
        <button onClick={handleClose} style={{ padding:'11px 14px', borderRadius:10, border:'none', cursor:'pointer', width:'100%', background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <CheckCircle2 size={14}/>{isHe?'סגור':'Закрыть'}
        </button>
      )}
    </div>
  )

  // ── Mobile footer ─────────────────────────────────────────────────────────────
  const footerContent = step === 'success' ? (
    <button onClick={handleClose} style={{ flex:1, padding:'12px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
      {isHe?'סגור':'Закрыть'}
    </button>
  ) : step === 'cart' ? (
    <>
      <button onClick={handleClose} style={{ flex:'0 0 auto', padding:'12px 18px', borderRadius:10, border:'1px solid rgba(0,0,0,0.1)', background:'transparent', color:'#64748b', fontSize:14, cursor:'pointer' }}>
        {isHe?'ביטול':'Отмена'}
      </button>
      <button onClick={() => setStep('checkout')} disabled={items.length === 0}
        style={{ flex:1, padding:'12px', borderRadius:10, border:'none', cursor: items.length>0?'pointer':'not-allowed', background: items.length>0?'linear-gradient(135deg,#f59e0b,#d97706)':'#e2e8f0', color: items.length>0?'#fff':'#94a3b8', fontSize:14, fontWeight:700 }}>
        {isHe?'לתשלום →':'К оплате →'}
      </button>
    </>
  ) : (
    <>
      <button onClick={() => setStep('cart')} disabled={isLoading}
        style={{ flex:'0 0 auto', padding:'11px 14px', borderRadius:10, border:'1px solid rgba(0,0,0,0.1)', background:'transparent', color:'#64748b', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
        <ChevronLeft size={15}/>{isHe?'חזור':'Назад'}
      </button>
      {!alwaysPaid && (
        <button onClick={handleSubmit} disabled={isLoading}
          style={{ flex:1, padding:'11px', borderRadius:10, border:'none', cursor: isLoading?'not-allowed':'pointer', background: isLoading?'#e2e8f0':'linear-gradient(135deg,#4a6fa5,#3b5998)', color: isLoading?'#94a3b8':'#fff', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
          {isLoading ? (isHe?'שומר...':'Сохраняем...') : (isHe?'ללא תשלום':'Без оплаты')}
        </button>
      )}
      <button onClick={handlePayAndCheckout} disabled={isLoading}
        style={{ flex:1, padding:'11px', borderRadius:10, border:'none', cursor: isLoading?'not-allowed':'pointer', background: isLoading?'#e2e8f0':'linear-gradient(135deg,#22c55e,#16a34a)', color: isLoading?'#94a3b8':'#fff', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
        <Wallet size={14}/>{isHe?'שלם':'Оплатить'}{total>0&&!isLoading?` ₪${total.toLocaleString()}`:''}
      </button>
    </>
  )

  // ── TYPE badge config ─────────────────────────────────────────────────────────
  const TYPE_BADGE: Record<string, string> = {
    service: 'bg-violet-100 text-violet-600',
    product: 'bg-emerald-100 text-emerald-600',
    custom:  'bg-amber-100 text-amber-600',
  }
  const TYPE_LABEL: Record<string, string> = {
    service: isHe?'שר':'У', product: isHe?'מו':'Т', custom: isHe?'חו':'С',
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── МОБИЛЬНЫЙ BOTTOM DRAWER (TrinityMob стиль) ── */}
      {isMobile ? (
        <AnimatePresence>
          {open && (
            <>
              <motion.div key="sale-mob-overlay" className="fixed inset-0 bg-black/50"
                style={{ zIndex: 9998 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: .2 }} onClick={handleClose} />
              <motion.div key="sale-mob-drawer"
                className="fixed bottom-0 left-0 right-0 flex flex-col"
                style={{ zIndex: 9999, height: 'calc(100dvh - 3rem)', background: '#1a2333', borderRadius: '20px 20px 0 0', border: '1px solid rgba(255,255,255,0.07)', borderBottom: 'none', overflow: 'hidden' }}
                dir={dir}
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 40 }}>
                {/* Ручка */}
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                  <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
                </div>
                {/* Header */}
                <div className="flex items-center gap-3 px-4 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ width:38, height:38, borderRadius:12, background:'linear-gradient(135deg,#f59e0b,#d97706)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <ShoppingBag size={18} color="#fff"/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'white' }}>{isHe?'עסקה חדשה':'Новая сделка'}</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>{clientLabel || (isHe?'בחר לקוח':'Выберите клиента')}</div>
                  </div>
                  {total > 0 && (
                    <div style={{ textAlign:'center', background:'rgba(52,211,153,0.12)', border:'0.5px solid rgba(52,211,153,0.3)', borderRadius:10, padding:'4px 10px' }}>
                      <div style={{ fontSize:15, fontWeight:800, color:'#34d399' }}>₪{total.toLocaleString()}</div>
                    </div>
                  )}
                  <button onClick={handleClose} style={{ width:26, height:26, borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.6)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
                </div>
                {/* Body */}
                <div className="flex-1 overflow-y-auto" style={{ background:'#fff' }}>
                  {step === 'success' && (
                    <div style={{ padding:'40px 20px', textAlign:'center' }}>
                      <div style={{ width:60, height:60, borderRadius:'50%', background:'linear-gradient(135deg,#22c55e,#16a34a)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                        <CheckCircle2 size={28} color="#fff"/>
                      </div>
                      <p style={{ fontSize:18, fontWeight:700, color:'#15803d', marginBottom:6 }}>{isHe?'✓ העסקה נשמרה!':'✓ Сделка сохранена!'}</p>
                      {total > 0 && <p style={{ fontSize:24, fontWeight:900, color:'#16a34a' }}>₪{total.toLocaleString()}</p>}
                    </div>
                  )}
                  {(step === 'cart' || step === 'checkout') && (
                    <div className="px-4 py-4 space-y-4">
                      {errorMsg && (
                        <div style={{ display:'flex', gap:10, padding:'10px 12px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10 }}>
                          <AlertCircle size={14} style={{ color:'#ef4444', flexShrink:0, marginTop:1 }}/>
                          <p style={{ fontSize:12, color:'#ef4444', margin:0 }}>{errorMsg}</p>
                          <button onClick={() => setErrorMsg(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#ef4444' }}><X size={12}/></button>
                        </div>
                      )}
                      {/* Шаг таб */}
                      <div style={{ display:'flex', gap:6, background:'#f1f5f9', borderRadius:10, padding:4 }}>
                        {(['cart','checkout'] as const).map(s => (
                          <button key={s} onClick={() => { if (s === 'checkout' && !items.length) return; setStep(s) }}
                            style={{ flex:1, padding:'7px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background: step === s ? '#fff' : 'transparent', color: step === s ? '#1e293b' : '#94a3b8', boxShadow: step === s ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition:'all .15s' }}>
                            {s === 'cart' ? (isHe?'🛒 סל':'🛒 Корзина') : (isHe?'💳 תשלום':'💳 Оплата')}
                          </button>
                        ))}
                      </div>
                      {/* CART */}
                      {step === 'cart' && (<>
                        {!safeData.clientId && (
                          <div className="relative">
                            {clientLabel ? (
                              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                                <span className="text-sm font-medium text-amber-800">{clientLabel}</span>
                                <button onClick={() => { setClientLabel(''); setClientId(null); setClientObj(null) }}><X size={14} className="text-amber-400"/></button>
                              </div>
                            ) : (
                              <div className="relative">
                                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                                <input value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                                  placeholder={isHe?'חיפוש לקוח...':'Поиск клиента...'}
                                  className="w-full ps-9 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300" />
                                {clientResults.length > 0 && (
                                  <div className="absolute top-full mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto">
                                    {clientResults.map((c: any) => (
                                      <button key={c.id} onClick={() => { setClientId(c.id); setClientLabel(`${c.first_name} ${c.last_name}`.trim()); setClientObj(c); setClientSearch(''); setClientResults([]) }}
                                        className="w-full text-start px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-0">
                                        <span className="font-medium">{c.first_name} {c.last_name}</span>
                                        {c.phone && <span className="ms-2 text-xs text-gray-400">{c.phone}</span>}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {items.length > 0 && (
                          <div className="space-y-2">
                            {items.map(item => (
                              <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ${TYPE_BADGE[item.type]}`}>{TYPE_LABEL[item.type]}</span>
                                <span className="flex-1 text-sm font-medium truncate">{item.product_name}</span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-md bg-gray-200 text-gray-500 text-xs font-bold flex items-center justify-center">−</button>
                                  <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                                  <button onClick={() => updateQty(item.id, +1)} className="w-6 h-6 rounded-md bg-gray-200 text-gray-500 text-xs font-bold flex items-center justify-center">+</button>
                                </div>
                                <span className="text-sm font-bold text-gray-600 flex-shrink-0">₪{(item.quantity * item.unit_price).toLocaleString()}</span>
                                <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400"><X size={13}/></button>
                              </div>
                            ))}
                          </div>
                        )}
                        <button onClick={() => setPickerOpen(true)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-semibold">
                          <Plus size={15}/>{isHe?'+ הוסף פריט':'+ Добавить позицию'}
                        </button>
                        {items.length > 0 && (
                          <div className="flex justify-between text-base font-bold text-green-700 bg-green-50 rounded-xl px-4 py-3 border-2 border-green-200">
                            <span>{isHe?'סה״כ':'Итого'}</span><span>₪{total.toFixed(2)}</span>
                          </div>
                        )}
                      </>)}
                      {/* CHECKOUT */}
                      {step === 'checkout' && (<>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">{isHe?'תאריך':'Дата'}</label>
                            <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none" />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">{isHe?'הערות':'Примечания'}</label>
                            <input type="text" value={saleNotes} onChange={e => setSaleNotes(e.target.value)} placeholder={isHe?'הערות...':'Заметки...'} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none" />
                          </div>
                        </div>
                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                          {items.map(item => (
                            <div key={item.id} className="flex items-center gap-3 px-3 py-2 border-b last:border-0 bg-white">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${TYPE_BADGE[item.type]}`}>{TYPE_LABEL[item.type]}</span>
                              <span className="flex-1 text-sm truncate">{item.product_name}</span>
                              <span className="text-sm font-bold">₪{(item.quantity * item.unit_price).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between px-3 py-2.5 bg-slate-800">
                            <span className="text-xs text-white/60 uppercase">{isHe?'סה״כ':'Итого'}</span>
                            <span className="text-base font-black text-white">₪{total.toFixed(2)}</span>
                          </div>
                        </div>
                      </>)}
                    </div>
                  )}
                </div>
                {/* Footer */}
                <div style={{ flexShrink:0, display:'flex', gap:8, padding:'12px 16px', background:'#fff', borderTop:'1px solid #f1f5f9' }}>
                  {footerContent}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      ) : (
        /* ── DESKTOP Modal ── */
        <Modal open={open} onClose={handleClose} darkHeader showCloseButton={false} width="860px" dir={dir} contentClassName="!p-0">
          <TrinityModalShell open={open} onClose={handleClose}
            icon={<ShoppingBag />} title={isHe?'עסקה חדשה':'Новая сделка'}
            subtitle={clientLabel || (isHe?'בחר לקוח':'Выберите клиента')}
            dir={dir} sidebarExtra={sidebar} footerContent={footerContent}>

          {/* ── SUCCESS ── */}
          {step === 'success' && (
            <div style={{ padding:'32px 18px', textAlign:'center' }}>
              <div style={{ width:60, height:60, borderRadius:'50%', background:'linear-gradient(135deg,#22c55e,#16a34a)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:'0 6px 20px rgba(34,197,94,0.3)' }}>
                <CheckCircle2 size={28} color="#fff"/>
              </div>
              <p style={{ fontSize:18, fontWeight:700, color:'#15803d', marginBottom:6 }}>
                {isHe?'✓ העסקה נשמרה בהצלחה!':'✓ Сделка успешно сохранена!'}
              </p>
              {total > 0 && <p style={{ fontSize:24, fontWeight:900, color:'#16a34a' }}>₪{total.toLocaleString()}</p>}
            </div>
          )}

          {/* ── CART ── */}
          {step === 'cart' && (
            <div className="px-5 py-5 space-y-5">

              {/* Error banner */}
              {errorMsg && (
                <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12 }}>
                  <AlertCircle size={16} style={{ color:'#ef4444', flexShrink:0, marginTop:1 }}/>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'#dc2626', margin:'0 0 2px' }}>{isHe?'שגיאה':'Ошибка'}</p>
                    <p style={{ fontSize:11, color:'#ef4444', margin:0 }}>{errorMsg}</p>
                  </div>
                  <button onClick={() => setErrorMsg(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', padding:0 }}><X size={14}/></button>
                </div>
              )}

              {/* Client search */}
              {!safeData.clientId && (
                <div className="relative">
                  {clientLabel ? (
                    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                      <span className="text-sm font-medium text-amber-800">{clientLabel}</span>
                      <button onClick={() => { setClientLabel(''); setClientId(null); setClientObj(null) }}><X size={14} className="text-amber-400"/></button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                      <input value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                        placeholder={isHe?'חיפוש לקוח...':'Поиск клиента...'}
                        className="w-full ps-9 py-2.5 rounded-xl border border-gray-200 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-300" />
                      {clientResults.length > 0 && (
                        <div className="absolute top-full mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                          {clientResults.map((c: any) => (
                            <button key={c.id} onClick={() => { setClientId(c.id); setClientLabel(`${c.first_name} ${c.last_name}`.trim()); setClientObj(c); setClientSearch(''); setClientResults([]) }}
                              className="w-full text-start px-3 py-2.5 text-sm hover:bg-gray-50 border-b last:border-0">
                              <span className="font-medium">{c.first_name} {c.last_name}</span>
                              {c.phone && <span className="ms-2 text-xs text-gray-400">{c.phone}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Items list */}
              {items.length > 0 && (
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3 py-2.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ${TYPE_BADGE[item.type]}`}>{TYPE_LABEL[item.type]}</span>
                      <span className="flex-1 text-sm font-medium truncate">{item.product_name}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-md bg-gray-200 text-gray-500 text-xs font-bold flex items-center justify-center hover:bg-gray-300">−</button>
                        <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, +1)} className="w-6 h-6 rounded-md bg-gray-200 text-gray-500 text-xs font-bold flex items-center justify-center hover:bg-gray-300">+</button>
                      </div>
                      <div className="relative w-20 flex-shrink-0">
                        <span className="absolute start-2 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">₪</span>
                        <input type="number" min={0} value={item.unit_price || ''}
                          onChange={e => updatePrice(item.id, Number(e.target.value))}
                          className="w-full ps-5 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40" />
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 flex-shrink-0"><X size={13}/></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add buttons */}
              <div className="flex gap-2">
                <button onClick={() => setPickerOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition">
                  <Plus size={15}/>{isHe?'+ הוסף פריט':'+ Добавить позицию'}
                </button>
                <button onClick={() => { setQuickName(''); setQuickPrice(''); setQuickOpen(true) }}
                  title={isHe?'הוספה מהירה':'Быстро добавить'}
                  className="px-4 py-3 rounded-xl border border-orange-200 bg-orange-50 text-orange-600 text-sm font-semibold hover:bg-orange-100 transition">
                  <Zap size={15}/>
                </button>
              </div>

              {/* Discount */}
              <div>
                <button onClick={() => setShowDiscount(v => !v)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.97]"
                  style={{ background: showDiscount ? '#7c3aed' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow:'0 2px 8px rgba(124,58,237,0.25)' }}>
                  <Percent size={13}/>
                  {isHe?'הנחה':'Скидка'}
                  {discount.value > 0 && <span className="ms-1 bg-white/20 px-1.5 py-0.5 rounded-md text-xs">
                    {discount.type === 'percent' ? `${discount.value}%` : `₪${discount.value}`}
                  </span>}
                </button>
                {showDiscount && (
                  <div className="mt-3 p-4 border border-indigo-200 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 space-y-3">
                    <div className="flex gap-2">
                      {(['percent','amount'] as const).map(type => (
                        <button key={type} onClick={() => setDiscount(d => ({ ...d, type }))}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${discount.type === type ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>
                          {type === 'percent' ? '% ' : '₪ '}{isHe ? (type==='percent'?'אחוז':'סכום') : (type==='percent'?'%':'₪')}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="number" min={0} max={discount.type==='percent'?100:subtotal}
                        value={discountInput} onChange={e => setDiscountInput(e.target.value)}
                        className="flex-1 p-2 border rounded-lg bg-white text-sm"
                        placeholder={discount.type==='percent'?'10':'50'} autoFocus />
                      <button onClick={() => {
                          const v = Math.min(discount.type==='percent'?100:subtotal, Math.max(0, Number(discountInput)||0))
                          setDiscount(d => ({ ...d, value: v })); setShowDiscount(false)
                        }}
                        className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium">
                        {isHe?'החל':'Применить'}
                      </button>
                    </div>
                    {discountAmt > 0 && (
                      <p className="text-sm text-indigo-700">{isHe?'הנחה':'Скидка'}: ₪{discountAmt.toFixed(2)} ({discountPct.toFixed(1)}%)</p>
                    )}
                  </div>
                )}
              </div>

              {/* Total row */}
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-200 dark:border-green-800">
                {discountAmt > 0 && (
                  <div className="flex justify-between text-sm text-red-600 mb-1">
                    <span>{isHe?'הנחה':'Скидка'}</span><span>−₪{discountAmt.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-green-700 dark:text-green-300">
                  <span>{isHe?'סה״כ':'Итого'}</span><span>₪{total.toFixed(2)}</span>
                </div>
              </div>

            </div>
          )}

          {/* ── CHECKOUT ── */}
          {step === 'checkout' && (
            <div className="px-5 py-5 space-y-5">
              {/* Error banner */}
              {errorMsg && (
                <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12 }}>
                  <AlertCircle size={16} style={{ color:'#ef4444', flexShrink:0, marginTop:1 }}/>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'#dc2626', margin:'0 0 2px' }}>{isHe?'שגיאה':'Ошибка'}</p>
                    <p style={{ fontSize:11, color:'#ef4444', margin:0 }}>{errorMsg}</p>
                  </div>
                  <button onClick={() => setErrorMsg(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', padding:0 }}><X size={14}/></button>
                </div>
              )}

              {/* Date + notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">{isHe?'תאריך':'Дата'}</label>
                  <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} disabled={isLoading}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">{isHe?'הערות':'Примечания'}</label>
                  <input type="text" value={saleNotes} onChange={e => setSaleNotes(e.target.value)} disabled={isLoading}
                    placeholder={isHe?'הערות נוספות...':'Дополнительно...'}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300" />
                </div>
              </div>

              {/* Order summary */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                {items.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0 bg-white">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${TYPE_BADGE[item.type]}`}>{TYPE_LABEL[item.type]}</span>
                    <span className="flex-1 text-sm truncate">{item.product_name}</span>
                    <span className="text-xs text-gray-400">{item.quantity}×₪{item.unit_price}</span>
                    <span className="text-sm font-bold">₪{(item.quantity * item.unit_price).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center px-3 py-3 bg-gradient-to-r from-slate-700 to-slate-800">
                  <span className="text-xs font-semibold text-white/60 uppercase">{isHe?'סה״כ':'Итого'}</span>
                  <span className="text-lg font-black text-white">₪{total.toFixed(2)}</span>
                </div>
              </div>

              {/* PDF Proposal */}
              {(clientObj || clientLabel) && (
                <div>
                  <button onClick={() => setShowProposal(v => !v)}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition">
                    <FileText size={14}/>{isHe?'הצעת מחיר (PDF)':'Коммерческое предложение (PDF)'}
                  </button>
                  {showProposal && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <button onClick={handleDownloadPDF} disabled={pdfLoading}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition">
                        <Download size={13}/>{isHe?'הורד PDF':'Скачать PDF'}
                      </button>
                      {clientObj?.phone && (
                        <button onClick={handleSendWhatsApp} disabled={pdfLoading}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-100 text-green-700 text-sm hover:bg-green-200 transition">
                          <MessageCircle size={13}/>WhatsApp
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </TrinityModalShell>
      </Modal>
      )} {/* end isMobile ternary */}

      {/* Item picker sheet */}
      <ItemPickerSheet isOpen={pickerOpen} onClose={() => setPickerOpen(false)} isHe={isHe} onAdd={addItem} />

      {/* ── UnifiedPaymentDialog — глобальный процессор оплат ── */}
      {payDialogOpen && payDialogData && (
        <UnifiedPaymentDialog
          open={payDialogOpen}
          onOpenChange={(v) => {
            setPayDialogOpen(v)
            if (!v) {
              setPayDialogData(null)
              queryClient.invalidateQueries({ queryKey: ['payments'] })
              queryClient.invalidateQueries({ queryKey: ['sales'] })
              safeData.onSuccess?.()
            }
          }}
          initialData={{
            clientId:      payDialogData.clientId,
            clientName:    payDialogData.clientName,
            clientPhone:   payDialogData.clientPhone,
            saleId:        payDialogData.saleId,
            prefillAmount: payDialogData.prefillAmount,
          }}
        />
      )}

      {/* Quick-add mini modal */}

      {/* Quick-add mini modal */}
      {quickOpen && (
        <div className="fixed inset-0 z-[9300] flex items-center justify-center px-4"
          style={{ background:'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setQuickOpen(false) }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2"><Zap size={14} className="text-orange-500"/>{isHe?'הוספה מהירה':'Быстро добавить'}</span>
              <button onClick={() => setQuickOpen(false)}><X size={16} className="text-gray-400"/></button>
            </div>
            <input type="text" value={quickName} onChange={e => setQuickName(e.target.value)} autoFocus
              placeholder={isHe?'שם פריט':'Название'}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300" />
            <div className="relative">
              <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₪</span>
              <input type="number" min={0} value={quickPrice} onChange={e => setQuickPrice(e.target.value)}
                placeholder="0"
                className="w-full ps-6 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setQuickOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                {isHe?'ביטול':'Отмена'}
              </button>
              <button onClick={() => { if (quickName.trim()) { addItem({ product_name: quickName.trim(), quantity: 1, unit_price: Number(quickPrice)||0, type: 'custom' }); setQuickOpen(false) } }}
                disabled={!quickName.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: quickName.trim() ? 'linear-gradient(135deg,#f97316,#ea580c)' : '#e2e8f0' }}>
                {isHe?'הוסף':'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

/**
 * QuickVisitModal — модал "Быстрого режима мастера"
 *
 * Открывается из карточки клиента кнопкой "Открыть / Запланировать".
 * Два пути:
 *   1. ПОСТФАКТУМ ("Открыть") — услуги + товары + кол-во,
 *      статус 'open', is_postfactum=true.
 *      Сохранить (статус 'open') или Завершить → Оплата.
 *   2. ЗАПЛАНИРОВАТЬ — открывает стандартный UnifiedVisitDialog.
 *
 * Услуги и товары: несколько позиций, у каждой — количество.
 */

import { useState, useEffect } from 'react'
import { WizardModal, WizardStep } from '@/components/ui/WizardModal'
import { useLanguage } from '@/contexts/LanguageContext'
import { useQueryClient } from '@tanstack/react-query'
import { useModalStore } from '@/store/useModalStore'
import {
  ShoppingBag, Package, CheckCircle, Plus, Minus, Trash2,
  Loader2, Search, Calendar,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  id: string
  type: 'service' | 'product'
  name: string
  price: number
  quantity: number
}

interface ServiceOption {
  id: string
  name: string
  name_ru?: string
  price: number
  duration_minutes?: number
}

interface ProductOption {
  id: string
  name: string
  price: number
  stock_quantity?: number
}

// ─── i18n ─────────────────────────────────────────────────────────────────────

const I18N = {
  he: {
    title: 'ביקור מהיר',
    stepItems: 'פריטים',
    stepSummary: 'סיכום',
    addService: 'הוסף שירות',
    addProduct: 'הוסף מוצר',
    searchService: 'חפש שירות...',
    searchProduct: 'חפש מוצר...',
    noItems: 'לא נבחרו פריטים',
    noItemsHint: 'הוסף שירות או מוצר',
    total: 'סה"כ',
    qty: 'כמות',
    save: 'שמור',
    saveAndPay: 'סיים ושלם',
    cancel: 'ביטול',
    back: 'חזור',
    next: 'הבא',
    saving: 'שומר...',
    noServices: 'אין שירותים',
    noProducts: 'אין מוצרים',
    items: 'פריטים',
    summary: 'סיכום',
  },
  ru: {
    title: 'Быстрый визит',
    stepItems: 'Позиции',
    stepSummary: 'Итог',
    addService: 'Добавить услугу',
    addProduct: 'Добавить товар',
    searchService: 'Поиск услуги...',
    searchProduct: 'Поиск товара...',
    noItems: 'Позиции не выбраны',
    noItemsHint: 'Добавьте услугу или товар',
    total: 'Итого',
    qty: 'Кол-во',
    save: 'Сохранить',
    saveAndPay: 'Завершить и оплатить',
    cancel: 'Отмена',
    back: 'Назад',
    next: 'Далее',
    saving: 'Сохраняю...',
    noServices: 'Нет услуг',
    noProducts: 'Нет товаров',
    items: 'Позиции',
    summary: 'Итог',
  },
}

// ─── QuantityControl ─────────────────────────────────────────────────────────

function QuantityControl({
  value, onChange, min = 1,
}: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
      >
        <Minus className="w-3 h-3 text-gray-500" />
      </button>
      <span className="w-7 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
      >
        <Plus className="w-3 h-3 text-gray-500" />
      </button>
    </div>
  )
}

// ─── ItemPicker ───────────────────────────────────────────────────────────────

function ItemPicker({
  type, options, onSelect, onClose, s,
}: {
  type: 'service' | 'product'
  options: (ServiceOption | ProductOption)[]
  onSelect: (item: ServiceOption | ProductOption) => void
  onClose: () => void
  s: typeof I18N['ru']
}) {
  const [search, setSearch] = useState('')
  const filtered = options.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    ((o as ServiceOption).name_ru || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={type === 'service' ? s.searchService : s.searchProduct}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white dark:bg-gray-800 dark:border-gray-700"
        />
      </div>
      <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            {type === 'service' ? s.noServices : s.noProducts}
          </p>
        ) : filtered.map(opt => (
          <button
            key={opt.id}
            onClick={() => { onSelect(opt); onClose() }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors text-left group"
          >
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100 group-hover:text-violet-700">
              {(opt as ServiceOption).name_ru || opt.name}
            </span>
            <span className="text-sm font-semibold text-violet-600">₪{opt.price}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface QuickVisitModalProps {
  open: boolean
  onClose: () => void
  clientId: string
  clientName: string
}

export function QuickVisitModal({ open, onClose, clientId, clientName }: QuickVisitModalProps) {
  const { language } = useLanguage()
  const s = I18N[language] || I18N.ru
  const isHe = language === 'he'
  const dir = isHe ? 'rtl' : 'ltr'
  const queryClient = useQueryClient()
  const { openModal } = useModalStore()

  const [step, setStep] = useState(1)
  const [items, setItems] = useState<LineItem[]>([])
  const [services, setServices] = useState<ServiceOption[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [pickerType, setPickerType] = useState<'service' | 'product' | null>(null)
  const [saving, setSaving] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')

  // Загружаем услуги и товары при открытии
  useEffect(() => {
    if (!open) return
    setItems([])
    setStep(1)
    setPickerType(null)
    setCustomOpen(false)
    setCustomName('')
    setCustomPrice('')
    setLoadingOptions(true)
    Promise.all([
      fetch('/api/services').then(r => r.ok ? r.json() : {}) as Promise<any>,
      fetch('/api/products').then(r => r.ok ? r.json() : {}) as Promise<any>,
    ]).then(([svcs, prods]) => {
      const svcList: ServiceOption[] = svcs.services || svcs.data || (Array.isArray(svcs) ? svcs : [])
      const prodList: ProductOption[] = prods.products || prods.data || (Array.isArray(prods) ? prods : [])
      setServices(svcList)
      setProducts(prodList)
    }).catch(() => {}).finally(() => setLoadingOptions(false))
  }, [open])

  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0)

  function addItem(opt: ServiceOption | ProductOption, type: 'service' | 'product') {
    setItems(prev => {
      const existing = prev.find(i => i.id === opt.id && i.type === type)
      if (existing) {
        return prev.map(i =>
          i.id === opt.id && i.type === type
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, {
        id: opt.id,
        type,
        name: (opt as ServiceOption).name_ru || opt.name,
        price: opt.price,
        quantity: 1,
      }]
    })
  }

  function updateQty(id: string, type: LineItem['type'], qty: number) {
    if (qty < 1) {
      setItems(prev => prev.filter(i => !(i.id === id && i.type === type)))
    } else {
      setItems(prev => prev.map(i =>
        i.id === id && i.type === type ? { ...i, quantity: qty } : i
      ))
    }
  }

  function removeItem(id: string, type: LineItem['type']) {
    setItems(prev => prev.filter(i => !(i.id === id && i.type === type)))
  }

  function addCustomItem() {
    const name = customName.trim()
    const price = parseFloat(customPrice)
    if (!name || isNaN(price) || price < 0) return
    const id = `custom_${Date.now()}`
    setItems(prev => [...prev, { id, type: 'service', name, price, quantity: 1 }])
    setCustomName('')
    setCustomPrice('')
    setCustomOpen(false)
  }

  // Создать визит со статусом 'open' (постфактум, не завершён)
  async function handleSave() {
    if (items.length === 0) return
    setSaving(true)
    try {
      const firstService = items.find(i => i.type === 'service')
      const body = {
        clientId,
        service: firstService?.name || 'other',
        serviceId: firstService?.id || null,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        price: total,
        is_postfactum: true,
        status_override: 'open',
        quick_items: items,
      }
      const res = await fetch('/api/visits/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
      toast.success(isHe ? 'ביקור נשמר' : 'Визит сохранён')
      queryClient.invalidateQueries({ queryKey: ['visits'] })
      onClose()
    } catch (e: any) {
      toast.error(e.message || (isHe ? 'שגיאה' : 'Ошибка'))
    } finally {
      setSaving(false)
    }
  }

  // Завершить визит и перейти к оплате
  async function handleSaveAndPay() {
    if (items.length === 0) return
    setSaving(true)
    try {
      const firstService = items.find(i => i.type === 'service')
      const body = {
        clientId,
        service: firstService?.name || 'other',
        serviceId: firstService?.id || null,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        price: total,
        is_postfactum: true,
        status_override: 'completed',
        quick_items: items,
      }
      const res = await fetch('/api/visits/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
      const { visit } = await res.json()
      queryClient.invalidateQueries({ queryKey: ['visits'] })
      onClose()
      // Открываем диалог оплаты
      openModal('sale-unified', {
        clientId,
        clientName,
        visitId: visit?.id,
        preloadedItems: items.map(i => ({ id: i.id, name: i.name, price: i.price * i.quantity })),
      })
    } catch (e: any) {
      toast.error(e.message || (isHe ? 'שגיאה' : 'Ошибка'))
    } finally {
      setSaving(false)
    }
  }

  const steps: WizardStep[] = [
    { label: s.stepItems, icon: ShoppingBag },
    { label: s.stepSummary, icon: CheckCircle },
  ]

  // Шаг 1 — выбор позиций
  const Step1 = (
    <div className="space-y-4 min-h-[280px]">
      {/* Кнопки добавления */}
      <div className="flex gap-2">
        <button
          onClick={() => { setPickerType(pickerType === 'service' ? null : 'service'); setCustomOpen(false) }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
            pickerType === 'service'
              ? 'bg-violet-600 text-white border-violet-600'
              : 'border-gray-200 text-gray-700 hover:bg-violet-50 hover:border-violet-300'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          {s.addService}
        </button>
        <button
          onClick={() => { setPickerType(pickerType === 'product' ? null : 'product'); setCustomOpen(false) }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
            pickerType === 'product'
              ? 'bg-violet-600 text-white border-violet-600'
              : 'border-gray-200 text-gray-700 hover:bg-violet-50 hover:border-violet-300'
          }`}
        >
          <Package className="w-4 h-4" />
          {s.addProduct}
        </button>
        <button
          onClick={() => { setCustomOpen(v => !v); setPickerType(null) }}
          className={`flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
            customOpen
              ? 'bg-amber-500 text-white border-amber-500'
              : 'border-gray-200 text-gray-500 hover:bg-amber-50 hover:border-amber-300'
          }`}
          title={isHe ? 'פריט מותאם אישית' : 'Произвольно'}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Форма произвольной позиции */}
      {customOpen && (
        <div className="border border-amber-200 rounded-xl p-3 bg-amber-50/50 dark:bg-amber-900/10 space-y-2">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            {isHe ? 'פריט מותאם אישית' : 'Произвольная позиция'}
          </p>
          <input
            autoFocus
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            placeholder={isHe ? 'שם השירות / מוצר...' : 'Название услуги / товара...'}
            className="w-full px-3 py-2 rounded-xl border border-amber-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-gray-800"
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₪</span>
              <input
                type="number"
                min="0"
                step="1"
                value={customPrice}
                onChange={e => setCustomPrice(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomItem()}
                placeholder="0"
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-amber-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-gray-800"
              />
            </div>
            <button
              onClick={addCustomItem}
              disabled={!customName.trim() || customPrice === ''}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 transition-colors"
            >
              {isHe ? 'הוסף' : 'Добавить'}
            </button>
          </div>
        </div>
      )}

      {/* Picker dropdown */}
      {pickerType && !loadingOptions && (
        <div className="border border-violet-200 rounded-xl p-3 bg-violet-50/50 dark:bg-violet-900/10">
          <ItemPicker
            type={pickerType}
            options={pickerType === 'service' ? services : products}
            onSelect={opt => addItem(opt, pickerType)}
            onClose={() => setPickerType(null)}
            s={s}
          />
        </div>
      )}
      {pickerType && loadingOptions && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
        </div>
      )}

      {/* Список выбранных позиций */}
      {items.length === 0 && !pickerType ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400 space-y-2">
          <ShoppingBag className="w-10 h-10 opacity-30" />
          <p className="text-sm font-medium">{s.noItems}</p>
          <p className="text-xs">{s.noItemsHint}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={`${item.type}-${item.id}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
            >
              {item.type === 'service'
                ? <ShoppingBag className="w-4 h-4 text-violet-500 flex-shrink-0" />
                : <Package className="w-4 h-4 text-amber-500 flex-shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-gray-400">₪{item.price} × {item.quantity} = ₪{item.price * item.quantity}</p>
              </div>
              <QuantityControl
                value={item.quantity}
                onChange={qty => updateQty(item.id, item.type, qty)}
              />
              <button onClick={() => removeItem(item.id, item.type)}
                className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // Шаг 2 — итог + кнопки действий
  const Step2 = (
    <div className="space-y-4 min-h-[280px]">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
        {items.map(item => (
          <div key={`${item.type}-${item.id}`} className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">
              {item.name} × {item.quantity}
            </span>
            <span className="font-semibold">₪{item.price * item.quantity}</span>
          </div>
        ))}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-bold text-base">
          <span>{s.total}</span>
          <span className="text-violet-700 dark:text-violet-300">₪{total}</span>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || items.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-violet-400 text-violet-700 font-semibold text-sm hover:bg-violet-50 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {s.save}
        </button>
        <button
          onClick={handleSaveAndPay}
          disabled={saving || items.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity shadow-md"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {s.saveAndPay}
        </button>
      </div>
    </div>
  )

  return (
    <WizardModal
      open={open}
      onClose={onClose}
      title={`${s.title} — ${clientName}`}
      steps={steps}
      currentStep={step}
      onNext={() => setStep(n => n + 1)}
      onBack={() => setStep(n => n - 1)}
      canProceed={step === 1 ? items.length > 0 : true}
      onSubmit={handleSaveAndPay}
      isSubmitting={saving}
      submitLabel={s.saveAndPay}
      cancelLabel={s.cancel}
      backLabel={s.back}
      nextLabel={s.next}
      dir={dir}
      size="md"
    >
      {step === 1 && Step1}
      {step === 2 && Step2}
    </WizardModal>
  )
}

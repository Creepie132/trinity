'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Plus, Trash2, Search, ShoppingCart, Wrench, Package, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCreateSale } from '@/hooks/useSales'
import { useBranch } from '@/contexts/BranchContext'
import { useServices } from '@/hooks/useServices'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

interface LineItem {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  type: 'service' | 'product' | 'custom'
}

interface Props { isOpen: boolean; onClose: () => void }

function uid() { return Math.random().toString(36).slice(2) }

const T = {
  he: {
    title: 'עסקה חדשה', clientSearch: 'חיפוש לקוח...',
    addItem: '+ הוסף פריט', chooseType: 'מה להוסיף?',
    service: 'שירות', product: 'מוצר', custom: 'פריט חופשי',
    serviceTitle: 'בחר שירות', productTitle: 'בחר מוצר', customTitle: 'פריט חופשי',
    searchService: 'חיפוש שירות...', searchProduct: 'חיפוש מוצר...',
    total: 'סה״כ', paid: 'שולם', method: 'שיטת תשלום',
    cash: 'מזומן', card: 'כרטיס', bit: 'ביט', transfer: 'העברה',
    date: 'תאריך', notes: 'הערות', cancel: 'ביטול', save: 'שמור עסקה', saving: 'שומר...',
    required: 'חובה להוסיף לפחות פריט אחד', success: 'העסקה נשמרה!', error: 'שגיאה בשמירה',
    noItems: 'לא נמצאו פריטים', min: 'דק׳', perUnit: 'ליחידה', back: 'חזור',
    customName: 'שם פריט / שירות', customPrice: 'מחיר', add: 'הוסף',
    client: 'לקוח', items: 'פריטים',
  },
  ru: {
    title: 'Новая сделка', clientSearch: 'Поиск клиента...',
    addItem: '+ Добавить позицию', chooseType: 'Что добавить?',
    service: 'Услуга', product: 'Товар', custom: 'Произвольно',
    serviceTitle: 'Выберите услугу', productTitle: 'Выберите товар', customTitle: 'Произвольная позиция',
    searchService: 'Поиск услуги...', searchProduct: 'Поиск товара...',
    total: 'Итого', paid: 'Оплачено', method: 'Способ оплаты',
    cash: 'Наличные', card: 'Карта', bit: 'Bit', transfer: 'Перевод',
    date: 'Дата', notes: 'Примечания', cancel: 'Отмена', save: 'Сохранить', saving: 'Сохраняем...',
    required: 'Добавьте хотя бы одну позицию', success: 'Сделка сохранена!', error: 'Ошибка сохранения',
    noItems: 'Ничего не найдено', min: 'мин', perUnit: 'за шт.', back: 'Назад',
    customName: 'Название товара / услуги', customPrice: 'Цена', add: 'Добавить',
    client: 'Клиент', items: 'Позиции',
  },
}

// ── Step 1: choose type ───────────────────────────────────────────────────────
function ChooseTypeStep({ t, onChoose }: {
  t: typeof T['ru']
  onChoose: (v: 'service' | 'product' | 'custom') => void
}) {
  return (
    <div className="p-5 space-y-3">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">{t.chooseType}</p>
      {([
        { type: 'service' as const, icon: <Wrench size={18} />, label: t.service,
          cls: 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/20 dark:border-violet-800 dark:text-violet-300' },
        { type: 'product' as const, icon: <Package size={18} />, label: t.product,
          cls: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300' },
        { type: 'custom' as const, icon: <Plus size={18} />, label: t.custom,
          cls: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300' },
      ]).map(({ type, icon, label, cls }) => (
        <button key={type} onClick={() => onChoose(type)}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 font-medium text-sm transition-all active:scale-[0.98] ${cls}`}>
          {icon}{label}
        </button>
      ))}
    </div>
  )
}

// ── Step 2a: service picker ───────────────────────────────────────────────────
function ServicePicker({ t, language, onAdd, onBack }: {
  t: typeof T['ru']; language: string
  onAdd: (item: Omit<LineItem, 'id'>) => void; onBack: () => void
}) {
  const [search, setSearch] = useState('')
  const { data: services = [], isLoading } = useServices()
  const filtered = services.filter(s => {
    if (!search) return true
    const name = language === 'he' ? s.name : (s.name_ru || s.name)
    return name.toLowerCase().includes(search.toLowerCase())
  })
  const formatDur = (min: number) => {
    if (!min) return ''
    if (min >= 60) { const h = Math.floor(min / 60), m = min % 60; return m > 0 ? `${h}${language === 'he' ? 'ש׳' : 'ч'} ${m}${language === 'he' ? 'ד׳' : 'мин'}` : `${h}${language === 'he' ? 'ש׳' : 'ч'}` }
    return `${min} ${t.min}`
  }
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 space-y-2">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <ChevronLeft size={13} />{t.back}
        </button>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={language === 'he' ? 'חיפוש...' : 'Поиск...'}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-800"
          autoFocus />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 mt-1">
        {isLoading ? <p className="py-8 text-center text-sm text-gray-400">{language === 'he' ? 'טוען...' : 'Загрузка...'}</p>
          : filtered.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">{t.noItems}</p>
          : filtered.map(s => {
            const name = language === 'he' ? s.name : (s.name_ru || s.name)
            return (
              <button key={s.id}
                onClick={() => onAdd({ product_name: name, quantity: 1, unit_price: s.price || 0, type: 'service' })}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 active:scale-[0.98] transition-all group text-start">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-violet-700 dark:group-hover:text-violet-300 truncate">{name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDur(s.duration_minutes)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ms-2">
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-300">₪{s.price || 0}</span>
                  <Plus size={16} className="text-violet-400" />
                </div>
              </button>
            )
          })}
      </div>
    </div>
  )
}

// ── Step 2b: product picker ───────────────────────────────────────────────────
function ProductPicker({ t, language, onAdd, onBack }: {
  t: typeof T['ru']; language: string
  onAdd: (item: Omit<LineItem, 'id'>) => void; onBack: () => void
}) {
  const [search, setSearch] = useState('')
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-for-sale'],
    queryFn: async () => {
      const res = await fetch('/api/products')
      if (!res.ok) return []
      const json = await res.json()
      return (json.products ?? []) as { id: string; name: string; sell_price: number; stock_quantity?: number; image_url?: string; category?: string }[]
    },
  })
  const filtered = products.filter((p: any) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 space-y-2">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <ChevronLeft size={13} />{t.back}
        </button>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={language === 'he' ? 'חיפוש...' : 'Поиск...'}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800"
          autoFocus />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 mt-1">
        {isLoading ? <p className="py-8 text-center text-sm text-gray-400">{language === 'he' ? 'טוען...' : 'Загрузка...'}</p>
          : filtered.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">{t.noItems}</p>
          : filtered.map((p: any) => (
            <button key={p.id}
              onClick={() => onAdd({ product_name: p.name, quantity: 1, unit_price: p.sell_price || 0, type: 'product' })}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 active:scale-[0.98] transition-all group text-start">
              <div className="flex items-center gap-3 min-w-0">
                {p.image_url
                  ? <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                  : <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    </div>}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 truncate">{p.name}</p>
                  {p.category && <p className="text-xs text-gray-400">{p.category}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ms-2">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">₪{p.sell_price || 0}</span>
                <Plus size={16} className="text-amber-400" />
              </div>
            </button>
          ))}
      </div>
    </div>
  )
}

// ── Step 2c: custom item ──────────────────────────────────────────────────────
function CustomItemStep({ t, onAdd, onBack }: {
  t: typeof T['ru']
  onAdd: (item: Omit<LineItem, 'id'>) => void; onBack: () => void
}) {
  const [name, setName]   = useState('')
  const [price, setPrice] = useState('')
  const submit = () => {
    if (!name.trim()) return
    onAdd({ product_name: name.trim(), quantity: 1, unit_price: Number(price) || 0, type: 'custom' })
    setName(''); setPrice('')
  }
  return (
    <div className="px-5 pt-3 pb-5 space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
        <ChevronLeft size={13} />{t.back}
      </button>
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">{t.customName}</label>
        <Input value={name} onChange={e => setName(e.target.value)} autoFocus
          onKeyDown={e => e.key === 'Enter' && submit()} />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">{t.customPrice}</label>
        <div className="relative">
          <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₪</span>
          <Input type="number" min={0} value={price} onChange={e => setPrice(e.target.value)}
            className="ps-6" onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
      </div>
      <Button onClick={submit} disabled={!name.trim()} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
        <Plus size={15} className="me-2" />{t.add}
      </Button>
    </div>
  )
}

// ── Picker sheet (slide-up) ────────────────────────────────────────────────────
type PickerStep = 'choose' | 'service' | 'product' | 'custom'

function ItemPickerSheet({ isOpen, onClose, t, language, onAdd }: {
  isOpen: boolean; onClose: () => void
  t: typeof T['ru']; language: string
  onAdd: (item: Omit<LineItem, 'id'>) => void
}) {
  const [step, setStep] = useState<PickerStep>('choose')
  useEffect(() => { if (isOpen) setStep('choose') }, [isOpen])
  const handleAdd = (item: Omit<LineItem, 'id'>) => { onAdd(item); onClose() }
  if (!isOpen) return null
  const titles: Record<PickerStep, string> = {
    choose: t.chooseType, service: t.serviceTitle, product: t.productTitle, custom: t.customTitle,
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl w-full max-w-sm
        max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
        style={{ animation: 'fadeInUp 0.2s ease both' }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{titles[step]}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={17} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {step === 'choose'  && <ChooseTypeStep t={t} onChoose={setStep} />}
          {step === 'service' && <ServicePicker t={t} language={language} onAdd={handleAdd} onBack={() => setStep('choose')} />}
          {step === 'product' && <ProductPicker t={t} language={language} onAdd={handleAdd} onBack={() => setStep('choose')} />}
          {step === 'custom'  && <CustomItemStep t={t} onAdd={handleAdd} onBack={() => setStep('choose')} />}
        </div>
      </div>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function NewSaleModal({ isOpen, onClose }: Props) {
  const { language } = useLanguage()
  const locale = language === 'he' ? 'he' : 'ru'
  const dir    = locale === 'he' ? 'rtl' : 'ltr'
  const t      = T[locale]
  const { activeOrgId } = useBranch()
  const createSale = useCreateSale()

  // ── client search (uses /api/clients — returns bare array) ──
  const [clientSearch, setClientSearch]     = useState('')
  const [clientId, setClientId]             = useState<string | null>(null)
  const [clientLabel, setClientLabel]       = useState('')
  const [showDrop, setShowDrop]             = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  const { data: clientResults = [] } = useQuery({
    queryKey: ['client-search', activeOrgId, clientSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ search: clientSearch, limit: '8' })
      const headers: Record<string, string> = {}
      if (activeOrgId) headers['X-Branch-Org-Id'] = activeOrgId
      const res = await fetch(`/api/clients?${params}`, { headers })
      if (!res.ok) return []
      const json = await res.json()
      // /api/clients returns a bare array
      return (Array.isArray(json) ? json : (json.clients ?? json.data ?? [])) as
        { id: string; first_name: string; last_name: string; phone?: string }[]
    },
    enabled: !!activeOrgId && clientSearch.length >= 2,
  })

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── items ──
  const [items, setItems]       = useState<LineItem[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const addItem = useCallback((item: Omit<LineItem, 'id'>) => {
    setItems(p => [...p, { ...item, id: uid() }])
  }, [])
  const removeItem  = (id: string) => setItems(p => p.filter(i => i.id !== id))
  const updateQty   = (id: string, qty: number) =>
    setItems(p => p.map(i => i.id === id ? { ...i, quantity: Math.max(1, qty) } : i))
  const updatePrice = (id: string, price: number) =>
    setItems(p => p.map(i => i.id === id ? { ...i, unit_price: Math.max(0, price) } : i))

  const [paidAmount, setPaidAmount] = useState('')
  const [method, setMethod]         = useState('cash')
  const [saleDate, setSaleDate]     = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes]           = useState('')

  const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  const selectClient = (c: { id: string; first_name: string; last_name: string }) => {
    setClientId(c.id)
    setClientLabel(`${c.first_name} ${c.last_name}`.trim())
    setClientSearch(''); setShowDrop(false)
  }
  const clearClient = () => { setClientId(null); setClientLabel(''); setClientSearch('') }

  const reset = () => {
    setItems([]); setPaidAmount(''); setMethod('cash'); setNotes('')
    setClientId(null); setClientLabel(''); setClientSearch('')
    setSaleDate(new Date().toISOString().slice(0, 10))
  }
  const handleClose = () => { reset(); onClose() }

  const handleSave = async () => {
    if (!items.length) { toast.error(t.required); return }
    try {
      await createSale.mutateAsync({
        client_id: clientId || undefined,
        items: items.map(i => ({ product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price })),
        paid_amount: paidAmount ? Number(paidAmount) : total,
        payment_method: method,
        sale_date: saleDate,
        notes: notes || undefined,
      })
      toast.success(t.success)
      handleClose()
    } catch { toast.error(t.error) }
  }

  if (!isOpen) return null

  const TYPE_BADGE: Record<string, string> = {
    service: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    product: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    custom:  'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  }
  const TYPE_LABEL: Record<string, string> = {
    service: locale === 'he' ? 'שר' : 'У',
    product: locale === 'he' ? 'מו' : 'Т',
    custom:  locale === 'he' ? 'חו' : 'С',
  }

  return (
    <>
      {/* ── Backdrop + modal ── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={e => { if (e.target === e.currentTarget) handleClose() }}>

        <div dir={dir} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg
          max-h-[92vh] overflow-y-auto flex flex-col"
          style={{ animation: 'fadeInScale 0.2s ease both' }}>

          {/* header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t.title}</h2>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="px-5 py-5 space-y-5 flex-1">

            {/* ── Client search ── */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">{t.client}</label>
              {clientLabel ? (
                <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-300">{clientLabel}</span>
                  <button onClick={clearClient} className="text-amber-400 hover:text-amber-600 ms-2"><X size={14} /></button>
                </div>
              ) : (
                <div className="relative" ref={dropRef}>
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input value={clientSearch}
                    onChange={e => { setClientSearch(e.target.value); setShowDrop(true) }}
                    onFocus={() => clientResults.length > 0 && setShowDrop(true)}
                    placeholder={t.clientSearch} className="ps-9 text-sm" />
                  {showDrop && clientResults.length > 0 && (
                    <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700
                      rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                      {clientResults.map(c => (
                        <button key={c.id} onClick={() => selectClient(c)}
                          className="w-full text-start px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                            border-b last:border-0 border-gray-50 dark:border-gray-700/50">
                          <span className="font-medium">{c.first_name} {c.last_name}</span>
                          {c.phone && <span className="ms-2 text-xs text-gray-400">{c.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Items ── */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wide">{t.items}</label>
              {items.length > 0 && (
                <div className="space-y-2 mb-3">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3 py-2.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ${TYPE_BADGE[item.type]}`}>
                        {TYPE_LABEL[item.type]}
                      </span>
                      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 truncate min-w-0">{item.product_name}</span>
                      {/* qty stepper */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => updateQty(item.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-500 text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center">−</button>
                        <span className="w-5 text-center text-xs font-medium tabular-nums">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-500 text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center">+</button>
                      </div>
                      {/* price */}
                      <div className="relative w-20 flex-shrink-0">
                        <span className="absolute start-2 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">₪</span>
                        <input type="number" min={0} value={item.unit_price || ''}
                          onChange={e => updatePrice(item.id, Number(e.target.value))}
                          className="w-full ps-5 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-lg
                            bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                            focus:outline-none focus:ring-2 focus:ring-amber-400/40" />
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* add-item button — always visible at bottom of items section */}
              <button onClick={() => setPickerOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed
                  border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-400
                  hover:border-amber-400 hover:text-amber-500 dark:hover:border-amber-600 dark:hover:text-amber-400
                  transition-all active:scale-[0.98]">
                <Plus size={15} />{t.addItem}
              </button>
            </div>

            {/* ── Total / Paid ── */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t.total}</span>
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">₪{total.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{t.paid}</label>
                <div className="relative flex-1">
                  <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₪</span>
                  <Input type="number" min={0} value={paidAmount}
                    onChange={e => setPaidAmount(e.target.value)}
                    placeholder={String(total)} className="ps-6 text-sm" />
                </div>
              </div>
            </div>

            {/* ── Method + Date ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">{t.method}</label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t.cash}</SelectItem>
                    <SelectItem value="card">{t.card}</SelectItem>
                    <SelectItem value="bit">{t.bit}</SelectItem>
                    <SelectItem value="transfer">{t.transfer}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">{t.date}</label>
                <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="text-sm" />
              </div>
            </div>

            {/* ── Notes ── */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">{t.notes}</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-white
                  dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none
                  focus:outline-none focus:ring-2 focus:ring-amber-400/40 placeholder:text-gray-400"
                placeholder={locale === 'he' ? 'הערות נוספות...' : 'Дополнительные примечания...'} />
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 sticky bottom-0 bg-white dark:bg-gray-900">
            <Button variant="outline" onClick={handleClose} className="flex-1 text-sm">{t.cancel}</Button>
            <Button onClick={handleSave} disabled={createSale.isPending || items.length === 0}
              className="flex-1 bg-theme-primary text-white hover:opacity-90 text-sm font-medium disabled:opacity-40">
              {createSale.isPending ? t.saving : `${t.save}${total > 0 ? ` · ₪${total.toLocaleString()}` : ''}`}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Item picker sheet ── */}
      <ItemPickerSheet isOpen={pickerOpen} onClose={() => setPickerOpen(false)}
        t={t} language={language} onAdd={addItem} />
    </>
  )
}

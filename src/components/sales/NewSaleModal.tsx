'use client'

import { useState, useCallback } from 'react'
import { X, Plus, Trash2, Search, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCreateSale } from '@/hooks/useSales'
import { useClients } from '@/hooks/useClients'
import { toast } from 'sonner'

// ─── types ────────────────────────────────────────────────────────────────────
interface LineItem {
  id: string
  product_name: string
  quantity: number
  unit_price: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  he: {
    title: 'עסקה חדשה', client: 'לקוח', clientSearch: 'חיפוש לקוח...',
    noClient: 'ללא לקוח', items: 'פריטים', addItem: 'הוסף פריט',
    product: 'שם מוצר / שירות', qty: 'כמות', price: 'מחיר',
    total: 'סה״כ', paid: 'שולם', method: 'שיטת תשלום',
    cash: 'מזומן', card: 'כרטיס', bit: 'ביט', transfer: 'העברה',
    date: 'תאריך', notes: 'הערות', cancel: 'ביטול', save: 'שמור עסקה',
    saving: 'שומר...', required: 'חובה להוסיף לפחות פריט אחד',
    success: 'העסקה נשמרה!', error: 'שגיאה בשמירה', noName: 'נא להזין שם מוצר',
  },
  ru: {
    title: 'Новая сделка', client: 'Клиент', clientSearch: 'Поиск клиента...',
    noClient: 'Без клиента', items: 'Позиции', addItem: 'Добавить позицию',
    product: 'Товар / услуга', qty: 'Кол-во', price: 'Цена',
    total: 'Итого', paid: 'Оплачено', method: 'Способ оплаты',
    cash: 'Наличные', card: 'Карта', bit: 'Bit', transfer: 'Перевод',
    date: 'Дата', notes: 'Примечания', cancel: 'Отмена', save: 'Сохранить',
    saving: 'Сохраняем...', required: 'Добавьте хотя бы одну позицию',
    success: 'Сделка сохранена!', error: 'Ошибка сохранения', noName: 'Укажите название',
  },
}

function uid() { return Math.random().toString(36).slice(2) }

// ─── Component ────────────────────────────────────────────────────────────────
export default function NewSaleModal({ isOpen, onClose }: Props) {
  const { language } = useLanguage()
  const locale = language === 'he' ? 'he' : 'ru'
  const dir    = locale === 'he' ? 'rtl' : 'ltr'
  const t      = T[locale]

  const createSale = useCreateSale()
  const [clientSearch, setClientSearch] = useState('')
  const [clientId, setClientId]         = useState<string | null>(null)
  const [clientLabel, setClientLabel]   = useState('')
  const [showClientDrop, setShowClientDrop] = useState(false)
  const [items, setItems]         = useState<LineItem[]>([{ id: uid(), product_name: '', quantity: 1, unit_price: 0 }])
  const [paidAmount, setPaidAmount]   = useState('')
  const [method, setMethod]           = useState('cash')
  const [saleDate, setSaleDate]       = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes]             = useState('')

  const { data: clientsData } = useClients(clientSearch.length >= 2 ? clientSearch : undefined)
  const clients = (clientsData as any)?.clients ?? []

  const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  // ── item helpers ──
  const addItem = () => setItems(p => [...p, { id: uid(), product_name: '', quantity: 1, unit_price: 0 }])
  const removeItem = (id: string) => setItems(p => p.filter(i => i.id !== id))
  const updateItem = useCallback((id: string, field: keyof LineItem, val: string | number) => {
    setItems(p => p.map(i => i.id === id ? { ...i, [field]: val } : i))
  }, [])

  const handleClientSelect = (c: { id: string; first_name: string; last_name: string }) => {
    setClientId(c.id)
    setClientLabel(`${c.first_name} ${c.last_name}`.trim())
    setClientSearch('')
    setShowClientDrop(false)
  }
  const clearClient = () => { setClientId(null); setClientLabel(''); setClientSearch('') }

  const handleClose = () => {
    setItems([{ id: uid(), product_name: '', quantity: 1, unit_price: 0 }])
    setPaidAmount(''); setMethod('cash'); setNotes(''); setClientId(null); setClientLabel('')
    onClose()
  }

  const handleSave = async () => {
    const validItems = items.filter(i => i.product_name.trim())
    if (!validItems.length) { toast.error(t.required); return }
    const bad = validItems.find(i => !i.product_name.trim())
    if (bad) { toast.error(t.noName); return }

    try {
      await createSale.mutateAsync({
        client_id: clientId || undefined,
        items: validItems.map(i => ({
          product_name: i.product_name.trim(),
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        paid_amount: paidAmount ? Number(paidAmount) : total,
        payment_method: method,
        sale_date: saleDate,
        notes: notes || undefined,
      })
      toast.success(t.success)
      handleClose()
    } catch {
      toast.error(t.error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}>

      <div dir={dir} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg
        max-h-[90vh] overflow-y-auto flex flex-col"
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

        <div className="px-5 py-4 space-y-5 flex-1">

          {/* ── Client ─────────────────────────────────────────────────── */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">{t.client}</label>
            {clientLabel ? (
              <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">{clientLabel}</span>
                <button onClick={clearClient} className="text-amber-400 hover:text-amber-600"><X size={14} /></button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setShowClientDrop(true) }}
                  onFocus={() => setShowClientDrop(true)}
                  placeholder={t.clientSearch}
                  className="ps-9 text-sm" />
                {showClientDrop && clients.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg z-20 max-h-44 overflow-y-auto">
                    {clients.slice(0, 8).map((c: any) => (
                      <button key={c.id} onClick={() => handleClientSelect(c)}
                        className="w-full text-start px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        {c.first_name} {c.last_name}
                        {c.phone && <span className="ms-2 text-xs text-gray-400">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Items ──────────────────────────────────────────────────── */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wide">{t.items}</label>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <Input value={item.product_name}
                    onChange={e => updateItem(item.id, 'product_name', e.target.value)}
                    placeholder={t.product} className="flex-1 text-sm" />
                  <Input type="number" min={1} value={item.quantity}
                    onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                    className="w-16 text-sm text-center" />
                  <div className="relative w-24">
                    <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₪</span>
                    <Input type="number" min={0} value={item.unit_price || ''}
                      onChange={e => updateItem(item.id, 'unit_price', Number(e.target.value))}
                      className="ps-6 text-sm" />
                  </div>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addItem}
              className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 font-medium transition-colors">
              <Plus size={14} />{t.addItem}
            </button>
          </div>

          {/* ── Total / Paid ────────────────────────────────────────────── */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t.total}</span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">₪{total.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap flex-shrink-0">{t.paid}</label>
              <div className="relative flex-1">
                <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₪</span>
                <Input type="number" min={0} value={paidAmount}
                  onChange={e => setPaidAmount(e.target.value)}
                  placeholder={String(total)}
                  className="ps-6 text-sm" />
              </div>
            </div>
          </div>

          {/* ── Method + Date ───────────────────────────────────────────── */}
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

          {/* ── Notes ───────────────────────────────────────────────────── */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">{t.notes}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2
                bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none
                focus:outline-none focus:ring-2 focus:ring-amber-400/40 placeholder:text-gray-400"
              placeholder={locale === 'he' ? 'הערות נוספות...' : 'Дополнительные примечания...'} />
          </div>
        </div>

        {/* footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 sticky bottom-0 bg-white dark:bg-gray-900">
          <Button variant="outline" onClick={handleClose} className="flex-1 text-sm">{t.cancel}</Button>
          <Button onClick={handleSave} disabled={createSale.isPending}
            className="flex-1 bg-theme-primary text-white hover:opacity-90 text-sm font-medium">
            {createSale.isPending ? t.saving : t.save}
          </Button>
        </div>
      </div>
    </div>
  )
}

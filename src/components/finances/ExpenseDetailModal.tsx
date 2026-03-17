'use client'

import { useState } from 'react'
import { X, Phone, Globe, Hash, FileText, Package, Gift, ExternalLink, Pencil, Check } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useUpdateExpense } from '@/hooks/useExpenses'
import type { Expense } from '@/hooks/useExpenses'
import { toast } from 'sonner'

// ─── Item type ─────────────────────────────────────────────────────────────────
interface ExpenseItem {
  name: string
  qty: number
  unit_price: number
  is_gift?: boolean   // бесплатный "подарок" от поставщика
}

// ─── Translations ──────────────────────────────────────────────────────────────
const t = {
  he: {
    title: 'פרטי הוצאה', vendor: 'ספק', phone: 'טלפון', website: 'אתר',
    orderNum: 'מספר הזמנה', notes: 'הערות', items: 'פירוט מוצרים',
    vat: 'מע"מ', total: 'סך הכל', subtotal: 'לפני מע"מ',
    gifts: 'מתנות (חינם)', costPrice: 'עלות (כולל מתנות)', perUnit: 'לפריט',
    noItems: 'אין פירוט מוצרים', save: 'שמור', edit: 'עריכה',
    notesPlaceholder: 'הוסף הערה...', orderPlaceholder: 'מספר הזמנה...',
    saved: 'נשמר בהצלחה', giftInfo: 'הכמות כוללת {{gift}} מתנות — העלות האמיתית לפריט:',
  },
  ru: {
    title: 'Детали расхода', vendor: 'Поставщик', phone: 'Телефон', website: 'Сайт',
    orderNum: 'Номер заказа', notes: 'Заметки', items: 'Состав заказа',
    vat: 'НДС (МААМ)', total: 'Итого', subtotal: 'До НДС',
    gifts: 'Бесплатно (подарки)', costPrice: 'Себестоимость (с учётом подарков)', perUnit: 'за ед.',
    noItems: 'Состав не указан', save: 'Сохранить', edit: 'Редактировать',
    notesPlaceholder: 'Добавить заметку...', orderPlaceholder: 'Номер заказа...',
    saved: 'Сохранено', giftInfo: 'В количество входит {{gift}} бесплатных — реальная себестоимость за ед.:',
  },
}

// ─── Cost with gifts ──────────────────────────────────────────────────────────
function CostWithGifts({ items, lang }: { items: ExpenseItem[]; lang: 'he' | 'ru' }) {
  const tx = t[lang]
  if (!items.length) return null

  const paid = items.filter(i => !i.is_gift)
  const gifts = items.filter(i => i.is_gift)
  if (!gifts.length) return null

  return (
    <div className="mt-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
      <div className="flex items-center gap-2 mb-2">
        <Gift className="w-4 h-4 text-violet-500 flex-shrink-0" />
        <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">{tx.costPrice}</p>
      </div>
      {paid.map((item, i) => {
        const giftItem = gifts.find(g => g.name === item.name)
        if (!giftItem) return null
        const totalQty = item.qty + giftItem.qty
        const realCost = (item.qty * item.unit_price) / totalQty
        const info = tx.giftInfo.replace('{{gift}}', String(giftItem.qty))
        return (
          <div key={i} className="mb-2 last:mb-0">
            <p className="text-xs text-violet-600 dark:text-violet-400">{item.name}</p>
            <p className="text-xs text-violet-500 mb-1">{info}</p>
            <p className="text-sm font-bold text-violet-700 dark:text-violet-300">
              ₪{realCost.toFixed(2)} {tx.perUnit}
              <span className="text-xs font-normal text-violet-400 ms-1">
                ({item.qty}+{giftItem.qty} = {totalQty} {lang === 'he' ? 'יח׳' : 'шт.'})
              </span>
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Items list ───────────────────────────────────────────────────────────────
function ItemsList({ items, lang }: { items: ExpenseItem[]; lang: 'he' | 'ru' }) {
  const tx = t[lang]
  if (!items.length) return <p className="text-xs text-gray-400 py-2">{tx.noItems}</p>

  const paidItems = items.filter(i => !i.is_gift)
  const giftItems = items.filter(i => i.is_gift)

  return (
    <div className="space-y-1.5">
      {paidItems.map((item, i) => (
        <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
          <Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{item.name}</span>
          <span className="text-xs text-gray-500">{item.qty}{lang === 'he' ? ' יח׳' : ' шт.'}</span>
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
            ₪{(item.unit_price * item.qty).toLocaleString('he-IL', { maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}
      {giftItems.map((item, i) => (
        <div key={`gift-${i}`} className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg px-3 py-2 border border-emerald-200 dark:border-emerald-800">
          <Gift className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          <span className="flex-1 text-xs text-emerald-700 dark:text-emerald-300 truncate">{item.name}</span>
          <span className="text-xs text-emerald-600">{item.qty}{lang === 'he' ? ' יח׳' : ' шт.'}</span>
          <span className="text-xs font-semibold text-emerald-600">
            {lang === 'he' ? 'מתנה 🎁' : 'Подарок 🎁'}
          </span>
        </div>
      ))}
      <CostWithGifts items={items} lang={lang} />
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
interface Props {
  expense: Expense
  onClose: () => void
}

export function ExpenseDetailModal({ expense, onClose }: Props) {
  const { language } = useLanguage()
  const lang = language === 'he' ? 'he' : 'ru'
  const tx = t[lang]
  const dir = lang === 'he' ? 'rtl' : 'ltr'
  const update = useUpdateExpense()

  const [notes, setNotes] = useState(expense.notes ?? '')
  const [orderNumber, setOrderNumber] = useState(expense.order_number ?? '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const items: ExpenseItem[] = Array.isArray(expense.items) ? expense.items as ExpenseItem[] : []
  const vatAmount: number = expense.vat_amount ?? 0
  const subtotal = (expense.amount ?? 0) - vatAmount

  const handleSave = async () => {
    setSaving(true)
    try {
      await update.mutateAsync({ id: expense.id, notes, order_number: orderNumber } as any)
      toast.success(tx.saved)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        dir={dir}
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700 rounded-t-3xl">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{tx.title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Vendor block */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{tx.vendor}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {expense.vendor ?? (lang === 'he' ? 'ספק לא ידוע' : 'Неизвестный')}
            </p>
            <div className="flex flex-wrap gap-2">
              {expense.vendor_phone && (
                <a href={`tel:${expense.vendor_phone}`}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors">
                  <Phone className="w-3.5 h-3.5" />
                  {expense.vendor_phone}
                </a>
              )}
              {expense.vendor_website && (
                <a href={expense.vendor_website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-100 transition-colors">
                  <Globe className="w-3.5 h-3.5" />
                  {lang === 'he' ? 'אתר הספק' : 'Сайт поставщика'}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Financial summary */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 px-4 pt-3 pb-2">{tx.total}</p>
            {vatAmount > 0 && (
              <>
                <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-500">{tx.subtotal}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                    ₪{subtotal.toLocaleString('he-IL', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-500">{tx.vat} (17%)</span>
                  <span className="text-sm font-medium text-amber-600 tabular-nums">
                    +₪{vatAmount.toLocaleString('he-IL', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-700/40">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{tx.total}</span>
              <span className="text-lg font-bold text-red-500 tabular-nums">
                ₪{(expense.amount ?? 0).toLocaleString('he-IL', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">{tx.items}</p>
            <ItemsList items={items} lang={lang} />
          </div>

          {/* Order number */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">{tx.orderNum}</p>
            {editing ? (
              <input
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                placeholder={tx.orderPlaceholder}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-amber-400"
              />
            ) : (
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
                <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {orderNumber || <span className="text-gray-400 italic">{tx.orderPlaceholder}</span>}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">{tx.notes}</p>
            {editing ? (
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={tx.notesPlaceholder}
                rows={3}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            ) : (
              <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 min-h-[44px]">
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {notes || <span className="text-gray-400 italic">{tx.notesPlaceholder}</span>}
                </span>
              </div>
            )}
          </div>

          {/* Receipt link */}
          {expense.receipt_url && (
            <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-blue-500 hover:text-blue-600 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
              {lang === 'he' ? 'צפה בקבלה המקורית' : 'Открыть оригинал квитанции'}
            </a>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1 pb-1">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors">
                  {lang === 'he' ? 'ביטול' : 'Отмена'}
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" />
                  {tx.save}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5">
                <Pencil className="w-4 h-4" />
                {tx.edit}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

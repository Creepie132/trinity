'use client'

/**
 * ExpenseDetailModal — детали и редактирование расхода.
 *
 * Trinity Standard compliance:
 * ✅ TrinityModalShell — стандартная оболочка вместо кастомного overlay
 * ✅ PATCH /api/expenses — Zod-валидация на сервере
 * ✅ queryClient.invalidateQueries() — через useUpdateExpense hook
 */

import { useState } from 'react'
import {
  Phone, Globe, Hash, FileText, Package, Gift,
  ExternalLink, Pencil, Check, X,
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useUpdateExpense } from '@/hooks/useExpenses'
import type { Expense } from '@/hooks/useExpenses'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'

// ─── Item type ────────────────────────────────────────────────────────────────
interface ExpenseItem {
  name: string
  qty: number
  unit_price: number
  is_gift?: boolean
}

// ─── i18n ─────────────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  he: {
    title: 'פרטי הוצאה', vendor: 'ספק', phone: 'טלפון', website: 'אתר',
    orderNum: 'מספר הזמנה', notes: 'הערות', items: 'פירוט מוצרים',
    vat: 'מע"מ', total: 'סך הכל', subtotal: 'לפני מע"מ',
    gifts: 'מתנות (חינם)', costPrice: 'עלות (כולל מתנות)', perUnit: 'לפריט',
    noItems: 'אין פירוט מוצרים', save: 'שמור', edit: 'עריכה',
    notesPlaceholder: 'הוסף הערה...', orderPlaceholder: 'מספר הזמנה...',
    saved: 'נשמר בהצלחה', cancel: 'ביטול', close: 'סגור',
    giftInfo: 'הכמות כוללת {{gift}} מתנות — העלות האמיתית לפריט:',
    receiptLink: 'צפה בקבלה המקורית',
  },
  ru: {
    title: 'Детали расхода', vendor: 'Поставщик', phone: 'Телефон', website: 'Сайт',
    orderNum: 'Номер заказа', notes: 'Заметки', items: 'Состав заказа',
    vat: 'НДС (МААМ)', total: 'Итого', subtotal: 'До НДС',
    gifts: 'Бесплатно (подарки)', costPrice: 'Себестоимость (с учётом подарков)', perUnit: 'за ед.',
    noItems: 'Состав не указан', save: 'Сохранить', edit: 'Редактировать',
    notesPlaceholder: 'Добавить заметку...', orderPlaceholder: 'Номер заказа...',
    saved: 'Сохранено', cancel: 'Отмена', close: 'Закрыть',
    giftInfo: 'В количество входит {{gift}} бесплатных — реальная себестоимость за ед.:',
    receiptLink: 'Открыть оригинал квитанции',
  },
}

// ─── CostWithGifts ────────────────────────────────────────────────────────────
function CostWithGifts({ items, lang }: { items: ExpenseItem[]; lang: 'he' | 'ru' }) {
  const tx = TRANSLATIONS[lang]
  const paidItems = items.filter(i => !i.is_gift)
  const giftItems = items.filter(i => i.is_gift)
  if (!giftItems.length) return null

  return (
    <div className="mt-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
      <div className="flex items-center gap-2 mb-2">
        <Gift className="w-4 h-4 text-violet-500 flex-shrink-0" />
        <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">{tx.costPrice}</p>
      </div>
      {paidItems.map((item, i) => {
        const giftItem = giftItems.find(g => g.name === item.name)
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

// ─── ItemsList ────────────────────────────────────────────────────────────────
function ItemsList({ items, lang }: { items: ExpenseItem[]; lang: 'he' | 'ru' }) {
  const tx = TRANSLATIONS[lang]
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

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props {
  expense: Expense
  onClose: () => void
}

export function ExpenseDetailModal({ expense, onClose }: Props) {
  const { language } = useLanguage()
  const lang = language === 'he' ? 'he' : 'ru'
  const tx   = TRANSLATIONS[lang]
  const dir  = lang === 'he' ? 'rtl' : 'ltr'
  const update = useUpdateExpense()

  const [notes,       setNotes]       = useState(expense.notes ?? '')
  const [orderNumber, setOrderNumber] = useState(expense.order_number ?? '')
  const [editing,     setEditing]     = useState(false)
  const [saving,      setSaving]      = useState(false)

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

  // ── Sidebar ──────────────────────────────────────────────────────────────────
  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Amount badge */}
      <div style={{ background: 'rgba(239,68,68,0.12)', border: '0.5px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '10px 8px', textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#f87171' }}>
          ₪{(expense.amount ?? 0).toLocaleString('he-IL', { maximumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
          {tx.total}
        </div>
      </div>
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '0 0 8px' }} />

      {/* Edit/Save button */}
      {editing ? (
        <>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%',
              background: saving ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#f59e0b,#d97706)',
              color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Check size={14} />
            {saving ? '...' : tx.save}
          </button>
          <button onClick={() => setEditing(false)}
            style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
            {tx.cancel}
          </button>
        </>
      ) : (
        <>
          <button onClick={() => setEditing(true)}
            style={{ padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%',
              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
              fontSize: 13, fontWeight: 600, marginBottom: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Pencil size={14} />{tx.edit}
          </button>
          <button onClick={onClose}
            style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
            {tx.close}
          </button>
        </>
      )}
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Modal open={true} onClose={onClose} darkHeader showCloseButton={false}
      width="680px" dir={dir} contentClassName="!p-0">
      <TrinityModalShell
        open={true} onClose={onClose}
        icon={<FileText />}
        title={tx.title}
        subtitle={expense.vendor ?? (lang === 'he' ? 'ספק לא ידוע' : 'Неизвестный')}
        dir={dir}
        sidebarExtra={sidebar}
      >
        <div style={{ padding: '20px 18px 24px' }} className="space-y-4">

          {/* Vendor block */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px' }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{tx.vendor}</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>
              {expense.vendor ?? (lang === 'he' ? 'ספק לא ידוע' : 'Неизвестный')}
            </p>
            <div className="flex flex-wrap gap-2">
              {expense.vendor_phone && (
                <a href={`tel:${expense.vendor_phone}`}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                  <Phone className="w-3.5 h-3.5" />{expense.vendor_phone}
                </a>
              )}
              {expense.vendor_website && (
                <a href={expense.vendor_website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors">
                  <Globe className="w-3.5 h-3.5" />
                  {lang === 'he' ? 'אתר הספק' : 'Сайт поставщика'}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Financial summary */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 14px 6px' }}>{tx.total}</p>
            {vatAmount > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{tx.subtotal}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>₪{subtotal.toLocaleString('he-IL', { maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{tx.vat} (17%)</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#d97706' }}>+₪{vatAmount.toLocaleString('he-IL', { maximumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{tx.total}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#ef4444' }}>₪{(expense.amount ?? 0).toLocaleString('he-IL', { maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{tx.items}</p>
              <ItemsList items={items} lang={lang} />
            </div>
          )}

          {/* Order number */}
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{tx.orderNum}</p>
            {editing ? (
              <input value={orderNumber} onChange={e => setOrderNumber(e.target.value)}
                placeholder={tx.orderPlaceholder}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', color: '#1e293b', boxSizing: 'border-box' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', borderRadius: 10, padding: '10px 12px' }}>
                <Hash className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span style={{ fontSize: 13, color: orderNumber ? '#334155' : '#94a3b8', fontStyle: orderNumber ? 'normal' : 'italic' }}>
                  {orderNumber || tx.orderPlaceholder}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{tx.notes}</p>
            {editing ? (
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder={tx.notesPlaceholder} rows={3}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', color: '#1e293b', resize: 'none', boxSizing: 'border-box' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#f8fafc', borderRadius: 10, padding: '10px 12px', minHeight: 44 }}>
                <FileText className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <span style={{ fontSize: 13, color: notes ? '#334155' : '#94a3b8', fontStyle: notes ? 'normal' : 'italic', whiteSpace: 'pre-wrap' }}>
                  {notes || tx.notesPlaceholder}
                </span>
              </div>
            )}
          </div>

          {/* Receipt link */}
          {expense.receipt_url && (
            <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-blue-500 hover:text-blue-600 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />{tx.receiptLink}
            </a>
          )}

        </div>
      </TrinityModalShell>
    </Modal>
  )
}

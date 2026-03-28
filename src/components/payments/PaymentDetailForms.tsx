'use client'

/**
 * PaymentDetailForms — формы для методов "Чек" и "Банковский перевод".
 *
 * CheckForm:
 *   - Массив чеков (до 5). Каждый: фото лицевой + оборотной стороны,
 *     номер чека, банк, филиал, счёт, дата погашения, сумма.
 *   - Валидация: сумма всех чеков === totalAmount.
 *
 * BankTransferForm:
 *   - Фото/скрин квитанции, номер транзакции (Reference), дата перевода.
 *
 * Оба компонента хранят данные в JSONB-совместимой структуре,
 * которая передаётся в POST /api/payments как поле payment_details.
 */

import { useState, useCallback } from 'react'
import { Plus, X, Upload, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { usePaymentReceiptUpload } from '@/hooks/usePaymentReceiptUpload'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CheckItem {
  id: string            // client-only uid
  check_number: string
  bank: string
  branch: string
  account: string
  due_date: string      // YYYY-MM-DD
  amount: string        // строка для input, парсим при сабмите
  front_url: string     // Supabase signed URL
  back_url: string
  front_uploading: boolean
  back_uploading: boolean
}

export interface CheckPaymentDetails {
  checks: Omit<CheckItem, 'id' | 'front_uploading' | 'back_uploading'>[]
}

export interface BankTransferDetails {
  reference: string
  transfer_date: string // YYYY-MM-DD
  receipt_url: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 8) }

const today = () => new Date().toISOString().slice(0, 10)

function emptyCheck(): CheckItem {
  return {
    id: uid(),
    check_number: '', bank: '', branch: '', account: '',
    due_date: today(), amount: '',
    front_url: '', back_url: '',
    front_uploading: false, back_uploading: false,
  }
}

// ─── Shared ImageUploadSlot ─────────────────────────────────────────────────────

interface ImageSlotProps {
  url: string
  uploading: boolean
  label: string
  onFile: (file: File) => void
  onClear: () => void
  disabled?: boolean
  accent?: string
}

function ImageSlot({ url, uploading, label, onFile, onClear, disabled, accent = '#6366f1' }: ImageSlotProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { onFile(f); e.target.value = '' }
  }

  if (url) return (
    <div style={{ position: 'relative', width: '100%', height: 80, borderRadius: 10, overflow: 'hidden', border: '2px solid #bbf7d0', background: '#f0fdf4' }}>
      <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {!disabled && (
        <button type="button" onClick={onClear}
          style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={11}/>
        </button>
      )}
      <div style={{ position: 'absolute', bottom: 4, left: 6, fontSize: 10, color: '#15803d', fontWeight: 600, background: 'rgba(240,253,244,0.8)', borderRadius: 4, padding: '1px 4px' }}>
        <CheckCircle2 size={9} style={{ display: 'inline', marginRight: 2 }}/>{label}
      </div>
    </div>
  )

  return (
    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: 80, borderRadius: 10, border: `2px dashed ${accent}40`, background: `${accent}08`, cursor: disabled || uploading ? 'not-allowed' : 'pointer', gap: 4 }}>
      {uploading
        ? <Loader2 size={20} className="animate-spin" style={{ color: accent }}/>
        : <Upload size={18} style={{ color: accent, opacity: 0.7 }}/>}
      <span style={{ fontSize: 11, color: accent, fontWeight: 600, opacity: 0.8 }}>{uploading ? 'Загрузка...' : label}</span>
      <input type="file" accept="image/*" className="sr-only" onChange={handleChange} disabled={disabled || uploading}/>
    </label>
  )
}

// ─── CheckForm ──────────────────────────────────────────────────────────────────

const CFG_CHECK = {
  gradient: 'linear-gradient(135deg,#f59e0b,#d97706)',
  color: '#b45309', border: '#fde68a', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)',
  accent: '#f59e0b',
}

interface CheckFormProps {
  totalAmount: number
  disabled?: boolean
  onChange: (data: CheckPaymentDetails, valid: boolean) => void
  locale: 'he' | 'ru'
}

export function CheckForm({ totalAmount, disabled, onChange, locale }: CheckFormProps) {
  const isHe = locale === 'he'
  const [checks, setChecks] = useState<CheckItem[]>([emptyCheck()])
  const { uploadFile } = usePaymentReceiptUpload()

  const sumChecks = checks.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
  const sumValid = Math.abs(sumChecks - totalAmount) < 0.01

  const notify = useCallback((updated: CheckItem[]) => {
    const payload: CheckPaymentDetails = {
      checks: updated.map(c => ({
        check_number: c.check_number, bank: c.bank, branch: c.branch,
        account: c.account, due_date: c.due_date, amount: c.amount,
        front_url: c.front_url, back_url: c.back_url,
      }))
    }
    const valid = updated.every(c => c.check_number && c.due_date && parseFloat(c.amount) > 0) &&
      Math.abs(updated.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0) - totalAmount) < 0.01
    onChange(payload, valid)
  }, [totalAmount, onChange])

  const update = useCallback((id: string, patch: Partial<CheckItem>) => {
    setChecks(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...patch } : c)
      notify(next)
      return next
    })
  }, [notify])

  const addCheck = () => {
    if (checks.length >= 5) return
    const next = [...checks, emptyCheck()]
    setChecks(next); notify(next)
  }

  const removeCheck = (id: string) => {
    const next = checks.filter(c => c.id !== id)
    setChecks(next); notify(next)
  }

  const handleUpload = async (id: string, side: 'front' | 'back', file: File) => {
    update(id, side === 'front' ? { front_uploading: true } : { back_uploading: true })
    const result = await uploadFile(file, { slot: `check_${id}_${side}` })
    if (result) {
      update(id, side === 'front'
        ? { front_url: result.url, front_uploading: false }
        : { back_url: result.url, back_uploading: false })
    } else {
      update(id, side === 'front' ? { front_uploading: false } : { back_uploading: false })
    }
  }

  const L = {
    he: { addCheck: '+ הוסף צ\'ק', checkN: "צ'ק", checkNum: "מס' צ'ק", bank: 'בנק', branch: 'סניף', account: 'חשבון', dueDate: 'תאריך פירעון', amount: 'סכום', front: 'פנים', back: 'גב', total: 'סה"כ צ\'קים', expected: 'סכום צפוי', diff: 'הפרש' },
    ru: { addCheck: '+ Добавить чек', checkN: 'Чек', checkNum: 'Номер чека', bank: 'Банк', branch: 'Филиал', account: 'Счёт', dueDate: 'Дата погашения', amount: 'Сумма', front: 'Лицевая', back: 'Оборотная', total: 'Сумма чеков', expected: 'Ожидается', diff: 'Разница' },
  }
  const t = L[isHe ? 'he' : 'ru']

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', borderRadius: 8, border: '1.5px solid #fde68a',
    background: '#fffbeb', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {checks.map((c, idx) => (
        <div key={c.id} style={{ background: CFG_CHECK.bg, border: `1.5px solid ${CFG_CHECK.border}`, borderRadius: 14, padding: '14px 14px 12px', position: 'relative' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: CFG_CHECK.color }}>{t.checkN} #{idx + 1}</span>
            {checks.length > 1 && (
              <button type="button" onClick={() => removeCheck(c.id)} disabled={disabled}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}>
                <X size={14}/>
              </button>
            )}
          </div>

          {/* Photos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <ImageSlot url={c.front_url} uploading={c.front_uploading} label={t.front}
              accent={CFG_CHECK.accent} disabled={disabled}
              onFile={f => handleUpload(c.id, 'front', f)}
              onClear={() => update(c.id, { front_url: '' })} />
            <ImageSlot url={c.back_url} uploading={c.back_uploading} label={t.back}
              accent={CFG_CHECK.accent} disabled={disabled}
              onFile={f => handleUpload(c.id, 'back', f)}
              onClear={() => update(c.id, { back_url: '' })} />
          </div>

          {/* Fields grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { key: 'check_number', label: t.checkNum, type: 'text' },
              { key: 'bank', label: t.bank, type: 'text' },
              { key: 'branch', label: t.branch, type: 'text' },
              { key: 'account', label: t.account, type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 10, fontWeight: 600, color: CFG_CHECK.color, display: 'block', marginBottom: 3 }}>{f.label}</label>
                <input type={f.type} value={(c as any)[f.key]} disabled={disabled}
                  onChange={e => update(c.id, { [f.key]: e.target.value } as any)}
                  style={fieldStyle} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: CFG_CHECK.color, display: 'block', marginBottom: 3 }}>{t.dueDate}</label>
              <input type="date" value={c.due_date} disabled={disabled}
                onChange={e => update(c.id, { due_date: e.target.value })}
                style={fieldStyle} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: CFG_CHECK.color, display: 'block', marginBottom: 3 }}>{t.amount} ₪</label>
              <input type="number" min="0" step="0.01" value={c.amount} disabled={disabled}
                onChange={e => update(c.id, { amount: e.target.value })}
                style={{ ...fieldStyle, borderColor: parseFloat(c.amount) > 0 ? '#fde68a' : '#fca5a5' }} />
            </div>
          </div>
        </div>
      ))}

      {/* Add check button */}
      {checks.length < 5 && (
        <button type="button" onClick={addCheck} disabled={disabled}
          style={{ padding: '9px 14px', borderRadius: 10, border: `2px dashed ${CFG_CHECK.accent}`, background: 'transparent', color: CFG_CHECK.color, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Plus size={14}/>{t.addCheck}
        </button>
      )}

      {/* Sum validation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: sumValid ? '#f0fdf4' : '#fef2f2', border: `1px solid ${sumValid ? '#bbf7d0' : '#fecaca'}` }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: sumValid ? '#15803d' : '#dc2626' }}>
          {sumValid ? <CheckCircle2 size={13} style={{ display: 'inline', marginRight: 4 }}/> : <AlertCircle size={13} style={{ display: 'inline', marginRight: 4 }}/>}
          {t.total}: ₪{sumChecks.toFixed(2)} / {t.expected}: ₪{totalAmount.toFixed(2)}
        </span>
      </div>
    </div>
  )
}

// ─── BankTransferForm ────────────────────────────────────────────────────────────

const CFG_BANK = {
  gradient: 'linear-gradient(135deg,#0ea5e9,#0284c7)',
  color: '#0369a1', border: '#bae6fd', bg: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)',
  accent: '#0ea5e9',
}

interface BankTransferFormProps {
  disabled?: boolean
  onChange: (data: BankTransferDetails, valid: boolean) => void
  locale: 'he' | 'ru'
}

export function BankTransferForm({ disabled, onChange, locale }: BankTransferFormProps) {
  const isHe = locale === 'he'
  const { uploadFile, uploading } = usePaymentReceiptUpload()

  const [reference, setReference] = useState('')
  const [transferDate, setTransferDate] = useState(today())
  const [receiptUrl, setReceiptUrl] = useState('')
  const [receiptUploading, setReceiptUploading] = useState(false)

  const notify = useCallback((ref: string, date: string, url: string) => {
    const data: BankTransferDetails = { reference: ref, transfer_date: date, receipt_url: url }
    const valid = ref.length > 0 && date.length > 0
    onChange(data, valid)
  }, [onChange])

  const handleRef = (v: string) => { setReference(v); notify(v, transferDate, receiptUrl) }
  const handleDate = (v: string) => { setTransferDate(v); notify(reference, v, receiptUrl) }

  const handleUpload = async (file: File) => {
    setReceiptUploading(true)
    const result = await uploadFile(file, { slot: 'bank_receipt' })
    if (result) {
      setReceiptUrl(result.url)
      notify(reference, transferDate, result.url)
    }
    setReceiptUploading(false)
  }

  const L = {
    he: { reference: 'מספר עסקה (Reference)', transferDate: 'תאריך העברה', receipt: 'צילום אסמכתא' },
    ru: { reference: 'Номер транзакции (Reference)', transferDate: 'Дата перевода', receipt: 'Скриншот/фото квитанции' },
  }
  const t = L[isHe ? 'he' : 'ru']

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${CFG_BANK.border}`,
    background: '#f0f9ff', fontSize: 13, outline: 'none', boxSizing: 'border-box',
    color: '#0c4a6e',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: CFG_BANK.bg, border: `1.5px solid ${CFG_BANK.border}`, borderRadius: 14, padding: '14px 14px 12px' }}>
        {/* Receipt upload */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: CFG_BANK.color, display: 'block', marginBottom: 6 }}>
            {t.receipt}
          </label>
          <ImageSlot
            url={receiptUrl}
            uploading={receiptUploading}
            label={t.receipt}
            accent={CFG_BANK.accent}
            disabled={disabled}
            onFile={handleUpload}
            onClear={() => { setReceiptUrl(''); notify(reference, transferDate, '') }}
          />
        </div>

        {/* Reference */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: CFG_BANK.color, display: 'block', marginBottom: 4 }}>
            {t.reference} *
          </label>
          <input
            type="text"
            value={reference}
            onChange={e => handleRef(e.target.value)}
            disabled={disabled}
            placeholder={isHe ? 'מספר אסמכתא...' : 'REF-123456...'}
            style={{ ...fieldStyle, borderColor: reference ? CFG_BANK.border : '#fca5a5' }}
          />
        </div>

        {/* Transfer date */}
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: CFG_BANK.color, display: 'block', marginBottom: 4 }}>
            {t.transferDate} *
          </label>
          <input
            type="date"
            value={transferDate}
            onChange={e => handleDate(e.target.value)}
            disabled={disabled}
            style={fieldStyle}
          />
        </div>
      </div>
    </div>
  )
}

// ─── CashForm ────────────────────────────────────────────────────────────────────

/** Израильский лимит наличных расчётов бизнес→клиент (Закон 5776-2016) */
export const IL_CASH_LIMIT = 6000

export interface CashFormData {
  notes: string
  amount_received: number | null  // Получено на руки
  change_amount: number           // Сдача (вычисляется)
}

interface CashFormProps {
  totalAmount: number       // итоговая сумма к оплате
  disabled?: boolean
  onChange: (data: CashFormData, valid: boolean) => void
  locale: 'he' | 'ru'
}

const CFG_CASH = {
  gradient: 'linear-gradient(135deg,#22c55e,#16a34a)',
  color: '#15803d', border: '#bbf7d0', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
  accent: '#22c55e',
}

const CFG_WARN = {
  bg: '#fef2f2', border: '#fecaca', color: '#dc2626', iconColor: '#ef4444',
}

export function CashForm({ totalAmount, disabled, onChange, locale }: CashFormProps) {
  const isHe = locale === 'he'
  const [notes, setNotes] = useState('')
  const [receivedRaw, setReceivedRaw] = useState('')

  const received = parseFloat(receivedRaw) || 0
  const change = received > 0 ? Math.max(0, received - totalAmount) : 0
  const exceedsLimit = totalAmount > IL_CASH_LIMIT
  const receivedInsufficient = received > 0 && received < totalAmount

  const notify = useCallback((n: string, rec: string) => {
    const r = parseFloat(rec) || 0
    const c = r > 0 ? Math.max(0, r - totalAmount) : 0
    const data: CashFormData = { notes: n, amount_received: r > 0 ? r : null, change_amount: c }
    // Валидно если: не превышает лимит и либо received пустой, либо достаточен
    const valid = !exceedsLimit && (rec === '' || r >= totalAmount)
    onChange(data, valid)
  }, [totalAmount, exceedsLimit, onChange])

  const handleNotes = (v: string) => { setNotes(v); notify(v, receivedRaw) }
  const handleReceived = (v: string) => { setReceivedRaw(v); notify(notes, v) }

  const L = {
    he: {
      limitWarning: `חריגה ממגבלת מזומן חוקית! לפי חוק הגבלת מזומן (2016), מקסימום ₪6,000 לעסקה.`,
      limitLink: 'קרא עוד על החוק',
      received: 'התקבל במזומן (₪)',
      change: 'עודף',
      receivedHint: 'הזן הסכום שנמסר בפועל',
      insufficientWarning: 'הסכום שהתקבל נמוך מסכום התשלום',
      notes: 'הערות',
      notesPlaceholder: 'הערות לתשלום...',
    },
    ru: {
      limitWarning: `Превышен законный лимит наличных! По закону Израиля об ограничении наличных (2016), максимум ₪6,000 за сделку.`,
      limitLink: 'Подробнее о законе',
      received: 'Получено наличными (₪)',
      change: 'Сдача',
      receivedHint: 'Введите фактически полученную сумму',
      insufficientWarning: 'Полученная сумма меньше суммы платежа',
      notes: 'Заметки',
      notesPlaceholder: 'Примечания к платежу...',
    },
  }
  const t = L[isHe ? 'he' : 'ru']

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 10,
    border: `1.5px solid ${CFG_CASH.border}`, background: '#f0fdf4',
    fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#0c4a00',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Лимит 6000 ₪ — строгое предупреждение ── */}
      {exceedsLimit && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: CFG_WARN.bg, border: `2px solid ${CFG_WARN.border}`, borderRadius: 12 }}>
          <AlertCircle size={18} style={{ color: CFG_WARN.iconColor, flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: CFG_WARN.color, margin: '0 0 4px' }}>
              {t.limitWarning}
            </p>
            <a
              href="https://www.gov.il/he/Departments/DynamicCollectors/laws-regulations?subject=%D7%97%D7%95%D7%A7+%D7%94%D7%92%D7%91%D7%9C%D7%AA+%D7%9E%D7%96%D7%95%D7%9E%D7%9F"
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: CFG_WARN.color, textDecoration: 'underline', fontWeight: 600 }}>
              {t.limitLink} →
            </a>
          </div>
        </div>
      )}

      <div style={{ background: CFG_CASH.bg, border: `1.5px solid ${CFG_CASH.border}`, borderRadius: 14, padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Калькулятор сдачи ── */}
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: CFG_CASH.color, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t.received}
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, fontWeight: 700, color: CFG_CASH.color, pointerEvents: 'none' }}>₪</span>
            <input
              type="number" min="0" step="0.01"
              value={receivedRaw}
              onChange={e => handleReceived(e.target.value)}
              placeholder={totalAmount.toFixed(2)}
              disabled={disabled}
              style={{ ...fieldStyle, paddingInlineStart: 32, fontSize: 18, fontWeight: 700, height: 48, borderColor: receivedInsufficient ? '#fca5a5' : CFG_CASH.border }}
            />
          </div>
          {receivedRaw && (
            <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0 2px' }}>{t.receivedHint}</p>
          )}
          {receivedInsufficient && (
            <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, margin: '4px 0 0 2px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertCircle size={12}/>{t.insufficientWarning}
            </p>
          )}
        </div>

        {/* ── Сдача — крупно и жирно ── */}
        {received >= totalAmount && received > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderRadius: 12, border: '2px solid #bbf7d0', boxShadow: '0 2px 8px rgba(34,197,94,0.12)' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#15803d' }}>{t.change}</span>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#16a34a', letterSpacing: '-1px' }}>
              ₪{change.toFixed(2)}
            </span>
          </div>
        )}

        {/* ── Заметки ── */}
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: CFG_CASH.color, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t.notes}
          </label>
          <textarea
            value={notes}
            onChange={e => handleNotes(e.target.value)}
            placeholder={t.notesPlaceholder}
            rows={2}
            disabled={disabled}
            style={{ ...fieldStyle, resize: 'none' }}
          />
        </div>
      </div>
    </div>
  )
}

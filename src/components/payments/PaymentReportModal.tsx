'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { useOrganization } from '@/hooks/useOrganization'
import { useGeneratePDF } from '@/lib/pdf/use-generate-pdf'
import { buildPaymentReportHTML, type PaymentReportData } from '@/lib/pdf/payment-report-html'
import { toast } from 'sonner'
import { FileText, Loader2, Calendar, CheckCircle2 } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  locale?: 'he' | 'ru'
}

const PAYMENT_METHODS = [
  { value: 'cash',          labelHe: 'מזומן',   labelRu: 'Наличные', icon: '💵', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)'  },
  { value: 'bit',           labelHe: 'ביט',     labelRu: 'BIT',      icon: '📱', color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
  { value: 'credit_card',   labelHe: 'כרטיס',   labelRu: 'Карта',    icon: '💳', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
  { value: 'bank_transfer', labelHe: 'העברה',   labelRu: 'Перевод',  icon: '🏦', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.3)' },
]

const METHOD_LABEL_HE: Record<string, string> = {
  cash: 'מזומן', bit: 'ביט', credit_card: 'כרטיס', bank_transfer: 'העברה',
}

export function PaymentReportModal({ open, onClose, locale = 'he' }: Props) {
  const { data: org } = useOrganization()
  const { downloadRaw, loading: pdfLoading } = useGeneratePDF()
  const isHe = locale === 'he'

  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [fromDate, setFromDate] = useState(firstOfMonth)
  const [toDate, setToDate] = useState(today)
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['cash', 'bit', 'credit_card', 'bank_transfer'])
  const [loading, setLoading] = useState(false)

  const toggleMethod = (value: string) =>
    setSelectedMethods(prev => prev.includes(value) ? prev.filter(m => m !== value) : [...prev, value])

  const handleGenerate = async () => {
    if (!fromDate || !toDate) { toast.error(isHe ? 'בחר תאריכים' : 'Выберите даты'); return }
    if (selectedMethods.length === 0) { toast.error(isHe ? 'בחר לפחות אמצעי אחד' : 'Выберите хотя бы один способ'); return }
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: 'completed', startDate: fromDate, endDate: toDate, limit: '500' })
      const res = await fetch(`/api/payments?${params}`)
      if (!res.ok) throw new Error('Failed to fetch payments')
      const raw = await res.json()
      const all: any[] = Array.isArray(raw) ? raw : (raw.payments || raw.data || [])
      const filtered = all.filter(p => selectedMethods.includes(p.payment_method))
      if (filtered.length === 0) { toast.error(isHe ? 'לא נמצאו תשלומים' : 'Платежи не найдены'); setLoading(false); return }

      const items = filtered.map(p => ({
        date: new Date(p.paid_at || p.created_at).toLocaleDateString('he-IL').replace(/\./g, '/'),
        clientName: p.clients ? `${p.clients.first_name || ''} ${p.clients.last_name || ''}`.trim() : (p.client_name || (isHe ? 'לא ידוע' : 'Неизвестно')),
        method: METHOD_LABEL_HE[p.payment_method] || p.payment_method,
        amount: Number(p.amount),
        description: p.description || '',
      }))

      const docNumber = `${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
      const issueDate = new Date().toLocaleDateString('he-IL').replace(/\./g, '/')
      const fmtDate = (d: string) => new Date(d).toLocaleDateString('he-IL').replace(/\./g, '/')

      const reportData: PaymentReportData = {
        orgName: org?.name || 'Trinity CRM', orgEmail: org?.email || '',
        orgPhone: org?.phone || '', orgAddress: (org as any)?.address || '',
        fromDate: fmtDate(fromDate), toDate: fmtDate(toDate),
        methods: selectedMethods.map(m => METHOD_LABEL_HE[m] || m),
        payments: items, docNumber, issueDate,
      }

      let logoDataUri = ''
      const logoUrl = (org as any)?.logo_url || '/logo-amber.png'
      if (logoUrl) {
        try {
          const lres = await fetch(logoUrl.startsWith('/') ? window.location.origin + logoUrl : logoUrl)
          const blob = await lres.blob()
          logoDataUri = await new Promise<string>((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.readAsDataURL(blob) })
        } catch { /* optional */ }
      }
      reportData.logoDataUri = logoDataUri

      const html = buildPaymentReportHTML(reportData)
      const contacts = [org?.email, (org as any)?.phone].filter(Boolean).join(' · ')
      await downloadRaw(html, `payment-report-${docNumber}.pdf`, { orgName: reportData.orgName, contacts, docNumber, label: 'סיכום תשלומים' })
      toast.success(isHe ? 'הדוח הורד בהצלחה ✓' : 'Отчёт скачан ✓')
      onClose()
    } catch (err: any) {
      console.error('[PaymentReport]', err)
      toast.error(err.message || (isHe ? 'שגיאה ביצירת הדוח' : 'Ошибка создания отчёта'))
    } finally { setLoading(false) }
  }

  const isLoading = loading || pdfLoading

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Icon */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div style={{ width: 54, height: 54, borderRadius: 16, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(245,158,11,0.4)' }}>
          <FileText size={24} color="#fff" />
        </div>
      </div>
      {/* Period */}
      {fromDate && toDate && (
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 8px', textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 3 }}>
            {isHe ? 'תקופה' : 'Период'}
          </div>
          <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>
            {new Date(fromDate).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', { day: 'numeric', month: 'short' })}
            {' — '}
            {new Date(toDate).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      )}
      {/* Selected methods count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 12 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          {selectedMethods.length} {isHe ? 'אמצעי תשלום' : 'способов оплаты'}
        </span>
      </div>
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '0 0 10px' }} />
      {/* Generate button */}
      <button onClick={handleGenerate} disabled={isLoading || selectedMethods.length === 0}
        style={{ padding: '11px 14px', borderRadius: 10, border: 'none', cursor: (isLoading || selectedMethods.length === 0) ? 'not-allowed' : 'pointer', width: '100%', background: (isLoading || selectedMethods.length === 0) ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #f59e0b, #d97706)', color: selectedMethods.length > 0 ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' }}>
        {isLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={14} />}
        {isLoading ? (isHe ? 'מייצר...' : 'Создаём...') : (isHe ? 'הפק PDF' : 'Создать PDF')}
      </button>
      <button onClick={onClose}
        style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
        {isHe ? 'ביטול' : 'Отмена'}
      </button>
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} darkHeader width="700px" contentClassName="!p-0" showCloseButton={false}>
      <TrinityModalShell open={open} onClose={onClose} icon={<FileText />}
        title={isHe ? 'סיכום תשלומים' : 'Сводка платежей'}
        subtitle={isHe ? 'הפק דוח תשלומים לפי תאריך ואמצעי תשלום' : 'Создать отчёт по платежам за период'}
        sidebarExtra={sidebar}>
        <div style={{ padding: '20px 18px 24px' }} className="space-y-5">

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: isHe ? 'מתאריך' : 'С даты', value: fromDate, setter: setFromDate },
              { label: isHe ? 'עד תאריך' : 'По дату', value: toDate, setter: setToDate },
            ].map((field, i) => (
              <div key={i} style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a', borderRadius: 14, padding: '12px 14px' }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                  <Calendar size={11} color="#d97706" />{field.label}
                </label>
                <input type="date" value={field.value} onChange={e => field.setter(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #fde68a', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#78350f', background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>

          {/* Payment methods */}
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              {isHe ? 'אמצעי תשלום' : 'Способы оплаты'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(m => {
                const active = selectedMethods.includes(m.value)
                return (
                  <button key={m.value} onClick={() => toggleMethod(m.value)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${active ? m.border : '#e8edf4'}`, background: active ? m.bg : '#f8fafc', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}>
                    <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{m.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: active ? m.color : '#64748b', flex: 1 }}>
                      {isHe ? m.labelHe : m.labelRu}
                    </span>
                    {active && <CheckCircle2 size={14} color={m.color} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Info note */}
          <div style={{ background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', border: '1px solid #bae6fd', borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>ℹ️</span>
            <p style={{ fontSize: 11, color: '#0369a1', margin: 0, lineHeight: 1.5 }}>
              {isHe ? 'הדוח יכלול תשלומים שהושלמו בלבד. הקובץ יישמר למשך יום אחד.' : 'В отчёт включаются только завершённые платежи. Файл сохраняется 1 день.'}
            </p>
          </div>

        </div>
      </TrinityModalShell>
    </Modal>
  )
}

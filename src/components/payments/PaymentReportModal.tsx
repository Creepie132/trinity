'use client'

import { useState, useEffect, useMemo } from 'react'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { useOrganization } from '@/hooks/useOrganization'
import { useGeneratePDF } from '@/lib/pdf/use-generate-pdf'
import { buildPaymentReportHTML, type PaymentReportData } from '@/lib/pdf/payment-report-html'
import { normalizePaymentMethod } from '@/lib/payment-method-normalizer'
import { usePaymentMethodConfig } from '@/hooks/usePaymentMethodConfig'
import { toast } from 'sonner'
import { FileText, Loader2, Calendar, CheckCircle2, TrendingUp } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  locale?: 'he' | 'ru'
  initialFrom?: string
  initialTo?: string
}

export function PaymentReportModal({ open, onClose, locale = 'he', initialFrom, initialTo }: Props) {
  const { data: org } = useOrganization()
  const { downloadRaw, loading: pdfLoading } = useGeneratePDF()
  const { enabledMethods, isLoading: methodsLoading } = usePaymentMethodConfig()
  const isHe = locale === 'he'

  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [fromDate, setFromDate] = useState(initialFrom || firstOfMonth)
  const [toDate, setToDate] = useState(initialTo || today)
  const [totalSum, setTotalSum] = useState<number | null>(null)
  const [sumLoading, setSumLoading] = useState(false)

  // Обновляем даты если родитель передал новые
  useEffect(() => {
    if (initialFrom !== undefined) setFromDate(initialFrom || firstOfMonth)
    if (initialTo   !== undefined) setToDate(initialTo   || today)
  }, [initialFrom, initialTo])

  // Ключи включённых методов из настроек
  const enabledKeys = useMemo(() => enabledMethods.map(m => m.key), [enabledMethods])

  // Лейбл для PDF — строим из enabledMethods
  const methodLabelHe = useMemo(() => {
    const map: Record<string, string> = {}
    enabledMethods.forEach(m => { map[m.key] = m.label.he })
    return map
  }, [enabledMethods])

  // selectedMethods — по умолчанию все включённые в настройках
  const [selectedMethods, setSelectedMethods] = useState<string[]>([])
  // При изменении enabledKeys (после загрузки) — синхронизируем выбор
  useEffect(() => {
    if (enabledKeys.length > 0) {
      setSelectedMethods(prev => {
        if (prev.length === 0) return enabledKeys
        // Оставляем только те, что ещё включены в настройках
        return prev.filter(k => enabledKeys.includes(k as any))
      })
    }
  }, [enabledKeys.join(',')])

  const [loading, setLoading] = useState(false)

  // Считаем сумму при изменении дат или методов
  useEffect(() => {
    if (!open) return
    const load = async () => {
      setSumLoading(true)
      try {
        const params = new URLSearchParams({ status: 'completed', limit: '500' })
        if (fromDate) params.set('startDate', fromDate)
        if (toDate)   params.set('endDate', toDate)
        const res = await fetch(`/api/payments?${params}`)
        if (!res.ok) return
        const raw = await res.json()
        const all: any[] = Array.isArray(raw) ? raw : (raw.payments || raw.data || [])
        const filtered = all.filter(p => selectedMethods.includes(normalizePaymentMethod(p.payment_method)))
        setTotalSum(filtered.reduce((s: number, p: any) => s + Number(p.amount || 0), 0))
      } catch { setTotalSum(null) } finally { setSumLoading(false) }
    }
    load()
  }, [open, fromDate, toDate, selectedMethods])

  const toggleMethod = (value: string) =>
    setSelectedMethods(prev => prev.includes(value) ? prev.filter(m => m !== value) : [...prev, value])

  const handleGenerate = async () => {
    if (!fromDate || !toDate) { toast.error(isHe ? 'בחר תאריכים' : 'Выберите даты'); return }
    if (selectedMethods.length === 0) { toast.error(isHe ? 'בחר לפחות אמצעי אחד' : 'Выберите хотя бы один способ'); return }
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: 'completed', limit: '500' })
      if (fromDate) params.set('startDate', fromDate)
      if (toDate)   params.set('endDate',   toDate)
      const res = await fetch(`/api/payments?${params}`)
      if (!res.ok) throw new Error('Failed to fetch payments')
      const raw = await res.json()
      const all: any[] = Array.isArray(raw) ? raw : (raw.payments || raw.data || [])
      const filtered = all.filter(p => selectedMethods.includes(normalizePaymentMethod(p.payment_method)))
      if (filtered.length === 0) { toast.error(isHe ? 'לא נמצאו תשלומים' : 'Платежи не найдены'); setLoading(false); return }

      const items = filtered.map(p => ({
        date: new Date(p.paid_at || p.created_at).toLocaleDateString('he-IL').replace(/\./g, '/'),
        clientName: p.clients ? `${p.clients.first_name || ''} ${p.clients.last_name || ''}`.trim() : (p.client_name || (isHe ? 'לא ידוע' : 'Неизвестно')),
        method: methodLabelHe[normalizePaymentMethod(p.payment_method)] || p.payment_method,
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
        methods: selectedMethods.map(m => methodLabelHe[m] || m),
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
      await downloadRaw(html, `payment-report-${docNumber}.pdf`, { orgName: reportData.orgName, contacts, docNumber, label: 'סיכום תשלומים' }, true)
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

          {/* ── Красивая сумма ── */}
          <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(199,210,254,.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                {isHe ? 'סה״כ לתקופה' : 'Итого за период'}
              </div>
              {sumLoading ? (
                <div style={{ height: 36, width: 120, borderRadius: 8, background: 'rgba(255,255,255,.1)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ) : (
                <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>
                  {totalSum !== null ? `₪${totalSum.toLocaleString()}` : '—'}
                </div>
              )}
              {(fromDate || toDate) && (
                <div style={{ fontSize: 10, color: 'rgba(199,210,254,.45)', marginTop: 6 }}>
                  {fromDate && toDate ? `${fromDate} → ${toDate}` : fromDate ? `с ${fromDate}` : `до ${toDate}`}
                </div>
              )}
            </div>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(99,102,241,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={22} color="#a5b4fc" />
            </div>
          </div>

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

          {/* Payment methods — только включённые в настройках */}
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              {isHe ? 'אמצעי תשלום' : 'Способы оплаты'}
            </p>
            {methodsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', color: '#94a3b8', fontSize: 13 }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginInlineEnd: 8 }} />
                {isHe ? 'טוען...' : 'Загрузка...'}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {enabledMethods.map(m => {
                  const active = selectedMethods.includes(m.key)
                  return (
                    <button key={m.key} onClick={() => toggleMethod(m.key)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${active ? m.border : '#e8edf4'}`, background: active ? m.bg : '#f8fafc', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}>
                      <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{m.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: active ? m.color : '#64748b', flex: 1 }}>
                        {isHe ? m.label.he : m.label.ru}
                      </span>
                      {active && <CheckCircle2 size={14} color={m.color} />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Info note */}
          <div style={{ background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', border: '1px solid #bae6fd', borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>ℹ️</span>
            <p style={{ fontSize: 11, color: '#0369a1', margin: 0, lineHeight: 1.5 }}>
              {isHe ? 'הדוח יכלול תשלומים שהושלמו בלבד. הקובץ יישמר למשך יום אחד.' : 'В отчёт включаются только завершённые платежи. Файл сохраняется 1 день.'}
            </p>
          </div>

          {/* ── Mobile-only: period badge + PDF button (видны только на мобиле) ── */}
          <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Period indicator */}
            {fromDate && toDate && (
              <div style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#92400e' }}>{isHe ? 'תקופה' : 'Период'}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#d97706' }}>
                  {new Date(fromDate).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', { day: 'numeric', month: 'short' })}
                  {' — '}
                  {new Date(toDate).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}
            {/* PDF button */}
            <button onClick={handleGenerate} disabled={isLoading || selectedMethods.length === 0}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: (isLoading || selectedMethods.length === 0) ? 'not-allowed' : 'pointer', background: (isLoading || selectedMethods.length === 0) ? '#e2e8f0' : 'linear-gradient(135deg, #f59e0b, #d97706)', color: selectedMethods.length > 0 ? '#fff' : '#94a3b8', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={16} />}
              {isLoading ? (isHe ? 'מייצר...' : 'Создаём...') : (isHe ? 'הפק PDF' : 'Создать PDF')}
            </button>
          </div>

        </div>
      </TrinityModalShell>
    </Modal>
  )
}

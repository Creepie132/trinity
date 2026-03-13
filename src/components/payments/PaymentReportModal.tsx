'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { useOrganization } from '@/hooks/useOrganization'
import { useGeneratePDF } from '@/lib/pdf/use-generate-pdf'
import { buildPaymentReportHTML, type PaymentReportData } from '@/lib/pdf/payment-report-html'
import { toast } from 'sonner'
import { FileText, Loader2 } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  locale?: 'he' | 'ru'
}

const PAYMENT_METHODS = [
  { value: 'cash',          labelHe: 'מזומן',   labelRu: 'Наличные', icon: '💵' },
  { value: 'bit',           labelHe: 'ביט',     labelRu: 'Bit',      icon: '📱' },
  { value: 'credit_card',   labelHe: 'כרטיס',   labelRu: 'Карта',    icon: '💳' },
  { value: 'bank_transfer', labelHe: 'העברה',   labelRu: 'Перевод',  icon: '🏦' },
]

const METHOD_LABEL_HE: Record<string, string> = {
  cash: 'מזומן', bit: 'ביט', credit_card: 'כרטיס', bank_transfer: 'העברה',
}

export function PaymentReportModal({ open, onClose, locale = 'he' }: Props) {
  const { data: org } = useOrganization()
  const { downloadRaw, loading: pdfLoading } = useGeneratePDF()

  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0]

  const [fromDate, setFromDate] = useState(firstOfMonth)
  const [toDate, setToDate] = useState(today)
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['cash', 'bit', 'credit_card', 'bank_transfer'])
  const [loading, setLoading] = useState(false)

  const toggleMethod = (value: string) => {
    setSelectedMethods(prev =>
      prev.includes(value) ? prev.filter(m => m !== value) : [...prev, value]
    )
  }

  const handleGenerate = async () => {
    if (!fromDate || !toDate) {
      toast.error(locale === 'he' ? 'בחר תאריכים' : 'Выберите даты')
      return
    }
    if (selectedMethods.length === 0) {
      toast.error(locale === 'he' ? 'בחר לפחות אמצעי תשלום אחד' : 'Выберите хотя бы один способ оплаты')
      return
    }
    setLoading(true)
    try {
      // Fetch payments from API
      const params = new URLSearchParams({
        status: 'completed',
        startDate: fromDate,
        endDate: toDate,
        limit: '500',
      })
      const res = await fetch(`/api/payments?${params}`)
      if (!res.ok) throw new Error('Failed to fetch payments')
      const raw = await res.json()
      const all: any[] = Array.isArray(raw) ? raw : (raw.payments || raw.data || [])

      // Filter by selected methods
      const filtered = all.filter(p => selectedMethods.includes(p.payment_method))

      if (filtered.length === 0) {
        toast.error(locale === 'he' ? 'לא נמצאו תשלומים בטווח זה' : 'Платежи не найдены за этот период')
        setLoading(false)
        return
      }

      // Format items
      const items = filtered.map(p => ({
        date: new Date(p.paid_at || p.created_at).toLocaleDateString('he-IL').replace(/\./g, '/'),
        clientName: p.clients
          ? `${p.clients.first_name || ''} ${p.clients.last_name || ''}`.trim()
          : (p.client_name || (locale === 'he' ? 'לא ידוע' : 'Неизвестно')),
        method: METHOD_LABEL_HE[p.payment_method] || p.payment_method,
        amount: Number(p.amount),
        description: p.description || '',
      }))

      const docNumber = `${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
      const issueDate = new Date().toLocaleDateString('he-IL').replace(/\./g, '/')

      const fmtDate = (d: string) => new Date(d).toLocaleDateString('he-IL').replace(/\./g, '/')

      const reportData: PaymentReportData = {
        orgName: org?.name || 'Trinity CRM',
        orgEmail: org?.email || '',
        orgPhone: org?.phone || '',
        orgAddress: (org as any)?.address || '',
        fromDate: fmtDate(fromDate),
        toDate: fmtDate(toDate),
        methods: selectedMethods.map(m => METHOD_LABEL_HE[m] || m),
        payments: items,
        docNumber,
        issueDate,
      }

      // Load logo
      let logoDataUri = ''
      const logoUrl = (org as any)?.logo_url || '/logo-amber.png'
      if (logoUrl) {
        try {
          const lres = await fetch(logoUrl.startsWith('/') ? window.location.origin + logoUrl : logoUrl)
          const blob = await lres.blob()
          logoDataUri = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })
        } catch { /* logo optional */ }
      }
      reportData.logoDataUri = logoDataUri

      const html = buildPaymentReportHTML(reportData)
      await downloadRaw(html, `payment-report-${docNumber}.pdf`)

      toast.success(locale === 'he' ? 'הדוח הורד בהצלחה ✓' : 'Отчёт скачан ✓')
      onClose()
    } catch (err: any) {
      console.error('[PaymentReport]', err)
      toast.error(err.message || (locale === 'he' ? 'שגיאה ביצירת הדוח' : 'Ошибка создания отчёта'))
    } finally {
      setLoading(false)
    }
  }

  const isLoading = loading || pdfLoading

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-500" />
          {locale === 'he' ? 'סיכום תשלומים' : 'Сводка платежей'}
        </div>
      }
      subtitle={locale === 'he' ? 'הפק דוח תשלומים לפי תאריך ואמצעי תשלום' : 'Создать отчёт по платежам за период'}
      width="480px"
    >
      <div className="space-y-5">

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              {locale === 'he' ? 'מתאריך' : 'С даты'}
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              {locale === 'he' ? 'עד תאריך' : 'По дату'}
            </label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Payment methods */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-2 block">
            {locale === 'he' ? 'אמצעי תשלום' : 'Способы оплаты'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map(m => {
              const active = selectedMethods.includes(m.value)
              return (
                <button
                  key={m.value}
                  onClick={() => toggleMethod(m.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    active
                      ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{locale === 'he' ? m.labelHe : m.labelRu}</span>
                  {active && <span className="mr-auto text-amber-500">✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Info note */}
        <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2">
          {locale === 'he'
            ? 'הדוח יכלול תשלומים שהושלמו בלבד. הקובץ יישמר למשך יום אחד.'
            : 'В отчёт включаются только завершённые платежи. Файл сохраняется 1 день.'}
        </p>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            {locale === 'he' ? 'ביטול' : 'Отмена'}
          </button>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition disabled:opacity-50"
          >
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {locale === 'he' ? 'מייצר...' : 'Создаём...'}</>
              : <><FileText className="w-4 h-4" /> {locale === 'he' ? 'הפק PDF' : 'Создать PDF'}</>
            }
          </button>
        </div>
      </div>
    </Modal>
  )
}

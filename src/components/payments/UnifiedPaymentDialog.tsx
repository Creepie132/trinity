'use client'

/**
 * UnifiedPaymentDialog — Master Component для всех платежей Trinity.
 *
 * State machine:
 *   'method-select' → 'cash-form' | 'link-form' → 'success'
 *
 * Защиты:
 *   - Double-submit: useRef-флаг isSubmittingRef (логический замок, не UI)
 *   - Сохранность данных при ошибке: форма НЕ сбрасывается при catch
 *   - Строгая типизация payload из ModalStore через validateModalData()
 *   - Методы оплаты: SSoT из БД, нет fallback на все методы при загрузке
 *
 * Вызов из любой точки приложения:
 *   openModal('payment-unified', { defaultMethod: 'cash', clientId: '...', clientName: '...' })
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ClientSearch } from '@/components/ui/ClientSearch'
import { useLanguage } from '@/contexts/LanguageContext'
import { useBranch } from '@/contexts/BranchContext'
import { useCreatePaymentLink } from '@/hooks/usePayments'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CreditCard, Banknote, Link, CheckCircle2,
  Loader2, AlertCircle, X, ArrowLeft, MessageCircle,
  FileCheck, Building2, Smartphone, RefreshCw,
} from 'lucide-react'
import { PaymentSuccessView, PaymentSuccessSidebar } from '@/components/payments/PaymentSuccessView'
import { usePaymentMethodConfig } from '@/hooks/usePaymentMethodConfig'
import {
  CheckForm, BankTransferForm, CashForm, IL_CASH_LIMIT,
  type CheckPaymentDetails, type BankTransferDetails, type CashFormData,
} from '@/components/payments/PaymentDetailForms'
import { InstallmentForm, type InstallmentConfig, type ClientCardToken } from '@/components/payments/InstallmentForm'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'bit' | 'link' | 'check' | 'bank_transfer' | 'installment'
type Step = 'method-select' | 'cash-form' | 'bit-form' | 'link-form' | 'check-form' | 'bank-form' | 'installment-form' | 'success'

export interface UnifiedPaymentModalData {
  clientId?: string
  clientName?: string
  clientPhone?: string
  visitId?: string
  saleId?: string
  prefillAmount?: number
  defaultMethod?: PaymentMethod
  onSuccess?: () => void
}

interface Client {
  id: string
  first_name: string
  last_name: string
  phone: string
  email?: string
}

export interface UnifiedPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: UnifiedPaymentModalData
}

// ─── Валидатор payload из ModalStore ─────────────────────────────────────────

function validateModalData(raw: unknown): UnifiedPaymentModalData {
  if (!raw || typeof raw !== 'object') return {}
  const d = raw as Record<string, unknown>
  return {
    clientId:      typeof d.clientId === 'string' ? d.clientId : undefined,
    clientName:    typeof d.clientName === 'string' ? d.clientName : undefined,
    clientPhone:   typeof d.clientPhone === 'string' ? d.clientPhone : undefined,
    visitId:       typeof d.visitId === 'string' ? d.visitId : undefined,
    saleId:        typeof d.saleId === 'string' ? d.saleId : undefined,
    prefillAmount: typeof d.prefillAmount === 'number' ? d.prefillAmount : undefined,
    defaultMethod: ['cash', 'bit', 'link'].includes(d.defaultMethod as string)
      ? (d.defaultMethod as PaymentMethod) : undefined,
    onSuccess:     typeof d.onSuccess === 'function'
      ? (d.onSuccess as () => void) : undefined,
  }
}

// ─── i18n ──────────────────────────────────────────────────────────────────────

const I18N = {
  he: {
    title: 'תשלום חדש', selectMethod: 'בחר אמצעי תשלום',
    cash: 'מזומן', cashDesc: 'תשלום במזומן ישירות',
    bit: 'ביט', bitDesc: 'תשלום דרך אפליקציית ביט',
    check: "צ'ק", checkDesc: "תשלום בצ'ק עם פרטים",
    bank_transfer: 'העברה בנקאית', bank_transferDesc: 'העברה ישירה עם אסמכתא',
    link: 'קישור תשלום', linkDesc: 'קישור מאובטח ללקוח',
    client: 'לקוח', selectClient: 'חפש לקוח...',
    amount: 'סכום (₪)', notes: 'הערות', description: 'תיאור',
    notesPlaceholder: 'הערות נוספות...', descPlaceholder: 'תיאור התשלום',
    save: 'שמור', cancel: 'ביטול', close: 'סגור', back: 'חזרה',
    creating: 'יוצר...', saving: 'שומר...',
    createLink: 'צור קישור',
    successCash: '✓ התשלום נרשם בהצלחה',
    successBit: '✓ תשלום ביט נרשם בהצלחה',
    successLink: '✓ הקישור נוצר בהצלחה',
    successCheck: "✓ הצ'קים נרשמו בהצלחה",
    successBank: '✓ ההעברה נרשמה בהצלחה',
    sendToClient: 'שלח ללקוח לתשלום מאובטח',
    copy: 'העתק', copied: 'הועתק!', openLink: 'פתח קישור',
    fillRequired: 'יש למלא את כל שדות החובה',
    invalidAmount: 'הזן סכום תקין',
    checkSumMismatch: "סכום הצ'קים אינו תואם לסכום הכולל",
    bankRefRequired: 'נא להזין מספר עסקה',
    noPhone: 'אין מספר טלפון ללקוח',
    errorGeneric: 'שגיאה, נסה שוב',
    toPayLabel: 'לתשלום', paidLabel: 'שולם ✓',
    errorTitle: 'שגיאה בביצוע פעולה',
    loadingMethods: 'טוען שיטות תשלום...',
    installment: 'תשלומים', installmentDesc: 'חלוקה לתשלומים בכרטיס',
    successInstallment: '✓ תוכנית תשלומים נוצרה בהצלחה',
  },
  ru: {
    title: 'Новый платёж', selectMethod: 'Выберите способ оплаты',
    cash: 'Наличные', cashDesc: 'Оплата наличными напрямую',
    bit: 'Bit', bitDesc: 'Оплата через приложение Bit',
    check: 'Чек', checkDesc: 'Оплата чеком с деталями',
    bank_transfer: 'Банковский перевод', bank_transferDesc: 'Прямой перевод с квитанцией',
    link: 'Ссылка на оплату', linkDesc: 'Безопасная ссылка клиенту',
    client: 'Клиент', selectClient: 'Поиск клиента...',
    amount: 'Сумма (₪)', notes: 'Заметки', description: 'Описание',
    notesPlaceholder: 'Дополнительные заметки...', descPlaceholder: 'Описание платежа',
    save: 'Сохранить', cancel: 'Отмена', close: 'Закрыть', back: 'Назад',
    creating: 'Создаём...', saving: 'Сохраняем...',
    createLink: 'Создать ссылку',
    successCash: '✓ Платёж успешно записан',
    successBit: '✓ Платёж Bit успешно записан',
    successLink: '✓ Ссылка успешно создана',
    successCheck: '✓ Чеки успешно записаны',
    successBank: '✓ Перевод успешно записан',
    sendToClient: 'Отправьте клиенту для безопасной оплаты',
    copy: 'Скопировать', copied: 'Скопировано!', openLink: 'Открыть ссылку',
    fillRequired: 'Заполните все обязательные поля',
    invalidAmount: 'Введите корректную сумму',
    checkSumMismatch: 'Сумма чеков не совпадает с итоговой суммой',
    bankRefRequired: 'Введите номер транзакции',
    noPhone: 'У клиента нет номера телефона',
    errorGeneric: 'Ошибка, попробуйте ещё раз',
    toPayLabel: 'К оплате', paidLabel: 'Оплачено ✓',
    errorTitle: 'Ошибка при выполнении',
    loadingMethods: 'Загрузка способов оплаты...',
    installment: 'Рассрочка', installmentDesc: 'Разбить оплату на платежи по карте',
    successInstallment: '✓ План рассрочки создан успешно',
  },
} as const

// ─── Method config ─────────────────────────────────────────────────────────────

const METHODS: {
  id: PaymentMethod
  gradient: string; glow: string; bg: string; border: string; color: string
}[] = [
  { id: 'cash',          gradient: 'linear-gradient(135deg,#22c55e,#16a34a)', glow: 'rgba(34,197,94,0.3)',   bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '#bbf7d0', color: '#15803d' },
  { id: 'bit',           gradient: 'linear-gradient(135deg,#f97316,#ea580c)', glow: 'rgba(249,115,22,0.3)', bg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '#fed7aa', color: '#c2410c' },
  { id: 'check',         gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', glow: 'rgba(245,158,11,0.3)', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '#fde68a', color: '#b45309' },
  { id: 'bank_transfer', gradient: 'linear-gradient(135deg,#0ea5e9,#0284c7)', glow: 'rgba(14,165,233,0.3)', bg: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: '#bae6fd', color: '#0369a1' },
  { id: 'link',          gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', glow: 'rgba(139,92,246,0.3)', bg: 'linear-gradient(135deg,#faf5ff,#ede9fe)', border: '#ddd6fe', color: '#6d28d9' },
  { id: 'installment',    gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)', glow: 'rgba(6,182,212,0.3)',   bg: 'linear-gradient(135deg,#ecfeff,#cffafe)', border: '#a5f3fc', color: '#0e7490' },
]

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  cash:          <Banknote size={22} />,
  bit:           <Smartphone size={22} />,
  check:         <FileCheck size={22} />,
  bank_transfer: <Building2 size={22} />,
  link:          <Link size={22} />,
  installment:   <RefreshCw size={22} />,
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function UnifiedPaymentDialog({
  open, onOpenChange, initialData,
}: UnifiedPaymentDialogProps) {
  const { language } = useLanguage()
  const { activeOrgId } = useBranch()
  const searchOrgId = activeOrgId || ''
  const isHe = language === 'he'
  const t = I18N[language as 'he' | 'ru'] ?? I18N.ru

  // Загружаем конфиг включённых методов. staleTime=0 → всегда актуально из БД.
  // ВАЖНО: пока грузится — allowedMethodIds пустой. Нет fallback на все методы.
  const { enabledMethods: configMethods, isLoading: methodsLoading, hasTerminal } = usePaymentMethodConfig()
  const allowedMethodIds = new Set(
    methodsLoading
      ? [] as string[]
      : configMethods.map(m => m.key as string)
  )
  const visibleMethods = METHODS.filter(m => {
    // Installment: показываем всегда когда есть token terminal (Tranzila)
    if (m.id === 'installment') return hasTerminal
    if (m.id === 'link') return allowedMethodIds.has('card') || allowedMethodIds.has('link')
    return allowedMethodIds.has(m.id)
  })

  const safeData = validateModalData(initialData)
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>(() =>
    safeData.defaultMethod
      ? (`${safeData.defaultMethod}-form` as Step)
      : 'method-select'
  )

  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [description, setDescription] = useState('')

  const [checkDetails, setCheckDetails] = useState<CheckPaymentDetails | null>(null)
  const [checkValid, setCheckValid] = useState(false)
  const [bankDetails, setBankDetails] = useState<BankTransferDetails | null>(null)
  const [bankValid, setBankValid] = useState(false)
  const [cashData, setCashData] = useState<CashFormData | null>(null)
  const [cashValid, setCashValid] = useState(true)
  const [installmentConfig, setInstallmentConfig] = useState<InstallmentConfig | null>(null)
  const [clientToken, setClientToken] = useState<ClientCardToken | null>(null)
  const [linkInstallments, setLinkInstallments] = useState<number>(1)

  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [paymentLink, setPaymentLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const isSubmittingRef = useRef(false)
  const createPaymentLinkMutation = useCreatePaymentLink()

  useEffect(() => {
    if (!open) return
    const sd = validateModalData(initialData)
    setStep(sd.defaultMethod ? (`${sd.defaultMethod}-form` as Step) : 'method-select')
    setErrorMsg(null)
    setPaymentLink(null)
    setLinkCopied(false)
    setNotes('')
    setDescription('')
    setCheckDetails(null); setCheckValid(false)
    setBankDetails(null); setBankValid(false)
    setCashData(null); setCashValid(true)
    setInstallmentConfig(null); setClientToken(null)
    setLinkInstallments(1)
    setAmount(sd.prefillAmount != null ? String(sd.prefillAmount) : '')
    if (sd.clientId && sd.clientName) {
      const parts = sd.clientName.trim().split(' ')
      const first_name = parts[0] ?? sd.clientName
      const last_name = parts.slice(1).join(' ')
      setSelectedClient({ id: sd.clientId, first_name, last_name, phone: sd.clientPhone || '' })
      loadClientToken(sd.clientId)
    } else {
      setSelectedClient(null)
      setClientToken(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const amountNum = parseFloat(amount)
  const isAmountValid = !isNaN(amountNum) && amountNum > 0
  const canSubmit = !!selectedClient && isAmountValid && (
    step === 'check-form' ? checkValid :
    step === 'bank-form'  ? bankValid  :
    step === 'cash-form'  ? cashValid && amountNum <= IL_CASH_LIMIT :
    step === 'installment-form' ? !!installmentConfig && !!clientToken :
    true
  )

  const currentMethod: PaymentMethod | null =
    step === 'cash-form' ? 'cash'
    : step === 'bit-form' ? 'bit'
    : step === 'check-form' ? 'check'
    : step === 'bank-form' ? 'bank_transfer'
    : step === 'installment-form' ? 'installment'
    : step === 'link-form' ? 'link'
    : step === 'success' && paymentLink ? 'link'
    : step === 'success' ? 'cash'
    : null

  const methodCfg = METHODS.find(m => m.id === currentMethod) ?? null

  const handleClose = useCallback(() => {
    if (isSubmittingRef.current) return
    setAmount(''); setNotes(''); setDescription('')
    setSelectedClient(null); setErrorMsg(null)
    setPaymentLink(null); setLinkCopied(false)
    setCheckDetails(null); setCheckValid(false)
    setBankDetails(null); setBankValid(false)
    setCashData(null); setCashValid(true)
    setInstallmentConfig(null); setClientToken(null)
    setLinkInstallments(1)
    setStep('method-select')
    onOpenChange(false)
  }, [onOpenChange])

  const handleSelectMethod = useCallback((method: PaymentMethod) => {
    setErrorMsg(null)
    const stepMap: Record<PaymentMethod, Step> = {
      cash:          'cash-form',
      bit:           'bit-form',
      link:          'link-form',
      check:         'check-form',
      bank_transfer: 'bank-form',
      installment:   'installment-form',
    }
    setStep(stepMap[method])
  }, [])

  const handleBack = useCallback(() => {
    if (isSubmittingRef.current) return
    setErrorMsg(null)
    setCheckDetails(null); setCheckValid(false)
    setBankDetails(null); setBankValid(false)
    setCashData(null); setCashValid(true)
    setInstallmentConfig(null); setClientToken(null)
    setLinkInstallments(1)
    setStep('method-select')
  }, [])

  // Load stored card token for the selected client (for installment payments)
  const loadClientToken = async (cid: string) => {
    setClientToken(null)
    try {
      const res = await fetch('/api/clients/' + cid)
      if (!res.ok) return
      const data = await res.json()
      const tk = data?.tranzila_token
      const exp = data?.tranzila_expdate
      if (tk && exp) {
        setClientToken({ tranzila_token: tk, tranzila_expdate: exp, card_last4: data?.card_last4 || undefined })
      }
    } catch { /* no token */ }
  }

  const handleSubmit = useCallback(async () => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true

    if (!selectedClient) { toast.error(t.fillRequired); isSubmittingRef.current = false; return }
    if (!isAmountValid)  { toast.error(t.invalidAmount); isSubmittingRef.current = false; return }

    setIsLoading(true)
    setErrorMsg(null)

    try {
      if (step === 'cash-form') {
        if (amountNum > IL_CASH_LIMIT) { toast.error(t.invalidAmount); isSubmittingRef.current = false; return }
        const res = await fetch('/api/payments', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: selectedClient.id, amount: amountNum, payment_method: 'cash',
            status: 'completed', visit_id: safeData.visitId ?? null, sale_id: safeData.saleId ?? null,
            description: cashData?.notes?.trim() || `Наличные — ${selectedClient.first_name} ${selectedClient.last_name}`,
            amount_received: cashData?.amount_received ?? null,
          }),
        })
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || t.errorGeneric) }
        queryClient.invalidateQueries({ queryKey: ['payments'] })
        queryClient.invalidateQueries({ queryKey: ['payments-stats'] })
        queryClient.invalidateQueries({ queryKey: ['sales'] })
        toast.success(t.successCash); safeData.onSuccess?.(); setStep('success'); return
      }

      if (step === 'bit-form') {
        const res = await fetch('/api/payments', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: selectedClient.id, amount: amountNum, payment_method: 'bit',
            status: 'completed', visit_id: safeData.visitId ?? null, sale_id: safeData.saleId ?? null,
            description: `Bit — ${selectedClient.first_name} ${selectedClient.last_name}`,
          }),
        })
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || t.errorGeneric) }
        queryClient.invalidateQueries({ queryKey: ['payments'] })
        queryClient.invalidateQueries({ queryKey: ['payments-stats'] })
        queryClient.invalidateQueries({ queryKey: ['sales'] })
        toast.success(t.successBit); safeData.onSuccess?.(); setStep('success'); return
      }

      if (step === 'check-form') {
        if (!checkValid || !checkDetails) { toast.error(t.checkSumMismatch); isSubmittingRef.current = false; return }
        const res = await fetch('/api/payments', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: selectedClient.id, amount: amountNum, payment_method: 'check',
            status: 'pending', visit_id: safeData.visitId ?? null, sale_id: safeData.saleId ?? null,
            description: `Чек — ${selectedClient.first_name} ${selectedClient.last_name}`,
            payment_details: checkDetails,
          }),
        })
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || t.errorGeneric) }
        queryClient.invalidateQueries({ queryKey: ['payments'] })
        queryClient.invalidateQueries({ queryKey: ['payments-stats'] })
        queryClient.invalidateQueries({ queryKey: ['sales'] })
        toast.success(t.successCheck); safeData.onSuccess?.(); setStep('success'); return
      }

      if (step === 'bank-form') {
        if (!bankValid || !bankDetails) { toast.error(t.bankRefRequired); isSubmittingRef.current = false; return }
        const res = await fetch('/api/payments', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: selectedClient.id, amount: amountNum, payment_method: 'bank_transfer',
            status: 'completed', visit_id: safeData.visitId ?? null, sale_id: safeData.saleId ?? null,
            description: `Перевод — ${bankDetails.reference}`, payment_details: bankDetails,
          }),
        })
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || t.errorGeneric) }
        queryClient.invalidateQueries({ queryKey: ['payments'] })
        queryClient.invalidateQueries({ queryKey: ['payments-stats'] })
        queryClient.invalidateQueries({ queryKey: ['sales'] })
        toast.success(t.successBank); safeData.onSuccess?.(); setStep('success'); return
      }

      if (step === 'installment-form') {
        if (!installmentConfig || !clientToken) { toast.error(t.fillRequired); isSubmittingRef.current = false; return }
        const res = await fetch('/api/installments', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: selectedClient.id,
            visit_id: safeData.visitId ?? null,
            sale_id: safeData.saleId ?? null,
            total_amount: amountNum,
            installments_count: installmentConfig.count,
            frequency: installmentConfig.frequency,
            tranzila_token: clientToken.tranzila_token,
            tranzila_expdate: clientToken.tranzila_expdate,
            card_last4: clientToken.card_last4,
          }),
        })
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || t.errorGeneric) }
        queryClient.invalidateQueries({ queryKey: ['payments'] })
        queryClient.invalidateQueries({ queryKey: ['installments'] })
        queryClient.invalidateQueries({ queryKey: ['sales'] })
        toast.success((t as any).successInstallment || '✓ Plan created'); safeData.onSuccess?.(); setStep('success'); return
      }

      if (step === 'link-form') {
        const result = await createPaymentLinkMutation.mutateAsync({
          client_id: selectedClient.id, amount: amountNum,
          description: description.trim() || `Оплата — ${selectedClient.first_name} ${selectedClient.last_name}`,
          visit_id: safeData.visitId, sale_id: safeData.saleId,
        })
        if (!result?.payment_link) throw new Error('No payment link returned from API')
        setPaymentLink(result.payment_link)
        queryClient.invalidateQueries({ queryKey: ['sales'] })
        toast.success(t.successLink); safeData.onSuccess?.(); setStep('success'); return
      }

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.errorGeneric
      setErrorMsg(msg)
      console.error('[UnifiedPaymentDialog] submit error:', err)
    } finally {
      setIsLoading(false)
      isSubmittingRef.current = false
    }
  }, [
    step, selectedClient, isAmountValid, amountNum,
    notes, description, safeData, queryClient,
    createPaymentLinkMutation, t,
    checkDetails, checkValid, bankDetails, bankValid, cashData, cashValid,
    installmentConfig, clientToken,
  ])

  const handleCopyLink = useCallback(() => {
    if (!paymentLink) return
    navigator.clipboard.writeText(paymentLink)
    setLinkCopied(true)
    toast.success(t.copied)
    setTimeout(() => setLinkCopied(false), 2000)
  }, [paymentLink, t.copied])

  const handleSendWhatsApp = useCallback(() => {
    if (!paymentLink || !selectedClient?.phone) { toast.error(t.noPhone); return }
    let p = selectedClient.phone.replace(/\D/g, '')
    if (p.startsWith('0')) p = p.slice(1)
    const msg = isHe ? `קישור לתשלום: ${paymentLink}` : `Ссылка для оплаты: ${paymentLink}`
    window.open(`https://wa.me/972${p}?text=${encodeURIComponent(msg)}`, '_blank')
  }, [paymentLink, selectedClient, isHe, t.noPhone])

  // ─── Sidebar ──────────────────────────────────────────────────────────────────

  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div style={{
          width: 54, height: 54, borderRadius: 16, color: '#fff',
          background: methodCfg?.gradient ?? 'linear-gradient(135deg,#334155,#1e293b)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 6px 20px ${methodCfg?.glow ?? 'rgba(0,0,0,0.2)'}`, transition: 'all 0.3s',
        }}>
          {step === 'success' ? <CheckCircle2 size={24} /> : currentMethod ? METHOD_ICONS[currentMethod] : <CreditCard size={22} />}
        </div>
      </div>
      {amount && isAmountValid ? (
        <div style={{ background: methodCfg?.bg ?? 'rgba(255,255,255,0.06)', border: `0.5px solid ${methodCfg?.border ?? 'rgba(255,255,255,0.1)'}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: methodCfg?.color ?? '#fff', letterSpacing: '-0.5px' }}>₪{amountNum.toLocaleString()}</div>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3, color: methodCfg?.color ?? '#94a3b8' }}>{step === 'success' ? t.paidLabel : t.toPayLabel}</div>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 8px', textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.15)' }}>₪ —</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{t.toPayLabel}</div>
        </div>
      )}
      {selectedClient && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: 10, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: methodCfg?.gradient ?? 'linear-gradient(135deg,#334155,#1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>
            {selectedClient.first_name?.[0]}{selectedClient.last_name?.[0]}
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedClient.first_name} {selectedClient.last_name}
          </span>
        </div>
      )}
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '0 0 10px' }} />
      {step !== 'success' && step !== 'method-select' && (
        <>
          <button onClick={handleSubmit} disabled={!canSubmit || isLoading}
            style={{ padding: '11px 14px', borderRadius: 10, border: 'none', width: '100%', marginBottom: 6, cursor: canSubmit && !isLoading ? 'pointer' : 'not-allowed', background: canSubmit && !isLoading ? (methodCfg?.gradient ?? 'linear-gradient(135deg,#334155,#1e293b)') : 'rgba(255,255,255,0.08)', color: canSubmit ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' }}>
            {isLoading ? <><Loader2 size={14} className="animate-spin" />{step === 'link-form' ? t.creating : t.saving}</> : <>{currentMethod ? METHOD_ICONS[currentMethod] : null}{step === 'link-form' ? t.createLink : t.save}</>}
          </button>
          <button onClick={handleBack} disabled={isLoading}
            style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
            {t.back}
          </button>
        </>
      )}
      {step === 'success' && (
        <PaymentSuccessSidebar paymentLink={paymentLink} clientPhone={selectedClient?.phone} onClose={handleClose} locale={isHe ? 'he' : 'ru'} />
      )}
    </div>
  )

  // ─── Mobile footer ────────────────────────────────────────────────────────────

  const mobileFooter =
    step === 'method-select' ? (
      <div style={{ display: 'flex', width: '100%' }}>
        <button onClick={handleClose} style={{ flex: 1, padding: '12px 18px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: '#64748b', fontSize: 14, cursor: 'pointer' }}>
          {t.cancel}
        </button>
      </div>
    ) : step === 'success' ? (
      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        {paymentLink && selectedClient?.phone && (
          <button onClick={handleSendWhatsApp} style={{ flex: '0 0 auto', padding: '12px 16px', borderRadius: 10, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageCircle size={15} />WA
          </button>
        )}
        <button onClick={handleClose} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: methodCfg?.gradient ?? 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          {t.close}
        </button>
      </div>
    ) : (
      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <button onClick={handleBack} disabled={isLoading} style={{ flex: '0 0 auto', padding: '12px 18px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: '#64748b', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={15} />{t.back}
        </button>
        <button onClick={handleSubmit} disabled={!canSubmit || isLoading} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', cursor: canSubmit && !isLoading ? 'pointer' : 'not-allowed', background: canSubmit ? (methodCfg?.gradient ?? '#334155') : '#e2e8f0', color: canSubmit ? '#fff' : '#94a3b8', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {isLoading ? <><Loader2 size={15} className="animate-spin" />{t.saving}</> : <>{currentMethod ? METHOD_ICONS[currentMethod] : null}{step === 'link-form' ? t.createLink : t.save}</>}
        </button>
      </div>
    )

  // ─── Step content ─────────────────────────────────────────────────────────────

  const renderStep = () => {
    // ── Method select ──────────────────────────────────────────────────────
    if (step === 'method-select') return (
      <div style={{ padding: '20px 18px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          {t.selectMethod}
        </p>
        {methodsLoading ? (
          // SSoT: пока данные не пришли — спиннер, не список всех методов
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 0' }}>
            <Loader2 size={22} className="animate-spin" style={{ color: '#94a3b8' }} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{t.loadingMethods}</span>
          </div>
        ) : visibleMethods.map((m) => {
          const label = t[m.id as keyof typeof t] as string
          const desc  = t[`${m.id}Desc` as keyof typeof t] as string
          return (
            <button key={m.id} onClick={() => handleSelectMethod(m.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: m.bg, border: `1.5px solid ${m.border}`, borderRadius: 14, cursor: 'pointer', textAlign: isHe ? 'right' : 'left', transition: 'transform 0.15s, box-shadow 0.15s', width: '100%' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 24px ${m.glow}` }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '' }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: m.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: `0 4px 14px ${m.glow}`, flexShrink: 0 }}>
                {METHOD_ICONS[m.id]}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: m.color, margin: '0 0 2px' }}>{label}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{desc}</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: m.color, opacity: 0.5, flexShrink: 0, transform: isHe ? 'rotate(180deg)' : 'none' }}>
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )
        })}
      </div>
    )

    // ── Success ────────────────────────────────────────────────────────────
    if (step === 'success') return (
      <PaymentSuccessView
        paymentLink={paymentLink} isCash={currentMethod === 'cash'} amount={amountNum}
        changeAmount={cashData?.change_amount} clientPhone={selectedClient?.phone}
        clientName={selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : undefined}
        onClose={handleClose} locale={isHe ? 'he' : 'ru'}
      />
    )

    // ── Installment form ─────────────────────────────────────────────────
    if (step === 'installment-form') {
      const accentBg = 'linear-gradient(135deg,#ecfeff,#cffafe)'
      const accentBorder = '#a5f3fc'
      const accentColor = '#0e7490'
      return (
        <div style={{ padding: '20px 18px 24px' }} className="space-y-5">
          {errorMsg && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12 }}>
              <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', margin: '0 0 2px' }}>{t.errorTitle}</p>
                <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{errorMsg}</p>
              </div>
              <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}><X size={14} /></button>
            </div>
          )}
          <div style={{ background: accentBg, border: '1px solid #a5f3fc', borderRadius: 14, padding: '14px 16px' }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>{t.client} *</label>
            <ClientSearch orgId={searchOrgId} onSelect={c => { setSelectedClient(c); loadClientToken(c.id) }} placeholder={t.selectClient} locale={language as 'he' | 'ru' | 'en'} value={selectedClient} />
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 16px' }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>{t.amount} *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 700, color: accentColor, pointerEvents: 'none' }}>₪</span>
              <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" disabled={isLoading}
                style={{ paddingInlineStart: 36, fontSize: 18, fontWeight: 700, height: 48, border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff' }} />
            </div>
          </div>
          {isAmountValid && selectedClient && (
            <InstallmentForm
              totalAmount={amountNum}
              clientToken={clientToken}
              disabled={isLoading}
              locale={isHe ? 'he' : 'ru'}
              onChange={setInstallmentConfig}
            />
          )}
        </div>
      )
    }

    // ── Bit form ─────────────────────────────────────────────────────────────
    if (step === 'bit-form') return (
      <div style={{ padding: '20px 18px 24px' }} className="space-y-5">
        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12 }}>
            <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', margin: '0 0 2px' }}>{t.errorTitle}</p>
              <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}><X size={14} /></button>
          </div>
        )}
        <div style={{ background: methodCfg?.bg ?? 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: `1px solid ${methodCfg?.border ?? '#fed7aa'}`, borderRadius: 14, padding: '14px 16px' }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: methodCfg?.color ?? '#c2410c', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>{t.client} *</label>
          <ClientSearch orgId={searchOrgId} onSelect={c => setSelectedClient(c)} placeholder={t.selectClient} locale={language as 'he' | 'ru' | 'en'} value={selectedClient} />
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 16px' }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>{t.amount} *</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 700, color: methodCfg?.color ?? '#64748b', pointerEvents: 'none' }}>₪</span>
            <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" disabled={isLoading}
              style={{ paddingInlineStart: 36, fontSize: 18, fontWeight: 700, height: 48, border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff' }} />
          </div>
        </div>
        <div style={{ padding: '12px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Smartphone size={18} style={{ color: '#c2410c', flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>
            {isHe ? 'יש לאשר קבלת תשלום ביט לפני שמירה' : 'Убедитесь в получении Bit-платежа перед сохранением'}
          </p>
        </div>
      </div>
    )

    // ── Check form ──────────────────────────────────────────────────────────
    if (step === 'check-form') return (
      <div style={{ padding: '20px 18px 24px' }} className="space-y-5">
        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12 }}>
            <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', margin: '0 0 2px' }}>{t.errorTitle}</p>
              <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}><X size={14} /></button>
          </div>
        )}
        <div style={{ background: methodCfg?.bg ?? '#fffbeb', border: `1px solid ${methodCfg?.border ?? '#fde68a'}`, borderRadius: 14, padding: '14px 16px' }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: methodCfg?.color ?? '#b45309', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>{t.client} *</label>
          <ClientSearch orgId={searchOrgId} onSelect={c => setSelectedClient(c)} placeholder={t.selectClient} locale={language as 'he' | 'ru' | 'en'} value={selectedClient} />
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 16px' }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>{t.amount} *</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 700, color: methodCfg?.color ?? '#64748b', pointerEvents: 'none' }}>₪</span>
            <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" disabled={isLoading}
              style={{ paddingInlineStart: 36, fontSize: 18, fontWeight: 700, height: 48, border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff' }} />
          </div>
        </div>
        {isAmountValid && selectedClient && (
          <CheckForm totalAmount={amountNum} disabled={isLoading} locale={isHe ? 'he' : 'ru'} onChange={(data, valid) => { setCheckDetails(data); setCheckValid(valid) }} />
        )}
      </div>
    )

    // ── Bank transfer form ───────────────────────────────────────────────────
    if (step === 'bank-form') return (
      <div style={{ padding: '20px 18px 24px' }} className="space-y-5">
        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12 }}>
            <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', margin: '0 0 2px' }}>{t.errorTitle}</p>
              <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}><X size={14} /></button>
          </div>
        )}
        <div style={{ background: methodCfg?.bg ?? '#f0f9ff', border: `1px solid ${methodCfg?.border ?? '#bae6fd'}`, borderRadius: 14, padding: '14px 16px' }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: methodCfg?.color ?? '#0369a1', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>{t.client} *</label>
          <ClientSearch orgId={searchOrgId} onSelect={c => setSelectedClient(c)} placeholder={t.selectClient} locale={language as 'he' | 'ru' | 'en'} value={selectedClient} />
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 16px' }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>{t.amount} *</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 700, color: methodCfg?.color ?? '#64748b', pointerEvents: 'none' }}>₪</span>
            <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" disabled={isLoading}
              style={{ paddingInlineStart: 36, fontSize: 18, fontWeight: 700, height: 48, border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff' }} />
          </div>
        </div>
        <BankTransferForm disabled={isLoading} locale={isHe ? 'he' : 'ru'} onChange={(data, valid) => { setBankDetails(data); setBankValid(valid) }} />
      </div>
    )

    // ── Cash form ────────────────────────────────────────────────────────────
    if (step === 'cash-form') return (
      <div style={{ padding: '20px 18px 24px' }} className="space-y-5">
        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12 }}>
            <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', margin: '0 0 2px' }}>{t.errorTitle}</p>
              <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}><X size={14} /></button>
          </div>
        )}
        <div style={{ background: methodCfg?.bg ?? '#f0fdf4', border: `1px solid ${methodCfg?.border ?? '#bbf7d0'}`, borderRadius: 14, padding: '14px 16px' }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: methodCfg?.color ?? '#15803d', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>{t.client} *</label>
          <ClientSearch orgId={searchOrgId} onSelect={c => setSelectedClient(c)} placeholder={t.selectClient} locale={language as 'he' | 'ru' | 'en'} value={selectedClient} />
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 16px' }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>{t.amount} *</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 700, color: methodCfg?.color ?? '#64748b', pointerEvents: 'none' }}>₪</span>
            <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" disabled={isLoading}
              style={{ paddingInlineStart: 36, fontSize: 18, fontWeight: 700, height: 48, border: `1.5px solid ${isAmountValid && amountNum > IL_CASH_LIMIT ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 10, background: '#fff' }} />
          </div>
        </div>
        {isAmountValid && selectedClient && (
          <CashForm totalAmount={amountNum} disabled={isLoading} locale={isHe ? 'he' : 'ru'} onChange={(data, valid) => { setCashData(data); setCashValid(valid) }} />
        )}
      </div>
    )

    // ── Link form ────────────────────────────────────────────────────────────
    return (
      <div style={{ padding: '20px 18px 24px' }} className="space-y-5">
        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12 }}>
            <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', margin: '0 0 2px' }}>{t.errorTitle}</p>
              <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}><X size={14} /></button>
          </div>
        )}
        <div style={{ background: methodCfg?.bg ?? 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: `1px solid ${methodCfg?.border ?? '#e2e8f0'}`, borderRadius: 14, padding: '14px 16px' }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: methodCfg?.color ?? '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>{t.client} *</label>
          <ClientSearch orgId={searchOrgId} onSelect={c => setSelectedClient(c)} placeholder={t.selectClient} locale={language as 'he' | 'ru' | 'en'} value={selectedClient} />
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 16px' }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>{t.amount} *</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 700, color: methodCfg?.color ?? '#64748b', pointerEvents: 'none' }}>₪</span>
            <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" disabled={isLoading}
              style={{ paddingInlineStart: 36, fontSize: 18, fontWeight: 700, height: 48, border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff' }} />
          </div>
        </div>
        {isAmountValid && selectedClient && hasTerminal && (
          <div style={{ background: 'linear-gradient(135deg,#ecfeff,#cffafe)', border: '1px solid #a5f3fc', borderRadius: 14, padding: '14px 16px' }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#0e7490', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 10 }}>
              {isHe ? 'תשלומים (אופציונלי)' : 'Рассрочка (необязательно)'}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[1,2,3,4,5,6,10,12].map(n => (
                <button key={n} onClick={() => setLinkInstallments(n)} disabled={isLoading}
                  style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: linkInstallments === n ? '#0891b2' : 'rgba(8,145,178,0.12)',
                    color: linkInstallments === n ? '#fff' : '#0e7490',
                    fontSize: 13, fontWeight: 700, transition: 'all 0.15s' }}>
                  {n === 1 ? (isHe ? 'ללא' : 'Без') : n}
                </button>
              ))}
            </div>
            {linkInstallments > 1 && amountNum > 0 && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(8,145,178,0.1)', borderRadius: 9, fontSize: 12, color: '#0e7490', fontWeight: 600 }}>
                {isHe ? '' : ''} {linkInstallments} x &#8362;{(amountNum / linkInstallments).toFixed(2)}
              </div>
            )}
          </div>
        )}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '14px 16px' }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>{t.description}</label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder={t.descPlaceholder} rows={3} disabled={isLoading}
            style={{ border: '1px solid #fde68a', borderRadius: 10, background: '#fffbeb', resize: 'none', fontSize: 13 }} />
        </div>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const shellIcon = currentMethod ? METHOD_ICONS[currentMethod] : <CreditCard />

  return (
    <Modal open={open} onClose={handleClose} darkHeader showCloseButton={false} width="680px" dir={isHe ? 'rtl' : 'ltr'} contentClassName="!p-0">
      <TrinityModalShell
        open={open} onClose={handleClose} icon={shellIcon} title={t.title}
        subtitle={selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : isHe ? 'בחר לקוח' : 'Выберите клиента'}
        dir={isHe ? 'rtl' : 'ltr'}
        sidebarExtra={step !== 'method-select' ? sidebar : undefined}
        footerContent={mobileFooter}
      >
        {renderStep()}
      </TrinityModalShell>
    </Modal>
  )
}


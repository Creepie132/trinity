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
  Copy, Loader2, AlertCircle, X, ArrowLeft, MessageCircle, ExternalLink,
} from 'lucide-react'
import { PaymentSuccessView, PaymentSuccessSidebar } from '@/components/payments/PaymentSuccessView'
import { TRINITY_PAYMENT_METHODS, type TrinityPaymentMethodId } from '@/lib/payment-methods'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'link'
type Step = 'method-select' | 'cash-form' | 'link-form' | 'success'

/** Строгий тип для данных из ModalStore */
export interface UnifiedPaymentModalData {
  clientId?: string
  clientName?: string
  clientPhone?: string
  visitId?: string
  saleId?: string          // ID уже созданной продажи
  prefillAmount?: number   // Предзаполненная сумма (из сделки)
  defaultMethod?: PaymentMethod
  onSuccess?: () => void
}

// Совместимо с ClientSearch (phone обязателен в его внутреннем типе)
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
  /** Данные из ModalStore — строго типизированы */
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
    defaultMethod: ['cash', 'link'].includes(d.defaultMethod as string)
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
    link: 'קישור תשלום', linkDesc: 'קישור מאובטח ללקוח',
    client: 'לקוח', selectClient: 'חפש לקוח...',
    amount: 'סכום (₪)', notes: 'הערות', description: 'תיאור',
    notesPlaceholder: 'הערות נוספות...', descPlaceholder: 'תיאור התשלום',
    save: 'שמור', cancel: 'ביטול', close: 'סגור', back: 'חזרה',
    creating: 'יוצר...', saving: 'שומר...',
    createLink: 'צור קישור',
    successCash: '✓ התשלום נרשם בהצלחה',
    successLink: '✓ הקישור נוצר בהצלחה',
    sendToClient: 'שלח ללקוח לתשלום מאובטח',
    copy: 'העתק', copied: 'הועתק!', openLink: 'פתח קישור',
    fillRequired: 'יש למלא את כל שדות החובה',
    invalidAmount: 'הזן סכום תקין',
    noPhone: 'אין מספר טלפון ללקוח',
    errorGeneric: 'שגיאה, נסה שוב',
    toPayLabel: 'לתשלום', paidLabel: 'שולם ✓',
    errorTitle: 'שגיאה בביצוע פעולה',
  },
  ru: {
    title: 'Новый платёж', selectMethod: 'Выберите способ оплаты',
    cash: 'Наличные', cashDesc: 'Оплата наличными напрямую',
    link: 'Ссылка на оплату', linkDesc: 'Безопасная ссылка клиенту',
    client: 'Клиент', selectClient: 'Поиск клиента...',
    amount: 'Сумма (₪)', notes: 'Заметки', description: 'Описание',
    notesPlaceholder: 'Дополнительные заметки...', descPlaceholder: 'Описание платежа',
    save: 'Сохранить', cancel: 'Отмена', close: 'Закрыть', back: 'Назад',
    creating: 'Создаём...', saving: 'Сохраняем...',
    createLink: 'Создать ссылку',
    successCash: '✓ Платёж успешно записан',
    successLink: '✓ Ссылка успешно создана',
    sendToClient: 'Отправьте клиенту для безопасной оплаты',
    copy: 'Скопировать', copied: 'Скопировано!', openLink: 'Открыть ссылку',
    fillRequired: 'Заполните все обязательные поля',
    invalidAmount: 'Введите корректную сумму',
    noPhone: 'У клиента нет номера телефона',
    errorGeneric: 'Ошибка, попробуйте ещё раз',
    toPayLabel: 'К оплате', paidLabel: 'Оплачено ✓',
    errorTitle: 'Ошибка при выполнении',
  },
} as const

// ─── Method config ─────────────────────────────────────────────────────────────

const METHODS: {
  id: PaymentMethod
  gradient: string; glow: string; bg: string; border: string; color: string
}[] = [
  { id: 'cash', gradient: 'linear-gradient(135deg,#22c55e,#16a34a)', glow: 'rgba(34,197,94,0.3)',  bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '#bbf7d0', color: '#15803d' },
  { id: 'link', gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', glow: 'rgba(139,92,246,0.3)', bg: 'linear-gradient(135deg,#faf5ff,#ede9fe)', border: '#ddd6fe', color: '#6d28d9' },
]

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  cash: <Banknote size={22} />,
  link: <Link size={22} />,
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

  const safeData = validateModalData(initialData)
  const queryClient = useQueryClient()

  // ── State machine ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(() =>
    safeData.defaultMethod
      ? (`${safeData.defaultMethod}-form` as Step)
      : 'method-select'
  )

  // ── Form state (НЕ сбрасывается при ошибке) ─────────────────────────────────
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [description, setDescription] = useState('')

  // ── UI state ────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [paymentLink, setPaymentLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  // ── Double-submit guard (useRef = логический замок, не UI) ──────────────────
  const isSubmittingRef = useRef(false)

  const createPaymentLinkMutation = useCreatePaymentLink()

  // ── Reset on open ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const sd = validateModalData(initialData)
    setStep(sd.defaultMethod ? (`${sd.defaultMethod}-form` as Step) : 'method-select')
    setErrorMsg(null)
    setPaymentLink(null)
    setLinkCopied(false)
    setNotes('')
    setDescription('')
    // Предзаполнение суммы из сделки
    setAmount(sd.prefillAmount != null ? String(sd.prefillAmount) : '')
    // Предзаполнение клиента
    if (sd.clientId && sd.clientName) {
      const parts = sd.clientName.trim().split(' ')
      const first_name = parts[0] ?? sd.clientName
      const last_name = parts.slice(1).join(' ')
      setSelectedClient({ id: sd.clientId, first_name, last_name, phone: sd.clientPhone || '' })
    } else {
      setSelectedClient(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const amountNum = parseFloat(amount)
  const isAmountValid = !isNaN(amountNum) && amountNum > 0
  const canSubmit = !!selectedClient && isAmountValid

  const currentMethod: PaymentMethod | null =
    step === 'cash-form' ? 'cash'
    : step === 'link-form' ? 'link'
    : step === 'success' && paymentLink ? 'link'
    : step === 'success' ? 'cash'
    : null

  const methodCfg = METHODS.find(m => m.id === currentMethod) ?? null

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    if (isSubmittingRef.current) return   // нельзя закрыть во время транзакции
    setAmount(''); setNotes(''); setDescription('')
    setSelectedClient(null); setErrorMsg(null)
    setPaymentLink(null); setLinkCopied(false)
    setStep('method-select')
    onOpenChange(false)
  }, [onOpenChange])

  const handleSelectMethod = useCallback((method: PaymentMethod) => {
    setErrorMsg(null)
    setStep(`${method}-form` as Step)
  }, [])

  const handleBack = useCallback(() => {
    if (isSubmittingRef.current) return
    setErrorMsg(null)
    setStep('method-select')
  }, [])

  /** Единственная точка записи в БД — через защищённый API, не суpabase-browser */
  const handleSubmit = useCallback(async () => {
    // ── Double-submit: логический замок ────────────────────────────────────
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true

    if (!selectedClient) {
      toast.error(t.fillRequired)
      isSubmittingRef.current = false; return
    }
    if (!isAmountValid) {
      toast.error(t.invalidAmount)
      isSubmittingRef.current = false; return
    }

    setIsLoading(true)
    setErrorMsg(null)

    try {
      // ── CASH — через POST /api/payments (Zero Trust) ────────────────────
      if (step === 'cash-form') {
        const res = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id:      selectedClient.id,
            amount:         amountNum,
            payment_method: 'cash',
            status:         'completed',
            visit_id:       safeData.visitId ?? null,
            description:    notes.trim() ||
              `Наличные — ${selectedClient.first_name} ${selectedClient.last_name}`,
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || t.errorGeneric)
        }
        // ✅ React Query invalidate
        queryClient.invalidateQueries({ queryKey: ['payments'] })
        toast.success(t.successCash)
        safeData.onSuccess?.()
        setStep('success')
        return
      }

      // ── PAYMENT LINK ──────────────────────────────────────────────────────
      if (step === 'link-form') {
        const result = await createPaymentLinkMutation.mutateAsync({
          client_id:   selectedClient.id,
          amount:      amountNum,
          description: description.trim() ||
            `Оплата — ${selectedClient.first_name} ${selectedClient.last_name}`,
          visit_id: safeData.visitId,
        })
        if (!result?.payment_link) throw new Error('No payment link returned from API')
        setPaymentLink(result.payment_link)
        toast.success(t.successLink)
        safeData.onSuccess?.()
        setStep('success')
        return
      }

    } catch (err: unknown) {
      // ── Ошибка: форма НЕ сбрасывается, только показываем banner ─────────
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
  ])

  const handleCopyLink = useCallback(() => {
    if (!paymentLink) return
    navigator.clipboard.writeText(paymentLink)
    setLinkCopied(true)
    toast.success(t.copied)
    setTimeout(() => setLinkCopied(false), 2000)
  }, [paymentLink, t.copied])

  const handleSendWhatsApp = useCallback(() => {
    if (!paymentLink || !selectedClient?.phone) {
      toast.error(t.noPhone); return
    }
    let p = selectedClient.phone.replace(/\D/g, '')
    if (p.startsWith('0')) p = p.slice(1)
    const msg = isHe
      ? `קישור לתשלום: ${paymentLink}`
      : `Ссылка для оплаты: ${paymentLink}`
    window.open(`https://wa.me/972${p}?text=${encodeURIComponent(msg)}`, '_blank')
  }, [paymentLink, selectedClient, isHe, t.noPhone])

  // ─── Sidebar (Desktop) ────────────────────────────────────────────────────────

  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Icon bubble */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div style={{
          width: 54, height: 54, borderRadius: 16, color: '#fff',
          background: methodCfg?.gradient ?? 'linear-gradient(135deg,#334155,#1e293b)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 6px 20px ${methodCfg?.glow ?? 'rgba(0,0,0,0.2)'}`,
          transition: 'all 0.3s',
        }}>
          {step === 'success' ? <CheckCircle2 size={24} />
            : currentMethod ? METHOD_ICONS[currentMethod]
            : <CreditCard size={22} />}
        </div>
      </div>

      {/* Amount preview */}
      {amount && isAmountValid ? (
        <div style={{
          background: methodCfg?.bg ?? 'rgba(255,255,255,0.06)',
          border: `0.5px solid ${methodCfg?.border ?? 'rgba(255,255,255,0.1)'}`,
          borderRadius: 12, padding: '10px 8px', textAlign: 'center', marginBottom: 10,
        }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: methodCfg?.color ?? '#fff', letterSpacing: '-0.5px' }}>
            ₪{amountNum.toLocaleString()}
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3, color: methodCfg?.color ?? '#94a3b8' }}>
            {step === 'success' ? t.paidLabel : t.toPayLabel}
          </div>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 8px', textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.15)' }}>₪ —</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{t.toPayLabel}</div>
        </div>
      )}

      {/* Client chip */}
      {selectedClient && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: 10, marginBottom: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: methodCfg?.gradient ?? 'linear-gradient(135deg,#334155,#1e293b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 11, fontWeight: 700,
          }}>
            {selectedClient.first_name?.[0]}{selectedClient.last_name?.[0]}
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedClient.first_name} {selectedClient.last_name}
          </span>
        </div>
      )}
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '0 0 10px' }} />

      {/* Sidebar action buttons — form steps */}
      {step !== 'success' && step !== 'method-select' && (
        <>
          <button onClick={handleSubmit} disabled={!canSubmit || isLoading}
            style={{
              padding: '11px 14px', borderRadius: 10, border: 'none', width: '100%', marginBottom: 6,
              cursor: canSubmit && !isLoading ? 'pointer' : 'not-allowed',
              background: canSubmit && !isLoading
                ? (methodCfg?.gradient ?? 'linear-gradient(135deg,#334155,#1e293b)')
                : 'rgba(255,255,255,0.08)',
              color: canSubmit ? '#fff' : 'rgba(255,255,255,0.2)',
              fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s',
            }}>
            {isLoading
              ? <><Loader2 size={14} className="animate-spin" />{step === 'link-form' ? t.creating : t.saving}</>
              : <>{currentMethod ? METHOD_ICONS[currentMethod] : null}{step === 'link-form' ? t.createLink : t.save}</>}
          </button>
          <button onClick={handleBack} disabled={isLoading}
            style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
            {t.back}
          </button>
        </>
      )}

      {/* Sidebar action buttons — success */}
      {step === 'success' && (
        <PaymentSuccessSidebar
          paymentLink={paymentLink}
          clientPhone={selectedClient?.phone}
          onClose={handleClose}
          locale={isHe ? 'he' : 'ru'}
        />
      )}
    </div>
  )

  // ─── Mobile footer ──────────────────────────────────────────────────────────

  const mobileFooter =
    step === 'method-select' ? (
      <button onClick={handleClose}
        style={{ flex: 1, padding: '12px 18px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: '#64748b', fontSize: 14, cursor: 'pointer' }}>
        {t.cancel}
      </button>
    ) : step === 'success' ? (
      <>
        {paymentLink && selectedClient?.phone && (
          <button onClick={handleSendWhatsApp}
            style={{ flex: '0 0 auto', padding: '12px 16px', borderRadius: 10, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageCircle size={15} />WA
          </button>
        )}
        <button onClick={handleClose}
          style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: methodCfg?.gradient ?? 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          {t.close}
        </button>
      </>
    ) : (
      <>
        <button onClick={handleBack} disabled={isLoading}
          style={{ flex: '0 0 auto', padding: '12px 18px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: '#64748b', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={15} />{t.back}
        </button>
        <button onClick={handleSubmit} disabled={!canSubmit || isLoading}
          style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', cursor: canSubmit && !isLoading ? 'pointer' : 'not-allowed', background: canSubmit ? (methodCfg?.gradient ?? '#334155') : '#e2e8f0', color: canSubmit ? '#fff' : '#94a3b8', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {isLoading
            ? <><Loader2 size={15} className="animate-spin" />{t.saving}</>
            : <>{currentMethod ? METHOD_ICONS[currentMethod] : null}{step === 'link-form' ? t.createLink : t.save}</>}
        </button>
      </>
    )

  // ─── Step content ───────────────────────────────────────────────────────────

  const renderStep = () => {
    // ── Method select ──────────────────────────────────────────────────────
    if (step === 'method-select') return (
      <div style={{ padding: '20px 18px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          {t.selectMethod}
        </p>
        {METHODS.map((m) => (
          <button key={m.id} onClick={() => handleSelectMethod(m.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: m.bg, border: `1.5px solid ${m.border}`, borderRadius: 14, cursor: 'pointer', textAlign: isHe ? 'right' : 'left', transition: 'transform 0.15s, box-shadow 0.15s', width: '100%' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 24px ${m.glow}` }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '' }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: m.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: `0 4px 14px ${m.glow}`, flexShrink: 0 }}>
              {METHOD_ICONS[m.id]}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: m.color, margin: '0 0 2px' }}>{t[m.id]}</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{t[`${m.id}Desc` as 'cashDesc' | 'linkDesc']}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: m.color, opacity: 0.5, flexShrink: 0, transform: isHe ? 'rotate(180deg)' : 'none' }}>
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>
    )

    // ── Success ────────────────────────────────────────────────────────────
    if (step === 'success') return (
      <PaymentSuccessView
        paymentLink={paymentLink}
        amount={amountNum}
        clientPhone={selectedClient?.phone}
        onClose={handleClose}
        locale={isHe ? 'he' : 'ru'}
      />
    )

    // ── Form (cash | link) ────────────────────────────────────────────────────
    return (
      <div style={{ padding: '20px 18px 24px' }} className="space-y-5">

        {/* Error banner — форма НЕ сбрасывается */}
        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12 }}>
            <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', margin: '0 0 2px' }}>{t.errorTitle}</p>
              <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Client */}
        <div style={{ background: methodCfg?.bg ?? 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: `1px solid ${methodCfg?.border ?? '#e2e8f0'}`, borderRadius: 14, padding: '14px 16px' }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: methodCfg?.color ?? '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
            {t.client} *
          </label>
          <ClientSearch orgId={searchOrgId} onSelect={c => setSelectedClient(c)}
            placeholder={t.selectClient} locale={language as 'he' | 'ru' | 'en'} value={selectedClient} />
        </div>

        {/* Amount */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 16px' }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
            {t.amount} *
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 700, color: methodCfg?.color ?? '#64748b', pointerEvents: 'none' }}>₪</span>
            <Input type="number" step="0.01" min="0" value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="0.00"
              disabled={isLoading}
              style={{ paddingInlineStart: 36, fontSize: 18, fontWeight: 700, height: 48, border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff' }} />
          </div>
        </div>

        {/* Notes — only cash */}
        {step === 'cash-form' && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '14px 16px' }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              {t.notes}
            </label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder={t.notesPlaceholder} rows={3} disabled={isLoading}
              style={{ border: '1px solid #fde68a', borderRadius: 10, background: '#fffbeb', resize: 'none', fontSize: 13 }} />
          </div>
        )}

        {/* Description — only link */}
        {step === 'link-form' && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '14px 16px' }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              {t.description}
            </label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder={t.descPlaceholder} rows={3} disabled={isLoading}
              style={{ border: '1px solid #fde68a', borderRadius: 10, background: '#fffbeb', resize: 'none', fontSize: 13 }} />
          </div>
        )}
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const shellIcon = currentMethod ? METHOD_ICONS[currentMethod] : <CreditCard />

  return (
    <Modal
      open={open}
      onClose={handleClose}
      darkHeader
      showCloseButton={false}
      width="680px"
      dir={isHe ? 'rtl' : 'ltr'}
      contentClassName="!p-0"
    >
      <TrinityModalShell
        open={open}
        onClose={handleClose}
        icon={shellIcon}
        title={t.title}
        subtitle={
          selectedClient
            ? `${selectedClient.first_name} ${selectedClient.last_name}`
            : isHe ? 'בחר לקוח' : 'Выберите клиента'
        }
        dir={isHe ? 'rtl' : 'ltr'}
        sidebarExtra={step !== 'method-select' ? sidebar : undefined}
        footerContent={mobileFooter}
      >
        {renderStep()}
      </TrinityModalShell>
    </Modal>
  )
}

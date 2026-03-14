'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreatePaymentLink } from '@/hooks/usePayments'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { Loader2, Copy, ExternalLink, CheckCircle2 } from 'lucide-react'

interface CreatePaymentDialogProps {
  clientId: string
  clientName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePaymentDialog({ clientId, clientName, open, onOpenChange }: CreatePaymentDialogProps) {
  const { language } = useLanguage()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [paymentLink, setPaymentLink] = useState<string | null>(null)
  const isRTL = language === 'he'

  const createPayment = useCreatePaymentLink()

  const l = {
    he: {
      title: 'קישור תשלום חדש', amount: 'סכום (₪)', desc: 'תיאור (אופציונלי)',
      descPlaceholder: 'תיאור התשלום', cancel: 'ביטול', create: 'צור קישור',
      creating: 'יוצר...', close: 'סגור', openLink: 'פתח קישור',
      copy: 'העתק קישור', copied: 'הועתק!', successTitle: 'הקישור נוצר!',
      successSub: 'שלח את הקישור ללקוח לתשלום מאובטח',
    },
    ru: {
      title: 'Новая ссылка на оплату', amount: 'Сумма (₪)', desc: 'Описание (необязательно)',
      descPlaceholder: 'Описание платежа', cancel: 'Отмена', create: 'Создать ссылку',
      creating: 'Создаём...', close: 'Закрыть', openLink: 'Открыть ссылку',
      copy: 'Скопировать', copied: 'Скопировано!', successTitle: 'Ссылка создана!',
      successSub: 'Отправьте клиенту для безопасной оплаты',
    },
  }
  const t = l[language as 'he' | 'ru'] || l.ru

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error(language === 'he' ? 'הזן סכום תקין' : 'Введите корректную сумму')
      return
    }
    try {
      const result = await createPayment.mutateAsync({
        client_id: clientId,
        amount: amountNum,
        description: description || `${language === 'he' ? 'תשלום עבור' : 'Оплата для'} ${clientName}`,
      })
      setPaymentLink(result.payment_link)
    } catch (error) {
      console.error('Failed to create payment:', error)
    }
  }

  const handleClose = () => {
    setAmount('')
    setDescription('')
    setPaymentLink(null)
    onOpenChange(false)
  }

  const copyLink = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink)
      toast.success(t.copied)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t.title}
      subtitle={clientName}
      width="440px"
      dir={isRTL ? 'rtl' : 'ltr'}
      footer={
        !paymentLink ? (
          <div className="flex gap-2">
            <button onClick={handleClose}
              className="flex-1 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              {t.cancel}
            </button>
            <button onClick={handleSubmit} disabled={createPayment.isPending}
              className="flex-[1.5] min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition">
              {createPayment.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {createPayment.isPending ? t.creating : t.create}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleClose}
              className="flex-1 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              {t.close}
            </button>
            <button onClick={() => window.open(paymentLink!, '_blank')}
              className="flex-[1.5] min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 flex items-center justify-center gap-2 transition">
              <ExternalLink className="w-4 h-4" />
              {t.openLink}
            </button>
          </div>
        )
      }
    >
      <div dir={isRTL ? 'rtl' : 'ltr'}>
        {!paymentLink ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {t.amount} *
              </Label>
              <Input id="amount" type="number" step="0.01" min="0"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="100.00" className="mt-1 text-lg font-semibold" dir="ltr" />
            </div>
            <div>
              <Label htmlFor="description" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {t.desc}
              </Label>
              <Textarea id="description" value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.descPlaceholder} rows={2}
                className="mt-1 resize-none" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-4 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{t.successTitle}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t.successSub}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input value={paymentLink} readOnly className="flex-1 text-sm bg-gray-50 dark:bg-gray-800" dir="ltr" />
              <button onClick={copyLink}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                <Copy className="w-4 h-4" />
                {t.copy}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

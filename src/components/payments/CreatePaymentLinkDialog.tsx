'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreatePaymentLink } from '@/hooks/usePayments'
import { toast } from 'sonner'
import { MessageSquare, Copy, ExternalLink, Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ClientSearch } from '@/components/ui/ClientSearch'
import { useAuth } from '@/hooks/useAuth'

interface CreatePaymentLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreatePaymentLinkDialog({ open, onOpenChange, onSuccess }: CreatePaymentLinkDialogProps) {
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [paymentLink, setPaymentLink] = useState<string | null>(null)

  const { t, language } = useLanguage()
  const { orgId } = useAuth()
  const createPayment = useCreatePaymentLink()

  const handleSubmit = async () => {
    if (!selectedClient) {
      toast.error(t('payments.selectClient'))
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error(t('payments.amount'))
      return
    }

    try {
      const result = await createPayment.mutateAsync({
        client_id: selectedClient.id,
        amount: amountNum,
        description: description || 'תשלום',
      })

      if (result.success || result.payment_link) {
        setPaymentLink(result.payment_link)
        toast.success(t('payments.successMessage'))
      }
    } catch (error) {
      console.error('Failed to create payment:', error)
    }
  }

  const handleClose = () => {
    const wasPaymentCreated = !!paymentLink
    setSelectedClient(null)
    setAmount('')
    setDescription('')
    setPaymentLink(null)
    onOpenChange(false)
    if (wasPaymentCreated && onSuccess) onSuccess()
  }

  const copyLink = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink)
      toast.success(t('payments.linkCopied'))
    }
  }

  const openLink = () => {
    if (paymentLink) window.open(paymentLink, '_blank')
  }

  const sendWhatsApp = () => {
    if (paymentLink && selectedClient?.phone) {
      let cleanPhone = selectedClient.phone.replace(/\D/g, '')
      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1)
      const formattedPhone = `972${cleanPhone}`
      const messageText = language === 'ru' ? `Ссылка для оплаты: ${paymentLink}` : `קישור לתשלום: ${paymentLink}`
      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`, '_blank')
    } else {
      toast.error(language === 'ru' ? 'У клиента нет номера телефона' : 'אין מספר טלפון ללקוח')
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('payments.createLink')}
      width="440px"
      footer={
        !paymentLink ? (
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleClose}
              className="px-5 min-h-[44px] rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 whitespace-nowrap"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={createPayment.isPending}
              className="px-5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
            >
              {createPayment.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {createPayment.isPending ? t('payments.creating') : t('payments.createLink')}
            </button>
          </div>
        ) : (
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleClose}
              className="px-5 min-h-[44px] rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 whitespace-nowrap"
            >
              {t('common.close')}
            </button>
            <button
              onClick={openLink}
              className="px-5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 whitespace-nowrap flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              {t('payments.openLink')}
            </button>
          </div>
        )
      }
    >
      {!paymentLink ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="client">{t('payments.client')} *</Label>
            <ClientSearch
              orgId={orgId || ''}
              onSelect={(client) => setSelectedClient(client)}
              placeholder={t('payments.selectClient')}
              locale={language as 'he' | 'ru' | 'en'}
              value={selectedClient}
            />
          </div>

          <div>
            <Label htmlFor="amount">{t('payments.amount')} (₪) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t('payments.amountPlaceholder')}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">{t('payments.description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('payments.descriptionPlaceholder')}
              rows={3}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-xl border border-green-200">
            <p className="text-sm text-green-800 font-semibold mb-2">✓ {t('payments.successMessage')}</p>
            <p className="text-xs text-green-700">{t('payments.sendLinkToClient')}</p>
          </div>

          {selectedClient && (
            <div className="text-sm text-gray-600">
              <strong>{t('payments.client')}:</strong> {selectedClient.first_name} {selectedClient.last_name}<br />
              <strong>{t('payments.amount')}:</strong> ₪{amount}
            </div>
          )}

          <div>
            <Label>{t('payments.createLink')}</Label>
            <div className="flex gap-2 mt-1">
              <Input value={paymentLink} readOnly className="flex-1 text-sm" />
              <button onClick={copyLink} className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={sendWhatsApp}
              className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium flex items-center justify-center gap-2"
            >
              💬 {language === 'ru' ? 'Отправить WhatsApp' : 'שלח WhatsApp'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

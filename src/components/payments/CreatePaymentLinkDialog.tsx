'use client'

import { useState } from 'react'
import ModalWrapper from '@/components/ui/ModalWrapper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreatePaymentLink } from '@/hooks/usePayments'
import { toast } from 'sonner'
import { MessageSquare, Copy, ExternalLink, X } from 'lucide-react'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

      setPaymentLink(result.payment_link)
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
    if (wasPaymentCreated && onSuccess) {
      onSuccess()
    }
  }

  const copyLink = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink)
      toast.success(t('payments.linkCopied'))
    }
  }

  const openLink = () => {
    if (paymentLink) {
      window.open(paymentLink, '_blank')
    }
  }

  const sendSMS = () => {
    if (paymentLink && selectedClient) {
      // TODO: Implement SMS sending
      toast.info('שליחת SMS - בפיתוח')
    }
  }

  const sendWhatsApp = () => {
    if (paymentLink && selectedClient && selectedClient.phone) {
      // Clean phone number and format for Israeli numbers
      let cleanPhone = selectedClient.phone.replace(/\D/g, '')
      
      // Remove leading 0 if present
      if (cleanPhone.startsWith('0')) {
        cleanPhone = cleanPhone.substring(1)
      }
      
      // Add Israeli country code
      const formattedPhone = `972${cleanPhone}`
      
      // Create message text based on language
      const messageText = language === 'ru' 
        ? `Ссылка для оплаты: ${paymentLink}`
        : `קישור לתשלום: ${paymentLink}`
      
      // Open WhatsApp
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`
      window.open(whatsappUrl, '_blank')
    } else if (!selectedClient?.phone) {
      toast.error(language === 'ru' ? 'У клиента нет номера телефона' : 'אין מספר טלפון ללקוח')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div 
        className="relative bg-white dark:bg-gray-900 rounded-[32px] w-[90vw] max-w-md max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 pb-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">{t('payments.createLink')}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {!paymentLink ? (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full"
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
                  className="w-full resize-none"
                />
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-800 font-semibold mb-2">
                  ✓ {t('payments.successMessage')}
                </p>
                <p className="text-xs text-green-700">
                  {t('payments.sendLinkToClient')}
                </p>
              </div>

              {selectedClient && (
                <div className="text-sm text-gray-600">
                  <strong>{t('payments.client')}:</strong> {selectedClient.first_name} {selectedClient.last_name}
                  <br />
                  <strong>{t('payments.amount')}:</strong> ₪{amount}
                </div>
              )}

              <div>
                <Label>{t('payments.createLink')}</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={paymentLink} readOnly className="flex-1 text-sm w-full" />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex gap-2">
                  <Button type="button" onClick={copyLink} variant="outline" className="flex-1">
                    <Copy className="w-4 h-4 ml-2" />
                    {t('payments.copyLink')}
                  </Button>
                  <Button type="button" onClick={sendSMS} variant="outline" className="flex-1">
                    <MessageSquare className="w-4 h-4 ml-2" />
                    {t('sms.send')} SMS
                  </Button>
                </div>
                <Button type="button" onClick={sendWhatsApp} variant="outline" className="w-full">
                  <span className="ml-2">💬</span>
                  {language === 'ru' ? 'Отправить WhatsApp' : 'שלח WhatsApp'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="flex gap-3 justify-end p-6 pt-4 border-t shrink-0">
          {!paymentLink ? (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={createPayment.isPending}
                onClick={handleSubmit}
              >
                {createPayment.isPending ? t('payments.creating') : t('payments.createLink')}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                {t('common.close')}
              </Button>
              <Button type="button" onClick={openLink}>
                <ExternalLink className="w-4 h-4 ml-2" />
                {t('payments.openLink')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

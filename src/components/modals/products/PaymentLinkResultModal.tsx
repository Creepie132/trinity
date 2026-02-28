'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, ExternalLink, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import ModalWrapper from '@/components/ModalWrapper'

interface PaymentLinkResultModalProps {
  open: boolean
  onClose: () => void
  paymentLink: string
  amount: number
  clientPhone?: string
  clientName?: string
}

export function PaymentLinkResultModal({
  open,
  onClose,
  paymentLink,
  amount,
  clientPhone,
  clientName,
}: PaymentLinkResultModalProps) {
  const { t, language } = useLanguage()

  const copyLink = () => {
    navigator.clipboard.writeText(paymentLink)
    toast.success(language === 'ru' ? 'Ссылка скопирована' : 'הקישור הועתק')
  }

  const openLink = () => {
    window.open(paymentLink, '_blank')
  }

  const sendSMS = () => {
    if (clientPhone) {
      let cleanPhone = clientPhone.replace(/\D/g, '')
      const smsBody = encodeURIComponent(
        language === 'ru'
          ? `Ссылка для оплаты ₪${amount}: ${paymentLink}`
          : `קישור לתשלום ₪${amount}: ${paymentLink}`
      )
      window.open(`sms:${cleanPhone}?&body=${smsBody}`, '_blank')
    } else {
      toast.error(language === 'ru' ? 'Номер телефона не указан' : 'מספר טלפון לא צוין')
    }
  }

  const sendWhatsApp = () => {
    if (clientPhone) {
      let cleanPhone = clientPhone.replace(/\D/g, '')
      
      if (cleanPhone.startsWith('0')) {
        cleanPhone = cleanPhone.substring(1)
      }
      
      const formattedPhone = `972${cleanPhone}`
      const messageText =
        language === 'ru'
          ? `Ссылка для оплаты ₪${amount}: ${paymentLink}`
          : `קישור לתשלום ₪${amount}: ${paymentLink}`
      
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`
      window.open(whatsappUrl, '_blank')
    } else {
      toast.error(language === 'ru' ? 'Номер телефона не указан' : 'מספר טלפון לא צוין')
    }
  }

  return (
    <ModalWrapper isOpen={open} onClose={onClose}>
      <div className="w-full max-w-md p-6">
        <h2 className="text-2xl font-bold mb-6">
          {language === 'ru' ? 'Ссылка на оплату создана' : 'קישור לתשלום נוצר'}
        </h2>

        <div className="space-y-4">
          {/* Success message */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-300 font-semibold mb-2">
              ✓ {language === 'ru' ? 'Ссылка успешно создана' : 'הקישור נוצר בהצלחה'}
            </p>
            <p className="text-xs text-green-700 dark:text-green-400">
              {language === 'ru'
                ? 'Отправьте ссылку клиенту для оплаты'
                : 'שלח את הקישור ללקוח לתשלום'}
            </p>
          </div>

          {/* Client info */}
          {clientName && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>{language === 'ru' ? 'Клиент' : 'לקוח'}:</strong> {clientName}
              <br />
              <strong>{language === 'ru' ? 'Сумма' : 'סכום'}:</strong> ₪{amount.toFixed(2)}
            </div>
          )}

          {/* Payment link */}
          <div>
            <Label>{language === 'ru' ? 'Ссылка на оплату' : 'קישור לתשלום'}</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={paymentLink}
                readOnly
                className="flex-1 text-sm bg-white dark:bg-gray-800"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" onClick={copyLink} variant="outline">
                <Copy className="w-4 h-4 ml-2" />
                {language === 'ru' ? 'Скопировать' : 'העתק'}
              </Button>
              <Button type="button" onClick={openLink} variant="outline">
                <ExternalLink className="w-4 h-4 ml-2" />
                {language === 'ru' ? 'Открыть' : 'פתח'}
              </Button>
            </div>

            {clientPhone && (
              <>
                <Button
                  type="button"
                  onClick={sendWhatsApp}
                  variant="outline"
                  className="w-full"
                >
                  <span className="ml-2">💬</span>
                  {language === 'ru' ? 'WhatsApp' : 'שלח ב-WhatsApp'}
                </Button>
                <Button type="button" onClick={sendSMS} variant="outline" className="w-full">
                  <MessageSquare className="w-4 h-4 ml-2" />
                  {language === 'ru' ? 'SMS' : 'שלח ב-SMS'}
                </Button>
              </>
            )}
          </div>

          {/* Close button */}
          <div className="flex justify-end pt-4">
            <Button type="button" onClick={onClose}>
              {language === 'ru' ? 'Закрыть' : 'סגור'}
            </Button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  )
}

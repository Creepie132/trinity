'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, ExternalLink, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'

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

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

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
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      style={{ display: open ? 'flex' : 'none' }}
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-900 rounded-[32px] max-h-[90vh] w-full max-w-md overflow-auto shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
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

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <Button type="button" onClick={copyLink} variant="outline" className="w-full">
              <Copy className="w-4 h-4 ml-2" />
              {language === 'ru' ? 'Скопировать ссылку' : 'העתק קישור'}
            </Button>
            <Button type="button" onClick={openLink} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
              <ExternalLink className="w-4 h-4 ml-2" />
              {language === 'ru' ? 'Перейти по ссылке' : 'פתח קישור'}
            </Button>

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
    </div>
  )
}

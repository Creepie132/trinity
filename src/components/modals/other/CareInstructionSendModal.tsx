'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { useCareInstructions } from '@/hooks/useCareInstructions'
import { useLanguage } from '@/contexts/LanguageContext'
import { FileText, MessageCircle, Mail, Send, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { CareInstruction } from '@/types/services'

interface CareInstructionSendModalProps {
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru' | 'en'
  clientPhone?: string
  clientEmail?: string
  clientName: string
}

export function CareInstructionSendModal({
  isOpen,
  onClose,
  locale,
  clientPhone,
  clientEmail,
  clientName
}: CareInstructionSendModalProps) {
  const { t, language } = useLanguage()
  const { data: instructions, isLoading } = useCareInstructions()
  const [selectedInstruction, setSelectedInstruction] = useState<CareInstruction | null>(null)
  const [sending, setSending] = useState(false)

  const handleBack = () => setSelectedInstruction(null)

  const handleClose = () => {
    setSelectedInstruction(null)
    onClose()
  }

  const sendInstruction = async (channel: 'whatsapp' | 'sms' | 'email') => {
    if (!selectedInstruction) return

    const content = language === 'he' 
      ? selectedInstruction.content 
      : (selectedInstruction.content_ru || selectedInstruction.content)

    setSending(true)

    try {
      if (channel === 'whatsapp') {
        if (!clientPhone) { toast.error(t('errors.noPhone')); return }
        const cleanPhone = clientPhone.replace(/\D/g, '')
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(content)}`, '_blank')
        toast.success(t('common.openedWhatsApp'))
      } else if (channel === 'sms') {
        if (!clientPhone) { toast.error(t('errors.noPhone')); return }
        const response = await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: clientPhone, message: content })
        })
        if (!response.ok) throw new Error('Failed to send SMS')
        toast.success(t('common.smsSent'))
      } else if (channel === 'email') {
        if (!clientEmail) { toast.error(t('errors.noEmail')); return }
        const title = language === 'he' ? selectedInstruction.title : (selectedInstruction.title_ru || selectedInstruction.title)
        window.location.href = `mailto:${clientEmail}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(content)}`
        toast.success(t('common.openedEmail'))
      }
      handleClose()
    } catch (error) {
      toast.error(t('errors.somethingWentWrong'))
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          {selectedInstruction && (
            <button onClick={handleBack} className="p-1 hover:bg-gray-100 rounded-full mr-2">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <FileText className="w-5 h-5" />
          {selectedInstruction ? t('careInstructions.sendInstruction') : t('careInstructions.selectInstruction')}
        </div>
      }
      width="520px"
    >
      {isLoading ? (
        <div className="py-8 text-center text-gray-500">{t('common.loading')}...</div>
      ) : !selectedInstruction ? (
        <div className="space-y-2">
          {instructions && instructions.length > 0 ? (
            instructions.map((instruction) => {
              const title = language === 'he' ? instruction.title : (instruction.title_ru || instruction.title)
              const serviceName = instruction.services
                ? (language === 'he' ? instruction.services.name : (instruction.services.name_ru || instruction.services.name))
                : null

              return (
                <button
                  key={instruction.id}
                  onClick={() => setSelectedInstruction(instruction)}
                  className="w-full text-right p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{title}</div>
                      {serviceName && <div className="text-sm text-gray-600 mt-1">{serviceName}</div>}
                    </div>
                  </div>
                </button>
              )
            })
          ) : (
            <div className="py-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">{t('careInstructions.noInstructions')}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <h3 className="font-semibold mb-2">
              {language === 'he' ? selectedInstruction.title : (selectedInstruction.title_ru || selectedInstruction.title)}
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {language === 'he' ? selectedInstruction.content : (selectedInstruction.content_ru || selectedInstruction.content)}
            </p>
          </div>

          {/* Send buttons */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600 mb-3">
              {t('careInstructions.sendTo')}: <strong>{clientName}</strong>
            </p>

            {clientPhone && (
              <>
                <button
                  onClick={() => sendInstruction('whatsapp')}
                  disabled={sending}
                  className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>
                <button
                  onClick={() => sendInstruction('sms')}
                  disabled={sending}
                  className="w-full min-h-[44px] rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" /> SMS
                </button>
              </>
            )}

            {clientEmail && (
              <button
                onClick={() => sendInstruction('email')}
                disabled={sending}
                className="w-full min-h-[44px] rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Mail className="w-4 h-4" /> Email
              </button>
            )}

            {!clientPhone && !clientEmail && (
              <div className="text-center py-4 text-gray-500">{t('errors.noContactInfo')}</div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

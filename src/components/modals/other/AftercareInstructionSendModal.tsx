'use client'

import { useState } from 'react'
import { X, MessageCircle, Mail, MessageSquare, Check } from 'lucide-react'
import { useAftercareInstructions } from '@/hooks/useAftercareInstructions'
import type { AftercareInstruction } from '@/types/aftercare'

interface AftercareInstructionSendModalProps {
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru' | 'en'
  clientPhone?: string
  clientEmail?: string
  clientName: string
}

export function AftercareInstructionSendModal(props: AftercareInstructionSendModalProps) {
  const { isOpen, onClose, locale, clientPhone, clientEmail, clientName } = props
  const [selectedInstruction, setSelectedInstruction] = useState<AftercareInstruction | null>(null)
  const { data: instructions = [], isLoading } = useAftercareInstructions()

  if (!isOpen) return null

  const l = locale === 'he'

  const t = {
    he: {
      title: 'בחר מסמך נלווה',
      selectInstruction: 'בחר הוראות טיפול',
      sendVia: 'שלח דרך',
      whatsapp: 'WhatsApp',
      sms: 'SMS',
      email: 'Email',
      back: 'חזור',
      loading: 'טוען...',
      noInstructions: 'אין הוראות טיפול זמינות',
      noPhone: 'אין מספר טלפון',
      noEmail: 'אין כתובת אימייל',
    },
    ru: {
      title: 'Выберите сопроводительный документ',
      selectInstruction: 'Выберите инструкции по уходу',
      sendVia: 'Отправить через',
      whatsapp: 'WhatsApp',
      sms: 'SMS',
      email: 'Email',
      back: 'Назад',
      loading: 'Загрузка...',
      noInstructions: 'Нет доступных инструкций',
      noPhone: 'Нет номера телефона',
      noEmail: 'Нет адреса электронной почты',
    },
    en: {
      title: 'Select Aftercare Document',
      selectInstruction: 'Select care instructions',
      sendVia: 'Send via',
      whatsapp: 'WhatsApp',
      sms: 'SMS',
      email: 'Email',
      back: 'Back',
      loading: 'Loading...',
      noInstructions: 'No instructions available',
      noPhone: 'No phone number',
      noEmail: 'No email address',
    }
  }

  const text = t[locale]

  const handleSendWhatsApp = () => {
    if (!selectedInstruction || !clientPhone) return
    const content = locale === 'ru' ? (selectedInstruction.content_ru || selectedInstruction.content) : selectedInstruction.content
    const cleanPhone = clientPhone.replace(/[^0-9]/g, '')
    // Remove leading 0 if present and add 972
    const phoneWithCountryCode = cleanPhone.startsWith('0') ? `972${cleanPhone.slice(1)}` : cleanPhone
    window.open(
      `https://wa.me/${phoneWithCountryCode}?text=${encodeURIComponent(content)}`,
      '_blank'
    )
    onClose()
  }

  const handleSendSMS = () => {
    if (!selectedInstruction || !clientPhone) return
    const content = locale === 'ru' ? (selectedInstruction.content_ru || selectedInstruction.content) : selectedInstruction.content
    window.location.href = `sms:${clientPhone}?body=${encodeURIComponent(content)}`
    onClose()
  }

  const handleSendEmail = () => {
    if (!selectedInstruction) return
    const content = locale === 'ru' ? (selectedInstruction.content_ru || selectedInstruction.content) : selectedInstruction.content
    const title = locale === 'ru' ? (selectedInstruction.title_ru || selectedInstruction.title) : selectedInstruction.title
    const recipient = clientEmail || ''
    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(content)}`
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      dir={l ? 'rtl' : 'ltr'}
    >
      <div
        className="relative bg-white rounded-[32px] shadow-xl w-full max-w-[480px] max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-600 transition"
        >
          <X size={20} />
        </button>

        <div className="p-6 space-y-4">
          {/* Title */}
          <h2 className="text-2xl font-bold pr-8">{text.title}</h2>

          {/* Step 1: Select instruction */}
          {!selectedInstruction && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">{text.selectInstruction}</p>
              
              {isLoading && (
                <p className="text-center py-8 text-slate-400">{text.loading}</p>
              )}

              {!isLoading && instructions.length === 0 && (
                <p className="text-center py-8 text-slate-400">{text.noInstructions}</p>
              )}

              {!isLoading && instructions.length > 0 && (
                <div className="space-y-2">
                  {instructions.map((instruction) => (
                    <button
                      key={instruction.id}
                      onClick={() => setSelectedInstruction(instruction)}
                      className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition text-start border-2 border-transparent hover:border-blue-500"
                    >
                      <p className="font-semibold text-sm">
                        {locale === 'ru' ? (instruction.title_ru || instruction.title) : instruction.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {locale === 'ru' ? (instruction.content_ru || instruction.content) : instruction.content}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Send via... */}
          {selectedInstruction && (
            <div className="space-y-4">
              {/* Selected instruction display */}
              <div className="p-4 rounded-2xl bg-blue-50 border-2 border-blue-500">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {locale === 'ru' ? (selectedInstruction.title_ru || selectedInstruction.title) : selectedInstruction.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-3">
                      {locale === 'ru' ? (selectedInstruction.content_ru || selectedInstruction.content) : selectedInstruction.content}
                    </p>
                  </div>
                  <Check size={20} className="text-blue-600 ml-2 flex-shrink-0" />
                </div>
              </div>

              <p className="text-sm text-slate-500 font-medium">{text.sendVia}</p>

              {/* Send buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleSendWhatsApp}
                  disabled={!clientPhone}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-green-50 text-green-600 hover:bg-green-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle size={18} />
                  <span className="font-semibold">{text.whatsapp}</span>
                  {!clientPhone && <span className="text-xs">({text.noPhone})</span>}
                </button>

                <button
                  onClick={handleSendSMS}
                  disabled={!clientPhone}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageSquare size={18} />
                  <span className="font-semibold">{text.sms}</span>
                  {!clientPhone && <span className="text-xs">({text.noPhone})</span>}
                </button>

                <button
                  onClick={handleSendEmail}
                  disabled={!clientEmail}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mail size={18} />
                  <span className="font-semibold">{text.email}</span>
                  {!clientEmail && <span className="text-xs">({text.noEmail})</span>}
                </button>
              </div>

              {/* Back button */}
              <button
                onClick={() => setSelectedInstruction(null)}
                className="w-full py-3 rounded-2xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition"
              >
                ← {text.back}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

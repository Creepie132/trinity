'use client'

import { useModalStore } from '@/store/useModalStore'
import { Pencil, X, Phone, MessageCircle, MessageSquare, Trash2 } from 'lucide-react'
import { getClientName, getClientInitials } from '@/lib/client-utils'
import { useEffect, useState } from 'react'
import { GdprDeleteDialog } from '@/components/clients/GdprDeleteDialog'

export function ClientDetailsModal() {
  const { isModalOpen, closeModal, getModalData, openModal } = useModalStore()
  const [showGdprDialog, setShowGdprDialog] = useState(false)
  
  const isOpen = isModalOpen('client-details')
  const data = getModalData('client-details')

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])
  
  if (!data?.client || !isOpen) return null

  const { client, locale = 'he' } = data

  const clientName = getClientName(client)
  const initials = getClientInitials(client)

  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-cyan-500',
  ]
  const colorIndex = clientName.charCodeAt(0) % colors.length
  const avatarColor = colors[colorIndex]

  const visitsCount = client.visits_count || client.total_visits || 0
  const totalPaid = client.total_paid || 0

  const t = {
    he: {
      information: 'מידע',
      visits: 'ביקורים',
      totalPaid: 'סה"כ שולם',
      notes: 'הערות',
      createdAt: 'תאריך יצירה',
      edit: 'ערוך',
      delete: 'מחק',
      status: 'סטטוס',
      active: 'פעיל',
      call: 'התקשר',
      whatsapp: 'WhatsApp',
      sms: 'SMS',
    },
    ru: {
      information: 'Информация',
      visits: 'Визитов',
      totalPaid: 'Всего оплачено',
      notes: 'Заметки',
      createdAt: 'Дата создания',
      edit: 'Редактировать',
      delete: 'Удалить',
      status: 'Статус',
      active: 'Активен',
      call: 'Позвонить',
      whatsapp: 'WhatsApp',
      sms: 'SMS',
    },
    en: {
      information: 'Information',
      visits: 'Visits',
      totalPaid: 'Total Paid',
      notes: 'Notes',
      createdAt: 'Date Created',
      edit: 'Edit',
      delete: 'Delete',
      status: 'Status',
      active: 'Active',
      call: 'Call',
      whatsapp: 'WhatsApp',
      sms: 'SMS',
    },
  }

  const text = t[locale as keyof typeof t] || t.he

  const handleEditClick = () => {
    closeModal('client-details')
    openModal('client-edit', { client })
  }

  const handleCall = () => {
    if (client.phone) {
      window.location.href = `tel:${client.phone}`
    }
  }

  const handleWhatsApp = () => {
    if (client.phone) {
      const cleanPhone = client.phone.replace(/\D/g, '')
      const whatsappPhone = cleanPhone.startsWith('0') 
        ? '972' + cleanPhone.substring(1) 
        : '972' + cleanPhone
      window.open(`https://wa.me/${whatsappPhone}`, '_blank')
    }
  }

  const handleSMS = () => {
    if (client.phone) {
      window.location.href = `sms:${client.phone}`
    }
  }

  const handleDeleteClick = () => {
    setShowGdprDialog(true)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={() => closeModal('client-details')}
      >
        <div
          className="w-full max-w-[480px] max-h-[85vh] bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ШАПКА - Fixed Header */}
          <div className="flex-shrink-0 px-6 pt-3 pb-6 border-b border-gray-200 dark:border-gray-800">
            {/* Close Button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => closeModal('client-details')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Avatar + Name + Status */}
            <div className="flex items-center gap-4">
              {/* Avatar 56px */}
              <div
                className={`${avatarColor} w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}
              >
                {initials}
              </div>

              {/* Name + Status */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold truncate">{clientName}</h2>
                <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium mt-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  {text.active}
                </div>
              </div>
            </div>
          </div>

          {/* ТЕЛО - Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Секция "Информация" */}
            <div className="mb-4">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 tracking-wider uppercase">
                {text.information}
              </h3>
              
              <div className="space-y-2">
                {/* Визитов */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{text.visits}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {visitsCount}
                  </span>
                </div>

                {/* Всего оплачено */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{text.totalPaid}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {totalPaid} ₪
                  </span>
                </div>
              </div>
            </div>

            {/* Секция "Заметки" */}
            {(client.notes || true) && (
              <div className="mb-4">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 tracking-wider uppercase">
                  {text.notes}
                </h3>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {client.notes || '—'}
                  </p>
                </div>
              </div>
            )}

            {/* Дата создания */}
            {client.created_at && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="text-sm text-gray-600 dark:text-gray-400">{text.createdAt}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {new Date(client.created_at).toLocaleDateString(
                    locale === 'he' ? 'he-IL' : locale === 'ru' ? 'ru-RU' : 'en-US'
                  )}
                </span>
              </div>
            )}
          </div>

          {/* ФУТЕР - Fixed Footer */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
            {/* Ряд 1: Редактировать + Удалить */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleEditClick}
                className="flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-2xl font-medium hover:opacity-90 transition text-sm"
              >
                <Pencil size={16} />
                {text.edit}
              </button>

              <button
                onClick={handleDeleteClick}
                className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-2xl font-medium transition text-sm"
              >
                <Trash2 size={16} />
                {text.delete}
              </button>
            </div>

            {/* Ряд 2: Позвонить + WhatsApp + SMS */}
            {client.phone && (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleCall}
                  className="flex flex-col items-center justify-center gap-1 p-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition"
                >
                  <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-[10px] font-medium text-blue-900 dark:text-blue-100">
                    {text.call}
                  </span>
                </button>

                <button
                  onClick={handleWhatsApp}
                  className="flex flex-col items-center justify-center gap-1 p-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition"
                >
                  <MessageCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-[10px] font-medium text-green-900 dark:text-green-100">
                    {text.whatsapp}
                  </span>
                </button>

                <button
                  onClick={handleSMS}
                  className="flex flex-col items-center justify-center gap-1 p-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-xl transition"
                >
                  <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-[10px] font-medium text-purple-900 dark:text-purple-100">
                    {text.sms}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GDPR Delete Dialog */}
      <GdprDeleteDialog
        open={showGdprDialog}
        onOpenChange={setShowGdprDialog}
        clientId={client.id}
        clientName={clientName}
        locale={locale as 'he' | 'ru'}
      />
    </>
  )
}

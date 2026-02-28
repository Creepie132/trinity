'use client'

import { useModalStore } from '@/store/useModalStore'
import { Pencil, X, Phone, MessageCircle, MessageSquare, Mail, Trash2 } from 'lucide-react'
import { getClientName, getClientInitials } from '@/lib/client-utils'
import { useEffect, useState } from 'react'
import { GdprDeleteDialog } from '@/components/clients/GdprDeleteDialog'

export function ClientDetailsModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
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

  const { client, locale = 'he', enabledModules = {} } = data

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

  const t = {
    he: {
      contacts: 'קשר',
      call: 'התקשר',
      whatsapp: 'WhatsApp',
      sms: 'SMS',
      sendEmail: 'שלח אימייל',
      information: 'מידע',
      visits: 'ביקורים',
      lastVisit: 'ביקור אחרון',
      totalPaid: 'סה"כ שולם',
      notes: 'הערות',
      createdAt: 'תאריך יצירה',
      actions: 'פעולות',
      edit: 'ערוך',
      deleteGdpr: 'מחק (GDPR)',
      status: 'סטטוס',
      active: 'פעיל',
    },
    ru: {
      contacts: 'КОНТАКТЫ',
      call: 'Позвонить',
      whatsapp: 'WhatsApp',
      sms: 'SMS',
      sendEmail: 'Отправить Email',
      information: 'ИНФОРМАЦИЯ',
      visits: 'Визитов',
      lastVisit: 'Последний визит',
      totalPaid: 'Всего оплачено',
      notes: 'Заметки',
      createdAt: 'Дата создания',
      actions: 'ДЕЙСТВИЯ',
      edit: 'Редактировать',
      deleteGdpr: 'Удалить (GDPR)',
      status: 'Статус',
      active: 'Активен',
    },
  }

  const text = t[locale as 'he' | 'ru'] || t.he

  const handleEditClick = () => {
    closeModal('client-details')
    const editModal = useModalStore.getState().openModal
    editModal('client-edit', { client })
  }

  const handleCall = () => {
    if (client.phone) {
      window.location.href = `tel:${client.phone}`
    }
  }

  const handleWhatsApp = () => {
    if (client.phone) {
      // Remove leading 0 and add 972 for Israeli numbers
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

  const handleEmail = () => {
    if (client.email) {
      window.location.href = `mailto:${client.email}`
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
          className="w-[560px] max-w-full h-[90vh] bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Fixed */}
          <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1" />
              <button
                onClick={() => closeModal('client-details')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Avatar + Name + Status */}
            <div className="flex flex-col items-center text-center">
              <div
                className={`${avatarColor} w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-3`}
              >
                {initials}
              </div>
              <h2 className="text-2xl font-bold mb-1">{clientName}</h2>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                {text.active}
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* Contacts Section */}
            {client.phone && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 tracking-wider">
                  {text.contacts}
                </h3>
                
                {/* Contact Buttons Row */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button
                    onClick={handleCall}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-2xl transition group"
                  >
                    <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition" />
                    <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                      {text.call}
                    </span>
                  </button>

                  <button
                    onClick={handleWhatsApp}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-2xl transition group"
                  >
                    <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400 group-hover:scale-110 transition" />
                    <span className="text-xs font-medium text-green-900 dark:text-green-100">
                      {text.whatsapp}
                    </span>
                  </button>

                  <button
                    onClick={handleSMS}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-2xl transition group"
                  >
                    <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition" />
                    <span className="text-xs font-medium text-purple-900 dark:text-purple-100">
                      SMS
                    </span>
                  </button>
                </div>

                {/* Email Button - Full Width if exists */}
                {client.email && (
                  <button
                    onClick={handleEmail}
                    className="w-full flex items-center justify-center gap-2 p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition group"
                  >
                    <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:scale-110 transition" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {text.sendEmail}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Information Section */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 tracking-wider">
                {text.information}
              </h3>
              
              <div className="space-y-3">
                {/* Visits */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{text.visits}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {visitsCount}
                  </span>
                </div>

                {/* Last Visit */}
                {client.last_visit && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{text.lastVisit}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {new Date(client.last_visit).toLocaleDateString(
                        locale === 'he' ? 'he-IL' : 'ru-RU'
                      )}
                    </span>
                  </div>
                )}

                {/* Total Paid */}
                {client.total_paid !== undefined && client.total_paid !== null && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{text.totalPaid}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      ₪{client.total_paid}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {client.notes && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                      {text.notes}
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                      {client.notes}
                    </p>
                  </div>
                )}

                {/* Created At */}
                {client.created_at && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{text.createdAt}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {new Date(client.created_at).toLocaleDateString(
                        locale === 'he' ? 'he-IL' : 'ru-RU'
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons - Fixed at Bottom */}
          <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
            <button
              onClick={handleEditClick}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-2xl font-medium hover:opacity-90 transition"
            >
              <Pencil size={18} />
              {text.edit}
            </button>

            <button
              onClick={handleDeleteClick}
              className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-2xl font-medium transition"
            >
              <Trash2 size={18} />
              {text.deleteGdpr}
            </button>
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

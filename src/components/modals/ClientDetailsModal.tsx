'use client'

import { useModalStore } from '@/store/useModalStore'
import Modal from '@/components/ui/Modal'
import { Pencil, Phone, MessageCircle, MessageSquare, Trash2, ShoppingCart } from 'lucide-react'
import { getClientName, getClientInitials } from '@/lib/client-utils'
import { useState } from 'react'
import { GdprDeleteDialog } from '@/components/clients/GdprDeleteDialog'

export function ClientDetailsModal() {
  const { isModalOpen, closeModal, getModalData, openModal } = useModalStore()
  const [showGdprDialog, setShowGdprDialog] = useState(false)
  
  const isOpen = isModalOpen('client-details')
  const data = getModalData('client-details')
  
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
      sale: 'עסקה',
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
      sale: 'Продажа',
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
      sale: 'Sale',
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

  const handleSaleClick = () => {
    closeModal('client-details')
    openModal('client-sale', { client, locale })
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
      <Modal
        open={isOpen}
        onClose={() => closeModal('client-details')}
        showCloseButton={true}
        width="480px"
        footer={
          <div className="space-y-2">
            {/* Ряд 1: Редактировать + Продажа + Удалить */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleEditClick}
                className="flex flex-col items-center justify-center gap-1 p-3 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-xl transition"
              >
                <Pencil className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-[10px] font-medium text-indigo-900 dark:text-indigo-100">
                  {text.edit}
                </span>
              </button>

              <button
                onClick={handleSaleClick}
                className="flex flex-col items-center justify-center gap-1 p-3 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-xl transition"
              >
                <ShoppingCart className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-[10px] font-medium text-amber-900 dark:text-amber-100">
                  {text.sale}
                </span>
              </button>

              <button
                onClick={handleDeleteClick}
                className="flex flex-col items-center justify-center gap-1 p-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition"
              >
                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-[10px] font-medium text-red-900 dark:text-red-100">
                  {text.delete}
                </span>
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
        }
      >
        {/* ШАПКА с аватаром */}
        <div className="flex items-center gap-4 mb-6">
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

        {/* Секция "Информация" */}
        <div className="mb-4">
          <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 tracking-wider uppercase">
            {text.information}
          </h3>
          
          <div className="space-y-2">
            {/* Email */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {client.email || '—'}
              </span>
            </div>

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
      </Modal>

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

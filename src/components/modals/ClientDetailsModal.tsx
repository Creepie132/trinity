'use client'

import { useModalStore } from '@/store/useModalStore'
import { Calendar, Clock, Phone, Mail, CalendarPlus, Pencil, X } from 'lucide-react'
import { getClientName, getClientInitials } from '@/lib/client-utils'
import { useEffect } from 'react'

export function ClientDetailsModal() {
  const { isModalOpen, closeModal, getModalData, openModal } = useModalStore()
  
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
      visits: 'ביקורים',
      lastVisit: 'ביקור אחרון',
      newVisit: 'קבע ביקור חדש',
      edit: 'ערוך פרטים',
      notes: 'הערות',
      createdAt: 'נוצר',
      totalPaid: 'סה"כ שולם',
      clientDetails: 'פרטי לקוח',
    },
    ru: {
      visits: 'Визитов',
      lastVisit: 'Последний визит',
      newVisit: 'Новый визит',
      edit: 'Редактировать',
      notes: 'Заметки',
      createdAt: 'Создан',
      totalPaid: 'Всего оплачено',
      clientDetails: 'Детали клиента',
    },
  }

  const text = t[locale as 'he' | 'ru'] || t.he

  const handleEditClick = () => {
    closeModal('client-details')
    openModal('client-edit', { client })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => closeModal('client-details')}
    >
      <div
        className="w-[400px] max-w-[90vw] h-[600px] max-h-[90vh] bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold">{text.clientDetails}</h2>
          <button
            onClick={() => closeModal('client-details')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-6">
          <div className="flex flex-col items-center mb-6">
            <div
              className={`${avatarColor} w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-3`}
            >
              {initials}
            </div>
            <h3 className="text-2xl font-bold text-center">{clientName}</h3>
          </div>

          <div className="space-y-4 mb-6">
          {client.phone && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Phone size={18} className="text-muted-foreground" />
              <span className="text-sm">{client.phone}</span>
            </div>
          )}

          {client.email && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Mail size={18} className="text-muted-foreground" />
              <span className="text-sm">{client.email}</span>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Calendar size={18} className="text-muted-foreground" />
            <span className="text-sm">
              {text.visits}: {visitsCount}
            </span>
          </div>

          {client.last_visit && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Clock size={18} className="text-muted-foreground" />
              <span className="text-sm">
                {text.lastVisit}:{' '}
                {new Date(client.last_visit).toLocaleDateString(
                  locale === 'he' ? 'he-IL' : 'ru-RU'
                )}
              </span>
            </div>
          )}

          {client.total_paid && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm font-medium">
                {text.totalPaid}: ₪{client.total_paid}
              </span>
            </div>
          )}

          {client.notes && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm font-medium mb-1">{text.notes}:</p>
              <p className="text-sm text-muted-foreground">{client.notes}</p>
            </div>
          )}

          {client.created_at && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-muted-foreground">
                {text.createdAt}:{' '}
                {new Date(client.created_at).toLocaleDateString(
                  locale === 'he' ? 'he-IL' : 'ru-RU'
                )}
              </p>
            </div>
          )}
          </div>

          <div className="space-y-2">
            <button
              onClick={handleEditClick}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:opacity-90 transition"
            >
              <Pencil size={18} />
              {text.edit}
            </button>

            {enabledModules.appointments && (
              <button
                onClick={() => closeModal('client-details')}
                className="w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-3 rounded-lg font-medium hover:opacity-90 transition"
              >
                <CalendarPlus size={18} />
                {text.newVisit}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

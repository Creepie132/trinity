'use client'

import { useState } from 'react'
import { Calendar, Clock, Phone, MessageCircle, CalendarPlus, Pencil, ChevronRight, X, Mail } from 'lucide-react'
import { getClientName, getClientInitials } from '@/lib/client-utils'
import ModalWrapper from '../ModalWrapper'

interface ClientCardProps {
  client: {
    id: string
    first_name?: string
    last_name?: string
    name?: string // legacy
    phone?: string
    email?: string
    visits_count?: number
    total_visits?: number
    last_visit?: string
    notes?: string
    created_at?: string
    total_paid?: string | number
  }
  locale: 'he' | 'ru'
  isDemo?: boolean
  enabledModules?: Record<string, boolean>
  onSelect: (client: any) => void
}

export function ClientCard({
  client,
  locale,
  isDemo,
  enabledModules,
  onSelect,
}: ClientCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

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
      call: 'התקשר',
      whatsapp: 'WhatsApp',
      email: 'אימייל',
      newVisit: 'קבע ביקור חדש',
      edit: 'ערוך פרטים',
      notes: 'הערות',
      createdAt: 'נוצר',
      totalPaid: 'סה"כ שולם',
      clientDetails: 'פרטי לקוח',
      actions: 'פעולות',
    },
    ru: {
      visits: 'Визитов',
      lastVisit: 'Последний визит',
      call: 'Позвонить',
      whatsapp: 'WhatsApp',
      email: 'Email',
      newVisit: 'Новый визит',
      edit: 'Редактировать',
      notes: 'Заметки',
      createdAt: 'Создан',
      totalPaid: 'Всего оплачено',
      clientDetails: 'Детали клиента',
      actions: 'Действия',
    },
  }

  const text = t[locale]

  const handleCardClick = () => {
    setIsModalOpen(true)
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsModalOpen(false)
    onSelect(client)
  }

  return (
    <>
      <div
        onClick={handleCardClick}
        className="bg-card border rounded-xl p-4 mb-2 active:bg-muted/50 transition cursor-pointer"
      >
        {/* Header: Аватар + Имя + Телефон */}
        <div className="flex items-center gap-3">
          {/* Аватар */}
          <div
            className={`${avatarColor} w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
          >
            {initials}
          </div>

          {/* Имя и телефон */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-base truncate">{clientName}</h4>
            {client.phone && (
              <p className="text-sm text-muted-foreground truncate">{client.phone}</p>
            )}
          </div>

          <ChevronRight className="text-muted-foreground flex-shrink-0" size={18} />
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-muted">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar size={13} />
            <span>
              {text.visits}: {visitsCount}
            </span>
          </div>

          {client.last_visit && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock size={13} />
              <span>
                {new Date(client.last_visit).toLocaleDateString(
                  locale === 'he' ? 'he-IL' : 'ru-RU'
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      <ModalWrapper isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="w-full max-w-md p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">{text.clientDetails}</h2>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Аватар и имя */}
          <div className="flex flex-col items-center mb-6">
            <div
              className={`${avatarColor} w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-3`}
            >
              {initials}
            </div>
            <h3 className="text-2xl font-bold text-center">{clientName}</h3>
          </div>

          {/* Информация */}
          <div className="space-y-4 mb-6">
            {client.phone && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone size={18} className="text-muted-foreground" />
                <span className="text-sm">{client.phone}</span>
              </div>
            )}

            {client.email && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail size={18} className="text-muted-foreground" />
                <span className="text-sm">{client.email}</span>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar size={18} className="text-muted-foreground" />
              <span className="text-sm">
                {text.visits}: {visitsCount}
              </span>
            </div>

            {client.last_visit && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
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
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">
                  {text.totalPaid}: ₪{client.total_paid}
                </span>
              </div>
            )}

            {client.notes && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-1">{text.notes}:</p>
                <p className="text-sm text-muted-foreground">{client.notes}</p>
              </div>
            )}

            {client.created_at && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  {text.createdAt}:{' '}
                  {new Date(client.created_at).toLocaleDateString(
                    locale === 'he' ? 'he-IL' : 'ru-RU'
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Действия */}
          <div className="space-y-2">
            <button
              onClick={handleEditClick}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:opacity-90 transition"
            >
              <Pencil size={18} />
              {text.edit}
            </button>

            {enabledModules?.appointments && (
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  // Здесь можно добавить логику для создания нового визита
                }}
                className="w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-3 rounded-lg font-medium hover:opacity-90 transition"
              >
                <CalendarPlus size={18} />
                {text.newVisit}
              </button>
            )}
          </div>
        </div>
      </ModalWrapper>
    </>
  )
}

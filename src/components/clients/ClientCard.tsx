'use client'

import { useState } from 'react'
import { Calendar, Clock, Phone, MessageCircle, Mail, ChevronRight, Edit, Eye, CalendarPlus, Pencil } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/button'

interface ClientCardProps {
  client: {
    id: string
    name: string
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
  onEdit?: (client: any) => void
  onClick?: (client: any) => void
}

export function ClientCard({
  client,
  locale,
  isDemo,
  enabledModules,
  onEdit,
  onClick,
}: ClientCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  // Инициалы из имени
  const initials = client.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Цвет аватара — генерируем из имени (стабильный)
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-cyan-500',
  ]
  const colorIndex = client.name.charCodeAt(0) % colors.length
  const avatarColor = colors[colorIndex]

  const visitsCount = client.visits_count || client.total_visits || 0

  const handleCardClick = () => {
    if (onClick) {
      onClick(client)
    }
    setSheetOpen(true)
  }

  const t = {
    he: {
      visits: 'ביקורים',
      lastVisit: 'ביקור אחרון',
      call: 'התקשר',
      whatsapp: 'WhatsApp',
      email: 'אימייל',
      sms: 'SMS',
      view: 'צפה',
      edit: 'ערוך',
      phone: 'טלפון',
      notes: 'הערות',
      createdAt: 'תאריך הוספה',
      totalSpent: 'סה"כ הוצא',
      noPhone: 'אין טלפון',
      noEmail: 'אין אימייל',
      noNotes: 'אין הערות',
    },
    ru: {
      visits: 'Визитов',
      lastVisit: 'Последний визит',
      call: 'Позвонить',
      whatsapp: 'WhatsApp',
      email: 'Email',
      sms: 'SMS',
      view: 'Просмотр',
      edit: 'Редактировать',
      phone: 'Телефон',
      notes: 'Заметки',
      createdAt: 'Дата добавления',
      totalSpent: 'Всего потрачено',
      noPhone: 'Нет телефона',
      noEmail: 'Нет email',
      noNotes: 'Нет заметок',
    },
  }

  const text = t[locale]

  return (
    <>
      {/* Карточка — вся кликабельная */}
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
            <h4 className="font-semibold text-base truncate">{client.name}</h4>
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

        {/* Action Bar — иконки-кнопки */}
        <div className="flex items-center gap-2 mt-3">
          {/* Звонок */}
          {client.phone && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                window.location.href = `tel:${client.phone}`
              }}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 transition"
              title={text.call}
            >
              <Phone size={16} />
            </button>
          )}

          {/* WhatsApp */}
          {client.phone && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const phone = client.phone?.replace(/[^0-9]/g, '')
                window.open(`https://wa.me/${phone}`, '_blank')
              }}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 transition"
              title={text.whatsapp}
            >
              <MessageCircle size={16} />
            </button>
          )}

          {/* Email */}
          {client.email && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                window.location.href = `mailto:${client.email}`
              }}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-100 transition"
              title={text.email}
            >
              <Mail size={16} />
            </button>
          )}

          {/* Записать на визит — только если модуль visits включён и не demo */}
          {enabledModules?.visits !== false && !isDemo && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                // Navigate to new visit with client preselected
                if (onClick) onClick(client)
              }}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 transition"
              title={locale === 'he' ? 'קבע ביקור' : 'Записать'}
            >
              <CalendarPlus size={16} />
            </button>
          )}

          {/* Редактировать */}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(client)
              }}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition ms-auto"
              title={locale === 'he' ? 'ערוך' : 'Редактировать'}
            >
              <Pencil size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Sheet - Детали */}
      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)}>
        {/* Большой аватар */}
        <div className="flex flex-col items-center mb-6">
          <div
            className={`${avatarColor} w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-3`}
          >
            {initials}
          </div>
          <h3 className="text-xl font-bold text-center">{client.name}</h3>
          {client.phone && (
            <p className="text-muted-foreground text-center">{client.phone}</p>
          )}
        </div>

        {/* Все поля */}
        <div className="space-y-1 mb-6">
          {client.email && (
            <div className="flex justify-between py-2.5 border-b border-muted">
              <span className="text-sm text-muted-foreground">{text.email}</span>
              <a
                href={`mailto:${client.email}`}
                className="text-sm text-primary hover:underline"
              >
                {client.email}
              </a>
            </div>
          )}

          <div className="flex justify-between py-2.5 border-b border-muted">
            <span className="text-sm text-muted-foreground">{text.visits}</span>
            <span className="text-sm font-medium">{visitsCount}</span>
          </div>

          {client.last_visit && (
            <div className="flex justify-between py-2.5 border-b border-muted">
              <span className="text-sm text-muted-foreground">{text.lastVisit}</span>
              <span className="text-sm">
                {new Date(client.last_visit).toLocaleDateString(
                  locale === 'he' ? 'he-IL' : 'ru-RU'
                )}
              </span>
            </div>
          )}

          {client.created_at && (
            <div className="flex justify-between py-2.5 border-b border-muted">
              <span className="text-sm text-muted-foreground">{text.createdAt}</span>
              <span className="text-sm">
                {new Date(client.created_at).toLocaleDateString(
                  locale === 'he' ? 'he-IL' : 'ru-RU'
                )}
              </span>
            </div>
          )}

          {client.notes && (
            <div className="py-2.5">
              <span className="text-sm text-muted-foreground block mb-1">
                {text.notes}
              </span>
              <p className="text-sm">{client.notes}</p>
            </div>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="space-y-2">
          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition"
            >
              <Phone size={18} />
              {text.call}
            </a>
          )}

          {client.phone && (
            <button
              onClick={() => {
                const phone = client.phone?.replace(/[^0-9]/g, '')
                window.open(`https://wa.me/${phone}`, '_blank')
              }}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition"
            >
              <MessageCircle size={18} />
              {text.whatsapp}
            </button>
          )}

          {onClick && (
            <Button
              onClick={() => {
                onClick(client)
                setSheetOpen(false)
              }}
              variant="outline"
              className="w-full py-3"
            >
              <Eye className="w-4 h-4 me-2" />
              {text.view}
            </Button>
          )}

          {onEdit && (
            <Button
              onClick={() => {
                onEdit(client)
                setSheetOpen(false)
              }}
              variant="outline"
              className="w-full py-3"
            >
              <Pencil className="w-4 h-4 me-2" />
              {text.edit}
            </Button>
          )}
        </div>
      </BottomSheet>
    </>
  )
}

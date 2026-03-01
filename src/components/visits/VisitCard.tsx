'use client'

import { useState } from 'react'
import { Clock, User, ChevronRight, Play, CheckCircle, X, Phone, MessageCircle, Pencil } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EditVisitSheet } from './EditVisitSheet'
import { useVisitServices } from '@/hooks/useVisitServices'

interface VisitCardProps {
  visit: {
    id: string
    client_name?: string
    client_phone?: string
    service_name?: string
    scheduled_at: string
    duration_minutes?: number
    status: string // scheduled | in_progress | completed | cancelled
    notes?: string | null
    price?: number
    created_at?: string
    clients?: {
      first_name?: string
      last_name?: string
      phone?: string
    }
    service_type?: string
    services?: {
      id: string
      name: string
      name_ru?: string
      duration_minutes?: number
      price?: number
    }
    visit_services?: Array<{
      id: string
      service_name: string
      service_name_ru?: string
      duration_minutes?: number
      price?: number
    }>
  }
  locale: 'he' | 'ru'
  isMeetingMode?: boolean
  onStart?: (id: string) => void
  onComplete?: (id: string) => void
  onCancel?: (id: string) => void
  onEdit?: (visit: any) => void
  onClick?: (visit: any) => void
}

const STATUS_LABELS: Record<string, { he: string; ru: string }> = {
  scheduled: { he: 'מתוכנן', ru: 'Запланирован' },
  in_progress: { he: 'בתהליך', ru: 'В процессе' },
  completed: { he: 'הושלם', ru: 'Завершён' },
  cancelled: { he: 'בוטל', ru: 'Отменён' },
}

export function VisitCard({ visit, locale, isMeetingMode, onStart, onComplete, onCancel, onEdit, onClick }: VisitCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  
  // Fetch visit services
  const { data: visitServices = [] } = useVisitServices(visit.id)
  
  const handleCardClick = () => {
    onClick && onClick(visit)
  }

  // Parse time and date
  const startTime = visit.scheduled_at || ''
  const time = startTime
    ? new Date(startTime).toLocaleTimeString(locale === 'he' ? 'he-IL' : 'ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--'

  const date = startTime
    ? new Date(startTime).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU', {
        day: 'numeric',
        month: 'short',
      })
    : ''
  
  // Calculate end time: start + main service duration + additional services
  const mainDuration = visit.services?.duration_minutes || visit.duration_minutes || 0
  const additionalDuration = visitServices.reduce((sum, service) => sum + (service.duration_minutes || 0), 0)
  const totalDuration = mainDuration + additionalDuration
  
  const endTime = startTime && totalDuration > 0
    ? new Date(new Date(startTime).getTime() + totalDuration * 60000).toLocaleTimeString(locale === 'he' ? 'he-IL' : 'ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  // Client info
  const clientName =
    visit.client_name ||
    (visit.clients ? `${visit.clients.first_name || ''} ${visit.clients.last_name || ''}`.trim() : null) ||
    (locale === 'he' ? 'לקוח' : 'Клиент')

  const clientPhone = visit.client_phone || visit.clients?.phone || null

  // Helper: check if string is UUID
  const isUUID = (str?: string) => {
    if (!str) return false
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  }

  // Get service name from services table (joined data) or fallback
  // Priority: 1) visit.services JOIN, 2) visit.service_name, 3) empty (never show UUID)
  const serviceName = visit.services 
    ? (locale === 'ru' ? (visit.services.name_ru || visit.services.name) : visit.services.name)
    : (!isUUID(visit.service_name) && visit.service_name) || (!isUUID(visit.service_type) && visit.service_type) || ''
  
  const duration = visit.duration_minutes || 0

  const statusLabel = STATUS_LABELS[visit.status]?.[locale] || visit.status

  const isActive = visit.status === 'scheduled' || visit.status === 'in_progress'
  const isCancelled = visit.status === 'cancelled'

  return (
    <>
      {/* Компактная карточка */}
      <div
        onClick={handleCardClick}
        className={`bg-card border rounded-xl mb-2 active:bg-muted/50 transition cursor-pointer ${
          isCancelled ? 'opacity-50' : ''
        } ${visit.status === 'in_progress' ? 'border-amber-300 dark:border-amber-700' : ''}`}
      >
        <div className="flex items-stretch">
          {/* Левая часть — Таймлайн */}
          <div
            className={`flex flex-col items-center justify-center px-4 py-3 border-e ${
              visit.status === 'in_progress'
                ? 'bg-amber-50 dark:bg-amber-900/20'
                : visit.status === 'completed'
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-muted/30'
            }`}
            style={{ minWidth: '72px' }}
          >
            <span className="text-lg font-bold">{time}</span>
            {duration > 0 && !isMeetingMode && (
              <span className="text-xs text-muted-foreground">
                {duration} {locale === 'he' ? "ד'" : 'мин'}
              </span>
            )}
          </div>

          {/* Центр — Информация */}
          <div className="flex-1 py-3 px-3 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate text-start">{clientName}</p>
                {serviceName && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5 text-start">{serviceName}</p>
                )}
              </div>

              {/* Правая часть — Статус + шеврон */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={visit.status} label={statusLabel} />
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            </div>

            {/* Цена если есть */}
            {visit.price != null && visit.price > 0 && (
              <p className="text-xs font-medium text-primary mt-1 text-start">₪{visit.price}</p>
            )}
          </div>
        </div>
      </div>

      {/* Форма редактирования */}
      <EditVisitSheet
        visit={visit}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          setEditOpen(false)
          window.location.reload()
        }}
        locale={locale}
        isMeetingMode={isMeetingMode}
      />
    </>
  )
}

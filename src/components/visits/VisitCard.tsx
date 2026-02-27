'use client'

import { useState } from 'react'
import { Clock, User, ChevronRight, Play, CheckCircle, X, Phone, MessageCircle, Pencil } from 'lucide-react'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'
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
    notes?: string
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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  
  // Fetch visit services
  const { data: visitServices = [] } = useVisitServices(visit.id)
  
  const handleCardClick = () => {
    if (onClick && typeof window !== 'undefined' && window.innerWidth >= 1024) {
      // Десктоп: вызываем onClick (откроет desktop panel)
      onClick(visit)
    } else {
      // Мобильный: открываем встроенный drawer
      setDrawerOpen(true)
    }
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

  // Get service name from services table (joined data) or fallback
  const serviceName = visit.services 
    ? (locale === 'he' ? visit.services.name : (visit.services.name_ru || visit.services.name))
    : visit.service_name || visit.service_type || ''
  
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

      {/* Bottom Drawer с деталями */}
      <TrinityBottomDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={clientName}
      >
        {/* Статус бейдж */}
        <div className="mb-4">
          <StatusBadge status={visit.status} label={statusLabel} />
        </div>

        {/* Детали */}
        <div className="space-y-1">
          <div className="flex justify-between py-2.5 border-b border-muted">
            <span className="text-sm text-muted-foreground">{locale === 'he' ? 'תאריך' : 'Дата'}</span>
            <span className="text-sm font-medium text-start">{date}</span>
          </div>

          <div className="flex justify-between py-2.5 border-b border-muted">
            <span className="text-sm text-muted-foreground">{locale === 'he' ? 'שעה' : 'Время'}</span>
            <span className="text-sm font-medium text-start">{time}</span>
          </div>

          {totalDuration > 0 && (
            <div className="flex justify-between py-2.5 border-b border-muted">
              <span className="text-sm text-muted-foreground">{locale === 'he' ? 'סיום' : 'Окончание'}</span>
              <span className="text-sm font-medium text-start">{endTime || '—'}</span>
            </div>
          )}

          {duration > 0 && !isMeetingMode && (
            <div className="flex justify-between py-2.5 border-b border-muted">
              <span className="text-sm text-muted-foreground">{locale === 'he' ? 'משך' : 'Длительность'}</span>
              <span className="text-sm text-start">
                {duration} {locale === 'he' ? 'דקות' : 'мин'}
              </span>
            </div>
          )}

          <div className="flex justify-between py-2.5 border-b border-muted">
            <span className="text-sm text-muted-foreground">{locale === 'he' ? 'שירות' : 'Услуга'}</span>
            <span className="text-sm text-start">{serviceName || (locale === 'he' ? 'לא צוין' : 'Не указано')}</span>
          </div>

          {visitServices.length > 0 && (
            <div className="py-2.5 border-b border-muted">
              <span className="text-sm text-muted-foreground block mb-2">{locale === 'he' ? 'שירותים נוספים' : 'Услуги'}</span>
              <div className="space-y-1.5">
                {visitServices.map((service) => (
                  <div key={service.id} className="flex justify-between items-center text-sm">
                    <span className="text-start">
                      {locale === 'ru' ? (service.service_name_ru || service.service_name) : service.service_name}
                    </span>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{service.duration_minutes} {locale === 'he' ? "ד'" : 'мин'}</span>
                      {service.price > 0 && <span className="font-medium text-foreground">₪{service.price}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {visit.price != null && (
            <div className="flex justify-between py-2.5 border-b border-muted">
              <span className="text-sm text-muted-foreground">{locale === 'he' ? 'מחיר' : 'Цена'}</span>
              <span className="text-sm font-bold text-start">₪{visit.price}</span>
            </div>
          )}

          {visit.notes && (
            <div className="py-2.5 border-b border-muted">
              <span className="text-sm text-muted-foreground block mb-1">{locale === 'he' ? 'הערות' : 'Заметки'}</span>
              <p className="text-sm text-start">{visit.notes}</p>
            </div>
          )}
        </div>

        {/* Контакт клиента */}
        {clientPhone && (
          <div className="flex gap-2 mt-4">
            <a
              href={`tel:${clientPhone}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-sm font-medium"
            >
              <Phone size={16} />
              {locale === 'he' ? 'התקשר' : 'Позвонить'}
            </a>
            <button
              onClick={() => {
                setDrawerOpen(false)
                setEditOpen(true)
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-sm font-medium"
            >
              <Pencil size={16} />
              {locale === 'he' ? 'עריכה' : 'Изменить'}
            </button>
            <a
              href={`https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 text-sm font-medium"
            >
              <MessageCircle size={16} />
              WhatsApp
            </a>
          </div>
        )}

        {/* Кнопки действий — outline стиль, в одну строку */}
        <div className="flex gap-2 mt-4">
          {visit.status === 'scheduled' && onStart && (
            <button
              onClick={() => {
                onStart(visit.id)
                setDrawerOpen(false)
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-amber-500 text-amber-600 dark:text-amber-400 font-medium text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"
            >
              <Play size={16} />
              {locale === 'he' ? 'התחל' : 'Начать'}
            </button>
          )}

          {visit.status === 'in_progress' && onComplete && (
            <button
              onClick={() => {
                onComplete(visit.id)
                setDrawerOpen(false)
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-green-500 text-green-600 dark:text-green-400 font-medium text-sm hover:bg-green-50 dark:hover:bg-green-900/20 transition"
            >
              <CheckCircle size={16} />
              {locale === 'he' ? 'סיים' : 'Завершить'}
            </button>
          )}

          {isActive && onCancel && (
            <button
              onClick={() => {
                onCancel(visit.id)
                setDrawerOpen(false)
              }}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-muted text-muted-foreground text-sm hover:bg-muted/50 transition"
            >
              <X size={16} />
              {locale === 'he' ? 'בטל' : 'Отмена'}
            </button>
          )}
        </div>
      </TrinityBottomDrawer>

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

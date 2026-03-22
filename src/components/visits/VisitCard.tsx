'use client'

import { useState } from 'react'
import { ChevronRight, MapPin, Video, Navigation, ExternalLink } from 'lucide-react'
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
    status: string
    notes?: string | null
    price?: number
    created_at?: string
    clients?: { first_name?: string; last_name?: string; phone?: string }
    service_type?: string
    services?: { id: string; name: string; name_ru?: string; duration_minutes?: number; price?: number }
    visit_services?: Array<{ id: string; service_name: string; service_name_ru?: string; duration_minutes?: number; price?: number }>
    event_type?: 'visit' | 'meeting'
    meeting_link?: string | null
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
  scheduled:   { he: 'מתוכנן', ru: 'Запланирован' },
  in_progress: { he: 'בתהליך', ru: 'В процессе' },
  completed:   { he: 'הושלם',  ru: 'Завершён' },
  cancelled:   { he: 'בוטל',   ru: 'Отменён' },
}

// ── Цвет border-left по типу события ──────────────────────────────────────────
const EVENT_ACCENT: Record<string, string> = {
  visit:   '#3b82f6', // blue-500
  meeting: '#10b981', // emerald-500
}

export function VisitCard({ visit, locale, isMeetingMode, onStart, onComplete, onCancel, onEdit, onClick }: VisitCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const { data: visitServices = [] } = useVisitServices(visit.id)

  const isMeeting = visit.event_type === 'meeting'
  const accentColor = EVENT_ACCENT[visit.event_type ?? 'visit']

  const startTime = visit.scheduled_at || ''
  const time = startTime
    ? new Date(startTime).toLocaleTimeString(locale === 'he' ? 'he-IL' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })
    : '--:--'

  const totalDuration = visit.duration_minutes || 0
  const clientName =
    visit.client_name ||
    (visit.clients ? `${visit.clients.first_name || ''} ${visit.clients.last_name || ''}`.trim() : null) ||
    (locale === 'he' ? 'לקוח' : 'Клиент')

  const isUUID = (str?: string) =>
    !!str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

  const serviceName = visit.services
    ? (locale === 'ru' ? (visit.services.name_ru || visit.services.name) : visit.services.name)
    : (!isUUID(visit.service_name) && visit.service_name) || (!isUUID(visit.service_type) && visit.service_type) || ''

  const statusLabel = STATUS_LABELS[visit.status]?.[locale] || visit.status
  const isCancelled = visit.status === 'cancelled'

  // Адрес из notes для визита (формат "Город: ...\nАдрес: ...")
  const locationFromNotes = (() => {
    if (!visit.notes || isMeeting) return null
    const lines = visit.notes.split('\n')
    const addr = lines.find(l => l.startsWith('Адрес:') || l.startsWith('כתובת:'))
    const city = lines.find(l => l.startsWith('Город:') || l.startsWith('עיר:'))
    if (!addr && !city) return null
    return [city?.split(': ')[1], addr?.split(': ')[1]].filter(Boolean).join(', ')
  })()

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!locationFromNotes) return
    const query = encodeURIComponent(locationFromNotes)
    window.open(`https://maps.google.com/?q=${query}`, '_blank')
  }

  const handleJoin = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (visit.meeting_link) window.open(visit.meeting_link, '_blank')
  }

  return (
    <>
      <div
        onClick={() => onClick?.(visit)}
        className={`bg-card border rounded-xl mb-2 active:bg-muted/50 transition cursor-pointer overflow-hidden ${
          isCancelled ? 'opacity-50' : ''
        } ${visit.status === 'in_progress' ? 'border-amber-300 dark:border-amber-700' : ''}`}
        style={{ borderLeftWidth: '4px', borderLeftColor: accentColor }}
      >
        <div className="flex items-stretch">

          {/* Левая часть — время */}
          <div
            className={`flex flex-col items-center justify-center px-3 py-3 border-e min-w-[64px] ${
              visit.status === 'in_progress' ? 'bg-amber-50 dark:bg-amber-900/20'
              : visit.status === 'completed'  ? 'bg-green-50 dark:bg-green-900/20'
              : 'bg-muted/30'
            }`}
          >
            <span className="text-base font-bold leading-tight">{time}</span>
            {totalDuration > 0 && !isMeeting && (
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {totalDuration}{locale === 'he' ? "ד'" : 'м'}
              </span>
            )}
            {/* Иконка типа события */}
            <span className="mt-1" style={{ color: accentColor }}>
              {isMeeting
                ? <Video size={12} />
                : <MapPin size={12} />
              }
            </span>
          </div>

          {/* Центр — информация */}
          <div className="flex-1 py-2.5 px-3 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-semibold text-sm truncate text-start">{clientName}</p>
                  {/* Бейдж Онлайн / Оффлайн */}
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: accentColor + '18',
                      color: accentColor,
                      border: `1px solid ${accentColor}40`,
                    }}
                  >
                    {isMeeting
                      ? (locale === 'he' ? 'אונליין' : 'Онлайн')
                      : (locale === 'he' ? 'אופליין' : 'Оффлайн')
                    }
                  </span>
                </div>
                {serviceName && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5 text-start">{serviceName}</p>
                )}
                {visit.price != null && visit.price > 0 && (
                  <p className="text-xs font-medium text-primary mt-0.5 text-start">₪{visit.price}</p>
                )}
              </div>

              {/* Статус + шеврон */}
              <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                <StatusBadge status={visit.status} label={statusLabel} />
                <ChevronRight size={14} className="text-muted-foreground" />
              </div>
            </div>

            {/* Быстрые действия */}
            {visit.status !== 'cancelled' && visit.status !== 'completed' && (
              <div className="flex items-center gap-2 mt-2">
                {isMeeting && visit.meeting_link && (
                  <button
                    onClick={handleJoin}
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all active:scale-95"
                    style={{ backgroundColor: accentColor + '18', color: accentColor, border: `1px solid ${accentColor}40` }}
                  >
                    <ExternalLink size={10} />
                    {locale === 'he' ? 'הצטרף' : 'Присоединиться'}
                  </button>
                )}
                {!isMeeting && locationFromNotes && (
                  <button
                    onClick={handleNavigate}
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all active:scale-95"
                    style={{ backgroundColor: '#3b82f618', color: '#3b82f6', border: '1px solid #3b82f640' }}
                  >
                    <Navigation size={10} />
                    {locale === 'he' ? 'נווט' : 'Навигация'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <EditVisitSheet
        visit={visit}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => { setEditOpen(false); window.location.reload() }}
        locale={locale}
        isMeetingMode={isMeetingMode}
      />
    </>
  )
}

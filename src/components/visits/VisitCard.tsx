'use client'

import { useRef, useState, useEffect } from 'react'
import { ChevronRight, MapPin, Video, Navigation, ExternalLink, Play, CheckCircle, X } from 'lucide-react'
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
    started_at?: string | null
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

const EVENT_ACCENT: Record<string, string> = {
  visit:   '#3b82f6',
  meeting: '#10b981',
}

const SWIPE_THRESHOLD = 60
const SWIPE_MAX = 88

export function VisitCard({ visit, locale, isMeetingMode, onStart, onComplete, onCancel, onEdit, onClick }: VisitCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const { data: visitServices = [] } = useVisitServices(visit.id)

  const isRtl     = locale === 'he'
  const canAction = visit.status === 'scheduled' || visit.status === 'in_progress'

  // KEY: All swipe state in refs — ZERO setState during touch = ZERO re-renders = SMOOTH animation
  const wrapperRef = useRef<HTMLDivElement>(null)
  const cardRef    = useRef<HTMLDivElement>(null)
  const revLRef    = useRef<HTMLDivElement>(null)
  const revRRef    = useRef<HTMLDivElement>(null)
  const startX     = useRef(0)
  const startY     = useRef(0)
  const curX       = useRef(0)
  const locked     = useRef<'h' | 'v' | null>(null)
  const fired      = useRef(false)

  // LTR: left(-)=progress/start, right(+)=cancel
  // RTL: right(+)=progress/start, left(-)=cancel
  const leftIsProgress  = !isRtl
  const rightIsProgress =  isRtl

  // Non-passive touchmove so we can preventDefault (stops page scroll during horiz swipe)
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const handler = (e: TouchEvent) => { if (locked.current === 'h') e.preventDefault() }
    el.addEventListener('touchmove', handler, { passive: false })
    return () => el.removeEventListener('touchmove', handler)
  }, [])

  function applyTransform(dx: number, animated = false) {
    const card = cardRef.current
    if (!card) return
    card.style.transition = animated ? 'transform 0.28s cubic-bezier(0.32,0.72,0,1)' : 'none'
    card.style.transform  = `translateX(${dx}px)`
    const pct = Math.min(1, Math.abs(dx) / SWIPE_MAX)
    if (revLRef.current) revLRef.current.style.opacity = dx < 0 ? String(pct) : '0'
    if (revRRef.current) revRRef.current.style.opacity = dx > 0 ? String(pct) : '0'
  }

  function snapBack() { applyTransform(0, true) }

  function fireAction(dir: 'left' | 'right') {
    if (fired.current) return
    fired.current = true
    const isProgress = (dir === 'left' && leftIsProgress) || (dir === 'right' && rightIsProgress)
    applyTransform(dir === 'right' ? SWIPE_MAX : -SWIPE_MAX, true)
    const vid = visit.id
    const vs  = visit.status
    setTimeout(() => {
      snapBack()
      fired.current = false
      if (isProgress) { if (vs === 'scheduled') onStart?.(vid); else onComplete?.(vid) }
      else onCancel?.(vid)
    }, 300)
  }

  function onTouchStart(e: React.TouchEvent) {
    if (!canAction) return
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    curX.current = 0; locked.current = null; fired.current = false
    if (cardRef.current) cardRef.current.style.transition = 'none'
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!canAction) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current
    if (locked.current === null) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return
      locked.current = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v'
    }
    if (locked.current === 'v') return
    // native handler calls preventDefault for horizontal
    curX.current = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, dx))
    applyTransform(curX.current)
  }

  function onTouchEnd() {
    if (!canAction || locked.current !== 'h') return
    const dx = curX.current
    if (Math.abs(dx) >= SWIPE_THRESHOLD) fireAction(dx > 0 ? 'right' : 'left')
    else snapBack()
  }

  const isMeeting   = visit.event_type === 'meeting'
  const accentColor = EVENT_ACCENT[visit.event_type ?? 'visit']
  const time = visit.scheduled_at
    ? new Date(visit.scheduled_at).toLocaleTimeString(
        locale === 'he' ? 'he-IL' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })
    : '--:--'
  const totalDuration = visit.duration_minutes || 0
  const clientName =
    visit.client_name ||
    (visit.clients ? `${visit.clients.first_name || ''} ${visit.clients.last_name || ''}`.trim() : null) ||
    (locale === 'he' ? 'לקוח' : 'Клиент')
  const isUUID = (s?: string) => !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  const serviceName = visit.services
    ? (locale === 'ru' ? (visit.services.name_ru || visit.services.name) : visit.services.name)
    : (!isUUID(visit.service_name) && visit.service_name) || (!isUUID(visit.service_type) && visit.service_type) || ''
  const statusLabel = STATUS_LABELS[visit.status]?.[locale] || visit.status
  const isCancelled = visit.status === 'cancelled'

  const locationFromNotes = (() => {
    if (!visit.notes || isMeeting) return null
    const lines = visit.notes.split('\n')
    const addr = lines.find(l => l.startsWith('Адрес:') || l.startsWith('כתובת:'))
    const city = lines.find(l => l.startsWith('Город:') || l.startsWith('עיר:'))
    if (!addr && !city) return null
    return [city?.split(': ')[1], addr?.split(': ')[1]].filter(Boolean).join(', ')
  })()

  const progressColor = 'rgba(52,211,153,0.22)'
  const cancelColor   = 'rgba(239,68,68,0.22)'

  const revealBase: React.CSSProperties = {
    position: 'absolute', inset: 0, borderRadius: 12,
    opacity: 0, pointerEvents: 'none', display: 'flex', alignItems: 'stretch',
  }
  const iconCol = (color: string): React.CSSProperties => ({
    width: SWIPE_MAX, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 4, color, fontSize: 11, fontWeight: 700,
  })

  const ProgressIcon = () => visit.status === 'scheduled'
    ? <><Play size={20} style={{ fill: '#34d399' }} />{locale === 'he' ? 'התחל' : 'Начать'}</>
    : <><CheckCircle size={20} />{locale === 'he' ? 'סיים' : 'Завершить'}</>
  const CancelIcon = () => <><X size={20} />{locale === 'he' ? 'בטל' : 'Отменить'}</>

  return (
    <>
      <div
        ref={wrapperRef}
        className="relative mb-2 select-none"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Reveal RIGHT (swipe right) */}
        {canAction && (
          <div ref={revRRef} style={{ ...revealBase, background: rightIsProgress ? progressColor : cancelColor }}>
            <div style={iconCol(rightIsProgress ? '#34d399' : '#f87171')}>
              {rightIsProgress ? <ProgressIcon /> : <CancelIcon />}
            </div>
          </div>
        )}

        {/* Reveal LEFT (swipe left) */}
        {canAction && (
          <div ref={revLRef} style={{ ...revealBase, justifyContent: 'flex-end', background: leftIsProgress ? progressColor : cancelColor }}>
            <div style={iconCol(leftIsProgress ? '#34d399' : '#f87171')}>
              {leftIsProgress ? <ProgressIcon /> : <CancelIcon />}
            </div>
          </div>
        )}

        {/* Card — moves via DOM ref, no React re-render during swipe */}
        <div
          ref={cardRef}
          onClick={() => { if (Math.abs(curX.current) < 8) onClick?.(visit) }}
          style={{ borderRadius: 12, overflow: 'hidden', willChange: 'transform' }}
          className={`bg-card border cursor-pointer ${isCancelled ? 'opacity-50' : ''} ${visit.status === 'in_progress' ? 'border-amber-300 dark:border-amber-700' : ''}`}
        >
          <div style={{ borderLeftWidth: 4, borderLeftColor: accentColor, borderLeftStyle: 'solid', borderRadius: 12, overflow: 'hidden' }}>
            <div className="flex items-stretch">

              {/* Time column */}
              <div className={`flex flex-col items-center justify-center px-3 py-3 border-e min-w-[64px] ${
                visit.status === 'in_progress' ? 'bg-amber-50 dark:bg-amber-900/20'
                : visit.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-muted/30'
              }`}>
                <span className="text-base font-bold leading-tight">{time}</span>
                {totalDuration > 0 && !isMeeting && (
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {totalDuration}{locale === 'he' ? "ד'" : 'м'}
                  </span>
                )}
                {visit.status === 'in_progress' && (() => {
                  const src = visit.started_at || visit.scheduled_at
                  if (!src) return null
                  const t2 = new Date(src).toLocaleTimeString(locale === 'he' ? 'he-IL' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })
                  return <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5 leading-tight">▶ {t2}</span>
                })()}
                <span className="mt-1" style={{ color: accentColor }}>
                  {isMeeting ? <Video size={12} /> : <MapPin size={12} />}
                </span>
              </div>

              {/* Info column */}
              <div className="flex-1 py-2.5 px-3 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-sm truncate text-start">{clientName}</p>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: accentColor + '18', color: accentColor, border: `1px solid ${accentColor}40` }}>
                        {isMeeting ? (locale === 'he' ? 'אונליין' : 'Онлайн') : (locale === 'he' ? 'אופליין' : 'Оффлайн')}
                      </span>
                    </div>
                    {serviceName && <p className="text-xs text-muted-foreground truncate mt-0.5 text-start">{serviceName}</p>}
                    {visit.price != null && visit.price > 0 && <p className="text-xs font-medium text-primary mt-0.5 text-start">₪{visit.price}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                    <StatusBadge status={visit.status} label={statusLabel} />
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </div>
                </div>
                {visit.status !== 'cancelled' && visit.status !== 'completed' && (
                  <div className="flex items-center gap-2 mt-2">
                    {isMeeting && visit.meeting_link && (
                      <button onClick={e => { e.stopPropagation(); window.open(visit.meeting_link!, '_blank') }}
                        className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                        style={{ backgroundColor: accentColor + '18', color: accentColor, border: `1px solid ${accentColor}40` }}>
                        <ExternalLink size={10} />{locale === 'he' ? 'הצטרף' : 'Присоединиться'}
                      </button>
                    )}
                    {!isMeeting && locationFromNotes && (
                      <button onClick={e => { e.stopPropagation(); window.open(`https://maps.google.com/?q=${encodeURIComponent(locationFromNotes)}`, '_blank') }}
                        className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                        style={{ backgroundColor: '#3b82f618', color: '#3b82f6', border: '1px solid #3b82f640' }}>
                        <Navigation size={10} />{locale === 'he' ? 'נווט' : 'Навигация'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
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

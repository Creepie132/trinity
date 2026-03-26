'use client'

import { useState, useRef } from 'react'
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

const SWIPE_THRESHOLD = 55
const SWIPE_MAX = 84

export function VisitCard({ visit, locale, isMeetingMode, onStart, onComplete, onCancel, onEdit, onClick }: VisitCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const { data: visitServices = [] } = useVisitServices(visit.id)

  // ── Swipe ─────────────────────────────────────────────────────────────────
  // LTR (RU): свайп ВЛЕВО  → Начать/Завершить (зелёный)
  //           свайп ВПРАВО → Отменить (красный)
  // RTL (HE): свайп ВПРАВО → Начать/Завершить (зелёный)
  //           свайп ВЛЕВО  → Отменить (красный)
  const [swipeX, setSwipeX] = useState(0)
  const [snapped, setSnapped] = useState<'left' | 'right' | null>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const swipeLocked = useRef(false)

  const isRtl = locale === 'he'
  const canAction = visit.status === 'scheduled' || visit.status === 'in_progress'

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    swipeLocked.current = false
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!canAction) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current)
    if (!swipeLocked.current && dy > Math.abs(dx) && dy > 6) { swipeLocked.current = true }
    if (swipeLocked.current) return
    setSwipeX(Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, dx)))
    setSnapped(null)
  }
  function onTouchEnd() {
    if (swipeLocked.current || !canAction) return
    if (Math.abs(swipeX) >= SWIPE_THRESHOLD) {
      const dir = swipeX > 0 ? 'right' : 'left'
      // Снап на полное раскрытие
      setSnapped(dir)
      setSwipeX(swipeX > 0 ? SWIPE_MAX : -SWIPE_MAX)
      // Автоматически выполняем действие через 350ms (после анимации снапа)
      const isProgressDir = (dir === 'right' && rightIsProgress) || (dir === 'left' && leftIsProgress)
      const visitId = visit.id
      const visitStatus = visit.status
      setTimeout(() => {
        setSwipeX(0); setSnapped(null)
        if (isProgressDir) {
          if (visitStatus === 'scheduled') onStart?.(visitId)
          else onComplete?.(visitId)
        } else {
          onCancel?.(visitId)
        }
      }, 350)
    } else {
      setSwipeX(0); setSnapped(null)
    }
  }
  function resetSwipe() { setSwipeX(0); setSnapped(null) }

  // Маппинг направлений → действия
  // LTR: влево(−) = progress, вправо(+) = cancel
  // RTL: влево(−) = cancel,   вправо(+) = progress
  const leftIsProgress  = !isRtl
  const rightIsProgress =  isRtl

  const isMeeting = visit.event_type === 'meeting'
  const accentColor = EVENT_ACCENT[visit.event_type ?? 'visit']
  const time = visit.scheduled_at
    ? new Date(visit.scheduled_at).toLocaleTimeString(locale === 'he' ? 'he-IL' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })
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

  const locationFromNotes = (() => {
    if (!visit.notes || isMeeting) return null
    const lines = visit.notes.split('\n')
    const addr = lines.find(l => l.startsWith('Адрес:') || l.startsWith('כתובת:'))
    const city = lines.find(l => l.startsWith('Город:') || l.startsWith('עיר:'))
    if (!addr && !city) return null
    return [city?.split(': ')[1], addr?.split(': ')[1]].filter(Boolean).join(', ')
  })()

  // Процент reveal для opacity фона
  const revealRightPct = snapped === 'right' ? 1 : swipeX > 0 ? Math.min(1, swipeX / SWIPE_MAX) : 0
  const revealLeftPct  = snapped === 'left'  ? 1 : swipeX < 0 ? Math.min(1, -swipeX / SWIPE_MAX) : 0

  const progressAction = () => {
    resetSwipe()
    if (visit.status === 'scheduled') onStart?.(visit.id)
    else onComplete?.(visit.id)
  }
  const cancelAction = () => {
    resetSwipe()
    onCancel?.(visit.id)
  }

  // Кнопка прогресса
  const ProgressBtn = () => (
    <button onClick={progressAction}
      style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,width:'100%',height:'100%',border:'none',cursor:'pointer',background:'transparent',color:'#34d399',fontSize:10,fontWeight:700,padding:'0 10px' }}>
      {visit.status === 'scheduled'
        ? <><Play size={18} style={{ fill:'#34d399' }} />{locale==='he'?'התחל':'Начать'}</>
        : <><CheckCircle size={18} />{locale==='he'?'סיים':'Завершить'}</>}
    </button>
  )

  // Кнопка отмены
  const CancelBtn = () => (
    <button onClick={cancelAction}
      style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,width:'100%',height:'100%',border:'none',cursor:'pointer',background:'transparent',color:'#f87171',fontSize:10,fontWeight:700,padding:'0 10px' }}>
      <X size={18} />{locale==='he'?'בטל':'Отменить'}
    </button>
  )

  return (
    <>
      <div
        className="relative mb-2"
        style={{ touchAction: swipeLocked.current ? 'pan-y' : 'pan-y' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* ── Reveal RIGHT (+ свайп): LTR=cancel, RTL=progress ── */}
        {canAction && revealRightPct > 0 && (
          <div style={{
            position:'absolute', inset:0, borderRadius:12, display:'flex', alignItems:'stretch',
            background: rightIsProgress ? 'rgba(52,211,153,0.18)' : 'rgba(239,68,68,0.18)',
            opacity: revealRightPct,
          }}>
            <div style={{ width: SWIPE_MAX, display:'flex' }}>
              {rightIsProgress ? <ProgressBtn /> : <CancelBtn />}
            </div>
          </div>
        )}

        {/* ── Reveal LEFT (− свайп): LTR=progress, RTL=cancel ── */}
        {canAction && revealLeftPct > 0 && (
          <div style={{
            position:'absolute', inset:0, borderRadius:12, display:'flex', alignItems:'stretch', justifyContent:'flex-end',
            background: leftIsProgress ? 'rgba(52,211,153,0.18)' : 'rgba(239,68,68,0.18)',
            opacity: revealLeftPct,
          }}>
            <div style={{ width: SWIPE_MAX, display:'flex' }}>
              {leftIsProgress ? <ProgressBtn /> : <CancelBtn />}
            </div>
          </div>
        )}

        {/* ── Карточка (смещается при свайпе) ── */}
        <div
          onClick={() => { if (Math.abs(swipeX) < 8 && !snapped) onClick?.(visit) }}
          style={{
            transform: `translateX(${swipeX}px)`,
            transition: snapped ? 'transform .25s cubic-bezier(.32,.72,0,1)' : 'transform 0ms',
            willChange: 'transform',
            borderRadius: 12, overflow:'hidden',
          }}
          className={`bg-card border cursor-pointer ${isCancelled ? 'opacity-50' : ''} ${visit.status === 'in_progress' ? 'border-amber-300 dark:border-amber-700' : ''}`}
        >
          {/* фикс: borderLeft через wrapper */}
          <div style={{ borderLeftWidth:4, borderLeftColor:accentColor, borderLeftStyle:'solid', borderRadius:12, overflow:'hidden' }}>
          <div className="flex items-stretch">

            {/* Время */}
            <div className={`flex flex-col items-center justify-center px-3 py-3 border-e min-w-[64px] ${
              visit.status === 'in_progress' ? 'bg-amber-50 dark:bg-amber-900/20'
              : visit.status === 'completed'  ? 'bg-green-50 dark:bg-green-900/20'
              : 'bg-muted/30'
            }`}>
              <span className="text-base font-bold leading-tight">{time}</span>
              {totalDuration > 0 && !isMeeting && (
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {totalDuration}{locale === 'he' ? "ד'" : 'м'}
                </span>
              )}
              {/* Фактическое время начала — для in_progress */}
              {visit.status === 'in_progress' && (() => {
                const startSource = visit.started_at || visit.scheduled_at
                if (!startSource) return null
                const startedTime = new Date(startSource).toLocaleTimeString(
                  locale === 'he' ? 'he-IL' : 'ru-RU',
                  { hour: '2-digit', minute: '2-digit' }
                )
                return (
                  <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5 leading-tight">
                    ▶ {startedTime}
                  </span>
                )
              })()}
              <span className="mt-1" style={{ color: accentColor }}>
                {isMeeting ? <Video size={12} /> : <MapPin size={12} />}
              </span>
            </div>

            {/* Информация */}
            <div className="flex-1 py-2.5 px-3 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-sm truncate text-start">{clientName}</p>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: accentColor+'18', color: accentColor, border:`1px solid ${accentColor}40` }}>
                      {isMeeting ? (locale==='he'?'אונליין':'Онлайн') : (locale==='he'?'אופליין':'Оффлайн')}
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

              {/* Навигация / встреча */}
              {visit.status !== 'cancelled' && visit.status !== 'completed' && (
                <div className="flex items-center gap-2 mt-2">
                  {isMeeting && visit.meeting_link && (
                    <button onClick={e=>{e.stopPropagation();window.open(visit.meeting_link!,'_blank')}}
                      className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                      style={{ backgroundColor:accentColor+'18', color:accentColor, border:`1px solid ${accentColor}40` }}>
                      <ExternalLink size={10}/>{locale==='he'?'הצטרף':'Присоединиться'}
                    </button>
                  )}
                  {!isMeeting && locationFromNotes && (
                    <button onClick={e=>{e.stopPropagation();window.open(`https://maps.google.com/?q=${encodeURIComponent(locationFromNotes)}`,'_blank')}}
                      className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                      style={{ backgroundColor:'#3b82f618', color:'#3b82f6', border:'1px solid #3b82f640' }}>
                      <Navigation size={10}/>{locale==='he'?'נווט':'Навигация'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          </div>{/* end borderLeft wrapper */}
        </div>
        {/* end card */}
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

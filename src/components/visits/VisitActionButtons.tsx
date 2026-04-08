'use client'

import { useState, useRef, useEffect } from 'react'
import {
  MessageCircle, Navigation, Play, CheckCircle,
  MoreHorizontal, Pencil, X, ExternalLink
} from 'lucide-react'

export interface VisitActionButtonsProps {
  visit: {
    id: string
    status: string
    event_type?: 'visit' | 'meeting'
    meeting_link?: string | null
    notes?: string | null
  }
  clientPhone?: string
  clientName?: string
  serviceName?: string
  locale: 'he' | 'ru'
  /** Called when user taps Start */
  onStart?: () => void
  /** Called when user taps Complete */
  onComplete?: () => void
  /** Called when user taps Cancel */
  onCancel?: () => void
  /** Called when user taps Edit */
  onEdit?: () => void
  /** Stop click event bubbling to parent card */
  stopPropagation?: boolean
}

function extractLocation(notes?: string | null): string | null {
  if (!notes) return null
  const lines = notes.split('\n')
  const addr = lines.find(l => l.startsWith('Адрес:') || l.startsWith('כתובת:'))
  const city = lines.find(l => l.startsWith('Город:') || l.startsWith('עיר:'))
  if (!addr && !city) return null
  return [city?.split(': ')[1], addr?.split(': ')[1]].filter(Boolean).join(', ')
}

// ─── Main component ──────────────────────────────────────────────────────────

export function VisitActionButtons({
  visit,
  clientPhone,
  clientName = '',
  serviceName = '',
  locale,
  onStart,
  onComplete,
  onCancel,
  onEdit,
  stopPropagation = true,
}: VisitActionButtonsProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isHe = locale === 'he'
  const isScheduled = visit.status === 'scheduled'
  const isInProgress = visit.status === 'in_progress'
  const isMeeting = visit.event_type === 'meeting'
  const location = extractLocation(visit.notes)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  function stop(e: React.MouseEvent) {
    if (stopPropagation) e.stopPropagation()
  }

  // ── WhatsApp reminder message ──────────────────────────────────────────────
  function openWhatsApp() {
    if (!clientPhone) return
    const now = new Date()
    const time = now.toLocaleTimeString(isHe ? 'he-IL' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })
    const date = now.toLocaleDateString(isHe ? 'he-IL' : 'ru-RU')
    const msg = isHe
      ? `שלום ${clientName}! תזכורת לביקור שלך${serviceName ? ` ל${serviceName}` : ''} ב-${date} בשעה ${time}. מחכים לך!`
      : `Здравствуйте, ${clientName}! Напоминаем о вашем визите${serviceName ? ` (${serviceName})` : ''} ${date} в ${time}. Ждём вас!`
    window.open(`https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  // ── Shared icon button style ───────────────────────────────────────────────
  const iconBtn =
    'flex items-center justify-center w-8 h-8 rounded-lg border border-transparent ' +
    'bg-white/5 hover:bg-white/10 dark:bg-white/5 dark:hover:bg-white/10 ' +
    'text-muted-foreground hover:text-foreground transition-colors flex-shrink-0'

  const ctaBtn =
    'flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ' +
    'transition-colors flex-shrink-0'

  if (!isScheduled && !isInProgress) return null

  return (
    <div className="flex items-center gap-1.5 mt-2" onClick={stop}>

      {/* ── WhatsApp icon ── */}
      {clientPhone && (
        <button className={iconBtn} onClick={openWhatsApp} title={isHe ? 'שלח הודעת וואצאפ' : 'Написать в WhatsApp'}>
          <MessageCircle size={15} />
        </button>
      )}

      {/* ── Navigation icon (visit only) ── */}
      {!isMeeting && location && (
        <button
          className={iconBtn}
          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(location)}`, '_blank')}
          title={isHe ? 'נווט' : 'Маршрут'}
        >
          <Navigation size={15} />
        </button>
      )}

      {/* ── Google Meet icon (meeting only) ── */}
      {isMeeting && visit.meeting_link && (
        <button
          className={iconBtn}
          onClick={() => window.open(visit.meeting_link!, '_blank')}
          title={isHe ? 'הצטרף לפגישה' : 'Присоединиться'}
        >
          <ExternalLink size={15} />
        </button>
      )}

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Primary CTA: Start / Complete ── */}
      {isScheduled && (
        <button
          className={`${ctaBtn} bg-amber-500 hover:bg-amber-400 text-white min-w-[80px] max-w-[160px]`}
          onClick={onStart}
        >
          <Play size={13} className="fill-white" />
          {isHe ? 'התחל' : 'Начать'}
        </button>
      )}
      {isInProgress && (
        <button
          className={`${ctaBtn} bg-emerald-600 hover:bg-emerald-500 text-white min-w-[80px] max-w-[160px]`}
          onClick={onComplete}
        >
          <CheckCircle size={13} />
          {isHe ? 'סיים' : 'Завершить'}
        </button>
      )}

      {/* ── More menu (•••) ── */}
      <div className="relative" ref={menuRef}>
        <button
          className={`${iconBtn} w-8 h-8`}
          onClick={() => setMenuOpen(v => !v)}
          title={isHe ? 'עוד פעולות' : 'Ещё'}
        >
          <MoreHorizontal size={15} />
        </button>

        {menuOpen && (
          <div
            className={
              'absolute bottom-full mb-1.5 z-50 min-w-[160px] ' +
              'bg-popover border border-border rounded-xl shadow-lg overflow-hidden ' +
              (isHe ? 'right-0' : 'right-0')
            }
          >
            {/* Edit */}
            {onEdit && (
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-start"
                onClick={() => { setMenuOpen(false); onEdit() }}
              >
                <Pencil size={14} className="text-muted-foreground flex-shrink-0" />
                {isHe ? 'ערוך' : 'Редактировать'}
              </button>
            )}

            {/* Cancel */}
            {onCancel && (
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-destructive text-start"
                onClick={() => { setMenuOpen(false); onCancel() }}
              >
                <X size={14} className="flex-shrink-0" />
                {isHe ? 'בטל ביקור' : 'Отменить визит'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

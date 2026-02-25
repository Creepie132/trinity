'use client'

import { Phone, MessageCircle, Clock, MapPin, X, Plus } from 'lucide-react'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'

interface MeetingDetailCardProps {
  visit: any
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru'
  clientName?: string
  onStart?: () => void
  onComplete?: () => void
  onCancel?: () => void
  onAddService?: () => void
}

export function MeetingDetailCard({
  visit,
  isOpen,
  onClose,
  locale,
  clientName,
  onStart,
  onComplete,
  onCancel,
  onAddService,
}: MeetingDetailCardProps) {
  if (!visit) return null

  const l = locale === 'he'
  const date = new Date(visit.scheduled_at)

  return (
    <TrinityBottomDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={clientName || (l ? 'פרטי ביקור' : 'Детали визита')}
    >
      <div className="space-y-4">
        {/* Время и дата — крупно */}
        <div className="text-center py-2">
          <p className="text-3xl font-bold">
            {date.toLocaleTimeString(l ? 'he-IL' : 'ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {date.toLocaleDateString(l ? 'he-IL' : 'ru-RU', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>

        {/* Инфо карточки */}
        <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-slate-400">{l ? 'סטטוס' : 'Статус'}</span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                visit.status === 'completed'
                  ? 'bg-emerald-500 text-white'
                  : visit.status === 'in_progress'
                  ? 'bg-amber-500 text-white'
                  : visit.status === 'scheduled'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-300 text-slate-600'
              }`}
            >
              {visit.status === 'completed'
                ? l
                  ? 'הושלם'
                  : 'Завершён'
                : visit.status === 'in_progress'
                ? l
                  ? 'בביצוע'
                  : 'В процессе'
                : visit.status === 'scheduled'
                ? l
                  ? 'מתוכנן'
                  : 'Запланирован'
                : visit.status === 'cancelled'
                ? l
                  ? 'בוטל'
                  : 'Отменён'
                : visit.status}
            </span>
          </div>

          {visit.duration_minutes && (
            <div className="flex justify-between">
              <span className="text-sm text-slate-400">{l ? 'משך' : 'Длительность'}</span>
              <span className="text-sm font-medium">
                {visit.duration_minutes} {l ? 'דק' : 'мин'}
              </span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-sm text-slate-400">{l ? 'מחיר' : 'Цена'}</span>
            <span className="text-sm font-bold">₪{visit.price || 0}</span>
          </div>
        </div>

        {/* Заметки */}
        {visit.notes && (
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-xs text-slate-400 mb-1">{l ? 'הערות' : 'Заметки'}</p>
            <p className="text-sm whitespace-pre-wrap">{visit.notes}</p>
          </div>
        )}

        {/* Контакты */}
        {visit.clients?.phone && (
          <div className="flex gap-2">
            <a
              href={`tel:${visit.clients.phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 text-white text-sm font-medium"
            >
              <Phone size={16} />
              {l ? 'התקשר' : 'Позвонить'}
            </a>
            <a
              href={`https://wa.me/${visit.clients.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-medium"
            >
              <MessageCircle size={16} />
              WhatsApp
            </a>
          </div>
        )}

        {/* Действия */}
        <div className="space-y-2">
          {visit.status === 'scheduled' && onStart && (
            <button
              onClick={() => {
                onStart()
                onClose()
              }}
              className="w-full py-3.5 rounded-2xl bg-amber-500 text-white text-sm font-semibold transition hover:bg-amber-600"
            >
              ▶ {l ? 'התחל' : 'Начать'}
            </button>
          )}

          {visit.status === 'in_progress' && (
            <div className="flex gap-2">
              {onComplete && (
                <button
                  onClick={() => {
                    onComplete()
                    onClose()
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-emerald-500 text-white text-sm font-semibold"
                >
                  ✓ {l ? 'סיים' : 'Завершить'}
                </button>
              )}
              {onAddService && (
                <button
                  onClick={onAddService}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl border-2 border-blue-600/30 text-blue-600"
                >
                  <Plus size={20} />
                </button>
              )}
            </div>
          )}

          {visit.status !== 'completed' && visit.status !== 'cancelled' && onCancel && (
            <button
              onClick={() => {
                onCancel()
                onClose()
              }}
              className="w-full py-3 rounded-2xl bg-slate-100 text-slate-500 text-sm font-medium"
            >
              ✕ {l ? 'בטל' : 'Отменить'}
            </button>
          )}
        </div>
      </div>
    </TrinityBottomDrawer>
  )
}

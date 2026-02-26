'use client'

import { useState } from 'react'
import { X, Phone, MessageCircle, Calendar, Clock, User } from 'lucide-react'
import { TrinityButton } from '@/components/ui/TrinityButton'
import { getClientName } from '@/lib/client-utils'

interface VisitDesktopPanelProps {
  visit: any
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru'
  clients: any[]
  onStatusChange?: (visitId: string, newStatus: string) => void
  onClientClick?: (clientId: string) => void
}

export function VisitDesktopPanel({
  visit,
  isOpen,
  onClose,
  locale,
  clients,
  onStatusChange,
  onClientClick,
}: VisitDesktopPanelProps) {
  const [activeTab, setActiveTab] = useState<'services' | 'notes'>('services')

  const isRTL = locale === 'he'
  
  const client = clients.find((c: any) => c.id === visit?.client_id)
  const clientName = client ? getClientName(client) : '—'

  const t = {
    he: {
      services: 'שירותים',
      notes: 'הערות',
      start: 'התחל',
      complete: 'סיים',
      cancel: 'בטל',
      date: 'תאריך',
      time: 'שעה',
      duration: 'משך',
      price: 'מחיר',
      status: 'סטטוס',
      client: 'לקוח',
      phone: 'טלפון',
      noServices: 'אין שירותים',
      noNotes: 'אין הערות',
      minutes: 'דקות',
    },
    ru: {
      services: 'Услуги',
      notes: 'Заметки',
      start: 'Начать',
      complete: 'Завершить',
      cancel: 'Отменить',
      date: 'Дата',
      time: 'Время',
      duration: 'Длительность',
      price: 'Цена',
      status: 'Статус',
      client: 'Клиент',
      phone: 'Телефон',
      noServices: 'Нет услуг',
      noNotes: 'Нет заметок',
      minutes: 'мин',
    },
  }

  const l = t[locale]

  if (!isOpen || !visit) return null

  const visitDate = new Date(visit.scheduled_at)

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch"
      onClick={onClose}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Panel */}
      <div
        className="relative z-10 bg-background shadow-2xl flex flex-col md:grid h-full w-full max-w-5xl mx-auto my-0 md:my-4 rounded-none md:rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ gridTemplateColumns: 'minmax(300px, 350px) 1fr' }}
      >
        {/* === ЛЕВАЯ ПАНЕЛЬ (или верхняя на мобиле) === */}
        <div className="p-6 flex flex-col border-b md:border-b-0 md:border-e border-muted bg-muted/20">
          {/* Закрыть */}
          <button
            onClick={onClose}
            className="self-end mb-4 text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>

          {/* Дата и время */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Calendar size={14} />
              <span>{l.date}</span>
            </div>
            <div className="text-2xl font-bold mb-2">
              {visitDate.toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU', {
                day: 'numeric',
                month: 'long',
              })}
            </div>
            <div className="flex items-center gap-2 text-lg">
              <Clock size={16} />
              {visitDate.toLocaleTimeString(locale === 'he' ? 'he-IL' : 'ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {visit.duration_minutes && (
                <span className="text-sm text-muted-foreground">
                  · {visit.duration_minutes} {l.minutes}
                </span>
              )}
            </div>
          </div>

          {/* Статус */}
          <div className="mb-4">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                visit.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-700'
                  : visit.status === 'in_progress'
                  ? 'bg-amber-100 text-amber-700'
                  : visit.status === 'cancelled'
                  ? 'bg-slate-100 text-slate-500'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {visit.status}
            </span>
          </div>

          {/* Клиент */}
          {client && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-1">{l.client}</p>
              <button
                onClick={() => onClientClick?.(client.id)}
                className="text-lg font-semibold text-primary hover:underline"
              >
                {clientName}
              </button>
            </div>
          )}

          {/* Контакты */}
          {client?.phone && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => (window.location.href = `tel:${client.phone}`)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
              >
                <Phone size={16} />
                <span className="text-sm">{client.phone}</span>
              </button>
              <button
                onClick={() =>
                  window.open(`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`, '_blank')
                }
                className="w-10 h-10 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition"
              >
                <MessageCircle size={18} />
              </button>
            </div>
          )}

          {/* Цена */}
          {visit.price > 0 && (
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-1">{l.price}</p>
              <p className="text-2xl font-bold">₪{visit.price}</p>
            </div>
          )}

          {/* Действия */}
          <div className="space-y-2 mt-auto">
            {visit.status === 'scheduled' && (
              <TrinityButton
                variant="outline"
                fullWidth
                onClick={() => onStatusChange?.(visit.id, 'in_progress')}
                className="border-2 border-amber-400 text-amber-600 hover:bg-amber-50"
              >
                {l.start}
              </TrinityButton>
            )}
            {visit.status === 'in_progress' && (
              <TrinityButton
                variant="outline"
                fullWidth
                onClick={() => onStatusChange?.(visit.id, 'completed')}
                className="border-2 border-emerald-400 text-emerald-600 hover:bg-emerald-50"
              >
                {l.complete}
              </TrinityButton>
            )}
            {visit.status !== 'completed' && visit.status !== 'cancelled' && (
              <TrinityButton
                variant="outline"
                fullWidth
                onClick={() => onStatusChange?.(visit.id, 'cancelled')}
                className="border border-muted text-muted-foreground hover:bg-muted"
              >
                {l.cancel}
              </TrinityButton>
            )}
          </div>
        </div>

        {/* === ПРАВАЯ ПАНЕЛЬ === */}
        <div className="flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-muted px-6">
            <button
              onClick={() => setActiveTab('services')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'services'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {l.services}
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'notes'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {l.notes}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'services' ? (
              <div className="space-y-3">
                {visit.service_type ? (
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                    <span className="text-sm font-medium">{visit.service_type}</span>
                    {visit.price > 0 && <span className="text-sm">₪{visit.price}</span>}
                  </div>
                ) : (
                  <p className="text-center py-12 text-muted-foreground text-sm">{l.noServices}</p>
                )}
              </div>
            ) : (
              <div>
                {visit.notes ? (
                  <p className="text-sm whitespace-pre-wrap">{visit.notes}</p>
                ) : (
                  <p className="text-center py-12 text-muted-foreground text-sm">{l.noNotes}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

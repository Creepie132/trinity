'use client'

import { useState } from 'react'
import { X, Phone, Mail, MapPin, Calendar, Clock, User, AlertCircle, CheckCircle2, Circle } from 'lucide-react'
import { TrinityButton } from '@/components/ui/TrinityButton'
import { getClientName } from '@/lib/client-utils'

interface TaskDesktopPanelProps {
  task: any
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru'
  clients: any[]
  visits?: any[]
  onStatusChange?: (taskId: string, newStatus: string) => void
  onClientClick?: (clientId: string) => void
  onVisitClick?: (visitId: string) => void
}

export function TaskDesktopPanel({
  task,
  isOpen,
  onClose,
  locale,
  clients,
  visits = [],
  onStatusChange,
  onClientClick,
  onVisitClick,
}: TaskDesktopPanelProps) {
  const isRTL = locale === 'he'
  
  const client = clients.find((c: any) => c.id === task?.client_id)
  const clientName = client ? getClientName(client) : null
  
  const linkedVisit = visits.find((v: any) => v.id === task?.visit_id)

  const t = {
    he: {
      start: 'התחל',
      complete: 'סיים',
      cancel: 'בטל',
      deadline: 'מועד יעד',
      assignedTo: 'מוקצה ל',
      client: 'לקוח',
      phone: 'טלפון',
      email: 'אימייל',
      address: 'כתובת',
      navigate: 'נווט',
      description: 'תיאור',
      linkedVisit: 'ביקור מקושר',
      priority: {
        low: 'נמוכה',
        medium: 'בינונית',
        high: 'גבוהה',
      },
      status: {
        todo: 'לביצוע',
        in_progress: 'בתהליך',
        completed: 'הושלם',
      },
    },
    ru: {
      start: 'Начать',
      complete: 'Завершить',
      cancel: 'Отменить',
      deadline: 'Дедлайн',
      assignedTo: 'Назначено',
      client: 'Клиент',
      phone: 'Телефон',
      email: 'Email',
      address: 'Адрес',
      navigate: 'Навигация',
      description: 'Описание',
      linkedVisit: 'Связанный визит',
      priority: {
        low: 'Низкий',
        medium: 'Средний',
        high: 'Высокий',
      },
      status: {
        todo: 'К выполнению',
        in_progress: 'В процессе',
        completed: 'Завершено',
      },
    },
  }

  const l = t[locale]

  if (!isOpen || !task) return null

  const priorityIcons = {
    low: <Circle size={20} className="text-blue-500" />,
    medium: <AlertCircle size={20} className="text-amber-500" />,
    high: <AlertCircle size={20} className="text-red-500" />,
  }

  const handleAddressClick = () => {
    if (!client?.address) return
    const geoUrl = `geo:0,0?q=${encodeURIComponent(client.address)}`
    window.location.href = geoUrl
    setTimeout(() => {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`, '_blank')
    }, 500)
  }

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
        className="relative z-10 bg-background shadow-2xl flex h-full w-full max-w-5xl mx-auto my-4 rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'grid', gridTemplateColumns: '350px 1fr' }}
      >
        {/* === ЛЕВАЯ ПАНЕЛЬ === */}
        <div className="p-6 flex flex-col border-e border-muted bg-muted/20">
          {/* Закрыть */}
          <button
            onClick={onClose}
            className="self-end mb-4 text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>

          {/* Приоритет + Заголовок */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              {priorityIcons[task.priority as keyof typeof priorityIcons] || priorityIcons.medium}
              <span className="text-xs text-muted-foreground uppercase">
                {l.priority[task.priority as keyof typeof l.priority] || task.priority}
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-2">{task.title}</h2>
          </div>

          {/* Статус */}
          <div className="mb-4">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                task.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-700'
                  : task.status === 'in_progress'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {l.status[task.status as keyof typeof l.status] || task.status}
            </span>
          </div>

          {/* Дедлайн */}
          {task.due_date && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-1">{l.deadline}</p>
              <div className="flex items-center gap-2 text-base">
                <Calendar size={16} />
                {new Date(task.due_date).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>
          )}

          {/* Назначено */}
          {task.assigned_to && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-1">{l.assignedTo}</p>
              <div className="flex items-center gap-2 text-base">
                <User size={16} />
                <span>{task.assigned_to}</span>
              </div>
            </div>
          )}

          {/* Клиент */}
          {clientName && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-1">{l.client}</p>
              <button
                onClick={() => client && onClientClick?.(client.id)}
                className="text-lg font-semibold text-primary hover:underline"
              >
                {clientName}
              </button>
            </div>
          )}

          {/* Контакты */}
          {client && (
            <div className="space-y-2 mb-6">
              {client.phone && (
                <button
                  onClick={() => (window.location.href = `tel:${client.phone}`)}
                  className="w-full flex items-center gap-3 py-2 px-3 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                >
                  <Phone size={16} />
                  <span className="text-sm">{client.phone}</span>
                </button>
              )}
              {client.email && (
                <button
                  onClick={() => (window.location.href = `mailto:${client.email}`)}
                  className="w-full flex items-center gap-3 py-2 px-3 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                >
                  <Mail size={16} />
                  <span className="text-sm">{client.email}</span>
                </button>
              )}
              {client.address && (
                <button
                  onClick={handleAddressClick}
                  className="w-full flex items-center gap-3 py-2 px-3 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                >
                  <MapPin size={16} />
                  <span className="text-sm flex-1 text-start truncate">{client.address}</span>
                  <span className="text-xs opacity-75">{l.navigate}</span>
                </button>
              )}
            </div>
          )}

          {/* Действия */}
          <div className="space-y-2 mt-auto">
            {task.status === 'todo' && (
              <TrinityButton
                variant="outline"
                fullWidth
                onClick={() => onStatusChange?.(task.id, 'in_progress')}
                className="border-2 border-amber-400 text-amber-600 hover:bg-amber-50"
              >
                {l.start}
              </TrinityButton>
            )}
            {task.status === 'in_progress' && (
              <TrinityButton
                variant="outline"
                fullWidth
                onClick={() => onStatusChange?.(task.id, 'completed')}
                className="border-2 border-emerald-400 text-emerald-600 hover:bg-emerald-50"
              >
                {l.complete}
              </TrinityButton>
            )}
            {task.status !== 'completed' && (
              <TrinityButton
                variant="outline"
                fullWidth
                onClick={() => onStatusChange?.(task.id, 'completed')}
                className="border border-muted text-muted-foreground hover:bg-muted"
              >
                {l.cancel}
              </TrinityButton>
            )}
          </div>
        </div>

        {/* === ПРАВАЯ ПАНЕЛЬ === */}
        <div className="flex flex-col">
          {/* Описание */}
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase">
              {l.description}
            </h3>
            {task.description ? (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{task.description}</p>
            ) : (
              <p className="text-center py-12 text-muted-foreground text-sm">—</p>
            )}

            {/* Привязанный визит */}
            {linkedVisit && (
              <div className="mt-8 pt-6 border-t border-muted">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase">
                  {l.linkedVisit}
                </h3>
                <button
                  onClick={() => onVisitClick?.(linkedVisit.id)}
                  className="w-full p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition text-start"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{clientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(linkedVisit.scheduled_at).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        linkedVisit.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : linkedVisit.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {linkedVisit.status}
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

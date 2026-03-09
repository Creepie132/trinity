'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { Phone, Mail, MapPin, Calendar, User, AlertCircle, Circle, MessageCircle, MessageSquare } from 'lucide-react'
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
  onEdit?: (task: any) => void
  onDelete?: (taskId: string) => void
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
  onEdit,
  onDelete,
}: TaskDesktopPanelProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
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
      whatsapp: 'WhatsApp',
      sms: 'SMS',
      sendEmail: 'שלח אימייל',
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
      edit: 'עריכה',
      delete: 'מחק',
      deleteConfirm: 'למחוק את המשימה',
      yesDelete: 'כן, מחק',
      cancelAction: 'ביטול',
    },
    ru: {
      start: 'Начать',
      complete: 'Завершить',
      cancel: 'Отменить',
      deadline: 'Дедлайн',
      assignedTo: 'Назначено',
      client: 'Клиент',
      phone: 'Позвонить',
      whatsapp: 'WhatsApp',
      sms: 'SMS',
      sendEmail: 'Отправить email',
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
      edit: 'Редактировать',
      delete: 'Удалить',
      deleteConfirm: 'Удалить задачу',
      yesDelete: 'Да, удалить',
      cancelAction: 'Отмена',
    },
  }

  const l = t[locale]

  if (!task) return null

  const priorityIcons = {
    low: <Circle size={16} className="text-blue-500" />,
    medium: <AlertCircle size={16} className="text-amber-500" />,
    high: <AlertCircle size={16} className="text-red-500" />,
  }

  const getFooterButtons = () => {
    if (task.status === 'completed') return null
    
    return (
      <div className="flex gap-2">
        {task.status === 'todo' && (
          <button
            onClick={() => onStatusChange?.(task.id, 'in_progress')}
            className="flex-1 py-2.5 rounded-xl border-2 border-amber-400 text-amber-600 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors whitespace-nowrap"
          >
            {l.start}
          </button>
        )}
        {task.status === 'in_progress' && (
          <button
            onClick={() => onStatusChange?.(task.id, 'completed')}
            className="flex-1 py-2.5 rounded-xl border-2 border-emerald-400 text-emerald-600 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors whitespace-nowrap"
          >
            {l.complete}
          </button>
        )}
        <button
          onClick={() => onStatusChange?.(task.id, 'completed')}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          {l.cancel}
        </button>
      </div>
    )
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {priorityIcons[task.priority as keyof typeof priorityIcons] || priorityIcons.medium}
          <span className="truncate">{task.title}</span>
        </div>
      }
      subtitle={
        task.due_date && (
          <div className="flex items-center gap-1.5 text-gray-500">
            <Calendar size={14} />
            {new Date(task.due_date).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </div>
        )
      }
      width="520px"
      footer={getFooterButtons()}
    >
      <div className="space-y-4" dir={locale === 'he' ? 'rtl' : 'ltr'}>
        {/* Status & Priority */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              task.status === 'completed'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : task.status === 'in_progress'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            }`}
          >
            {l.status[task.status as keyof typeof l.status] || task.status}
          </span>
          <span className="text-xs text-gray-400">
            {l.priority[task.priority as keyof typeof l.priority] || task.priority}
          </span>
        </div>

        {/* Assigned To */}
        {task.assigned_to && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <User size={16} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">{l.assignedTo}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{task.assigned_to}</p>
            </div>
          </div>
        )}

        {/* Client */}
        {clientName && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">{l.client}</p>
            <button
              onClick={() => client && onClientClick?.(client.id)}
              className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {clientName}
            </button>
          </div>
        )}

        {/* Contact Actions */}
        {(client?.phone || task.contact_phone) && (
          <div className="space-y-2">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-gray-400" />
                <span className="text-sm text-gray-900 dark:text-gray-100">{client?.phone || task.contact_phone}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => (window.location.href = `tel:${client?.phone || task.contact_phone}`)}
                className="py-2.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition text-xs font-medium flex items-center justify-center gap-1.5"
              >
                <Phone size={14} />
                {l.phone}
              </button>
              <button
                onClick={() => {
                  const cleanPhone = (client?.phone || task.contact_phone)!.replace(/[^0-9]/g, '')
                  window.open(`https://wa.me/${cleanPhone}`, '_blank')
                }}
                className="py-2.5 px-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition text-xs font-medium flex items-center justify-center gap-1.5"
              >
                <MessageCircle size={14} />
                {l.whatsapp}
              </button>
              <button
                onClick={() => (window.location.href = `sms:${client?.phone || task.contact_phone}`)}
                className="py-2.5 px-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition text-xs font-medium flex items-center justify-center gap-1.5"
              >
                <MessageSquare size={14} />
                {l.sms}
              </button>
            </div>
          </div>
        )}

        {/* Email */}
        {(client?.email || task.contact_email) && (
          <button
            onClick={() => (window.location.href = `mailto:${client?.email || task.contact_email}`)}
            className="w-full p-3 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center gap-2"
          >
            <Mail size={16} className="text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-900 dark:text-red-100 truncate flex-1 text-start">
              {client?.email || task.contact_email}
            </span>
            <span className="text-xs text-red-600 dark:text-red-400">{l.sendEmail}</span>
          </button>
        )}

        {/* Address */}
        {(client?.address || task.contact_address) && (
          <button
            onClick={() => {
              const address = client?.address || task.contact_address
              const geoUrl = `geo:0,0?q=${encodeURIComponent(address!)}`
              window.location.href = geoUrl
              setTimeout(() => {
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address!)}`, '_blank')
              }, 500)
            }}
            className="w-full p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition flex items-center gap-2"
          >
            <MapPin size={16} className="text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-blue-900 dark:text-blue-100 truncate flex-1 text-start">
              {client?.address || task.contact_address}
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400">{l.navigate}</span>
          </button>
        )}

        {/* Быстрые действия: Завершить / Редактировать / Удалить */}
        {task.status !== 'completed' && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {/* Завершить */}
              <button
                onClick={() => {
                  onStatusChange?.(task.id, 'completed')
                  onClose()
                }}
                className="flex flex-col items-center gap-1 py-2 px-3 rounded-xl bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 transition-colors text-xs font-medium"
              >
                <span className="text-lg">✅</span>
                {l.complete}
              </button>

              {/* Редактировать */}
              {onEdit && (
                <button
                  onClick={() => {
                    onClose()
                    onEdit(task)
                  }}
                  className="flex flex-col items-center gap-1 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 transition-colors text-xs font-medium"
                >
                  <span className="text-lg">✏️</span>
                  {l.edit}
                </button>
              )}

              {/* Удалить — с подтверждением */}
              {onDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex flex-col items-center gap-1 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 transition-colors text-xs font-medium"
                >
                  <span className="text-lg">🗑️</span>
                  {l.delete}
                </button>
              )}
            </div>

            {/* Диалог подтверждения удаления */}
            {showDeleteConfirm && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-700 dark:text-red-300 text-center mb-3">
                  {l.deleteConfirm} «{task.title}»?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onDelete?.(task.id)
                      setShowDeleteConfirm(false)
                      onClose()
                    }}
                    className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
                  >
                    {l.yesDelete}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    {l.cancelAction}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Description */}
        {task.description && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{l.description}</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {task.description}
            </p>
          </div>
        )}

        {/* Linked Visit */}
        {linkedVisit && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{l.linkedVisit}</h4>
            <button
              onClick={() => onVisitClick?.(linkedVisit.id)}
              className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-start"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{clientName}</p>
                  <p className="text-xs text-gray-500">
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
    </Modal>
  )
}

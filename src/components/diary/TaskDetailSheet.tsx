'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'
import { TrinityButton } from '@/components/ui/TrinityButton'
import { User, Calendar, Phone, MessageCircle, MapPin, Mail, CheckCircle, Clock, XCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { getClientName } from '@/lib/client-utils'
import { he, ru } from 'date-fns/locale'

interface Task {
  id: string
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'done' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  due_date: string | null
  client_id: string | null
  visit_id: string | null
  contact_phone: string | null
  contact_email: string | null
  contact_address: string | null
  is_auto: boolean
  auto_type: string | null
  created_at: string
  client?: {
    id: string
    name: string
  } | null
}

interface TaskDetailSheetProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onStatusChange?: (taskId: string, status: Task['status']) => void
  onClientClick?: (clientId: string) => void
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
  locale: 'he' | 'ru'
}

export function TaskDetailSheet({ 
  task, 
  isOpen, 
  onClose, 
  onStatusChange,
  onClientClick,
  onEdit,
  onDelete,
  locale 
}: TaskDetailSheetProps) {
  const router = useRouter()
  const dateLocale = locale === 'he' ? he : ru
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!task) return null

  const t = {
    he: {
      description: 'תיאור',
      dueDate: 'תאריך יעד',
      client: 'לקוח',
      visit: 'ביקור',
      viewVisit: 'צפה בביקור',
      phone: 'טלפון',
      email: 'אימייל',
      address: 'כתובת',
      navigate: 'נווט',
      markDone: 'סמן כהושלם',
      startWork: 'התחל עבודה',
      cancel: 'בטל',
      priority: 'עדיפות',
      status: 'סטטוס',
      open: 'פתוח',
      inProgress: 'בתהליך',
      done: 'הושלם',
      cancelled: 'בוטל',
      low: 'נמוכה',
      normal: 'רגילה',
      high: 'גבוהה',
      urgent: 'דחופה',
      birthdayToday: 'יום הולדת היום!',
      call: 'חייג',
      sms: 'SMS',
      sendEmail: 'שלח אימייל',
      complete: 'הושלם',
      edit: 'עריכה',
      delete: 'מחק',
      deleteConfirm: 'למחוק את המשימה',
      yesDelete: 'כן, מחק',
      cancelAction: 'ביטול',
    },
    ru: {
      description: 'Описание',
      dueDate: 'Срок',
      client: 'Клиент',
      visit: 'Визит',
      viewVisit: 'Посмотреть визит',
      phone: 'Телефон',
      email: 'Email',
      address: 'Адрес',
      navigate: 'Навигация',
      markDone: 'Завершить',
      startWork: 'В процесс',
      cancel: 'Отменить',
      priority: 'Приоритет',
      status: 'Статус',
      open: 'Открыто',
      inProgress: 'В процессе',
      done: 'Завершено',
      cancelled: 'Отменено',
      low: 'Низкий',
      normal: 'Обычный',
      high: 'Высокий',
      urgent: 'Срочный',
      birthdayToday: 'День рождения сегодня!',
      call: 'Позвонить',
      sms: 'SMS',
      sendEmail: 'Отправить email',
      complete: 'Завершить',
      edit: 'Редактировать',
      delete: 'Удалить',
      deleteConfirm: 'Удалить задачу',
      yesDelete: 'Да, удалить',
      cancelAction: 'Отмена',
    },
  }

  const labels = t[locale]

  const priorityLabels = {
    low: labels.low,
    normal: labels.normal,
    high: labels.high,
    urgent: labels.urgent,
  }

  const statusLabels = {
    open: labels.open,
    in_progress: labels.inProgress,
    done: labels.done,
    cancelled: labels.cancelled,
  }

  function handleCall(phone: string) {
    window.location.href = `tel:${phone}`
  }

  function handleWhatsApp(phone: string) {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${cleanPhone}`, '_blank')
  }

  function handleSMS(phone: string) {
    window.location.href = `sms:${phone}`
  }

  function handleEmail(email: string) {
    window.location.href = `mailto:${email}`
  }

  function handleNavigate(address: string) {
    const encoded = encodeURIComponent(address)
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
    
    if (isMobile) {
      window.open(`geo:0,0?q=${encoded}`, '_blank')
      // Фоллбэк на Google Maps если geo: не поддерживается
      setTimeout(() => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank')
      }, 500)
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank')
    }
  }

  function handleClientClick() {
    if (task && task.client_id && onClientClick) {
      onClose()
      onClientClick(task.client_id)
    }
  }

  function handleVisitClick() {
    if (task && task.visit_id) {
      onClose()
      router.push(`/visits?highlight=${task.visit_id}`)
    }
  }

  function handleComplete() {
    if (task && onStatusChange) {
      onStatusChange(task.id, 'done')
      onClose()
    }
  }

  function handleEdit() {
    if (task && onEdit) {
      onClose()
      onEdit(task)
    }
  }

  function handleDelete() {
    if (task && onDelete) {
      onDelete(task.id)
      setShowDeleteConfirm(false)
      onClose()
    }
  }

  return (
    <TrinityBottomDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
    >
      <div className="space-y-4">
        {/* Специальная карточка для дня рождения */}
        {task.is_auto && task.auto_type === 'birthday' && (
          <div className="bg-gradient-to-r from-pink-50 to-amber-50 dark:from-pink-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-pink-200 dark:border-pink-800 mb-4">
            <p className="text-3xl mb-2">🎂</p>
            <p className="font-semibold text-lg">{getClientName(task.client)}</p>
            <p className="text-sm text-muted-foreground mt-1">{labels.birthdayToday}</p>
          </div>
        )}

        {/* Описание */}
        {task.description && (
          <div>
            <label className="block text-sm font-medium mb-2">{labels.description}</label>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {/* Статус и Приоритет */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-2">{labels.status}</label>
            <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-medium ${
              task.status === 'done' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
              task.status === 'cancelled' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' :
              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {statusLabels[task.status]}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{labels.priority}</label>
            <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-medium ${
              task.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
              task.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
              task.priority === 'low' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' :
              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            }`}>
              {priorityLabels[task.priority]}
            </span>
          </div>
        </div>

        {/* Дедлайн */}
        {task.due_date && (
          <div>
            <label className="block text-sm font-medium mb-2">{labels.dueDate}</label>
            <p className="text-sm">{format(parseISO(task.due_date), 'dd MMM yyyy, HH:mm', { locale: dateLocale })}</p>
          </div>
        )}

        {/* Привязанный клиент - кликабельный */}
        {task.client_id && task.client && (
          <div>
            <label className="block text-sm font-medium mb-2">{labels.client}</label>
            <button
              onClick={handleClientClick}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 hover:bg-primary/10 transition"
            >
              <User size={14} className="text-primary" />
              <span className="text-sm font-medium text-primary">{getClientName(task.client)}</span>
            </button>
          </div>
        )}

        {/* Привязанный визит - кликабельный */}
        {task.visit_id && (
          <div>
            <label className="block text-sm font-medium mb-2">{labels.visit}</label>
            <button
              onClick={handleVisitClick}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition"
            >
              <Calendar size={14} className="text-amber-600 dark:text-amber-400" />
              <span className="text-sm text-amber-700 dark:text-amber-300">{labels.viewVisit}</span>
            </button>
          </div>
        )}

        {/* Телефон - кликабельный с кнопками */}
        {task.contact_phone && (
          <div>
            <label className="block text-sm font-medium mb-2">{labels.phone}</label>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={`tel:${task.contact_phone}`}
                className="text-sm text-primary underline hover:text-primary/80"
                dir="ltr"
              >
                {task.contact_phone}
              </a>
              <button
                onClick={() => handleCall(task.contact_phone!)}
                className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-center transition"
                title={labels.call}
              >
                <Phone size={14} />
              </button>
              <button
                onClick={() => handleWhatsApp(task.contact_phone!)}
                className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 flex items-center justify-center transition"
                title="WhatsApp"
              >
                <MessageCircle size={14} />
              </button>
              <button
                onClick={() => handleSMS(task.contact_phone!)}
                className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 flex items-center justify-center transition"
                title={labels.sms}
              >
                <MessageCircle size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Email - кликабельный с кнопкой */}
        {task.contact_email && (
          <div>
            <label className="block text-sm font-medium mb-2">{labels.email}</label>
            <div className="flex items-center gap-2">
              <a
                href={`mailto:${task.contact_email}`}
                className="text-sm text-primary underline hover:text-primary/80"
                dir="ltr"
              >
                {task.contact_email}
              </a>
              <button
                onClick={() => handleEmail(task.contact_email!)}
                className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center justify-center transition"
                title={labels.sendEmail}
              >
                <Mail size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Адрес - кликабельный с навигацией */}
        {task.contact_address && (
          <div>
            <label className="block text-sm font-medium mb-2">{labels.address}</label>
            <button
              onClick={() => handleNavigate(task.contact_address!)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition w-full text-left"
            >
              <MapPin size={14} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <span className="text-sm text-purple-700 dark:text-purple-300 flex-1">{task.contact_address}</span>
              <span className="text-xs text-purple-400">{labels.navigate}</span>
            </button>
          </div>
        )}

        {/* Быстрые действия: Завершить / Редактировать / Удалить */}
        {task.status !== 'done' && task.status !== 'cancelled' && (
          <>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <button
                onClick={handleComplete}
                className="flex flex-col items-center gap-1 py-2 px-3 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200 text-green-600 transition-colors text-xs font-medium"
              >
                <span className="text-lg">✅</span>
                {labels.complete}
              </button>

              <button
                onClick={handleEdit}
                className="flex flex-col items-center gap-1 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 transition-colors text-xs font-medium"
              >
                <span className="text-lg">✏️</span>
                {labels.edit}
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex flex-col items-center gap-1 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 transition-colors text-xs font-medium"
              >
                <span className="text-lg">🗑️</span>
                {labels.delete}
              </button>
            </div>

            {showDeleteConfirm && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700 text-center mb-3">
                  {labels.deleteConfirm} «{task.title}»?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
                  >
                    {labels.yesDelete}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                  >
                    {labels.cancelAction}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Кнопки действий */}
        {task.status !== 'done' && task.status !== 'cancelled' && onStatusChange && (
          <div className="flex gap-3 pt-4 border-t">
            {task.status === 'open' && (
              <TrinityButton
                variant="primary"
                size="md"
                icon={<Clock className="w-4 h-4" />}
                onClick={() => onStatusChange(task.id, 'in_progress')}
                fullWidth
              >
                {labels.startWork}
              </TrinityButton>
            )}
            <TrinityButton
              variant="secondary"
              size="md"
              icon={<XCircle className="w-4 h-4" />}
              onClick={() => onStatusChange(task.id, 'cancelled')}
            >
              {labels.cancel}
            </TrinityButton>
          </div>
        )}
      </div>
    </TrinityBottomDrawer>
  )
}

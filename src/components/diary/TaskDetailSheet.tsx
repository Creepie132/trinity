'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { User, Calendar, Phone, MessageCircle, MapPin, Mail, Clock, CheckSquare } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { getClientName } from '@/lib/client-utils'
import { he, ru } from 'date-fns/locale'
import { useOrgTemplates } from '@/hooks/useOrgTemplates'
import { buildMessage, buildWhatsAppUrl } from '@/lib/message-utils'

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
  client?: { id: string; name: string } | null
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

const PRIORITY_CONFIG = {
  low:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', he: 'נמוכה', ru: 'Низкий' },
  normal: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  he: 'רגילה', ru: 'Обычный' },
  high:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  he: 'גבוהה', ru: 'Высокий' },
  urgent: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   he: 'דחופה', ru: 'Срочный' },
}

const STATUS_CONFIG = {
  open:        { color: '#f59e0b', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',  he: 'פתוח',    ru: 'Открыто' },
  in_progress: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  he: 'בתהליך',  ru: 'В процессе' },
  done:        { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',   he: 'הושלם',   ru: 'Завершено' },
  cancelled:   { color: '#64748b', bg: 'rgba(100,116,139,0.1)',  border: 'rgba(100,116,139,0.2)', he: 'בוטל',    ru: 'Отменено' },
}

export function TaskDetailSheet({ task, isOpen, onClose, onStatusChange, onClientClick, onEdit, onDelete, locale }: TaskDetailSheetProps) {
  const router = useRouter()
  const isHe = locale === 'he'
  const dir = isHe ? 'rtl' : 'ltr'
  const dateLocale = isHe ? he : ru
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { templates } = useOrgTemplates()

  if (!task) return null

  const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal
  const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.open
  const priorityLabel = isHe ? pc.he : pc.ru
  const statusLabel = isHe ? sc.he : sc.ru

  const isActive = task.status !== 'done' && task.status !== 'cancelled'

  function handleWhatsApp(phone: string) {
    const clientName = task?.client ? getClientName(task.client) : undefined
    const text = templates?.whatsapp_template ? buildMessage(templates.whatsapp_template, { client_name: clientName }) : undefined
    window.open(buildWhatsAppUrl(phone, text), '_blank')
  }

  function handleNavigate(address: string) {
    const encoded = encodeURIComponent(address)
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
    if (isMobile) {
      window.open(`geo:0,0?q=${encoded}`, '_blank')
      setTimeout(() => window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank'), 500)
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank')
    }
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Status badge */}
      <div style={{ background: sc.bg, border: `0.5px solid ${sc.border}`, borderRadius: 12, padding: '8px 8px', textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: sc.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{statusLabel}</div>
      </div>
      {/* Priority */}
      <div style={{ background: pc.bg, border: `0.5px solid ${pc.border}`, borderRadius: 10, padding: '6px 8px', textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: pc.color }}>{priorityLabel}</div>
      </div>
      {/* Due date */}
      {task.due_date && (
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '6px 8px', textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            {format(parseISO(task.due_date), 'dd MMM, HH:mm', { locale: dateLocale })}
          </div>
        </div>
      )}
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', marginBottom: 10 }} />
      {/* Quick actions */}
      {isActive && (
        <>
          <button onClick={() => { if (task && onStatusChange) { onStatusChange(task.id, 'done'); onClose() } }}
            style={{ padding: '9px 10px', borderRadius: 9, border: 'none', background: 'rgba(34,197,94,0.15)', color: '#34d399', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <CheckSquare size={13} />{isHe ? 'הושלם' : 'Завершить'}
          </button>
          {task.status === 'open' && (
            <button onClick={() => { if (task && onStatusChange) onStatusChange(task.id, 'in_progress') }}
              style={{ padding: '9px 10px', borderRadius: 9, border: '0.5px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Clock size={13} />{isHe ? 'התחל עבודה' : 'В процесс'}
            </button>
          )}
          {onEdit && (
            <button onClick={() => { onClose(); onEdit(task) }}
              style={{ padding: '9px 10px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              ✏️ {isHe ? 'עריכה' : 'Редактировать'}
            </button>
          )}
          <button onClick={() => setShowDeleteConfirm(true)}
            style={{ padding: '8px 10px', borderRadius: 9, border: '0.5px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.7)', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            🗑️ {isHe ? 'מחק' : 'Удалить'}
          </button>
          <button onClick={() => { if (task && onStatusChange) { onStatusChange(task.id, 'cancelled'); onClose() } }}
            style={{ padding: '7px 10px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 600, cursor: 'pointer', marginBottom: 5 }}>
            {isHe ? 'בטל משימה' : 'Отменить задачу'}
          </button>
        </>
      )}
      <button onClick={onClose}
        style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', marginTop: 2 }}>
        {isHe ? 'סגור' : 'Закрыть'}
      </button>
    </div>
  )

  return (
    <Modal open={isOpen} onClose={onClose} darkHeader width="700px" dir={dir} contentClassName="!p-0">
      <TrinityModalShell open={isOpen} onClose={onClose} icon={<CheckSquare />}
        title={task.title} subtitle={isHe ? 'פרטי משימה' : 'Детали задачи'}
        dir={dir} sidebarExtra={sidebar}>
        <div style={{ padding: '20px 18px 24px' }} className="space-y-4">

          {/* Birthday card */}
          {task.is_auto && task.auto_type === 'birthday' && (
            <div style={{ background: 'linear-gradient(135deg,#fdf2f8,#fce7f3)', border: '1px solid #f9a8d4', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>🎂</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#9d174d', margin: '0 0 2px' }}>{getClientName(task.client)}</p>
              <p style={{ fontSize: 12, color: '#be185d', margin: 0 }}>{isHe ? 'יום הולדת היום!' : 'День рождения сегодня!'}</p>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 14px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                {isHe ? 'תיאור' : 'Описание'}
              </p>
              <p style={{ fontSize: 13, color: '#78350f', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{task.description}</p>
            </div>
          )}

          {/* Status + Priority badges */}
          <div className="grid grid-cols-2 gap-3">
            <div style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 12, padding: '10px 14px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: sc.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{isHe ? 'סטטוס' : 'Статус'}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: sc.color, margin: 0 }}>{statusLabel}</p>
            </div>
            <div style={{ background: pc.bg, border: `1px solid ${pc.border}`, borderRadius: 12, padding: '10px 14px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: pc.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{isHe ? 'עדיפות' : 'Приоритет'}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: pc.color, margin: 0 }}>{priorityLabel}</p>
            </div>
          </div>

          {/* Due date */}
          {task.due_date && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={14} color="#94a3b8" />
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>{isHe ? 'תאריך יעד' : 'Срок'}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>
                  {format(parseISO(task.due_date), 'dd MMM yyyy, HH:mm', { locale: dateLocale })}
                </p>
              </div>
            </div>
          )}

          {/* Client */}
          {task.client_id && task.client && (
            <button onClick={() => { if (onClientClick && task.client_id) { onClose(); onClientClick(task.client_id) } }}
              style={{ width: '100%', background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', border: '1px solid #c7d2fe', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left' }}>
              <User size={14} color="#4f46e5" />
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 1px' }}>{isHe ? 'לקוח' : 'Клиент'}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#4338ca', margin: 0 }}>{getClientName(task.client)}</p>
              </div>
            </button>
          )}

          {/* Visit */}
          {task.visit_id && (
            <button onClick={() => { onClose(); router.push(`/visits?highlight=${task.visit_id}`) }}
              style={{ width: '100%', background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left' }}>
              <Calendar size={14} color="#d97706" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#d97706' }}>{isHe ? 'צפה בביקור' : 'Посмотреть визит'}</span>
            </button>
          )}

          {/* Phone */}
          {task.contact_phone && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{isHe ? 'טלפון' : 'Телефон'}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', flex: 1, fontFamily: 'monospace' }} dir="ltr">{task.contact_phone}</span>
                <button onClick={() => window.location.href = `tel:${task.contact_phone}`}
                  style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={14} color="#3b82f6" />
                </button>
                <button onClick={() => handleWhatsApp(task.contact_phone!)}
                  style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={14} color="#22c55e" />
                </button>
                <button onClick={() => window.location.href = `sms:${task.contact_phone}`}
                  style={{ width: 32, height: 32, borderRadius: 8, background: '#faf5ff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={14} color="#a78bfa" />
                </button>
              </div>
            </div>
          )}

          {/* Email */}
          {task.contact_email && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{isHe ? 'אימייל' : 'Email'}</p>
                <p style={{ fontSize: 13, color: '#1e293b', margin: 0 }} dir="ltr">{task.contact_email}</p>
              </div>
              <button onClick={() => window.location.href = `mailto:${task.contact_email}`}
                style={{ width: 32, height: 32, borderRadius: 8, background: '#fef2f2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={14} color="#ef4444" />
              </button>
            </div>
          )}

          {/* Address */}
          {task.contact_address && (
            <button onClick={() => handleNavigate(task.contact_address!)}
              style={{ width: '100%', background: 'linear-gradient(135deg,#faf5ff,#ede9fe)', border: '1px solid #ddd6fe', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left' }}>
              <MapPin size={14} color="#7c3aed" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#6d28d9', flex: 1 }}>{task.contact_address}</span>
              <span style={{ fontSize: 11, color: '#a78bfa' }}>{isHe ? 'נווט' : 'Навигация'}</span>
            </button>
          )}

          {/* Delete confirm */}
          {showDeleteConfirm && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px' }}>
              <p style={{ fontSize: 13, color: '#dc2626', textAlign: 'center', marginBottom: 10, fontWeight: 600 }}>
                {isHe ? `למחוק את המשימה «${task.title}»?` : `Удалить задачу «${task.title}»?`}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { if (onDelete) { onDelete(task.id); setShowDeleteConfirm(false); onClose() } }}
                  style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {isHe ? 'כן, מחק' : 'Да, удалить'}
                </button>
                <button onClick={() => setShowDeleteConfirm(false)}
                  style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
                  {isHe ? 'ביטול' : 'Отмена'}
                </button>
              </div>
            </div>
          )}

        </div>
      </TrinityModalShell>
    </Modal>
  )
}

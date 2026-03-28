'use client'

/**
 * TaskDetailSheet — детали задачи.
 * Мобиль: ModalBottomSheet с compact action chips
 * Десктоп: Modal + TrinityModalShell (сайдбар с действиями)
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { ModalBottomSheet } from '@/components/ui/ModalBottomSheet'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import {
  User, Calendar, Phone, MessageCircle, MapPin, Mail,
  Clock, CheckSquare, Check, Pencil, Trash2, X,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { getClientName } from '@/lib/client-utils'
import { he, ru } from 'date-fns/locale'
import { useOrgTemplates } from '@/hooks/useOrgTemplates'
import { buildMessage, buildWhatsAppUrl } from '@/lib/message-utils'

interface Task {
  id: string; title: string; description: string | null
  status: 'open' | 'in_progress' | 'done' | 'cancelled' | 'completed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  due_date: string | null; client_id: string | null; visit_id: string | null
  contact_phone: string | null; contact_email: string | null; contact_address: string | null
  is_auto: boolean; auto_type: string | null; created_at: string
  client?: { id: string; name?: string; first_name?: string; last_name?: string } | null
}

interface TaskDetailSheetProps {
  task: Task | null; isOpen: boolean; onClose: () => void
  onStatusChange?: (taskId: string, status: string) => void
  onClientClick?: (clientId: string) => void
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
  locale: 'he' | 'ru'
}

const PRIORITY_CFG = {
  low:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', he: 'נמוכה', ru: 'Низкий' },
  normal: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  he: 'רגילה', ru: 'Обычный' },
  high:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  he: 'גבוהה', ru: 'Высокий' },
  urgent: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   he: 'דחופה', ru: 'Срочный' },
}
const STATUS_CFG = {
  open:        { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', he: 'פתוח',   ru: 'Открыто' },
  in_progress: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', he: 'בתהליך', ru: 'В процессе' },
  done:        { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  he: 'הושלם',  ru: 'Завершено' },
  completed:   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  he: 'הושלם',  ru: 'Завершено' },
  cancelled:   { color: '#64748b', bg: 'rgba(100,116,139,0.1)', he: 'בוטל',   ru: 'Отменено' },
}

export function TaskDetailSheet({
  task, isOpen, onClose, onStatusChange, onClientClick, onEdit, onDelete, locale,
}: TaskDetailSheetProps) {
  const router = useRouter()
  const isHe = locale === 'he'
  const dir = isHe ? 'rtl' : 'ltr'
  const dateLocale = isHe ? he : ru
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { templates } = useOrgTemplates()

  if (!task) return null

  const pc = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.normal
  const sc = STATUS_CFG[task.status] ?? STATUS_CFG.open
  const isActive = task.status !== 'done' && task.status !== 'completed' && task.status !== 'cancelled'

  function handleWhatsApp(phone: string) {
    const clientName = task?.client ? getClientName(task.client) : undefined
    const text = templates?.whatsapp_template ? buildMessage(templates.whatsapp_template, { client_name: clientName }) : undefined
    window.open(buildWhatsAppUrl(phone, text), '_blank')
  }

  function handleNavigate(address: string) {
    const encoded = encodeURIComponent(address)
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
    if (isMobile) { window.open(`geo:0,0?q=${encoded}`, '_blank'); setTimeout(() => window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank'), 500) }
    else window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank')
  }

  // ── Общий контент деталей ─────────────────────────────────────────────────
  const detailContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} dir={dir}>

      {/* Приоритет + Статус — компактная строка */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: sc.bg, color: sc.color }}>
          {isHe ? sc.he : sc.ru}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: pc.bg, color: pc.color }}>
          {isHe ? pc.he : pc.ru}
        </span>
        {task.due_date && (
          <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: '#f8fafc', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={10} />
            {format(parseISO(task.due_date), 'dd MMM, HH:mm', { locale: dateLocale })}
          </span>
        )}
      </div>

      {/* Birthday */}
      {task.is_auto && task.auto_type === 'birthday' && (
        <div style={{ background: 'linear-gradient(135deg,#fdf2f8,#fce7f3)', border: '1px solid #f9a8d4', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🎂</div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#9d174d', margin: 0 }}>{getClientName(task.client)}</p>
          <p style={{ fontSize: 11, color: '#be185d', margin: '2px 0 0' }}>{isHe ? 'יום הולדת היום!' : 'День рождения сегодня!'}</p>
        </div>
      )}

      {/* Описание */}
      {task.description && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 12px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 5px' }}>{isHe ? 'תיאור' : 'Описание'}</p>
          <p style={{ fontSize: 13, color: '#78350f', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{task.description}</p>
        </div>
      )}

      {/* Клиент */}
      {task.client_id && task.client && (
        <button onClick={() => { if (onClientClick && task.client_id) { onClose(); onClientClick(task.client_id) } }}
          style={{ width: '100%', background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', border: '1px solid #c7d2fe', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
          <User size={14} color="#4f46e5" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 1px' }}>{isHe ? 'לקוח' : 'Клиент'}</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#4338ca', margin: 0 }}>{getClientName(task.client)}</p>
          </div>
        </button>
      )}

      {/* Телефон */}
      {task.contact_phone && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 7px' }}>{isHe ? 'טלפון' : 'Телефон'}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', flex: 1, fontFamily: 'monospace' }} dir="ltr">{task.contact_phone}</span>
            <button onClick={() => window.location.href = `tel:${task.contact_phone}`} style={{ width: 30, height: 30, borderRadius: 8, background: '#eff6ff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Phone size={13} color="#3b82f6" /></button>
            <button onClick={() => handleWhatsApp(task.contact_phone!)} style={{ width: 30, height: 30, borderRadius: 8, background: '#f0fdf4', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MessageCircle size={13} color="#22c55e" /></button>
          </div>
        </div>
      )}

      {/* Адрес */}
      {task.contact_address && (
        <button onClick={() => handleNavigate(task.contact_address!)}
          style={{ width: '100%', background: 'linear-gradient(135deg,#faf5ff,#ede9fe)', border: '1px solid #ddd6fe', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
          <MapPin size={14} color="#7c3aed" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#6d28d9', flex: 1 }}>{task.contact_address}</span>
          <span style={{ fontSize: 11, color: '#a78bfa' }}>{isHe ? 'נווט' : 'Навигация'}</span>
        </button>
      )}

      {/* Email */}
      {task.contact_email && (
        <button onClick={() => window.location.href = `mailto:${task.contact_email}`}
          style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
          <Mail size={14} color="#ef4444" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#1e293b', flex: 1 }} dir="ltr">{task.contact_email}</span>
        </button>
      )}

      {/* Визит */}
      {task.visit_id && (
        <button onClick={() => { onClose(); router.push(`/visits?highlight=${task.visit_id}`) }}
          style={{ width: '100%', background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
          <Calendar size={14} color="#d97706" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#d97706' }}>{isHe ? 'צפה בביקור' : 'Посмотреть визит'}</span>
        </button>
      )}

      {/* Подтверждение удаления */}
      {showDeleteConfirm && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px' }}>
          <p style={{ fontSize: 13, color: '#dc2626', textAlign: 'center', margin: '0 0 10px', fontWeight: 600 }}>
            {isHe ? `למחוק את «${task.title}»?` : `Удалить «${task.title}»?`}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { onDelete?.(task.id); setShowDeleteConfirm(false); onClose() }}
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
  )

  // ── Мобильный footer — компактные action chips ────────────────────────────
  const mobileFooter = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {isActive && !showDeleteConfirm && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { onStatusChange?.(task.id, 'completed'); onClose() }}
            style={{ flex: 1, padding: '11px 8px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Check size={15} />{isHe ? 'בוצע' : 'Выполнено'}
          </button>
          {task.status === 'open' && (
            <button onClick={() => onStatusChange?.(task.id, 'in_progress')}
              style={{ flex: 1, padding: '11px 8px', borderRadius: 12, border: '1.5px solid #3b82f6', background: 'rgba(59,130,246,0.08)', color: '#3b82f6', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Clock size={14} />{isHe ? 'בתהליך' : 'В процесс'}
            </button>
          )}
        </div>
      )}
      {isActive && !showDeleteConfirm && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { onClose(); onEdit?.(task) }}
            style={{ flex: 1, padding: '10px 8px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Pencil size={13} />{isHe ? 'עריכה' : 'Изменить'}
          </button>
          <button onClick={() => setShowDeleteConfirm(true)}
            style={{ flex: 1, padding: '10px 8px', borderRadius: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Trash2 size={13} />{isHe ? 'מחק' : 'Удалить'}
          </button>
        </div>
      )}
      {!isActive && !showDeleteConfirm && (
        <button onClick={onClose}
          style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#f1f5f9', color: '#64748b', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {isHe ? 'סגור' : 'Закрыть'}
        </button>
      )}
    </div>
  )

  // ── Сайдбар для десктопа ──────────────────────────────────────────────────
  const desktopSidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ background: sc.bg, border: `0.5px solid ${sc.color}40`, borderRadius: 12, padding: '8px', textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: sc.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{isHe ? sc.he : sc.ru}</div>
      </div>
      <div style={{ background: pc.bg, border: `0.5px solid ${pc.color}40`, borderRadius: 10, padding: '6px', textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: pc.color }}>{isHe ? pc.he : pc.ru}</div>
      </div>
      {task.due_date && (
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '6px', textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            {format(parseISO(task.due_date), 'dd MMM, HH:mm', { locale: dateLocale })}
          </div>
        </div>
      )}
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '0 0 8px' }} />
      {isActive && (
        <>
          <button onClick={() => { onStatusChange?.(task.id, 'completed'); onClose() }}
            style={{ padding: '9px', borderRadius: 9, border: 'none', background: 'rgba(34,197,94,0.15)', color: '#34d399', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Check size={12} />{isHe ? 'הושלם' : 'Завершить'}
          </button>
          {task.status === 'open' && (
            <button onClick={() => onStatusChange?.(task.id, 'in_progress')}
              style={{ padding: '9px', borderRadius: 9, border: '0.5px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Clock size={12} />{isHe ? 'התחל' : 'В процесс'}
            </button>
          )}
          {onEdit && (
            <button onClick={() => { onClose(); onEdit(task) }}
              style={{ padding: '9px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Pencil size={11} />{isHe ? 'עריכה' : 'Редактировать'}
            </button>
          )}
          <button onClick={() => setShowDeleteConfirm(true)}
            style={{ padding: '8px', borderRadius: 9, border: '0.5px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.7)', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Trash2 size={11} />{isHe ? 'מחק' : 'Удалить'}
          </button>
        </>
      )}
      <button onClick={onClose} style={{ padding: '8px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
        {isHe ? 'סגור' : 'Закрыть'}
      </button>
    </div>
  )

  return (
    <>
      {/* ── МОБИЛЬ ── */}
      <ModalBottomSheet
        open={isOpen}
        onClose={onClose}
        icon={<CheckSquare size={18} />}
        title={task.title}
        subtitle={isHe ? 'פרטי משימה' : 'Детали задачи'}
        dir={dir}
        footerContent={mobileFooter}
      >
        <div className="md:hidden">
          {detailContent}
        </div>
      </ModalBottomSheet>

      {/* ── ДЕСКТОП ── */}
      <Modal open={isOpen} onClose={onClose} darkHeader showCloseButton={false} width="700px" dir={dir} contentClassName="!p-0">
        <div className="hidden md:block">
          <TrinityModalShell open={isOpen} onClose={onClose} icon={<CheckSquare />}
            title={task.title} subtitle={isHe ? 'פרטי משימה' : 'Детали задачи'}
            dir={dir} sidebarExtra={desktopSidebar}>
            <div style={{ padding: '20px 18px 24px' }}>
              {detailContent}
            </div>
          </TrinityModalShell>
        </div>
      </Modal>
    </>
  )
}

'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useModalStore } from '@/store/useModalStore'
import Modal from '@/components/ui/Modal'
import { TrinitySearchDropdown } from '@/components/ui/TrinitySearch'
import { Phone, MessageCircle, X, Loader2, Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getClientName } from '@/lib/client-utils'
import { useLanguage } from '@/contexts/LanguageContext'

interface OrgUser {
  user_id: string
  full_name: string
  role: string
  email?: string
}

interface Client {
  id: string
  first_name?: string
  last_name?: string
  name?: string
  phone: string
  email: string
}

type Priority = 'low' | 'normal' | 'high' | 'urgent'

const t = {
  he: {
    title: 'כותרת', priority: 'עדיפות', low: 'נמוכה', normal: 'רגילה', high: 'גבוהה', urgent: 'דחופה',
    dueDate: 'תאריך יעד', dueTime: 'שעה', assignee: 'הקצה לעובד', noColleagues: 'אין עובדים נוספים',
    client: 'לקוח', phone: 'טלפון', email: 'אימייל', description: 'תיאור',
    newTask: 'משימה חדשה', editTask: 'עריכת משימה', save: 'צור משימה', saveEdit: 'שמור שינויים',
    cancel: 'ביטול', searchClient: 'חיפוש לקוח...', searchUser: 'חיפוש עובד...',
  },
  ru: {
    title: 'Заголовок', priority: 'Приоритет', low: 'Низкий', normal: 'Обычный', high: 'Высокий', urgent: 'Срочный',
    dueDate: 'Дедлайн', dueTime: 'Время', assignee: 'Назначить', noColleagues: 'Нет коллег',
    client: 'Клиент', phone: 'Телефон', email: 'Email', description: 'Описание',
    newTask: 'Новая задача', editTask: 'Редактирование задачи', save: 'Создать задачу', saveEdit: 'Сохранить изменения',
    cancel: 'Отмена', searchClient: 'Поиск клиента...', searchUser: 'Поиск сотрудника...',
  },
}

export function CreateTaskModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  const { user } = useAuth()
  const { language } = useLanguage()

  const isOpen = isModalOpen('task-create')
  const data = getModalData('task-create')
  const prefill = data?.prefill
  const editTask = data?.editTask
  const isEditMode = !!editTask
  const onCreated = data?.onCreated || (() => {})

  const locale = language as 'he' | 'ru'
  const isRTL = locale === 'he'
  const labels = t[locale]

  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('normal')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [reminder, setReminder] = useState(false)
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientName, setSelectedClientName] = useState('')
  const [selectedUserName, setSelectedUserName] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadOrgUsers(); loadClients()
      if (editTask) {
        setTitle(editTask.title || ''); setDescription(editTask.description || '')
        setPriority(editTask.priority || 'normal'); setClientId(editTask.client_id || null)
        setContactPhone(editTask.contact_phone || ''); setContactEmail(editTask.contact_email || '')
        setAssignedTo(editTask.assigned_to || null)
        if (editTask.due_date) {
          const dt = new Date(editTask.due_date)
          setDueDate(dt.toISOString().split('T')[0]); setDueTime(dt.toTimeString().slice(0, 5))
        }
        if (editTask.client) setSelectedClientName(getClientName(editTask.client))
      } else if (prefill) {
        setTitle(prefill.title || ''); setDescription(prefill.description || '')
        setClientId(prefill.client_id || null); setContactPhone(prefill.contact_phone || '')
      }
    }
  }, [isOpen, prefill, editTask])

  async function loadOrgUsers() {
    try { const r = await fetch('/api/org-users'); if (r.ok) setOrgUsers(await r.json()) } catch {}
  }
  async function loadClients() {
    try {
      const r = await fetch('/api/clients')
      if (r.ok) { const d = await r.json(); setClients(Array.isArray(d) ? d : d?.data || []) }
    } catch {}
  }

  function handleClientSelect(client: Client) {
    setClientId(client.id); setSelectedClientName(getClientName(client))
    if (client.phone) setContactPhone(client.phone)
    if (client.email) setContactEmail(client.email)
  }
  function handleUserSelect(u: OrgUser) { setAssignedTo(u.user_id); setSelectedUserName(u.full_name) }

  function handleClose() {
    setTitle(''); setPriority('normal'); setDueDate(''); setDueTime('')
    setAssignedTo(null); setClientId(null); setContactPhone(''); setContactEmail('')
    setDescription(''); setSelectedClientName(''); setSelectedUserName(''); setReminder(false)
    closeModal('task-create')
  }

  async function handleSubmit() {
    if (!title.trim()) { alert(locale === 'he' ? 'נא למלא כותרת' : 'Заполните заголовок'); return }
    if (reminder && (!dueDate || !dueTime)) {
      alert(locale === 'he' ? 'לתזכורת חובה לבחור תאריך ושעה' : 'Для напоминания нужна дата и время'); return
    }
    setSaving(true)
    try {
      let due_date = null
      if (dueDate) due_date = new Date(`${dueDate}T${dueTime || '00:00'}`).toISOString()
      const body = { title: title.trim(), description: description.trim() || null, priority, due_date, assigned_to: assignedTo, client_id: clientId, contact_phone: contactPhone || null, contact_email: contactEmail || null, reminder }
      const url = isEditMode ? `/api/tasks/${editTask.id}` : '/api/tasks'
      const r = await fetch(url, { method: isEditMode ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!r.ok) { const d = await r.json(); alert(d.error || 'Ошибка'); return }
      onCreated(); handleClose()
    } catch { alert('Ошибка') } finally { setSaving(false) }
  }

  const today = new Date().toISOString().split('T')[0]
  const priorityButtons: Array<{ key: Priority; label: string; bg: string; text: string }> = [
    { key: 'low',    label: labels.low,    bg: 'bg-gray-100 dark:bg-gray-800',        text: 'text-gray-700 dark:text-gray-300' },
    { key: 'normal', label: labels.normal, bg: 'bg-blue-100 dark:bg-blue-900/30',     text: 'text-blue-700 dark:text-blue-400' },
    { key: 'high',   label: labels.high,   bg: 'bg-amber-100 dark:bg-amber-900/30',   text: 'text-amber-700 dark:text-amber-400' },
    { key: 'urgent', label: labels.urgent, bg: 'bg-red-100 dark:bg-red-900/30',       text: 'text-red-700 dark:text-red-400' },
  ]
  const inp = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"

  return (
    <Modal open={isOpen} onClose={handleClose} title={isEditMode ? labels.editTask : labels.newTask} width="580px"
      footer={
        <div className="flex gap-2">
          <button onClick={handleClose} className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition">{labels.cancel}</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-[1.5] min-h-[44px] py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />{locale === 'he' ? 'שומר...' : 'Сохранение...'}</> : <>{!isEditMode && <Plus className="w-4 h-4" />}{isEditMode ? labels.saveEdit : labels.save}</>}
          </button>
        </div>
      }
    >
      <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Title */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{labels.title} <span className="text-red-500">*</span></label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inp} dir={isRTL ? 'rtl' : 'ltr'} autoFocus />
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">{labels.priority}</label>
          <div className="grid grid-cols-4 gap-2">
            {priorityButtons.map(btn => (
              <button key={btn.key} type="button" onClick={() => setPriority(btn.key)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition ${priority === btn.key ? `${btn.bg} ${btn.text} ring-2 ring-offset-1 ring-current` : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100'}`}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{labels.dueDate}</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} min={today} className={inp} dir="ltr" />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{labels.dueTime}</label>
            <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} disabled={!dueDate} className={`${inp} disabled:opacity-40 disabled:cursor-not-allowed`} dir="ltr" />
          </div>
        </div>

        {/* Reminder */}
        <div className="flex items-center gap-3">
          <input type="checkbox" id="task-reminder" checked={reminder} onChange={e => setReminder(e.target.checked)} className="w-4 h-4 accent-indigo-600 cursor-pointer" />
          <label htmlFor="task-reminder" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            {locale === 'he' ? '🔔 תזכורת (2 שעות לפני)' : '🔔 Напоминание (за 2 часа до)'}
          </label>
        </div>

        {/* Assignee */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{labels.assignee}</label>
          {orgUsers.length === 0
            ? <div className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 text-sm">{labels.noColleagues}</div>
            : <TrinitySearchDropdown data={orgUsers} searchKeys={['full_name', 'email']} minChars={0} placeholder={labels.searchUser} onSelect={handleUserSelect}
                renderItem={(u) => { const c = ['bg-blue-500','bg-purple-500','bg-emerald-500','bg-amber-500','bg-rose-500'][(u.full_name||'').charCodeAt(0)%5]; return <div className="flex items-center gap-2.5"><div className={`w-8 h-8 rounded-full ${c} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{(u.full_name||u.email||'?')[0].toUpperCase()}</div><div><p className="font-medium text-sm">{u.full_name||u.email}</p><p className="text-xs text-gray-500 capitalize">{u.role}</p></div></div> }}
                locale={locale} />
          }
          {selectedUserName && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 px-1">{locale === 'he' ? 'נבחר' : 'Выбрано'}: {selectedUserName}</p>}
        </div>

        {/* Client */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{labels.client}</label>
          <TrinitySearchDropdown data={clients} searchKeys={['first_name','last_name','phone']} minChars={2} placeholder={labels.searchClient} onSelect={handleClientSelect}
            renderItem={(c) => <div><p className="font-medium text-sm">{getClientName(c)}</p>{c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}</div>}
            locale={locale} />
          {selectedClientName && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 px-1">{locale === 'he' ? 'נבחר' : 'Выбрано'}: {selectedClientName}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{labels.phone}</label>
          <div className="flex gap-2">
            <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className={`${inp} flex-1`} dir="ltr" />
            {contactPhone && <>
              <button type="button" onClick={() => window.location.href = `tel:${contactPhone}`} className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 flex items-center justify-center transition"><Phone className="w-4 h-4" /></button>
              <button type="button" onClick={() => window.open(`https://wa.me/${contactPhone.replace(/[^0-9]/g,'')}`, '_blank')} className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 flex items-center justify-center transition"><MessageCircle className="w-4 h-4" /></button>
            </>}
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{labels.email}</label>
          <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className={inp} dir="ltr" />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{labels.description}</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={`${inp} resize-none max-h-[150px] overflow-y-auto`} dir={isRTL ? 'rtl' : 'ltr'} />
        </div>
      </div>
    </Modal>
  )
}

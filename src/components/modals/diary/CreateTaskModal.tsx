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
    title: 'כותרת',
    priority: 'עדיפות',
    low: 'נמוכה',
    normal: 'רגילה',
    high: 'גבוהה',
    urgent: 'דחופה',
    dueDate: 'תאריך יעד',
    dueTime: 'שעה',
    assignee: 'הקצה לעובד',
    noColleagues: 'אין עובדים נוספים',
    client: 'לקוח',
    phone: 'טלפון',
    email: 'אימייל',
    description: 'תיאור',
    newTask: 'משימה חדשה',
    save: 'צור משימה',
    cancel: 'ביטול',
    searchClient: 'חיפוש לקוח...',
    searchUser: 'חיפוש עובד...',
  },
  ru: {
    title: 'Заголовок',
    priority: 'Приоритет',
    low: 'Низкий',
    normal: 'Обычный',
    high: 'Высокий',
    urgent: 'Срочный',
    dueDate: 'Дедлайн',
    dueTime: 'Время',
    assignee: 'Назначить',
    noColleagues: 'Нет коллег',
    client: 'Клиент',
    phone: 'Телефон',
    email: 'Email',
    description: 'Описание',
    newTask: 'Новая задача',
    save: 'Создать задачу',
    cancel: 'Отмена',
    searchClient: 'Поиск клиента...',
    searchUser: 'Поиск сотрудника...',
  },
}

export function CreateTaskModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  const { user } = useAuth()
  const { language } = useLanguage()
  
  const isOpen = isModalOpen('task-create')
  const data = getModalData('task-create')
  const prefill = data?.prefill
  const onCreated = data?.onCreated || (() => {})
  
  const locale = language as 'he' | 'ru'
  const isRTL = locale === 'he'
  const labels = t[locale]

  // Form state
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

  // Data for dropdowns
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [clients, setClients] = useState<Client[]>([])

  // Selected names
  const [selectedClientName, setSelectedClientName] = useState('')
  const [selectedUserName, setSelectedUserName] = useState('')

  // Load data
  useEffect(() => {
    if (isOpen) {
      loadOrgUsers()
      loadClients()
      
      // Apply prefill
      if (prefill) {
        setTitle(prefill.title || '')
        setDescription(prefill.description || '')
        setClientId(prefill.client_id || null)
        setContactPhone(prefill.contact_phone || '')
      }
    }
  }, [isOpen, prefill])

  async function loadOrgUsers() {
    try {
      const response = await fetch('/api/org-users')
      if (response.ok) {
        const data = await response.json()
        setOrgUsers(data)
      }
    } catch (error) {
      console.error('Load org users error:', error)
    }
  }

  async function loadClients() {
    try {
      const response = await fetch('/api/clients')
      if (response.ok) {
        const data = await response.json()
        const clients = Array.isArray(data) ? data : data?.data || []
        setClients(clients)
      }
    } catch (error) {
      console.error('Load clients error:', error)
    }
  }

  function handleClientSelect(client: Client) {
    setClientId(client.id)
    setSelectedClientName(getClientName(client))
    if (client.phone) setContactPhone(client.phone)
    if (client.email) setContactEmail(client.email)
  }

  function handleUserSelect(user: OrgUser) {
    setAssignedTo(user.user_id)
    setSelectedUserName(user.full_name)
  }

  function handleClose() {
    // Reset form
    setTitle('')
    setPriority('normal')
    setDueDate('')
    setDueTime('')
    setAssignedTo(null)
    setClientId(null)
    setContactPhone('')
    setContactEmail('')
    setDescription('')
    setSelectedClientName('')
    setSelectedUserName('')
    closeModal('task-create')
  }

  async function handleSubmit() {
    if (!title.trim()) {
      alert(locale === 'he' ? 'נא למלא כותרת' : 'Заполните заголовок')
      return
    }

    setSaving(true)
    try {
      let dueDateTimestamp = null
      if (dueDate) {
        const timeStr = dueTime || '00:00'
        dueDateTimestamp = new Date(`${dueDate}T${timeStr}`).toISOString()
      }

      const body = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_date: dueDateTimestamp,
        assigned_to: assignedTo,
        client_id: clientId,
        contact_phone: contactPhone || null,
        contact_email: contactEmail || null,
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || (locale === 'he' ? 'שגיאה' : 'Ошибка'))
        return
      }
      
      onCreated()
      handleClose()
    } catch (error) {
      console.error('Create task error:', error)
      alert(locale === 'he' ? 'שגיאה ביצירת משימה' : 'Ошибка создания задачи')
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const priorityButtons: Array<{ key: Priority; label: string; bgColor: string; textColor: string }> = [
    { key: 'low', label: labels.low, bgColor: 'bg-gray-100 dark:bg-gray-800', textColor: 'text-gray-700 dark:text-gray-300' },
    { key: 'normal', label: labels.normal, bgColor: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-700 dark:text-blue-400' },
    { key: 'high', label: labels.high, bgColor: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-700 dark:text-amber-400' },
    { key: 'urgent', label: labels.urgent, bgColor: 'bg-red-100 dark:bg-red-900/30', textColor: 'text-red-700 dark:text-red-400' },
  ]

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title={labels.newTask}
      width="580px"
      footer={
        <div className="flex gap-2">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            {labels.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-[1.5] py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {locale === 'he' ? 'שומר...' : 'Сохранение...'}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {labels.save}
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Title */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
            {labels.title} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">{labels.priority}</label>
          <div className="grid grid-cols-4 gap-2">
            {priorityButtons.map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={() => setPriority(btn.key)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition ${
                  priority === btn.key
                    ? `${btn.bgColor} ${btn.textColor} ring-2 ring-offset-1 ring-current`
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{labels.dueDate}</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={today}
              className={inputClass}
              dir="ltr"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{labels.dueTime}</label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className={inputClass}
              dir="ltr"
            />
          </div>
        </div>

        {/* Assignee */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{labels.assignee}</label>
          {orgUsers.length <= 1 ? (
            <div className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 text-sm">
              {labels.noColleagues}
            </div>
          ) : (
            <TrinitySearchDropdown
              data={orgUsers}
              searchKeys={['full_name']}
              minChars={1}
              placeholder={labels.searchUser}
              onSelect={handleUserSelect}
              renderItem={(user) => (
                <div>
                  <p className="font-medium text-sm">{user.full_name}</p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
              )}
              locale={locale}
            />
          )}
          {selectedUserName && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 px-1">
              {locale === 'he' ? 'נבחר' : 'Выбрано'}: {selectedUserName}
            </p>
          )}
        </div>

        {/* Client */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{labels.client}</label>
          <TrinitySearchDropdown
            data={clients}
            searchKeys={['first_name', 'last_name', 'phone']}
            minChars={2}
            placeholder={labels.searchClient}
            onSelect={handleClientSelect}
            renderItem={(client) => (
              <div>
                <p className="font-medium text-sm">{getClientName(client)}</p>
                {client.phone && <p className="text-xs text-gray-500">{client.phone}</p>}
              </div>
            )}
            locale={locale}
          />
          {selectedClientName && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 px-1">
              {locale === 'he' ? 'נבחר' : 'Выбрано'}: {selectedClientName}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{labels.phone}</label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className={`${inputClass} flex-1`}
              dir="ltr"
            />
            {contactPhone && (
              <>
                <button
                  type="button"
                  onClick={() => window.location.href = `tel:${contactPhone}`}
                  className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 flex items-center justify-center transition"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cleanPhone = contactPhone.replace(/[^0-9]/g, '')
                    window.open(`https://wa.me/${cleanPhone}`, '_blank')
                  }}
                  className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 flex items-center justify-center transition"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{labels.email}</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className={inputClass}
            dir="ltr"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{labels.description}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>
      </div>
    </Modal>
  )
}

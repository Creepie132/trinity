'use client'

import { useState, useEffect } from 'react'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'
import { TrinityButton } from '@/components/ui/TrinityButton'
import { TrinitySearchDropdown } from '@/components/ui/TrinitySearch'
import { Phone, MessageSquare, Navigation, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface CreateTaskSheetProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  locale: 'he' | 'ru'
}

interface OrgUser {
  user_id: string
  full_name: string
  role: string
}

interface Client {
  id: string
  name: string
  phone: string
  email: string
}

interface Visit {
  id: string
  client_id: string
  scheduled_at: string
  service_type: string
  client?: {
    name: string
  }
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
    visit: 'ביקור',
    phone: 'טלפון',
    email: 'אימייל',
    address: 'כתובת',
    navigate: 'נווט',
    description: 'תיאור',
    newTask: 'משימה חדשה',
    save: 'שמור',
    cancel: 'ביטול',
    call: 'חייג',
    searchClient: 'חיפוש לקוח...',
    searchVisit: 'חיפוש ביקור...',
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
    assignee: 'Назначить работнику',
    noColleagues: 'Нет коллег',
    client: 'Клиент',
    visit: 'Визит',
    phone: 'Телефон',
    email: 'Email',
    address: 'Адрес',
    navigate: 'Навигация',
    description: 'Описание',
    newTask: 'Новая задача',
    save: 'Сохранить',
    cancel: 'Отмена',
    call: 'Позвонить',
    searchClient: 'Поиск клиента...',
    searchVisit: 'Поиск визита...',
    searchUser: 'Поиск сотрудника...',
  },
}

export function CreateTaskSheet({ isOpen, onClose, onCreated, locale }: CreateTaskSheetProps) {
  const { user } = useAuth()
  const isRTL = locale === 'he'
  const labels = t[locale]

  // Form state
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('normal')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [visitId, setVisitId] = useState<string | null>(null)
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactAddress, setContactAddress] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Data for dropdowns
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [visits, setVisits] = useState<Visit[]>([])

  // Selected names for display
  const [selectedClientName, setSelectedClientName] = useState('')
  const [selectedVisitName, setSelectedVisitName] = useState('')
  const [selectedUserName, setSelectedUserName] = useState('')

  // Load org users
  useEffect(() => {
    if (isOpen) {
      loadOrgUsers()
      loadClients()
      loadVisits()
    }
  }, [isOpen])

  async function loadOrgUsers() {
    try {
      const response = await fetch('/api/org-users')
      if (!response.ok) throw new Error('Failed to load users')
      const data = await response.json()
      setOrgUsers(data)
    } catch (error) {
      console.error('Load org users error:', error)
    }
  }

  async function loadClients() {
    try {
      const response = await fetch('/api/clients')
      if (!response.ok) throw new Error('Failed to load clients')
      const data = await response.json()
      setClients(data || [])
    } catch (error) {
      console.error('Load clients error:', error)
    }
  }

  async function loadVisits() {
    try {
      const response = await fetch('/api/visits')
      if (!response.ok) throw new Error('Failed to load visits')
      const data = await response.json()
      setVisits(data || [])
    } catch (error) {
      console.error('Load visits error:', error)
    }
  }

  function handleClientSelect(client: Client) {
    setClientId(client.id)
    setSelectedClientName(client.name)
    if (client.phone) setContactPhone(client.phone)
    if (client.email) setContactEmail(client.email)
  }

  function handleVisitSelect(visit: Visit) {
    setVisitId(visit.id)
    setSelectedVisitName(
      `${visit.client?.name || ''} - ${visit.service_type || ''} (${new Date(visit.scheduled_at).toLocaleDateString()})`
    )
  }

  function handleUserSelect(user: OrgUser) {
    setAssignedTo(user.user_id)
    setSelectedUserName(user.full_name)
  }

  function handleCall(phone: string) {
    window.location.href = `tel:${phone}`
  }

  function handleWhatsApp(phone: string) {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${cleanPhone}`, '_blank')
  }

  function handleNavigate() {
    if (!contactAddress) return
    const encoded = encodeURIComponent(contactAddress)
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank')
  }

  async function handleSubmit() {
    if (!title.trim()) {
      alert(locale === 'he' ? 'נא למלא כותרת' : 'Заполните заголовок')
      return
    }

    setSaving(true)
    try {
      // Combine date and time if both provided
      let dueDateTimestamp = null
      if (dueDate) {
        const timeStr = dueTime || '00:00'
        dueDateTimestamp = new Date(`${dueDate}T${timeStr}`).toISOString()
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          priority,
          due_date: dueDateTimestamp,
          assigned_to: assignedTo,
          client_id: clientId,
          visit_id: visitId,
          contact_phone: contactPhone || null,
          contact_email: contactEmail || null,
          contact_address: contactAddress || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to create task')
      
      // Reset form
      setTitle('')
      setPriority('normal')
      setDueDate('')
      setDueTime('')
      setAssignedTo(null)
      setClientId(null)
      setVisitId(null)
      setContactPhone('')
      setContactEmail('')
      setContactAddress('')
      setDescription('')
      setSelectedClientName('')
      setSelectedVisitName('')
      setSelectedUserName('')

      onCreated()
    } catch (error) {
      console.error('Create task error:', error)
      alert(locale === 'he' ? 'שגיאה ביצירת משימה' : 'Ошибка создания задачи')
    } finally {
      setSaving(false)
    }
  }

  // Get today's date for min attribute
  const today = new Date().toISOString().split('T')[0]

  // Priority button styles
  const priorityButtons: Array<{ key: Priority; label: string; bgColor: string; textColor: string }> = [
    { key: 'low', label: labels.low, bgColor: 'bg-gray-100 dark:bg-gray-800', textColor: 'text-gray-700 dark:text-gray-300' },
    { key: 'normal', label: labels.normal, bgColor: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-700 dark:text-blue-400' },
    { key: 'high', label: labels.high, bgColor: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-700 dark:text-amber-400' },
    { key: 'urgent', label: labels.urgent, bgColor: 'bg-red-100 dark:bg-red-900/30', textColor: 'text-red-700 dark:text-red-400' },
  ]

  return (
    <TrinityBottomDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={labels.newTask}
    >
      <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Заголовок */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {labels.title} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>

        {/* Приоритет */}
        <div>
          <label className="block text-sm font-medium mb-2">{labels.priority}</label>
          <div className="grid grid-cols-4 gap-2">
            {priorityButtons.map((btn) => (
              <button
                key={btn.key}
                onClick={() => setPriority(btn.key)}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  priority === btn.key
                    ? `${btn.bgColor} ${btn.textColor} ring-2 ring-offset-1 ring-current`
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Дата дедлайна */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-2">{labels.dueDate}</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={today}
              className="w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{labels.dueTime}</label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              dir="ltr"
            />
          </div>
        </div>

        {/* Назначить работнику */}
        <div>
          <label className="block text-sm font-medium mb-2">{labels.assignee}</label>
          {orgUsers.length <= 1 ? (
            <button
              disabled
              className="w-full px-4 py-3 rounded-xl border bg-muted text-muted-foreground cursor-not-allowed"
            >
              {labels.noColleagues}
            </button>
          ) : (
            <TrinitySearchDropdown
              data={orgUsers}
              searchKeys={['full_name']}
              minChars={1}
              placeholder={labels.searchUser}
              onSelect={handleUserSelect}
              renderItem={(user) => (
                <div>
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user.role}</p>
                </div>
              )}
              locale={locale}
            />
          )}
          {selectedUserName && (
            <p className="text-sm text-muted-foreground mt-1 px-1">
              {locale === 'he' ? 'נבחר' : 'Выбрано'}: {selectedUserName}
            </p>
          )}
        </div>

        {/* Привязать клиента */}
        <div>
          <label className="block text-sm font-medium mb-2">{labels.client}</label>
          <TrinitySearchDropdown
            data={clients}
            searchKeys={['name', 'phone']}
            minChars={2}
            placeholder={labels.searchClient}
            onSelect={handleClientSelect}
            renderItem={(client) => (
              <div>
                <p className="font-medium">{client.name}</p>
                {client.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
              </div>
            )}
            locale={locale}
          />
          {selectedClientName && (
            <p className="text-sm text-muted-foreground mt-1 px-1">
              {locale === 'he' ? 'נבחר' : 'Выбрано'}: {selectedClientName}
            </p>
          )}
        </div>

        {/* Привязать визит */}
        <div>
          <label className="block text-sm font-medium mb-2">{labels.visit}</label>
          <TrinitySearchDropdown
            data={visits}
            searchKeys={['service_type']}
            minChars={1}
            placeholder={labels.searchVisit}
            onSelect={handleVisitSelect}
            renderItem={(visit) => (
              <div>
                <p className="font-medium">{visit.client?.name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">
                  {visit.service_type} - {new Date(visit.scheduled_at).toLocaleDateString()}
                </p>
              </div>
            )}
            locale={locale}
          />
          {selectedVisitName && (
            <p className="text-sm text-muted-foreground mt-1 px-1">
              {locale === 'he' ? 'נבחר' : 'Выбрано'}: {selectedVisitName}
            </p>
          )}
        </div>

        {/* Телефон */}
        <div>
          <label className="block text-sm font-medium mb-2">{labels.phone}</label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              dir="ltr"
            />
            {contactPhone && (
              <>
                <button
                  onClick={() => handleCall(contactPhone)}
                  className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-center transition"
                  title={labels.call}
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleWhatsApp(contactPhone)}
                  className="w-12 h-12 rounded-xl bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 flex items-center justify-center transition"
                  title="WhatsApp"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-2">{labels.email}</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            dir="ltr"
          />
        </div>

        {/* Адрес */}
        <div>
          <label className="block text-sm font-medium mb-2">{labels.address}</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={contactAddress}
              onChange={(e) => setContactAddress(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            {contactAddress && (
              <button
                onClick={handleNavigate}
                className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center justify-center transition"
                title={labels.navigate}
              >
                <Navigation className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Описание */}
        <div>
          <label className="block text-sm font-medium mb-2">{labels.description}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 pt-2">
          <TrinityButton
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            loading={saving}
            fullWidth
          >
            {labels.save}
          </TrinityButton>
          <TrinityButton
            variant="secondary"
            size="lg"
            onClick={onClose}
            fullWidth
          >
            {labels.cancel}
          </TrinityButton>
        </div>
      </div>
    </TrinityBottomDrawer>
  )
}

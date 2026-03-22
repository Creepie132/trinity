'use client'

import { useState, useEffect } from 'react'
import { useModalStore } from '@/store/useModalStore'
import Modal from '@/components/ui/Modal'
import { TrinitySearchDropdown } from '@/components/ui/TrinitySearch'
import { Phone, MessageCircle, Loader2, Plus, MapPin, AlertCircle } from 'lucide-react'
import { getClientName } from '@/lib/client-utils'
import { useLanguage } from '@/contexts/LanguageContext'

interface OrgUser  { user_id: string; full_name: string; role: string; email?: string }
interface Client   { id: string; first_name?: string; last_name?: string; name?: string; phone: string; email: string }
type Priority = 'low' | 'normal' | 'high' | 'urgent'

const PRIORITY_CFG = {
  low:    { he: 'נמוכה', ru: 'Низкий',  dot: '#94a3b8' },
  normal: { he: 'רגילה', ru: 'Обычный', dot: '#3b82f6' },
  high:   { he: 'גבוהה', ru: 'Высокий', dot: '#f59e0b' },
  urgent: { he: 'דחופה', ru: 'Срочный', dot: '#ef4444' },
}

const inp = "w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-slate-50 text-sm focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
const lbl = "block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5"

// Address validation hint: must be Hebrew in format "רחוב מספר עיר"
function AddressHint({ value, isHe }: { value: string; isHe: boolean }) {
  if (!value.trim()) return null
  // Check if contains Hebrew letters
  const hasHebrew = /[\u05D0-\u05EA]/.test(value)
  // Check rough format: word + space + number + space + word
  const hasFormat = /[\u05D0-\u05EA].+\d/.test(value)

  if (!hasHebrew) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
        <span className="text-xs text-red-600 font-medium">
          {isHe ? 'הכתובת חייבת להיות בעברית' : 'Адрес должен быть на иврите'}
        </span>
      </div>
    )
  }
  return null
}

export function CreateTaskModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  const { language } = useLanguage()

  const isOpen    = isModalOpen('task-create')
  const data      = getModalData('task-create')
  const prefill   = data?.prefill
  const editTask  = data?.editTask
  const isEdit    = !!editTask
  const onCreated = data?.onCreated || (() => {})
  const locale    = language as 'he' | 'ru'
  const isRTL     = locale === 'he'
  const isHe      = locale === 'he'

  const [title,        setTitle]        = useState('')
  const [priority,     setPriority]     = useState<Priority>('normal')
  const [dueDate,      setDueDate]      = useState('')
  const [dueTime,      setDueTime]      = useState('')
  const [assignedTo,   setAssignedTo]   = useState<string | null>(null)
  const [clientId,     setClientId]     = useState<string | null>(null)
  const [contactPhone, setContactPhone] = useState('')
  const [address,      setAddress]      = useState('')
  const [description,  setDescription]  = useState('')
  const [saving,       setSaving]       = useState(false)
  const [reminder,     setReminder]     = useState(false)
  const [orgUsers,     setOrgUsers]     = useState<OrgUser[]>([])
  const [clients,      setClients]      = useState<Client[]>([])
  const [selectedClientName, setSelectedClientName] = useState('')
  const [selectedUserName,   setSelectedUserName]   = useState('')
  const [addressFocused, setAddressFocused] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadOrgUsers(); loadClients()
      if (editTask) {
        setTitle(editTask.title || ''); setDescription(editTask.description || '')
        setPriority(editTask.priority || 'normal'); setClientId(editTask.client_id || null)
        setContactPhone(editTask.contact_phone || ''); setAssignedTo(editTask.assigned_to || null)
        setAddress(editTask.address || '')
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
      // Uses /api/clients/summary which already filters by assigned_to for workers
      // and returns all org clients for owners
      const r = await fetch('/api/clients/summary?limit=100')
      if (r.ok) {
        const d = await r.json()
        const list = d.data || d || []
        setClients(Array.isArray(list) ? list : [])
      }
    } catch {}
  }

  function handleClientSelect(c: Client) {
    setClientId(c.id); setSelectedClientName(getClientName(c))
    if (c.phone) setContactPhone(c.phone)
  }
  function handleUserSelect(u: OrgUser) { setAssignedTo(u.user_id); setSelectedUserName(u.full_name) }

  function handleClose() {
    setTitle(''); setPriority('normal'); setDueDate(''); setDueTime('')
    setAssignedTo(null); setClientId(null); setContactPhone(''); setAddress('')
    setDescription(''); setSelectedClientName(''); setSelectedUserName(''); setReminder(false)
    closeModal('task-create')
  }

  async function handleSubmit() {
    if (!title.trim()) { alert(isHe ? 'נא למלא כותרת' : 'Заполните заголовок'); return }
    if (reminder && (!dueDate || !dueTime)) {
      alert(isHe ? 'לתזכורת חובה לבחור תאריך ושעה' : 'Для напоминания нужна дата и время'); return
    }
    // Validate address if filled
    if (address.trim() && !/[\u05D0-\u05EA]/.test(address)) {
      alert(isHe ? 'הכתובת חייבת להיות בעברית' : 'Адрес должен быть на иврите'); return
    }
    setSaving(true)
    try {
      const due_date = dueDate ? new Date(`${dueDate}T${dueTime || '00:00'}`).toISOString() : null
      const body = {
        title: title.trim(), description: description.trim() || null, priority,
        due_date, assigned_to: assignedTo, client_id: clientId,
        contact_phone: contactPhone || null, address: address.trim() || null, reminder,
      }
      const url = isEdit ? `/api/tasks/${editTask.id}` : '/api/tasks'
      const r = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!r.ok) { const d = await r.json(); alert(d.error || 'Ошибка'); return }
      onCreated(); handleClose()
    } catch { alert('Ошибка') } finally { setSaving(false) }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      darkHeader={true}
      width="660px"
      footer={
        <div className="flex gap-2">
          <button onClick={handleClose}
            className="flex-1 min-h-[44px] py-2.5 rounded-2xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">
            {isHe ? 'ביטול' : 'Отмена'}
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-[2] min-h-[44px] py-2.5 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-indigo-200">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" />{isHe ? 'שומר...' : 'Сохранение...'}</>
              : <>{!isEdit && <Plus className="w-4 h-4" />}{isEdit ? (isHe ? 'שמור שינויים' : 'Сохранить') : (isHe ? 'צור משימה' : 'Создать задачу')}</>}
          </button>
        </div>
      }
    >
      {/* ── Dark header ─────────────────────────────────────────────────── */}
      <div style={{ background: '#0f172a', borderRadius: '16px 16px 0 0' }}>
        <div className="px-6 pt-6 pb-5" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              {isEdit ? '✏️' : '📋'}
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                {isEdit ? (isHe ? 'עריכת משימה' : 'Редактировать задачу') : (isHe ? 'משימה חדשה' : 'Новая задача')}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {isHe ? 'הוסף פרטים למשימה' : 'Заполните детали задачи'}
              </p>
            </div>
          </div>

          {/* Title in header */}
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            autoFocus placeholder={isHe ? 'כותרת המשימה *' : 'Заголовок задачи *'}
            dir={isRTL ? 'rtl' : 'ltr'}
            className="w-full px-4 py-3 rounded-2xl text-white font-semibold text-base outline-none placeholder:text-slate-500 transition-all"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            onFocus={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
            onBlur={e  => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
          />

          {/* Priority pills in header */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {(Object.entries(PRIORITY_CFG) as [Priority, typeof PRIORITY_CFG.low][]).map(([key, cfg]) => (
              <button key={key} type="button" onClick={() => setPriority(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  priority === key
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                }`}>
                <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                {isHe ? cfg.he : cfg.ru}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Light body — 2 columns ─────────────────────────────────────── */}
      <div className="px-6 py-5" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">

          {/* Date */}
          <div>
            <label className={lbl}>{isHe ? 'תאריך יעד' : 'Дедлайн'}</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} min={today} className={inp} dir="ltr" />
          </div>

          {/* Time */}
          <div>
            <label className={lbl}>{isHe ? 'שעה' : 'Время'}</label>
            <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} disabled={!dueDate} className={`${inp} disabled:opacity-40`} dir="ltr" />
          </div>

          {/* Assignee */}
          <div>
            <label className={lbl}>{isHe ? 'הקצה לעובד' : 'Назначить'}</label>
            {orgUsers.length === 0
              ? <div className="px-4 py-2.5 rounded-xl bg-slate-50 text-gray-400 text-sm">{isHe ? 'אין עובדים' : 'Нет коллег'}</div>
              : <TrinitySearchDropdown data={orgUsers} searchKeys={['full_name','email']} minChars={0}
                  placeholder={isHe ? 'חיפוש עובד...' : 'Поиск...'} onSelect={handleUserSelect}
                  renderItem={(u) => {
                    const c = ['bg-indigo-500','bg-purple-500','bg-emerald-500','bg-amber-500','bg-rose-500'][(u.full_name||'').charCodeAt(0)%5]
                    return <div className="flex items-center gap-2.5"><div className={`w-8 h-8 rounded-full ${c} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{(u.full_name||u.email||'?')[0].toUpperCase()}</div><div><p className="font-semibold text-sm">{u.full_name||u.email}</p><p className="text-xs text-gray-500 capitalize">{u.role}</p></div></div>
                  }} locale={locale} />
            }
            {selectedUserName && <p className="text-xs text-indigo-600 mt-1 px-1">✓ {selectedUserName}</p>}
          </div>

          {/* Client */}
          <div>
            <label className={lbl}>{isHe ? 'לקוח' : 'Клиент'}</label>
            <TrinitySearchDropdown data={clients} searchKeys={['first_name','last_name','phone']} minChars={0}
              placeholder={isHe ? 'חיפוש לקוח...' : 'Поиск клиента...'} onSelect={handleClientSelect}
              renderItem={(c) => <div><p className="font-semibold text-sm">{getClientName(c)}</p>{c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}</div>}
              locale={locale} />
            {selectedClientName && <p className="text-xs text-indigo-600 mt-1 px-1">✓ {selectedClientName}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className={lbl}>{isHe ? 'טלפון' : 'Телефон'}</label>
            <div className="flex gap-2">
              <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className={`${inp} flex-1 min-w-0`} dir="ltr" />
              {contactPhone && <>
                <button type="button" onClick={() => window.location.href = `tel:${contactPhone}`}
                  className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition shrink-0">
                  <Phone className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => window.open(`https://wa.me/${contactPhone.replace(/[^0-9]/g,'')}`, '_blank')}
                  className="w-10 h-10 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </button>
              </>}
            </div>
          </div>

          {/* Address — full width with hint */}
          <div className="col-span-2">
            <label className={lbl}>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                {isHe ? 'כתובת' : 'Адрес'}
              </span>
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              onFocus={() => setAddressFocused(true)}
              onBlur={() => setAddressFocused(false)}
              className={inp}
              dir="rtl"
              placeholder={isHe ? 'רחוב הרצל 12, תל אביב' : 'ул. Герцль 12, Тель-Авив'}
            />
            {/* Hint — shown on focus or when value has no Hebrew */}
            {(addressFocused || (address && !/[\u05D0-\u05EA]/.test(address))) && (
              <div className={`mt-1.5 px-3 py-2 rounded-xl text-xs flex items-start gap-2 ${
                address && !/[\u05D0-\u05EA]/.test(address)
                  ? 'bg-red-50 border border-red-100 text-red-600'
                  : 'bg-amber-50 border border-amber-100 text-amber-700'
              }`}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">
                  {address && !/[\u05D0-\u05EA]/.test(address)
                    ? (isHe ? '❌ הכתובת חייבת להיות בעברית' : '❌ Адрес должен быть только на иврите')
                    : (isHe
                        ? '📍 הכתובת חייבת להיות בעברית בפורמט: שם רחוב — מספר בית — שם עיר\nדוגמה: רחוב הרצל 12, תל אביב'
                        : '📍 Адрес — только на иврите, в формате: улица — номер дома — город\nПример: רחוב הרצל 12, תל אביב'
                      )
                  }
                </span>
              </div>
            )}
          </div>

          {/* Reminder — full width */}
          <div className="col-span-2">
            <label className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 border border-gray-100 cursor-pointer hover:bg-indigo-50 hover:border-indigo-100 transition-all">
              <input type="checkbox" checked={reminder} onChange={e => setReminder(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
              <span className="text-sm text-gray-700 font-medium">
                {isHe ? '🔔 תזכורת (2 שעות לפני)' : '🔔 Напоминание (за 2 часа до)'}
              </span>
            </label>
          </div>

          {/* Description — full width */}
          <div className="col-span-2">
            <label className={lbl}>{isHe ? 'תיאור' : 'Описание'}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className={`${inp} resize-none`} dir={isRTL ? 'rtl' : 'ltr'} />
          </div>
        </div>
      </div>
    </Modal>
  )
}

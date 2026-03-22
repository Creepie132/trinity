'use client'

import { useState, useEffect, useRef } from 'react'
import { useModalStore } from '@/store/useModalStore'
import Modal from '@/components/ui/Modal'
import { TrinitySearchDropdown } from '@/components/ui/TrinitySearch'
import { Phone, MessageCircle, Loader2, Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getClientName } from '@/lib/client-utils'
import { useLanguage } from '@/contexts/LanguageContext'

interface OrgUser  { user_id: string; full_name: string; role: string; email?: string }
interface Client   { id: string; first_name?: string; last_name?: string; name?: string; phone: string; email: string }
type Priority = 'low' | 'normal' | 'high' | 'urgent'

const PRIORITY_CFG = {
  low:    { he: 'נמוכה',  ru: 'Низкий',   dot: '#94a3b8', bg: 'bg-slate-100', ring: 'ring-slate-400' },
  normal: { he: 'רגילה',  ru: 'Обычный',  dot: '#3b82f6', bg: 'bg-blue-100',  ring: 'ring-blue-400'  },
  high:   { he: 'גבוהה',  ru: 'Высокий',  dot: '#f59e0b', bg: 'bg-amber-100', ring: 'ring-amber-400' },
  urgent: { he: 'דחופה',  ru: 'Срочный',  dot: '#ef4444', bg: 'bg-red-100',   ring: 'ring-red-400'   },
}

const inp = "w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-slate-50 text-sm focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
const lbl = "block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5"

export function CreateTaskModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  const { user } = useAuth()
  const { language } = useLanguage()

  const isOpen     = isModalOpen('task-create')
  const data       = getModalData('task-create')
  const prefill    = data?.prefill
  const editTask   = data?.editTask
  const isEdit     = !!editTask
  const onCreated  = data?.onCreated || (() => {})
  const locale     = language as 'he' | 'ru'
  const isRTL      = locale === 'he'

  const [title,         setTitle]         = useState('')
  const [priority,      setPriority]      = useState<Priority>('normal')
  const [dueDate,       setDueDate]       = useState('')
  const [dueTime,       setDueTime]       = useState('')
  const [assignedTo,    setAssignedTo]    = useState<string | null>(null)
  const [clientId,      setClientId]      = useState<string | null>(null)
  const [contactPhone,  setContactPhone]  = useState('')
  const [description,   setDescription]   = useState('')
  const [saving,        setSaving]        = useState(false)
  const [reminder,      setReminder]      = useState(false)
  const [orgUsers,      setOrgUsers]      = useState<OrgUser[]>([])
  const [clients,       setClients]       = useState<Client[]>([])
  const [selectedClientName, setSelectedClientName] = useState('')
  const [selectedUserName,   setSelectedUserName]   = useState('')

  useEffect(() => {
    if (isOpen) {
      loadOrgUsers(); loadClients()
      if (editTask) {
        setTitle(editTask.title || ''); setDescription(editTask.description || '')
        setPriority(editTask.priority || 'normal'); setClientId(editTask.client_id || null)
        setContactPhone(editTask.contact_phone || ''); setAssignedTo(editTask.assigned_to || null)
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
    try { const r = await fetch('/api/clients'); if (r.ok) { const d = await r.json(); setClients(Array.isArray(d) ? d : d?.data || []) } } catch {}
  }

  function handleClientSelect(c: Client) {
    setClientId(c.id); setSelectedClientName(getClientName(c))
    if (c.phone) setContactPhone(c.phone)
  }
  function handleUserSelect(u: OrgUser) { setAssignedTo(u.user_id); setSelectedUserName(u.full_name) }

  function handleClose() {
    setTitle(''); setPriority('normal'); setDueDate(''); setDueTime('')
    setAssignedTo(null); setClientId(null); setContactPhone('')
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
      const due_date = dueDate ? new Date(`${dueDate}T${dueTime || '00:00'}`).toISOString() : null
      const body = { title: title.trim(), description: description.trim() || null, priority, due_date, assigned_to: assignedTo, client_id: clientId, contact_phone: contactPhone || null, reminder }
      const url = isEdit ? `/api/tasks/${editTask.id}` : '/api/tasks'
      const r = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!r.ok) { const d = await r.json(); alert(d.error || 'Ошибка'); return }
      onCreated(); handleClose()
    } catch { alert('Ошибка') } finally { setSaving(false) }
  }

  const today = new Date().toISOString().split('T')[0]
  const pcfg = PRIORITY_CFG[priority]
  const isHe = locale === 'he'

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      darkHeader={true}
      width="560px"
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
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-2xl"
              style={{ background: `linear-gradient(135deg, #4f46e5, #7c3aed)` }}>
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

          {/* Title input — in header */}
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
            placeholder={isHe ? 'כותרת המשימה *' : 'Заголовок задачи *'}
            dir={isRTL ? 'rtl' : 'ltr'}
            className="w-full px-4 py-3 rounded-2xl text-white font-semibold text-base outline-none placeholder:text-slate-500 transition-all"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            onFocus={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
            onBlur={e  => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
          />

          {/* Priority row — in header */}
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

      {/* ── Light body ───────────────────────────────────────────────────── */}
      <div className="px-6 py-5 space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>{isHe ? 'תאריך יעד' : 'Дедлайн'}</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} min={today} className={inp} dir="ltr" />
          </div>
          <div>
            <label className={lbl}>{isHe ? 'שעה' : 'Время'}</label>
            <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} disabled={!dueDate} className={`${inp} disabled:opacity-40`} dir="ltr" />
          </div>
        </div>

        {/* Reminder */}
        <label className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 border border-gray-100 cursor-pointer hover:bg-indigo-50 hover:border-indigo-100 transition-all">
          <input type="checkbox" checked={reminder} onChange={e => setReminder(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
          <span className="text-sm text-gray-700 font-medium">
            {isHe ? '🔔 תזכורת (2 שעות לפני)' : '🔔 Напоминание (за 2 часа до)'}
          </span>
        </label>

        {/* Assignee */}
        <div>
          <label className={lbl}>{isHe ? 'הקצה לעובד' : 'Назначить'}</label>
          {orgUsers.length === 0
            ? <div className="px-4 py-3 rounded-xl bg-slate-50 text-gray-400 text-sm">{isHe ? 'אין עובדים נוספים' : 'Нет коллег'}</div>
            : <TrinitySearchDropdown data={orgUsers} searchKeys={['full_name','email']} minChars={0}
                placeholder={isHe ? 'חיפוש עובד...' : 'Поиск сотрудника...'} onSelect={handleUserSelect}
                renderItem={(u) => {
                  const c = ['bg-indigo-500','bg-purple-500','bg-emerald-500','bg-amber-500','bg-rose-500'][(u.full_name||'').charCodeAt(0)%5]
                  return <div className="flex items-center gap-2.5"><div className={`w-8 h-8 rounded-full ${c} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{(u.full_name||u.email||'?')[0].toUpperCase()}</div><div><p className="font-semibold text-sm">{u.full_name||u.email}</p><p className="text-xs text-gray-500 capitalize">{u.role}</p></div></div>
                }}
                locale={locale}
              />
          }
          {selectedUserName && <p className="text-xs text-indigo-600 mt-1 px-1">✓ {selectedUserName}</p>}
        </div>

        {/* Client */}
        <div>
          <label className={lbl}>{isHe ? 'לקוח' : 'Клиент'}</label>
          <TrinitySearchDropdown data={clients} searchKeys={['first_name','last_name','phone']} minChars={2}
            placeholder={isHe ? 'חיפוש לקוח...' : 'Поиск клиента...'} onSelect={handleClientSelect}
            renderItem={(c) => <div><p className="font-semibold text-sm">{getClientName(c)}</p>{c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}</div>}
            locale={locale}
          />
          {selectedClientName && <p className="text-xs text-indigo-600 mt-1 px-1">✓ {selectedClientName}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className={lbl}>{isHe ? 'טלפון' : 'Телефон'}</label>
          <div className="flex gap-2">
            <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className={`${inp} flex-1`} dir="ltr" />
            {contactPhone && <>
              <button type="button" onClick={() => window.location.href = `tel:${contactPhone}`}
                className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition shrink-0">
                <Phone className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => window.open(`https://wa.me/${contactPhone.replace(/[^0-9]/g,'')}`, '_blank')}
                className="w-11 h-11 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition shrink-0">
                <MessageCircle className="w-4 h-4" />
              </button>
            </>}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={lbl}>{isHe ? 'תיאור' : 'Описание'}</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className={`${inp} resize-none`} dir={isRTL ? 'rtl' : 'ltr'} />
        </div>
      </div>
    </Modal>
  )
}

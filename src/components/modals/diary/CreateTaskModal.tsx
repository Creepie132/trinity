'use client'

/**
 * CreateTaskModal — создание и редактирование задачи.
 * Мобиль: ModalBottomSheet (прямой вызов, без TrinityModalShell)
 * Десктоп: Modal + TrinityModalShell (сайдбар с приоритетами)
 */

import { useState, useEffect } from 'react'
import { useModalStore } from '@/store/useModalStore'
import Modal from '@/components/ui/Modal'
import { ModalBottomSheet } from '@/components/ui/ModalBottomSheet'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { TrinitySearchDropdown } from '@/components/ui/TrinitySearch'
import { Phone, MessageCircle, Loader2, MapPin, AlertCircle, CheckSquare } from 'lucide-react'
import { getClientName } from '@/lib/client-utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { apiFetch } from '@/lib/api-fetch'
import { useMobileBackTrap } from '@/hooks/useMobileBackTrap'

interface OrgUser  { user_id: string; full_name: string; role: string; email?: string }
interface Client   { id: string; first_name?: string; last_name?: string; name?: string; phone: string; email: string }
type Priority = 'low' | 'normal' | 'high' | 'urgent'

const PRIORITY_CFG = {
  low:    { he: 'נמוכה', ru: 'Низкий',  dot: '#94a3b8' },
  normal: { he: 'רגילה', ru: 'Обычный', dot: '#3b82f6' },
  high:   { he: 'גבוהה', ru: 'Высокий', dot: '#f59e0b' },
  urgent: { he: 'דחופה', ru: 'Срочный', dot: '#ef4444' },
}

const inp = "w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-slate-50 text-sm focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
const lbl = "block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5"

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
  const [addressFocused,     setAddressFocused]     = useState(false)

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  async function loadOrgUsers() {
    try { const r = await fetch('/api/org-users'); if (r.ok) setOrgUsers(await r.json()) } catch {}
  }
  async function loadClients() {
    try {
      const r = await fetch('/api/clients/summary?limit=100')
      const d = await r.json()
      const list = d.data || d || []
      setClients(Array.isArray(list) ? list : [])
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

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useMobileBackTrap(isOpen, handleClose)

  async function handleSubmit() {
    if (!title.trim()) { alert(isHe ? 'נא למלא כותרת' : 'Заполните заголовок'); return }
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
      await apiFetch(url, { method: isEdit ? 'PUT' : 'POST', json: body })
      onCreated(); handleClose()
    } catch { alert('Ошибка') } finally { setSaving(false) }
  }

  const today = new Date().toISOString().split('T')[0]

  // ── Общий контент формы — используется и на мобиле и на десктопе ──────────
  const formContent = (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Заголовок */}
      <div>
        <label className={lbl}>{isHe ? 'כותרת *' : 'Заголовок *'}</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder={isHe ? 'כותרת המשימה...' : 'Заголовок задачи...'} dir={isRTL ? 'rtl' : 'ltr'}
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 12,
            fontSize: 14, fontWeight: 600, color: '#1e293b', background: '#fff', outline: 'none', boxSizing: 'border-box' }}
          onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
          onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'} />
      </div>

      {/* Приоритет — компактные пилюли */}
      <div>
        <label className={lbl}>{isHe ? 'עדיפות' : 'Приоритет'}</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {(Object.entries(PRIORITY_CFG) as [Priority, typeof PRIORITY_CFG.low][]).map(([key, cfg]) => (
            <button key={key} type="button" onClick={() => setPriority(key)}
              style={{ flex: 1, padding: '7px 4px', borderRadius: 10,
                border: `1.5px solid ${priority === key ? cfg.dot : '#e2e8f0'}`,
                background: priority === key ? `${cfg.dot}15` : '#f8fafc',
                color: priority === key ? cfg.dot : '#94a3b8',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot }} />
              {isHe ? cfg.he : cfg.ru}
            </button>
          ))}
        </div>
      </div>

      {/* Дедлайн + Время */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label className={lbl}>{isHe ? 'תאריך יעד' : 'Дедлайн'}</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            min={today} className={inp} dir="ltr" />
        </div>
        <div>
          <label className={lbl}>{isHe ? 'שעה' : 'Время'}</label>
          <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)}
            disabled={!dueDate} className={`${inp} disabled:opacity-40`} dir="ltr" />
        </div>
      </div>

      {/* Назначить + Клиент */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label className={lbl}>{isHe ? 'הקצה' : 'Назначить'}</label>
          {orgUsers.length === 0
            ? <div className="px-3 py-2 rounded-xl bg-slate-50 text-gray-400 text-xs">{isHe ? 'אין' : 'Нет'}</div>
            : <TrinitySearchDropdown data={orgUsers} searchKeys={['full_name','email']} minChars={0}
                placeholder={isHe ? 'חיפוש...' : 'Поиск...'} onSelect={handleUserSelect}
                renderItem={(u) => <div><p className="font-semibold text-sm">{u.full_name || u.email}</p><p className="text-xs text-gray-500 capitalize">{u.role}</p></div>}
                locale={locale} />
          }
          {selectedUserName && <p className="text-xs text-indigo-600 mt-1">✓ {selectedUserName}</p>}
        </div>
        <div>
          <label className={lbl}>{isHe ? 'לקוח' : 'Клиент'}</label>
          <TrinitySearchDropdown data={clients} searchKeys={['first_name','last_name','phone']} minChars={0}
            placeholder={isHe ? 'חיפוש...' : 'Поиск...'} onSelect={handleClientSelect}
            renderItem={(c) => <div><p className="font-semibold text-sm">{getClientName(c)}</p>{c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}</div>}
            locale={locale} />
          {selectedClientName && <p className="text-xs text-indigo-600 mt-1">✓ {selectedClientName}</p>}
        </div>
      </div>

      {/* Телефон */}
      <div>
        <label className={lbl}>{isHe ? 'טלפון' : 'Телефон'}</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
            className={`${inp} flex-1 min-w-0`} dir="ltr" />
          {contactPhone && <>
            <button type="button" onClick={() => window.location.href = `tel:${contactPhone}`}
              style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Phone className="w-4 h-4 text-blue-600" />
            </button>
            <button type="button" onClick={() => window.open(`https://wa.me/${contactPhone.replace(/[^0-9]/g,'')}`, '_blank')}
              style={{ width: 38, height: 38, borderRadius: 10, background: '#f0fdf4', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MessageCircle className="w-4 h-4 text-green-600" />
            </button>
          </>}
        </div>
      </div>

      {/* Адрес */}
      <div>
        <label className={lbl}><span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{isHe ? 'כתובת' : 'Адрес'}</span></label>
        <input type="text" value={address} onChange={e => setAddress(e.target.value)}
          onFocus={() => setAddressFocused(true)} onBlur={() => setAddressFocused(false)}
          className={inp} dir="rtl"
          placeholder={isHe ? 'רחוב הרצל 12, תל אביב' : 'ул. Герцль 12, Тель-Авив'} />
        {(addressFocused || (address && !/[\u05D0-\u05EA]/.test(address))) && (
          <div className={`mt-1.5 px-3 py-2 rounded-xl text-xs flex items-start gap-2 ${address && !/[\u05D0-\u05EA]/.test(address) ? 'bg-red-50 border border-red-100 text-red-600' : 'bg-amber-50 border border-amber-100 text-amber-700'}`}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">
              {address && !/[\u05D0-\u05EA]/.test(address)
                ? (isHe ? '❌ הכתובת חייבת להיות בעברית' : '❌ Адрес только на иврите')
                : (isHe ? '📍 פורמט: רחוב — מספר — עיר' : '📍 Формат: улица — номер — город')}
            </span>
          </div>
        )}
      </div>

      {/* Напоминание */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
        <input type="checkbox" checked={reminder} onChange={e => setReminder(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
        <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
          {isHe ? '🔔 תזכורת (2 שעות לפני)' : '🔔 Напоминание (за 2 часа до)'}
        </span>
      </label>

      {/* Описание */}
      <div>
        <label className={lbl}>{isHe ? 'תיאור' : 'Описание'}</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
          className={`${inp} resize-none`} dir={isRTL ? 'rtl' : 'ltr'} />
      </div>
    </div>
  )

  // ── Footer кнопки для мобиля ───────────────────────────────────────────────
  const mobileFooter = (
    <div style={{ display: 'flex', gap: 10, width: '100%' }}>
      <button onClick={handleClose} disabled={saving}
        style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.12)', background: 'transparent', color: '#64748b', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
        {isHe ? 'ביטול' : 'Отмена'}
      </button>
      <button onClick={handleSubmit} disabled={saving || !title.trim()}
        style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none',
          background: !title.trim() || saving ? '#e2e8f0' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
          color: !title.trim() || saving ? '#94a3b8' : '#fff',
          fontSize: 14, fontWeight: 700, cursor: title.trim() && !saving ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {saving && <Loader2 size={15} className="animate-spin" />}
        {saving ? '...' : isEdit ? (isHe ? 'שמור' : 'Сохранить') : (isHe ? 'צור משימה' : 'Создать')}
      </button>
    </div>
  )

  // ── Сайдбар-кнопки для десктопа ───────────────────────────────────────────
  const desktopSidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
        {(Object.entries(PRIORITY_CFG) as [Priority, typeof PRIORITY_CFG.low][]).map(([key, cfg]) => (
          <button key={key} type="button" onClick={() => setPriority(key)}
            style={{ padding: '6px 10px', borderRadius: 8, border: `0.5px solid ${priority === key ? cfg.dot : 'rgba(255,255,255,0.1)'}`, background: priority === key ? `${cfg.dot}20` : 'transparent', color: priority === key ? cfg.dot : 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot }} />
            {isHe ? cfg.he : cfg.ru}
          </button>
        ))}
      </div>
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '0 0 8px' }} />
      <button onClick={handleSubmit} disabled={saving}
        style={{ padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%', background: saving ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckSquare size={14} />}
        {saving ? '...' : isEdit ? (isHe ? 'שמור' : 'Сохранить') : (isHe ? 'צור' : 'Создать')}
      </button>
      <button onClick={handleClose} style={{ padding: '8px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
        {isHe ? 'ביטול' : 'Отмена'}
      </button>
    </div>
  )

  return (
    <>
      {/* ── МОБИЛЬ: ModalBottomSheet ── */}
      <ModalBottomSheet
        open={isOpen}
        onClose={handleClose}
        icon={<CheckSquare size={18} />}
        title={isEdit ? (isHe ? 'עריכת משימה' : 'Редактировать задачу') : (isHe ? 'משימה חדשה' : 'Новая задача')}
        subtitle={title || (isHe ? 'הוסף פרטים' : 'Заполните детали')}
        dir={isRTL ? 'rtl' : 'ltr'}
        footerContent={mobileFooter}
      >
        <div className="md:hidden">
          {formContent}
        </div>
      </ModalBottomSheet>

      {/* ── ДЕСКТОП: Modal + TrinityModalShell ── */}
      <Modal open={isOpen} onClose={handleClose} darkHeader showCloseButton={false}
        width="720px" dir={isRTL ? 'rtl' : 'ltr'} contentClassName="!p-0">
        <div className="hidden md:block">
          <TrinityModalShell open={isOpen} onClose={handleClose} icon={<CheckSquare />}
            title={isEdit ? (isHe ? 'עריכת משימה' : 'Редактировать задачу') : (isHe ? 'משימה חדשה' : 'Новая задача')}
            subtitle={title || (isHe ? 'הוסף פרטים' : 'Заполните детали')}
            dir={isRTL ? 'rtl' : 'ltr'} sidebarExtra={desktopSidebar}>
            <div style={{ padding: '20px 18px 24px' }}>
              {formContent}
            </div>
          </TrinityModalShell>
        </div>
      </Modal>
    </>
  )
}

'use client'

/**
 * UnifiedVisitDialog — Master Component для создания и редактирования визитов/встреч.
 *
 * State machine:
 *   create-form | edit-form  →  submitting  →  success / error
 *
 * Защиты:
 *   - isSubmittingRef: логический замок (double-submit guard)
 *   - Error не сбрасывает форму — данные сохраняются
 *   - Строгая типизация payload из ModalStore через validateVisitModalData()
 *   - После success: queryClient.invalidateQueries (NO window.location.reload)
 *
 * Вызов:
 *   openModal('visit-unified', { mode: 'create', clientId?, date?, time? })
 *   openModal('visit-unified', { mode: 'edit', visit: Visit })
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ClientSearch } from '@/components/ui/ClientSearch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/contexts/BranchContext'
import { useServices } from '@/hooks/useServices'
import { useFeatures } from '@/hooks/useFeatures'
import { apiFetch } from '@/lib/api-fetch'
import { toast } from 'sonner'
import {
  Users, Calendar, FileText, CheckCircle2, Clock,
  Scissors, MapPin, Video, Loader2, AlertCircle, X, Save,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UnifiedVisitModalData {
  mode: 'create' | 'edit'
  visit?: any          // полный Visit-объект для edit
  clientId?: string    // preselect при create
  date?: string
  time?: string
  isMeetingMode?: boolean
  onSuccess?: () => void
}

interface Client {
  id: string
  first_name: string
  last_name: string
  phone: string
  email?: string
}

export interface UnifiedVisitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: UnifiedVisitModalData
}

// ─── Payload validator ────────────────────────────────────────────────────────

export function validateVisitModalData(raw: unknown): UnifiedVisitModalData {
  if (!raw || typeof raw !== 'object') return { mode: 'create' }
  const d = raw as Record<string, unknown>
  return {
    mode:          d.mode === 'edit' ? 'edit' : 'create',
    visit:         d.visit ?? undefined,
    clientId:      typeof d.clientId === 'string' ? d.clientId : undefined,
    date:          typeof d.date === 'string' ? d.date : undefined,
    time:          typeof d.time === 'string' ? d.time : undefined,
    isMeetingMode: typeof d.isMeetingMode === 'boolean' ? d.isMeetingMode : undefined,
    onSuccess:     typeof d.onSuccess === 'function' ? (d.onSuccess as () => void) : undefined,
  }
}

// ─── Static data ──────────────────────────────────────────────────────────────

const ISRAEL_CITIES = [
  'תל אביב','ירושלים','חיפה','ראשון לציון','פתח תקווה','אשדוד','נתניה',
  'באר שבע','בני ברק','חולון','רמת גן','אשקלון','רחובות','בת ים',
  'בית שמש','כפר סבא','הרצליה','חדרה','מודיעין','לוד','נהריה',
  'רמלה','רעננה','גבעתיים','הוד השרון','עכו','אלעד','קרית גת',
  'אום אל-פחם','אילת','עפולה','טבריה','צפת','קרית אתא','ראש העין',
  'יבנה','נצרת','אריאל','שוהם','גדרה','קרית ביאליק',
  'קרית ים','קרית מוצקין','טירת כרמל','קרית שמונה','מעלה אדומים',
]

const DEFAULT_SERVICES = [
  'haircut','coloring','smoothing','facial','manicure','pedicure',
  'haircutColoring','hairTreatment','consultation','meeting','advertising','other',
].map(v => ({ id: v, value: v, labelKey: `service.${v}` }))

const DURATIONS = [
  { value: 30, labelKey: 'duration.30min' },
  { value: 45, labelKey: 'duration.45min' },
  { value: 60, labelKey: 'duration.60min' },
  { value: 90, labelKey: 'duration.90min' },
  { value: 120, labelKey: 'duration.120min' },
]

const REMINDER_OPTIONS = [24, 12, 6, 3, 1]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultTime() {
  const now = new Date()
  const d = new Date(now)
  d.setMinutes(now.getMinutes() < 30 ? 30 : 0)
  if (now.getMinutes() >= 30) d.setHours(d.getHours() + 1)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function getDefaultDate() {
  const t = new Date(); t.setDate(t.getDate() + 1)
  return t.toISOString().split('T')[0]
}

function toDateStr(d: Date | string | null | undefined) {
  if (!d) return getDefaultDate()
  return d instanceof Date ? d.toISOString().split('T')[0] : String(d)
}

function parseDateFromScheduledAt(scheduledAt?: string) {
  if (!scheduledAt) return { date: getDefaultDate(), time: getDefaultTime() }
  const dt = new Date(scheduledAt)
  return {
    date: `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`,
    time: `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`,
  }
}

const emptyForm = () => ({
  clientId: '', serviceId: '', service: '',
  date: getDefaultDate(), time: getDefaultTime(),
  duration: 60, price: '', quantity: 1, notes: '', city: '', address: '', meeting_link: '',
  meetingPurpose: '', isOnline: false, reminderHours: [] as number[],
})

// ─── CityAutocomplete ─────────────────────────────────────────────────────────

function CityAutocomplete({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string
}) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleInput = (v: string) => {
    onChange(v)
    if (v.length >= 2) {
      const m = ISRAEL_CITIES.filter(c => c.startsWith(v) || c.includes(v)).slice(0, 8)
      setSuggestions(m); setOpen(m.length > 0)
    } else { setSuggestions([]); setOpen(false) }
  }

  return (
    <div ref={wrapRef} className="relative">
      <Input value={value} onChange={e => handleInput(e.target.value)}
        onFocus={() => value.length >= 2 && setOpen(suggestions.length > 0)}
        placeholder={placeholder} className="h-10" dir="rtl" />
      {open && (
        <ul className="absolute z-[10000] mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-auto text-sm">
          {suggestions.map(city => (
            <li key={city} className="px-3 py-2 cursor-pointer hover:bg-indigo-50 text-gray-800" dir="rtl"
              onMouseDown={() => { onChange(city); setOpen(false) }}>{city}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── ReminderBlock ────────────────────────────────────────────────────────────

function ReminderBlock({ hasWhatsapp, value, onChange, isHe }: {
  hasWhatsapp: boolean; value: number[]; onChange: (v: number[]) => void; isHe: boolean
}) {
  const toggle = (h: number) =>
    onChange(value.includes(h) ? value.filter(x => x !== h) : [...value, h])

  if (!hasWhatsapp) {
    return (
      <div style={{ borderRadius: 14, background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #86efac', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>📱</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#15803d' }}>
              {isHe ? 'שלח תזכורות WhatsApp ללקוחות' : 'Отправляйте напоминания в WhatsApp'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#16a34a' }}>
              {isHe ? 'הפעל שילוב WhatsApp לתזכורות אוטומטיות' : 'Подключите WhatsApp для автоматических напоминаний'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ borderRadius: 12, padding: '12px 14px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        🔔 {isHe ? 'תזכורות WhatsApp' : 'Напоминания WhatsApp'}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {REMINDER_OPTIONS.map(h => {
          const active = value.includes(h)
          return (
            <button key={h} type="button" onClick={() => toggle(h)}
              style={{ padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: active ? '1.5px solid #4f46e5' : '1.5px solid #e2e8f0', background: active ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : '#fff', color: active ? '#fff' : '#64748b', cursor: 'pointer' }}>
              {isHe ? `${h}ש` : `${h}ч`}
            </button>
          )
        })}
      </div>
      {value.length > 0 && (
        <p style={{ margin: '8px 0 0', fontSize: 10, color: '#6366f1' }}>
          {isHe
            ? `✓ תזכורת תישלח ${value.sort((a,b)=>b-a).join(', ')} שעות לפני`
            : `✓ Напоминание за ${value.sort((a,b)=>b-a).join(', ')} ч до встречи`}
        </p>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function UnifiedVisitDialog({ open, onOpenChange, initialData }: UnifiedVisitDialogProps) {
  const { t, language } = useLanguage()
  const { orgId } = useAuth()
  const { activeOrgId } = useBranch()
  const queryClient = useQueryClient()
  const { data: customServices } = useServices()
  const { hasWhatsapp } = useFeatures()
  const isHe = language === 'he'
  const dir = isHe ? 'rtl' : 'ltr'

  const safeData = validateVisitModalData(initialData)
  const isEditMode = safeData.mode === 'edit'

  // ── Form state ───────────────────────────────────────────────────────────────
  const [isAppt, setIsAppt] = useState(false)
  const [selClient, setSelClient] = useState<Client | null>(null)
  const [form, setForm] = useState(emptyForm)

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // ── Double-submit guard ──────────────────────────────────────────────────────
  const isSubmittingRef = useRef(false)

  // ── Services list ────────────────────────────────────────────────────────────
  const services = (customServices && customServices.length > 0)
    ? customServices
    : DEFAULT_SERVICES.map(s => ({ id: s.id, name: t(s.labelKey), name_ru: t(s.labelKey), duration_minutes: 60, price: undefined }))

  // ── Sync state on open ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const sd = validateVisitModalData(initialData)
    setErrorMsg(null)

    if (sd.mode === 'edit' && sd.visit) {
      // Populate form from existing visit
      const v = sd.visit
      const { date, time } = parseDateFromScheduledAt(v.scheduled_at)
      setIsAppt(v.event_type === 'meeting')
      setForm({
        clientId: v.client_id || '',
        serviceId: v.service_id || '',
        service: v.service || '',
        date, time,
        duration: v.duration_minutes || 60,
        price: v.price != null ? String(v.price) : '',
        quantity: v.quantity || 1,
        notes: v.notes || '',
        city: '', address: '', meeting_link: v.meeting_link || '',
        meetingPurpose: v.service || '',
        isOnline: !!(v.meeting_link),
        reminderHours: [],
      })
      if (v.clients) {
        setSelClient({
          id: v.client_id,
          first_name: v.clients.first_name || '',
          last_name: v.clients.last_name || '',
          phone: v.clients.phone || '',
        })
      }
    } else {
      // Create mode — reset
      setIsAppt(sd.isMeetingMode ?? false)
      setForm({
        ...emptyForm(),
        clientId: sd.clientId || '',
        date: toDateStr(sd.date),
        time: sd.time || getDefaultTime(),
      })
      setSelClient(null)
      // Prefetch client by ID if passed
      if (sd.clientId) {
        fetch(`/api/clients/${sd.clientId}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => { if (data) setSelClient(data) })
          .catch(() => {})
      }
    }
    // Invalidate services cache on open
    queryClient.invalidateQueries({ queryKey: ['services'] })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const canSubmit = !!form.clientId && !!form.date && !!form.time &&
    (isAppt ? !!form.meetingPurpose : (!!form.serviceId && !!form.price))

  // ── Service change handler ────────────────────────────────────────────────────
  const onSvcChange = useCallback((id: string) => {
    const svc = (customServices || []).find((s: any) => s.id === id)
      ?? services.find((s: any) => s.id === id)
    const svcName = isHe ? svc?.name : (svc?.name_ru || svc?.name)
    const svcPrice = svc?.price != null ? parseFloat(String(svc.price)) : null
    const svcDuration = svc?.duration_minutes ? Number(svc.duration_minutes) : null
    setForm(p => ({
      ...p, serviceId: id, service: svcName || id,
      price: svcPrice != null ? String(svcPrice) : p.price,
      duration: svcDuration ?? p.duration,
    }))
  }, [customServices, services, isHe])

  // ── Close ────────────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    if (isSubmittingRef.current) return
    setErrorMsg(null)
    onOpenChange(false)
  }, [onOpenChange])

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true

    if (!canSubmit || !orgId) {
      toast.error(t('common.fillRequired'))
      isSubmittingRef.current = false; return
    }

    // ── GUARD: не отправляем optimistic clientId на сервер ──────────────────
    // Клиент ещё не сохранён — UUID не вернулся с сервера (onSettled ещё не завершился).
    if (form.clientId.startsWith('optimistic-')) {
      toast.error(isHe
        ? 'הלקוח עדיין נשמר. נסה שוב עוד רגע.'
        : 'Клиент ещё сохраняется. Повторите попытку через секунду.')
      isSubmittingRef.current = false; return
    }

    setIsLoading(true)
    setErrorMsg(null)

    try {
      if (isEditMode && safeData.visit) {
        // ── EDIT: PUT /api/visits/:id ──────────────────────────────────────────
        const scheduled_at = new Date(`${form.date}T${form.time}`).toISOString()

        // Validate not in past
        if (new Date(scheduled_at) < new Date()) {
          setErrorMsg(isHe ? 'לא ניתן לבחור תאריך שעבר' : 'Нельзя выбрать прошедшую дату')
          return
        }

        await apiFetch(`/api/visits/${safeData.visit.id}`, {
          method: 'PUT',
          json: {
            scheduled_at,
            service_id:       form.serviceId || null,
            duration_minutes: isAppt ? null : Number(form.duration),
            notes:            form.notes,
            price:            form.price ? Number(form.price) : null,
          },
        })
        toast.success(isHe ? 'נשמר בהצלחה' : 'Сохранено')
      } else {
        // ── CREATE: POST /api/visits ───────────────────────────────────────────
        let notes = form.notes
        if (isAppt) {
          const parts: string[] = []
          if (form.meetingPurpose) parts.push(`${isHe ? 'מטרה' : 'Цель'}: ${form.meetingPurpose}`)
          if (form.isOnline && form.meeting_link) parts.push(`${isHe ? 'קישור' : 'Ссылка'}: ${form.meeting_link}`)
          if (!form.isOnline) {
            if (form.city)    parts.push(`${isHe ? 'עיר' : 'Город'}: ${form.city}`)
            if (form.address) parts.push(`${isHe ? 'כתובת' : 'Адрес'}: ${form.address}`)
          }
          if (form.notes) parts.push(form.notes)
          notes = parts.join('\n')
        }
        await apiFetch('/api/visits', {
          method: 'POST',
          json: {
            clientId:   form.clientId,
            serviceId:  isAppt ? null : form.serviceId,
            service:    isAppt ? (form.meetingPurpose || (isHe ? 'פגישה' : 'Встреча')) : form.service,
            date: form.date, time: form.time,
            duration:   isAppt ? null : form.duration,
            price:      isAppt ? '0' : form.price,
            quantity:   isAppt ? 1 : form.quantity,
            notes,
            event_type: isAppt ? 'meeting' : 'visit',
            meeting_link: isAppt && form.isOnline ? (form.meeting_link || null) : null,
          },
        })
        toast.success(t('common.success'))
      }

      // ✅ Шаг 5 — инвалидация кэша вместо window.location.reload()
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'visits' })
      safeData.onSuccess?.()
      handleClose()

    } catch (err: unknown) {
      // Форма НЕ сбрасывается при ошибке
      const msg = err instanceof Error ? err.message : (isHe ? 'שגיאה, נסה שוב' : 'Ошибка, попробуйте снова')
      setErrorMsg(msg)
      console.error('[UnifiedVisitDialog] submit error:', err)
    } finally {
      setIsLoading(false)
      isSubmittingRef.current = false
    }
  }, [
    isEditMode, canSubmit, orgId, form, isAppt, isHe, safeData,
    handleClose, queryClient, t,
  ])

  // ─── Mobile footer ────────────────────────────────────────────────────────────
  const footerContent = (
    <div style={{ display: 'flex', gap: 10, width: '100%' }}>
      <button onClick={handleClose} disabled={isLoading}
        style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.12)', background: 'transparent', color: 'var(--muted-foreground)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
        {isHe ? 'ביטול' : 'Отмена'}
      </button>
      <button onClick={handleSubmit} disabled={!canSubmit || isLoading}
        style={{ flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', background: canSubmit && !isLoading ? 'var(--trinity-accent,#4a6fa5)' : 'rgba(0,0,0,0.12)', color: canSubmit && !isLoading ? '#fff' : 'rgba(0,0,0,0.3)', fontSize: 14, fontWeight: 600, cursor: canSubmit && !isLoading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {isLoading && <Loader2 size={14} className="animate-spin" />}
        {isLoading ? '...' : isEditMode
          ? (isHe ? 'שמור' : 'Сохранить')
          : (isAppt ? (isHe ? 'צור פגישה' : 'Создать встречу') : (isHe ? 'צור ביקור' : 'Создать визит'))}
      </button>
    </div>
  )

  // ─── Title / Icon ─────────────────────────────────────────────────────────────
  const shellTitle = isEditMode
    ? (isHe ? 'עריכת ביקור' : 'Редактирование визита')
    : isAppt ? (isHe ? 'צור פגישה' : 'Создать встречу')
    : (isHe ? 'צור ביקור' : 'Создать визит')

  const shellIcon = isEditMode ? <Save /> : isAppt ? <MapPin /> : <Scissors />

  // ─── Services for select ──────────────────────────────────────────────────────
  const selSvc = services.find((s: any) => s.id === form.serviceId)
  const svcName = selSvc ? (isHe ? selSvc.name : (selSvc.name_ru || selSvc.name)) : ''

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <Modal open={open} onClose={handleClose} darkHeader showCloseButton={false} width="680px" dir={dir} contentClassName="!p-0">
      <TrinityModalShell
        open={open} onClose={handleClose}
        icon={shellIcon} title={shellTitle}
        subtitle={isHe ? 'מלא את הפרטים' : 'Заполните данные'}
        dir={dir} footerContent={footerContent}
      >
        <div className="space-y-4">

          {/* Error banner — форма НЕ сбрасывается */}
          {errorMsg && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12 }}>
              <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', margin: '0 0 2px' }}>
                  {isHe ? 'שגיאה' : 'Ошибка'}
                </p>
                <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{errorMsg}</p>
              </div>
              <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Визит / Встреча toggle (только create) */}
          {!isEditMode && (
            <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--muted,#f1f5f9)' }}>
              {[
                { v: false, l: isHe ? 'ביקור' : 'Визит', I: <Scissors size={13} /> },
                { v: true,  l: isHe ? 'פגישה' : 'Встреча', I: <MapPin size={13} /> },
              ].map(o => (
                <button key={String(o.v)} onClick={() => setIsAppt(o.v)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, background: isAppt === o.v ? '#fff' : 'transparent', color: isAppt === o.v ? '#4f46e5' : 'var(--muted-foreground)', boxShadow: isAppt === o.v ? '0 1px 4px rgba(0,0,0,.1)' : 'none', border: 'none', cursor: 'pointer' }}>
                  {o.I}{o.l}
                </button>
              ))}
            </div>
          )}

          {/* Клиент */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Users size={11} />{t('visits.client')} *
            </label>
            <ClientSearch
              orgId={activeOrgId || orgId || ''}
              onSelect={c => { setSelClient(c); setForm(p => ({ ...p, clientId: c?.id || '' })) }}
              placeholder={t('visits.selectClient')}
              locale={language as 'he' | 'ru' | 'en'}
              value={selClient}
            />
          </div>

          {/* Услуга / Цель встречи */}
          {!isAppt ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Scissors size={11} />{t('visits.service')} *
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={form.serviceId} onValueChange={onSvcChange}>
                    <SelectTrigger className="h-10 w-full"><SelectValue placeholder={t('visits.selectService')} /></SelectTrigger>
                    <SelectContent position="popper" side="bottom" avoidCollisions={false}>
                      {services.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{isHe ? s.name : (s.name_ru || s.name)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!isEditMode && (
                  <input type="number" min={1} max={999} value={form.quantity}
                    onChange={e => setForm(p => ({ ...p, quantity: Math.max(1, Math.min(999, parseInt(e.target.value)||1)) }))}
                    className="h-10 w-14 rounded-md border border-input bg-background px-2 text-sm text-center font-semibold" />
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <FileText size={11} />{isHe ? 'מטרת הפגישה' : 'Цель встречи'} *
                </label>
                <Input value={form.meetingPurpose} onChange={e => setForm(p => ({ ...p, meetingPurpose: e.target.value }))}
                  placeholder={isHe ? 'לדוגמה: ייעוץ...' : 'Напр.: консультация...'} className="h-10" disabled={isLoading} />
              </div>
              {/* Онлайн / Оффлайн (только create) */}
              {!isEditMode && (
                <>
                  <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: 'var(--muted,#f1f5f9)' }}>
                    {[{v:false,l:isHe?'פרונטלי':'Оффлайн',I:<MapPin size={12}/>},{v:true,l:isHe?'מקוון':'Онлайн',I:<Video size={12}/>}].map(o => (
                      <button key={String(o.v)} onClick={() => setForm(p => ({ ...p, isOnline: o.v }))}
                        style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'7px 0', borderRadius:7, fontSize:12, fontWeight:600, background: form.isOnline===o.v ? '#fff' : 'transparent', color: form.isOnline===o.v ? (o.v?'#0ea5e9':'#4f46e5') : 'var(--muted-foreground)', border:'none', cursor:'pointer' }}>
                        {o.I}{o.l}
                      </button>
                    ))}
                  </div>
                  {form.isOnline ? (
                    <Input value={form.meeting_link} onChange={e => setForm(p => ({ ...p, meeting_link: e.target.value }))}
                      className="h-10" placeholder="https://zoom.us/..." type="url" dir="ltr" />
                  ) : (
                    <div className="space-y-2">
                      <CityAutocomplete value={form.city} onChange={v => setForm(p => ({ ...p, city: v }))}
                        placeholder={isHe ? 'עיר' : '2 символа...'} />
                      <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                        className="h-10" dir="rtl" placeholder="כתובת" />
                    </div>
                  )}
                </>
              )}
              {/* Edit mode — ссылка на встречу */}
              {isEditMode && (
                <Input value={form.meeting_link} onChange={e => setForm(p => ({ ...p, meeting_link: e.target.value }))}
                  className="h-10" placeholder="https://zoom.us/..." type="url" dir="ltr" disabled={isLoading} />
              )}
            </div>
          )}

          {/* Дата + Время */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Calendar size={11} />{t('visits.date')} *
              </label>
              <Input type="date" value={form.date} className="h-10" disabled={isLoading}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Clock size={11} />{t('visits.time')} *
              </label>
              <Input type="time" value={form.time} className="h-10" disabled={isLoading}
                onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
            </div>
          </div>

          {/* Длит + Цена (только для визита) */}
          {!isAppt && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('visits.duration')}</label>
                <Select value={form.duration.toString()} onValueChange={v => setForm(p => ({ ...p, duration: parseInt(v) }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" side="bottom" avoidCollisions={false}>
                    {DURATIONS.map(d => <SelectItem key={d.value} value={d.value.toString()}>{t(d.labelKey)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('visits.price')} *</label>
                <Input type="number" value={form.price} placeholder="₪" className="h-10" disabled={isLoading}
                  onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
              </div>
            </div>
          )}

          {/* Напоминания WhatsApp (только create + встреча) */}
          {!isEditMode && isAppt && (
            <ReminderBlock hasWhatsapp={hasWhatsapp} value={form.reminderHours}
              onChange={v => setForm(p => ({ ...p, reminderHours: v }))} isHe={isHe} />
          )}

          {/* Заметки */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <FileText size={11} />{t('visits.notes')}
            </label>
            <Textarea value={form.notes} rows={2} className="resize-none" disabled={isLoading}
              placeholder={t('visits.notes')} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>

          {/* Сводка (только create) */}
          {!isEditMode && canSubmit && (
            <div style={{ borderRadius: 12, padding: 12, background: 'rgba(74,111,165,0.08)', border: '1px solid rgba(74,111,165,0.2)' }}>
              <div className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 text-indigo-600 mb-2">
                <CheckCircle2 size={11} />{isHe ? 'סיכום' : 'Сводка'}
              </div>
              <div className="space-y-1 text-xs text-foreground">
                {selClient && <div className="flex items-center gap-1.5"><Users size={10} className="text-muted-foreground shrink-0" /><span className="font-medium">{selClient.first_name} {selClient.last_name}</span></div>}
                {isAppt && form.meetingPurpose && <div className="flex items-center gap-1.5"><FileText size={10} className="text-muted-foreground shrink-0" /><span>{form.meetingPurpose}</span></div>}
                {!isAppt && svcName && <div className="flex items-center gap-1.5"><Scissors size={10} className="text-muted-foreground shrink-0" /><span>{svcName}{form.price ? ` — ₪${form.price}` : ''}</span></div>}
                <div className="flex items-center gap-1.5"><Calendar size={10} className="text-muted-foreground shrink-0" /><span>{form.date} {isHe ? 'ב' : 'в'} {form.time}</span></div>
              </div>
            </div>
          )}

        </div>
      </TrinityModalShell>
    </Modal>
  )
}

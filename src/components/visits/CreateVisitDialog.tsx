'use client'

import { useState, useEffect, useRef } from 'react' // useRef needed by CityAutocomplete
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/hooks/useServices'
import { useBranch } from '@/contexts/BranchContext'
import { useFeatures } from '@/hooks/useFeatures'
import { WizardModal } from '@/components/ui/WizardModal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Users, Calendar, FileText, CheckCircle2, Clock, Scissors, MapPin, Video, X, Loader2 } from 'lucide-react'
import { ClientSearch } from '@/components/ui/ClientSearch'

// ─── Cities ───────────────────────────────────────────────────────────────────
const ISRAEL_CITIES = [
  'תל אביב','ירושלים','חיפה','ראשון לציון','פתח תקווה','אשדוד','נתניה',
  'באר שבע','בני ברק','חולון','רמת גן','אשקלון','רחובות','בת ים',
  'בית שמש','כפר סבא','הרצליה','חדרה','מודיעין','לוד','נהריה',
  'רמלה','רעננה','גבעתיים','הוד השרון','עכו','אלעד','קרית גת',
  'אום אל-פחם','אילת','עפולה','טבריה','צפת','קרית אתא','ראש העין',
  'יבנה','נצרת','אריאל','שוהם','גדרה','קרית ביאליק',
  'קרית ים','קרית מוצקין','טירת כרמל','קרית שמונה','מעלה אדומים',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getDefaultTime = () => {
  const now = new Date(); const d = new Date(now)
  d.setMinutes(now.getMinutes() < 30 ? 30 : 0)
  if (now.getMinutes() >= 30) d.setHours(d.getHours() + 1)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
const getDefaultDate = () => {
  const t = new Date(); t.setDate(t.getDate()+1); return t.toISOString().split('T')[0]
}
const toDateStr = (d: Date | string | null | undefined) =>
  d ? (d instanceof Date ? d.toISOString().split('T')[0] : String(d)) : getDefaultDate()

// ─── Static data ──────────────────────────────────────────────────────────────
const DEFAULT_SERVICES = [
  'haircut','coloring','smoothing','facial','manicure','pedicure',
  'haircutColoring','hairTreatment','consultation','meeting','advertising','other',
].map(v => ({ value: v, labelKey: `service.${v}` }))

const DURATIONS = [
  { value: 30, labelKey: 'duration.30min' },
  { value: 45, labelKey: 'duration.45min' },
  { value: 60, labelKey: 'duration.60min' },
  { value: 90, labelKey: 'duration.90min' },
  { value: 120, labelKey: 'duration.120min' },
]

// ─── Props ────────────────────────────────────────────────────────────────────
interface CreateVisitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedClientId?: string
  preselectedDate?: Date | string | null
  preselectedTime?: string | null
  onVisitCreated?: (v: { clientName: string; clientPhone?: string; date: string; time: string }) => void
}

// ─── City Autocomplete ────────────────────────────────────────────────────────
function CityAutocomplete({ value, onChange, placeholder, inputClass = 'h-11' }: {
  value: string; onChange: (v: string) => void; placeholder: string; inputClass?: string
}) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
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
        placeholder={placeholder} className={inputClass} dir="rtl" />
      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-auto text-sm">
          {suggestions.map(city => (
            <li key={city} className="px-3 py-2 cursor-pointer hover:bg-indigo-50 text-gray-800" dir="rtl"
              onMouseDown={() => { onChange(city); setOpen(false) }}>{city}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Shared submit logic ──────────────────────────────────────────────────────
async function submitVisit(params: {
  orgId: string; isAppt: boolean; form: any; selClient: any; isHe: boolean
  onVisitCreated?: (v: any) => void; onSuccess: () => void
  t: (k: string) => string
}) {
  const { orgId, isAppt, form, selClient, isHe, onVisitCreated, onSuccess, t } = params
  let notes = form.notes

  if (isAppt) {
    // Собираем заметки для встречи
    const p: string[] = []
    if (form.meetingPurpose) p.push(`${isHe ? 'מטרת הפגישה' : 'Цель встречи'}: ${form.meetingPurpose}`)
    if (form.isOnline) {
      if (form.meeting_link) p.push(`${isHe ? 'קישור' : 'Ссылка'}: ${form.meeting_link}`)
    } else {
      if (form.city) p.push(`${isHe ? 'עיר' : 'Город'}: ${form.city}`)
      if (form.address) p.push(`${isHe ? 'כתובת' : 'Адрес'}: ${form.address}`)
    }
    if (form.reminderHours?.length > 0) {
      p.push(`${isHe ? 'תזכורות' : 'Напоминания'}: ${form.reminderHours.sort((a: number, b: number) => b - a).join(', ')}ч`)
    }
    if (form.notes) p.push(form.notes)
    notes = p.join('\n')
  }

  const res = await fetch('/api/visits', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: form.clientId,
      serviceId: isAppt ? null : form.serviceId,
      service: isAppt ? (form.meetingPurpose || (isHe ? 'פגישה' : 'Встреча')) : form.service,
      date: form.date, time: form.time,
      duration: isAppt ? null : form.duration,
      price: isAppt ? '0' : form.price,
      quantity: isAppt ? 1 : form.quantity,
      notes,
      event_type: isAppt ? 'meeting' : 'visit',
      meeting_link: isAppt && form.isOnline ? (form.meeting_link || null) : null,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed')
  if (onVisitCreated && selClient) {
    onVisitCreated({ clientName: `${selClient.first_name} ${selClient.last_name}`.trim(), clientPhone: selClient.phone, date: form.date, time: form.time })
  }
  onSuccess()
}

const emptyForm = () => ({
  clientId: '', serviceId: '', service: '',
  date: getDefaultDate(), time: getDefaultTime(),
  duration: 60, price: '', quantity: 1, notes: '', city: '', address: '', meeting_link: '',
  meetingPurpose: '', isOnline: false, reminderHours: [] as number[],
})

// ─── Reminder block — WhatsApp reminder checkboxes or upgrade banner ──────────
const REMINDER_OPTIONS = [24, 12, 6, 3, 1]

function ReminderBlock({ hasWhatsapp, value, onChange, isHe }: {
  hasWhatsapp: boolean
  value: number[]
  onChange: (v: number[]) => void
  isHe: boolean
}) {
  const toggle = (h: number) => {
    onChange(value.includes(h) ? value.filter(x => x !== h) : [...value, h])
  }

  if (!hasWhatsapp) {
    return (
      <div style={{
        borderRadius: 14, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #d1fae5 100%)',
        border: '1.5px solid #86efac',
        padding: '14px 16px',
      }}>
        {/* Анимированный shimmer */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(90deg, transparent 0%, rgba(134,239,172,0.3) 50%, transparent 100%)',
          animation: 'shimmer-wave 2.4s ease-in-out infinite',
        }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, position: 'relative' }}>
          <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>📱</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#15803d', lineHeight: 1.3 }}>
              {isHe ? 'שלח תזכורות WhatsApp ללקוחות' : 'Отправляйте напоминания в WhatsApp'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#16a34a', lineHeight: 1.5 }}>
              {isHe
                ? 'הפעל את שילוב WhatsApp וצור תזכורות אוטומטיות לפגישות'
                : 'Подключите WhatsApp и автоматически напоминайте клиентам о встречах'}
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8,
              padding: '5px 12px', borderRadius: 20,
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'default',
              boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
            }}>
              ✨ {isHe ? 'לשדרוג פנה למנהל' : 'Для подключения обратитесь к администратору'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ borderRadius: 12, padding: '12px 14px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>🔔</span>{isHe ? 'תזכורות WhatsApp' : 'Напоминания WhatsApp'}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {REMINDER_OPTIONS.map(h => {
          const active = value.includes(h)
          return (
            <button
              key={h}
              type="button"
              onClick={() => toggle(h)}
              style={{
                padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: active ? '1.5px solid #4f46e5' : '1.5px solid #e2e8f0',
                background: active ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : '#fff',
                color: active ? '#fff' : '#64748b',
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: active ? '0 2px 8px rgba(79,70,229,0.3)' : 'none',
              }}
            >
              {isHe ? `${h}ש` : `${h}ч`}
            </button>
          )
        })}
      </div>
      {value.length > 0 && (
        <p style={{ margin: '8px 0 0', fontSize: 10, color: '#6366f1' }}>
          {isHe
            ? `✓ תזכורת תישלח ${value.sort((a,b)=>b-a).join(', ')} שעות לפני הפגישה`
            : `✓ Напоминание отправится за ${value.sort((a,b)=>b-a).join(', ')} ч до встречи`}
        </p>
      )}
    </div>
  )
}

// ─── MOBILE component — uses TrinityModalShell (ModalBottomSheet) ─────────────
function CreateVisitMobile({ open, onClose, preselectedClientId, preselectedDate, preselectedTime, onVisitCreated }: {
  open: boolean; onClose: () => void; preselectedClientId?: string
  preselectedDate?: Date | string | null; preselectedTime?: string | null
  onVisitCreated?: (v: any) => void
}) {
  const { t, language } = useLanguage()
  const { orgId } = useAuth()
  const queryClient = useQueryClient()
  const { data: customServices } = useServices()
  // Force-invalidate services cache on open to always get fresh prices
  useEffect(() => {
    if (open) queryClient.invalidateQueries({ queryKey: ['services'] })
  }, [open])
  const { hasWhatsapp } = useFeatures()
  const isHe = language === 'he'
  const dir = isHe ? 'rtl' : 'ltr'

  const [isAppt, setIsAppt] = useState(false)
  const [selClient, setSelClient] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ ...emptyForm(), clientId: preselectedClientId || '', date: toDateStr(preselectedDate), time: preselectedTime || getDefaultTime() })

  useEffect(() => {
    if (!open) return
    setForm(p => ({ ...p, clientId: preselectedClientId || p.clientId, date: toDateStr(preselectedDate), time: preselectedTime || p.time }))
  }, [open, preselectedDate, preselectedTime, preselectedClientId])

  // Загружаем клиента по ID чтобы ClientSearch показал имя
  useEffect(() => {
    if (!open || !preselectedClientId) return
    setSelClient(null)
    fetch(`/api/clients/${preselectedClientId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSelClient(data) })
      .catch(() => {})
  }, [open, preselectedClientId])

  const services = (customServices && customServices.length > 0) ? customServices
    : DEFAULT_SERVICES.map(s => ({ id: s.value, name: t(s.labelKey), name_ru: t(s.labelKey), duration_minutes: 60, price: undefined }))

  // Сбрасываем форму при каждом открытии — чистый старт.
  // НЕ зависим от customServices?.length: если добавить его как dep,
  // useEffect срабатывает при фоновом рефетче и сбрасывает уже заполненную форму.
  useEffect(() => {
    if (!open) return
    setForm(p => ({ ...p, serviceId: '', service: '', price: '', duration: 60 }))
  }, [open])

  // Если форма уже открыта и юзер ещё не выбрал услугу,
  // но customServices только что загрузились — ничего не делаем принудительно.
  // Юзер сам выберет из актуального списка. Не трогаем форму.

  const onSvcChange = (id: string) => {
    // Always search in customServices first (real DB data), fall back to static list
    const realSvc = (customServices || []).find((s: any) => s.id === id)
    const svc = realSvc || services.find((s: any) => s.id === id)
    const svcNameStr = isHe ? svc?.name : (svc?.name_ru || svc?.name)
    // price may come as string "3000.00" from Supabase numeric — always parse to float first
    const svcPrice = svc?.price != null ? parseFloat(String(svc.price)) : null
    const svcDuration = svc?.duration_minutes ? Number(svc.duration_minutes) : null
    setForm(p => ({
      ...p,
      serviceId: id,
      service: svcNameStr || id,
      price: svcPrice != null ? String(svcPrice) : p.price,
      duration: svcDuration != null ? svcDuration : p.duration,
    }))
  }

  const selSvc = services.find((s: any) => s.id === form.serviceId)
  const svcName = selSvc ? (isHe ? selSvc.name : (selSvc.name_ru || selSvc.name)) : ''
  const canSubmit = !!form.clientId && !!form.date && !!form.time &&
    (isAppt ? !!form.meetingPurpose : (!!form.serviceId && !!form.price))

  const handleClose = () => {
    onClose(); setIsAppt(false); setSelClient(null); setForm(emptyForm())
  }

  const handleSubmit = async () => {
    if (!orgId || !canSubmit) return
    setSubmitting(true)
    try {
      await submitVisit({ orgId, isAppt, form, selClient, isHe, onVisitCreated, t,
        onSuccess: () => { toast.success(t('common.success')); queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'visits' }); handleClose() } })
    } catch (e: any) { toast.error(e.message || t('common.error')) }
    finally { setSubmitting(false) }
  }

  const footerContent = (
    <div style={{ display: 'flex', gap: 10, width: '100%' }}>
      <button
        onClick={handleClose}
        style={{
          flex: 1, padding: '12px 0', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.12)',
          background: 'transparent', color: 'var(--muted-foreground)', fontSize: 14,
          fontWeight: 500, cursor: 'pointer',
        }}
      >
        {isHe ? 'ביטול' : 'Отмена'}
      </button>
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        style={{
          flex: 2, padding: '12px 0', borderRadius: 12, border: 'none',
          background: canSubmit && !submitting ? 'var(--trinity-accent, #4a6fa5)' : 'rgba(0,0,0,0.12)',
          color: canSubmit && !submitting ? '#fff' : 'rgba(0,0,0,0.3)',
          fontSize: 14, fontWeight: 600, cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'background 0.2s',
        }}
      >
        {submitting && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
        {submitting ? '...' : (isHe ? 'צור ביקור' : 'Создать визит')}
      </button>
    </div>
  )

  return (
    <Modal open={open} onClose={handleClose} darkHeader showCloseButton={false} width="680px" dir={dir}>
      <TrinityModalShell
        open={open}
        onClose={handleClose}
        icon={isAppt ? <MapPin /> : <Scissors />}
        title={isAppt ? (isHe ? 'צור פגישה' : 'Создать встречу') : (isHe ? 'צור ביקור' : 'Создать визит')}
        subtitle={isHe ? 'מלא את הפרטים' : 'Заполните данные'}
        dir={dir}
        footerContent={footerContent}
      >
        <div className="space-y-4">

          {/* Toggle Визит / Встреча */}
          <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--muted, #f1f5f9)' }}>
            {[
              { v: false, l: isHe ? 'ביקור' : 'Визит', I: <Scissors size={13} /> },
              { v: true,  l: isHe ? 'פגישה' : 'Встреча', I: <MapPin size={13} /> },
            ].map(o => (
              <button key={String(o.v)} onClick={() => setIsAppt(o.v)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: isAppt === o.v ? '#fff' : 'transparent',
                  color: isAppt === o.v ? '#4f46e5' : 'var(--muted-foreground)',
                  boxShadow: isAppt === o.v ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {o.I}{o.l}
              </button>
            ))}
          </div>

          {/* Клиент */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Users size={11} />{t('visits.client')} *
            </label>
            <ClientSearch orgId={orgId || ''} onSelect={c => { setSelClient(c); setForm(p => ({ ...p, clientId: c?.id || '' })) }}
              placeholder={t('visits.selectClient')} locale={language as 'he' | 'ru' | 'en'} value={selClient} />
          </div>

          {/* Услуга + кол-во / Цель встречи */}
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
                      {services.map((s: any) => {
                        const n = isHe ? s.name : (s.name_ru || s.name)
                        return <SelectItem key={s.id} value={s.id}>{n}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <input type="number" min={1} max={999} value={form.quantity}
                  onChange={e => setForm(p => ({ ...p, quantity: Math.max(1, Math.min(999, parseInt(e.target.value) || 1)) }))}
                  className="h-10 w-14 rounded-md border border-input bg-background px-2 text-sm text-center font-semibold" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Цель встречи */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <FileText size={11} />{isHe ? 'מטרת הפגישה' : 'Цель встречи'} *
                </label>
                <Input
                  value={form.meetingPurpose}
                  onChange={e => setForm(p => ({ ...p, meetingPurpose: e.target.value }))}
                  placeholder={isHe ? 'לדוגמה: ייעוץ, הצגה...' : 'Напр.: консультация, презентация...'}
                  className="h-10"
                />
              </div>

              {/* Тумблер Онлайн / Оффлайн */}
              <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: 'var(--muted, #f1f5f9)' }}>
                {[
                  { v: false, l: isHe ? 'פרונטלי' : 'Оффлайн', I: <MapPin size={12} /> },
                  { v: true,  l: isHe ? 'מקוון'   : 'Онлайн',  I: <Video size={12} /> },
                ].map(o => (
                  <button key={String(o.v)} onClick={() => setForm(p => ({ ...p, isOnline: o.v }))}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      padding: '7px 0', borderRadius: 7, fontSize: 12, fontWeight: 600,
                      background: form.isOnline === o.v ? '#fff' : 'transparent',
                      color: form.isOnline === o.v ? (o.v ? '#0ea5e9' : '#4f46e5') : 'var(--muted-foreground)',
                      boxShadow: form.isOnline === o.v ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                      border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    {o.I}{o.l}
                  </button>
                ))}
              </div>

              {/* Поля в зависимости от онлайн/оффлайн */}
              {form.isOnline ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Video size={11} />{isHe ? 'קישור לפגישה' : 'Ссылка на встречу'}
                  </label>
                  <Input value={form.meeting_link} onChange={e => setForm(p => ({ ...p, meeting_link: e.target.value }))}
                    className="h-10" placeholder="https://zoom.us/..." type="url" dir="ltr" />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <MapPin size={11} />{isHe ? 'עיר' : 'Город'}
                    </label>
                    <CityAutocomplete value={form.city} onChange={v => setForm(p => ({ ...p, city: v }))}
                      placeholder={isHe ? 'עיר בעברית' : '2 символа...'} inputClass="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <MapPin size={11} />{isHe ? 'כתובת' : 'Адрес'}
                    </label>
                    <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                      className="h-10" dir="rtl" placeholder="כתובת בעברית" />
                  </div>
                </>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Calendar size={11} />{t('visits.date')} *
              </label>
              <Input type="date" value={form.date} className="h-10" onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Clock size={11} />{t('visits.time')} *
              </label>
              <Input type="time" value={form.time} className="h-10" onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
            </div>
          </div>

          {/* Длит + Цена (только для визита) */}
          {!isAppt && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('visits.duration')}</label>
                <Select value={form.duration.toString()} onValueChange={v => setForm(p => ({ ...p, duration: parseInt(v) }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{DURATIONS.map(d => <SelectItem key={d.value} value={d.value.toString()}>{t(d.labelKey)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('visits.price')} *</label>
                <Input type="number" value={form.price} placeholder="₪" className="h-10" onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
              </div>
            </div>
          )}

          {/* Напоминания WhatsApp — только для встречи */}
          {isAppt && (
            <ReminderBlock
              hasWhatsapp={hasWhatsapp}
              value={form.reminderHours}
              onChange={v => setForm(p => ({ ...p, reminderHours: v }))}
              isHe={isHe}
            />
          )}

          {/* Заметки */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <FileText size={11} />{t('visits.notes')}
            </label>
            <Textarea value={form.notes} rows={2} placeholder={t('visits.notes')} className="resize-none"
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>

          {/* Сводка */}
          {canSubmit && (
            <div style={{ borderRadius: 12, padding: 12, background: 'rgba(74,111,165,0.08)', border: '1px solid rgba(74,111,165,0.2)' }}>
              <div className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 text-indigo-600 mb-2">
                <CheckCircle2 size={11} />{isHe ? 'סיכום' : 'Сводка'}
              </div>
              <div className="space-y-1 text-xs text-foreground">
                {selClient && <div className="flex items-center gap-1.5"><Users size={10} className="text-muted-foreground shrink-0" /><span className="font-medium">{selClient.first_name} {selClient.last_name}</span></div>}
                {isAppt && form.meetingPurpose && <div className="flex items-center gap-1.5"><FileText size={10} className="text-muted-foreground shrink-0" /><span>{form.meetingPurpose}</span></div>}
                {!isAppt && svcName && <div className="flex items-center gap-1.5"><Scissors size={10} className="text-muted-foreground shrink-0" /><span>{svcName}{form.price ? ` — ₪${form.price}` : ''}{form.quantity > 1 ? ` ×${form.quantity}` : ''}</span></div>}
                <div className="flex items-center gap-1.5"><Calendar size={10} className="text-muted-foreground shrink-0" /><span>{form.date} {isHe ? 'ב' : 'в'} {form.time}</span></div>
                {!isAppt && <div className="flex items-center gap-1.5"><Clock size={10} className="text-muted-foreground shrink-0" /><span>{form.duration} {isHe ? 'דקות' : 'мин'}</span></div>}
                {isAppt && form.isOnline && form.meeting_link && <div className="flex items-center gap-1.5"><Video size={10} className="text-muted-foreground shrink-0" /><span className="truncate">{form.meeting_link}</span></div>}
                {isAppt && !form.isOnline && (form.city || form.address) && <div className="flex items-center gap-1.5"><MapPin size={10} className="text-muted-foreground shrink-0" /><span dir="rtl">{form.city}{form.address ? `, ${form.address}` : ''}</span></div>}
              </div>
            </div>
          )}
        </div>
      </TrinityModalShell>
    </Modal>
  )
}

// ─── DESKTOP component — same form as mobile, in standard Modal ──────────────
// WizardModal replaced with TrinityModalShell (consistent look across devices)
function CreateVisitDesktop({ open, onOpenChange, preselectedClientId, preselectedDate, preselectedTime, onVisitCreated }: CreateVisitDialogProps) {
  return (
    <CreateVisitMobile
      open={open}
      onClose={() => onOpenChange(false)}
      preselectedClientId={preselectedClientId}
      preselectedDate={preselectedDate}
      preselectedTime={preselectedTime}
      onVisitCreated={onVisitCreated}
    />
  )
}

// ─── PUBLIC EXPORT ─────────────────────────────────────────────────────────────
// Единая форма для мобиля и десктопа — TrinityModalShell bottom sheet
export function CreateVisitDialog({ open, onOpenChange, preselectedClientId, preselectedDate, preselectedTime, onVisitCreated }: CreateVisitDialogProps) {
  return (
    <CreateVisitMobile
      open={open}
      onClose={() => onOpenChange(false)}
      preselectedClientId={preselectedClientId}
      preselectedDate={preselectedDate}
      preselectedTime={preselectedTime}
      onVisitCreated={onVisitCreated}
    />
  )
}

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

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
import { visitsKeys } from '@/hooks/useVisits'
import {
  Users, Calendar, FileText, CheckCircle2, Clock,
  Scissors, MapPin, Video, Loader2, AlertCircle, X, Save, Search, ChevronLeft, ChevronRight,
  Plus, Wrench, Package,
} from 'lucide-react'
import { ItemPickerSheet, type PickedItem } from '@/components/shared/ItemPickerSheet'

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
  duration: 60, price: '', quantity: '' as string | number, notes: '', city: '', address: '', meeting_link: '',
  meetingPurpose: '', isOnline: false, reminderHours: [] as number[],
})

// ─── Multi-item cart types (create + edit visits) ─────────────────────────────
// Одна позиция корзины визита.
// В create-режиме: первая позиция → visits.service_id/price, остальные → POST
// /api/visits/[id]/services или /products после создания визита.
// В edit-режиме: первая позиция (isBase=true) — основная услуга визита
// (visits.service_id/price/duration), управляется через PUT /api/visits/[id].
// Остальные позиции хранятся в таблице visit_services:
//   - dbId присутствует → позиция уже в БД (при удалении → DELETE)
//   - dbId отсутствует → свежедобавленная (при сохранении → POST)
export interface VisitLineItem {
  id: string              // local uid (для React key)
  type: 'service' | 'product' | 'custom'
  service_id?: string     // для service
  product_id?: string     // для product
  name: string            // отображаемое имя в текущем языке
  quantity: number
  unit_price: number
  duration_minutes: number  // 0 для product/custom
  dbId?: string           // id в visit_services (если уже сохранено в БД — edit-режим)
  isBase?: boolean        // true для основной позиции визита (редактируется через PUT /api/visits/[id])
}

function uid() { return Math.random().toString(36).slice(2, 10) }

// ─── ServicePicker — searchable + paginated (7 per page) ────────────────────

const PAGE_SIZE = 7

interface ServicePickerProps {
  services: any[]
  value: string
  onChange: (id: string) => void
  isHe: boolean
  placeholder: string
  disabled?: boolean
}

function ServicePicker({ services, value, onChange, isHe, placeholder, disabled }: ServicePickerProps) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const [page, setPage]   = useState(0)
  const wrapRef           = useRef<HTMLDivElement>(null)
  const inputRef          = useRef<HTMLInputElement>(null)

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Reset page when query changes
  useEffect(() => { setPage(0) }, [query])

  // Focus input when dropdown opens
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  const filtered = useMemo(() => {
    if (!query.trim()) return services
    const q = query.toLowerCase()
    return services.filter((s: any) => {
      const name = isHe ? s.name : (s.name_ru || s.name)
      return name?.toLowerCase().includes(q)
    })
  }, [services, query, isHe])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged      = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  const selected   = services.find((s: any) => s.id === value)
  const selectedLabel = selected
    ? (isHe ? selected.name : (selected.name_ru || selected.name))
    : ''

  const handleSelect = (id: string) => {
    onChange(id)
    setOpen(false)
    setQuery('')
    setPage(0)
  }

  return (
    <div ref={wrapRef} className="relative flex-1">
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className="h-10 w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selectedLabel ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedLabel || placeholder}
        </span>
        <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[9999] mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={isHe ? 'חפש שירות...' : 'Поиск услуги...'}
              className="flex-1 text-sm outline-none bg-transparent text-foreground placeholder:text-muted-foreground"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Items */}
          <div>
            {paged.length === 0 ? (
              <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                {isHe ? 'לא נמצאו שירותים' : 'Услуги не найдены'}
              </div>
            ) : (
              paged.map((s: any) => {
                const name    = isHe ? s.name : (s.name_ru || s.name)
                const isActive = s.id === value
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelect(s.id)}
                    className={`w-full text-start px-3 py-2.5 text-sm flex items-center justify-between gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors ${
                      isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 font-medium text-indigo-700 dark:text-indigo-300' : 'text-foreground'
                    }`}
                  >
                    <span>{name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                      {s.price != null && <span>₪{s.price}</span>}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

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

  // ── Multi-item cart (только для create-mode визита, не встречи) ──────────────
  // Если items.length > 0, то управление ценой/длительностью переходит к корзине,
  // и поля form.serviceId/price/duration игнорируются при submit.
  const [items, setItems] = useState<VisitLineItem[]>([])
  // Ручной override общей суммы (скидка/наценка). null = считаем автоматически.
  const [priceOverride, setPriceOverride] = useState<number | null>(null)
  // Ручной override длительности в минутах. null = авто из корзины (или 60 по умолчанию).
  const [durationOverride, setDurationOverride] = useState<number | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // ── Double-submit guard ──────────────────────────────────────────────────────
  const isSubmittingRef = useRef(false)

  // ── Edit-mode snapshot: исходное состояние корзины на момент открытия ────────
  // Нужен для diff-синхронизации при submit: сравниваем текущие items с ref и
  // понимаем, что DELETE-нуть (было + dbId, стало отсутствует) и что POST-нуть
  // (новые items без dbId). isBase позиция сюда НЕ попадает — она идёт через PUT.
  const initialItemsRef = useRef<VisitLineItem[]>([])

  // ── Services list ────────────────────────────────────────────────────────────
  const services = (customServices && customServices.length > 0)
    ? customServices
    : DEFAULT_SERVICES.map(s => ({ id: s.id, name: t(s.labelKey), name_ru: t(s.labelKey), duration_minutes: 60, price: undefined }))

  // ── Sync state on open ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const sd = validateVisitModalData(initialData)
    setErrorMsg(null)
    // Корзина сбрасывается при каждом открытии; потом в edit-режиме она
    // асинхронно заполняется из visit_services ниже.
    setItems([])
    initialItemsRef.current = []
    setPriceOverride(null)
    setDurationOverride(null)
    setPickerOpen(false)

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

      // Только для визитов (не встреч) подгружаем корзину позиций из БД.
      // Базовая позиция (visits.service_*) кладётся первой с isBase=true —
      // её нельзя удалить, но можно менять цену/qty/длительность;
      // при submit это уйдёт в PUT /api/visits/[id].
      if (v.event_type !== 'meeting') {
        const baseName = (isHe ? v.services?.name : (v.services?.name_ru || v.services?.name))
          || v.service_type
          || v.service
          || (isHe ? 'שירות' : 'Услуга')

        const baseItem: VisitLineItem = {
          id: uid(),
          type: 'service',
          service_id: v.service_id || undefined,
          name: baseName,
          quantity: v.quantity || 1,
          unit_price: Number(v.price) || 0,
          duration_minutes: Number(v.duration_minutes) || 0,
          isBase: true,
        }

        // Свежий fetch visit_services — источник истины (на случай, если в prop
        // пришла устаревшая версия из кэша visitsData).
        fetch(`/api/visits/${v.id}/services`)
          .then(r => r.ok ? r.json() : [])
          .then((rows: any[]) => {
            const extras: VisitLineItem[] = (rows || []).map((vs: any) => {
              const isProduct = !vs.service_id && (vs.duration_minutes === 0 || vs.duration_minutes === null)
              const nm = isHe
                ? (vs.service_name || vs.service_name_ru || '')
                : (vs.service_name_ru || vs.service_name || '')
              return {
                id: uid(),
                type: isProduct ? 'product' : (vs.service_id ? 'service' : 'custom'),
                service_id: vs.service_id || undefined,
                name: nm,
                quantity: 1,
                unit_price: Number(vs.price) || 0,
                duration_minutes: Number(vs.duration_minutes) || 0,
                dbId: vs.id,
              }
            })
            const next = [baseItem, ...extras]
            setItems(next)
            // Snapshot: только БД-позиции (с dbId) участвуют в diff'е.
            initialItemsRef.current = extras
          })
          .catch(() => {
            // Если fetch упал — хотя бы базовая позиция будет видна.
            setItems([baseItem])
            initialItemsRef.current = []
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

  // ── Multi-item cart mode flag ────────────────────────────────────────────────
  // Мульти-корзина активна для всех визитов (create + edit), НЕ для встреч.
  // В edit-режиме первая позиция = основная услуга визита (visits.*),
  // остальные = строки visit_services. Подробнее см. VisitLineItem.
  // Объявлено до canSubmit / useEffect / handleSubmit — используется во всех трёх.
  const hasMultiMode = !isAppt

  // ── Derived ──────────────────────────────────────────────────────────────────
  // В мульти-режиме (create + visit) валидность = клиент + дата + время + непустая корзина.
  // Иначе — как было: клиент + дата + время + (serviceId + price) или meetingPurpose.
  const canSubmit =
    !!form.clientId && !!form.date && !!form.time &&
    (hasMultiMode
      ? items.length > 0
      : (isAppt ? !!form.meetingPurpose : (!!form.serviceId && !!form.price)))

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

  // ── Multi-item cart handlers (create-mode visit only) ────────────────────────
  // hasMultiMode объявлен выше, до canSubmit.

  const addItem = useCallback((picked: PickedItem) => {
    setItems(prev => [...prev, {
      id: uid(),
      type: picked.type,
      service_id: picked.service_id,
      product_id: picked.product_id,
      name: picked.product_name,
      quantity: picked.quantity,
      unit_price: picked.unit_price,
      duration_minutes: picked.duration_minutes,
    }])
    // сбрасываем override когда добавляется позиция — чтобы пользователь увидел актуальную сумму
    setPriceOverride(null)
  }, [])

  const removeItem = useCallback((id: string) => {
    // Защита: базовую позицию визита (isBase) никогда не удаляем из корзины —
    // это сам визит. UI тоже скрывает кнопку ×, но здесь дубль на всякий случай.
    setItems(prev => prev.filter(i => i.id !== id || i.isBase))
    setPriceOverride(null)
  }, [])

  const updateItemQty = useCallback((id: string, delta: number) => {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
    ))
    setPriceOverride(null)
  }, [])

  const updateItemPrice = useCallback((id: string, price: number) => {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, unit_price: Math.max(0, price) } : i
    ))
    setPriceOverride(null)
  }, [])

  // ── Авто-расчёт итогов корзины ───────────────────────────────────────────────
  const cartSubtotal = useMemo(() =>
    items.reduce((s, i) => s + i.quantity * i.unit_price, 0), [items])

  // Длительность = сумма длительностей услуг × qty. Товары и custom не считаются.
  const cartDuration = useMemo(() =>
    items.reduce((s, i) =>
      i.type === 'service' ? s + (i.duration_minutes * i.quantity) : s, 0
    ), [items])

  // Финальная сумма: override или subtotal
  const cartTotal = priceOverride !== null ? priceOverride : cartSubtotal

  // ── Close ────────────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    // Не закрываем пока идёт submit — но этот guard только для внешних кликов.
    // При programmatic close (из handleSubmit) isSubmittingRef уже сброшен.
    if (isSubmittingRef.current) return
    setErrorMsg(null)
    onOpenChange(false)
  }, [onOpenChange])

  // Закрытие после успешного submit — вызывается ПОСЛЕ сброса isSubmittingRef
  const handleCloseAfterSuccess = useCallback(() => {
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
        // ── EDIT ───────────────────────────────────────────────────────────────
        // 1) PUT /api/visits/[id]  — сохраняем основную услугу, дату, длительность, notes
        // 2) DELETE /api/visits/[id]/services/[serviceId] — для удалённых позиций
        // 3) POST   /api/visits/[id]/services или /products — для новых позиций
        //
        // Фундаментальное правило: visits.price = базовая цена (первая позиция).
        // visit_services[] хранит только ДОП. позиции. Итог = visits.price + sum(vs.price).
        // DELETE/POST эндпоинты visits.price не трогают (специально).

        // Build ISO with explicit Israel offset to avoid browser-timezone ambiguity
        const _noonUTC = new Date(`${form.date}T12:00:00.000Z`)
        const _tzParts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', timeZoneName: 'shortOffset' }).formatToParts(_noonUTC)
        const _tzName = _tzParts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT+2'
        const _tzMatch = _tzName.match(/GMT([+-])(\d+)(?::(\d+))?/)
        const _offset = _tzMatch ? `${_tzMatch[1]}${_tzMatch[2].padStart(2,'0')}:${(_tzMatch[3]??'00').padStart(2,'0')}` : '+02:00'
        const scheduled_at = new Date(`${form.date}T${form.time}:00${_offset}`).toISOString()

        // Validate not in past — only for non-completed visits
        const isCompleted = safeData.visit?.status === 'completed'
        if (!isCompleted && new Date(scheduled_at) < new Date()) {
          setErrorMsg(isHe ? 'לא ניתן לבחור תאריך שעבר' : 'Нельзя выбрать прошедшую дату')
          return
        }

        const visitId: string = safeData.visit.id

        // ── Для визитов с корзиной: берём значения базовой позиции
        // для PUT /api/visits/[id], и diff'аем остальные.
        // Для встреч — fallback на старую логику (form.serviceId/price/duration).
        const useMultiCart = hasMultiMode && items.length > 0
        const base = useMultiCart ? items.find(i => i.isBase) : null
        const extrasNow = useMultiCart ? items.filter(i => !i.isBase) : []

        // ── PUT визита ───────────────────────────────────────────────────────
        const putJson: Record<string, unknown> = {
          scheduled_at,
          notes: form.notes,
        }
        if (useMultiCart && base) {
          // Корзинный edit: base управляет service/price/duration
          putJson.service_id       = base.service_id || null
          putJson.duration_minutes = isAppt ? null : (Number(base.duration_minutes) || 0)
          putJson.price            = Number(base.unit_price) || 0
        } else {
          // Встреча или fallback на legacy поля формы
          putJson.service_id       = form.serviceId || null
          putJson.duration_minutes = isAppt ? null : Number(form.duration)
          putJson.price            = form.price ? Number(form.price) : null
        }

        await apiFetch(`/api/visits/${visitId}`, { method: 'PUT', json: putJson })

        // ── DIFF и синхронизация visit_services (только для корзинного edit) ──
        if (useMultiCart) {
          const prevExtras = initialItemsRef.current // snapshot из useEffect(open)
          const nowDbIds   = new Set(extrasNow.filter(i => i.dbId).map(i => i.dbId!))

          // DELETE: были в БД, сейчас нет в корзине
          const toDelete = prevExtras.filter(p => p.dbId && !nowDbIds.has(p.dbId))
          // POST: новые позиции без dbId
          const toInsert = extrasNow.filter(i => !i.dbId)

          const results = await Promise.allSettled([
            ...toDelete.map(p =>
              apiFetch(`/api/visits/${visitId}/services/${p.dbId}`, { method: 'DELETE' })
            ),
            ...toInsert.map(item => {
              if (item.type === 'product' && item.product_id) {
                return apiFetch(`/api/visits/${visitId}/products`, {
                  method: 'POST',
                  json: { product_id: item.product_id },
                })
              }
              return apiFetch(`/api/visits/${visitId}/services`, {
                method: 'POST',
                json: {
                  visit_id:         visitId,
                  service_id:       item.type === 'service' ? item.service_id : undefined,
                  service_name:     item.name,
                  service_name_ru:  item.name,
                  price:            item.unit_price * item.quantity,
                  duration_minutes: item.duration_minutes * item.quantity,
                },
              })
            }),
          ])

          const failed = results.filter(r => r.status === 'rejected').length
          if (failed > 0) {
            console.error('[UnifiedVisitDialog] EDIT: some item ops failed:', results)
            toast.warning(
              isHe
                ? `נשמר, אך ${failed} פעולות על פריטים נכשלו`
                : `Сохранено, но ${failed} операций с позициями не удалось`
            )
          }
        }

        toast.success(isHe ? 'נשמר בהצלחה' : 'Сохранено')
      } else {
        // ── CREATE: POST /api/visits ───────────────────────────────────────────
        // В мульти-режиме первая позиция уходит в visits.service_id/price/duration
        // для обратной совместимости (мобилка, CalendarView, VisitFlowCard читают
        // visit.services). Остальные позиции пишутся параллельными POST в
        // /api/visits/[id]/services и /api/visits/[id]/products после создания.
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

        // Выбираем payload: мульти-режим с корзиной ИЛИ legacy single-service
        const useMultiCart = hasMultiMode && items.length > 0
        const firstItem = useMultiCart ? items[0] : null
        const restItems = useMultiCart ? items.slice(1) : []

        const createPayload = useMultiCart
          ? {
              clientId:    form.clientId,
              // service_id из первой позиции (если это services-тип, иначе null + service_type=имя)
              serviceId:   firstItem!.type === 'service' ? firstItem!.service_id : null,
              service:     firstItem!.name,
              scheduledAt: new Date(`${form.date}T${form.time}`).toISOString(),
              date: form.date, time: form.time,
              // Длительность визита = override или сумма длительностей. 60 минимум если одни товары.
              duration:    durationOverride !== null ? durationOverride : (cartDuration > 0 ? cartDuration : 60),
              // Цена = override или subtotal, отдаётся как строка (API парсит parseFloat)
              price:       String(cartTotal),
              quantity:    firstItem!.quantity,
              notes,
              event_type:  'visit',
              meeting_link: null,
            }
          : {
              clientId:   form.clientId,
              serviceId:  isAppt ? null : form.serviceId,
              service:    isAppt ? (form.meetingPurpose || (isHe ? 'פגישה' : 'Встреча')) : form.service,
              scheduledAt: new Date(`${form.date}T${form.time}`).toISOString(),
              date: form.date, time: form.time,
              duration:   isAppt ? null : form.duration,
              price:      isAppt ? '0' : form.price,
              quantity:   isAppt ? 1 : (parseInt(String(form.quantity)) || 1),
              notes,
              event_type: isAppt ? 'meeting' as const : 'visit' as const,
              meeting_link: isAppt && form.isOnline ? (form.meeting_link || null) : null,
            }

        const createRes = await apiFetch<{ visit: { id: string } }>('/api/visits', {
          method: 'POST',
          json: createPayload,
        })

        // Доп.позиции: параллельные POST-ы в /services и /products.
        // Ошибки тут не ломают визит (он уже создан), только логируем + показываем toast.
        if (useMultiCart && restItems.length > 0 && createRes?.visit?.id) {
          const visitId = createRes.visit.id
          const results = await Promise.allSettled(
            restItems.map(item => {
              if (item.type === 'product' && item.product_id) {
                // Товар → visit_services с пометкой о продукте, без движения склада
                return apiFetch(`/api/visits/${visitId}/products`, {
                  method: 'POST',
                  json: { product_id: item.product_id },
                })
              }
              // service / custom → visit_services напрямую
              return apiFetch(`/api/visits/${visitId}/services`, {
                method: 'POST',
                json: {
                  visit_id:         visitId,
                  service_id:       item.type === 'service' ? item.service_id : undefined,
                  service_name:     item.name,
                  service_name_ru:  item.name,
                  price:            item.unit_price * item.quantity,
                  duration_minutes: item.duration_minutes * item.quantity,
                },
              })
            })
          )
          const failed = results.filter(r => r.status === 'rejected').length
          if (failed > 0) {
            console.error('[UnifiedVisitDialog] Some extra items failed:', results)
            toast.warning(
              isHe
                ? `הביקור נוצר, אך ${failed} פריטים לא נוספו`
                : `Визит создан, но ${failed} позиций не добавилось`
            )
          }
        }

        toast.success(t('common.success'))
      }

      // ✅ Инвалидация кэша через typed key factory (охватывает все ['visits', orgId, *])
      queryClient.invalidateQueries({ queryKey: visitsKeys.all(activeOrgId) })
      safeData.onSuccess?.()

      // Сначала снимаем замок, потом закрываем — иначе handleClose видит isSubmittingRef=true
      isSubmittingRef.current = false
      handleCloseAfterSuccess()
      return  // выходим досрочно, finally не должен снова сбрасывать ref

    } catch (err: unknown) {
      // Форма НЕ сбрасывается при ошибке
      const msg = err instanceof Error ? err.message : (isHe ? 'שגיאה, נסה שוב' : 'Ошибка, попробуйте снова')
      setErrorMsg(msg)
      console.error('[UnifiedVisitDialog] submit error:', err)
    } finally {
      setIsLoading(false)
      // isSubmittingRef сбрасывается здесь только при ошибке.
      // При успехе — уже сброшен до handleCloseAfterSuccess().
      if (isSubmittingRef.current) {
        isSubmittingRef.current = false
      }
    }
  }, [
    isEditMode, canSubmit, orgId, activeOrgId, form, isAppt, isHe, safeData,
    handleCloseAfterSuccess, queryClient, t,
    hasMultiMode, items, cartTotal, cartDuration, durationOverride,
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
            hasMultiMode ? (
              /* ─── Multi-item cart (create + visit) ─────────────────────────── */
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Scissors size={11} />{isHe ? 'פריטים' : 'Позиции'} *
                </label>

                {/* Список позиций */}
                {items.length > 0 && (
                  <div className="space-y-2">
                    {items.map(item => {
                      const TYPE_BADGE: Record<string, string> = {
                        service: 'bg-violet-100 text-violet-600',
                        product: 'bg-emerald-100 text-emerald-600',
                        custom:  'bg-amber-100 text-amber-600',
                      }
                      const TYPE_LABEL: Record<string, string> = {
                        service: isHe ? 'שר' : 'У',
                        product: isHe ? 'מו' : 'Т',
                        custom:  isHe ? 'חו' : 'С',
                      }
                      const Icon = item.type === 'service' ? Wrench : item.type === 'product' ? Package : Plus
                      return (
                        <div key={item.id} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${item.isBase ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800' : 'bg-gray-50 dark:bg-gray-800/60'}`}>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ${TYPE_BADGE[item.type]}`}>
                            <Icon size={9} className="inline me-0.5 -mt-0.5" />{TYPE_LABEL[item.type]}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{item.name}</div>
                            {item.isBase && (
                              <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wide">
                                {isHe ? 'שירות ראשי' : 'Основная услуга'}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button type="button" onClick={() => updateItemQty(item.id, -1)}
                              className="w-6 h-6 rounded-md bg-gray-200 text-gray-500 text-xs font-bold flex items-center justify-center hover:bg-gray-300">−</button>
                            <input
                              type="number"
                              min={1}
                              max={999}
                              value={item.quantity}
                              onChange={e => {
                                const raw = e.target.value
                                const n = Math.max(1, Math.min(999, parseInt(raw) || 1))
                                setItems(prev => prev.map(i =>
                                  i.id === item.id ? { ...i, quantity: n } : i
                                ))
                                setPriceOverride(null)
                              }}
                              className="w-10 h-6 text-center text-xs font-semibold border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button type="button" onClick={() => updateItemQty(item.id, +1)}
                              className="w-6 h-6 rounded-md bg-gray-200 text-gray-500 text-xs font-bold flex items-center justify-center hover:bg-gray-300">+</button>
                          </div>
                          <div className="relative w-20 flex-shrink-0">
                            <span className="absolute start-2 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">₪</span>
                            <input type="number" min={0} value={item.unit_price || ''}
                              onChange={e => updateItemPrice(item.id, Number(e.target.value))}
                              className="w-full ps-5 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40" />
                          </div>
                          {item.isBase ? (
                            // Базовую позицию нельзя удалить (это и есть сам визит).
                            // Чтобы заменить основную услугу — используйте /api/visits PUT.
                            <span className="w-[13px] flex-shrink-0" aria-hidden />
                          ) : (
                            <button type="button" onClick={() => removeItem(item.id)}
                              className="text-gray-300 hover:text-red-400 flex-shrink-0"
                              title={isHe ? 'הסר' : 'Удалить'}><X size={13}/></button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Кнопка добавить */}
                <button type="button" onClick={() => setPickerOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition">
                  <Plus size={15}/>{isHe ? '+ הוסף פריט' : '+ Добавить позицию'}
                </button>

                {/* Итого + override */}
                {items.length > 0 && (
                  <div className="flex items-center gap-3 mt-2 p-3 rounded-xl bg-green-50 border-2 border-green-200">
                    <span className="text-sm font-bold text-green-700 flex-shrink-0">
                      {isHe ? 'סה״כ' : 'Итого'}:
                    </span>
                    <div className="relative flex-1">
                      <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-green-600 text-sm font-bold">₪</span>
                      <input
                        type="number"
                        min={0}
                        value={priceOverride !== null ? priceOverride : cartSubtotal.toFixed(2)}
                        onChange={e => {
                          const v = e.target.value
                          if (v === '') { setPriceOverride(null); return }
                          setPriceOverride(Math.max(0, Number(v)))
                        }}
                        className="w-full ps-6 py-1.5 text-base font-bold text-green-700 border border-green-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-400/40"
                      />
                    </div>
                    {priceOverride !== null && priceOverride !== cartSubtotal && (
                      <button type="button" onClick={() => setPriceOverride(null)}
                        title={isHe ? 'אפס' : 'Сброс'}
                        className="text-xs text-green-600 hover:text-green-800 underline flex-shrink-0">
                        {isHe ? `₪${cartSubtotal.toFixed(0)}` : `↺ ₪${cartSubtotal.toFixed(0)}`}
                      </button>
                    )}
                  </div>
                )}
                {items.length > 0 && cartDuration > 0 && durationOverride === null && (
                  <p className="text-xs text-muted-foreground px-1">
                    <Clock size={10} className="inline me-1 -mt-0.5" />
                    {isHe ? 'משך' : 'Длительность'}: {cartDuration} {isHe ? "ד'" : 'мин'}
                  </p>
                )}

                {/* Ручной ввод длительности (необязательно, default 60 мин) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Clock size={11} />{isHe ? 'משך (דקות)' : 'Длительность (мин)'}
                    <span className="text-[10px] font-normal normal-case tracking-normal opacity-60">
                      {isHe ? 'אופציונלי · ברירת מחדל 60' : 'необязательно · по умолч. 60'}
                    </span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={durationOverride !== null ? durationOverride : ''}
                    placeholder="60"
                    onChange={e => {
                      const raw = e.target.value
                      if (raw === '') { setDurationOverride(null); return }
                      const n = Math.max(1, Math.min(600, parseInt(raw) || 1))
                      setDurationOverride(n)
                    }}
                    className="h-10 w-28 rounded-md border border-input bg-background px-3 text-sm font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            ) : (
              /* ─── Legacy single-service (edit-mode visit) ───────────────────── */
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Scissors size={11} />{t('visits.service')} *
                </label>
                <div className="flex gap-2">
                  <ServicePicker
                    services={services}
                    value={form.serviceId}
                    onChange={onSvcChange}
                    isHe={isHe}
                    placeholder={t('visits.selectService')}
                    disabled={isLoading}
                  />
                  {!isEditMode && (
                    <input type="number" min={1} max={999}
                      value={form.quantity === '' ? '' : form.quantity}
                      placeholder="1"
                      onChange={e => {
                        const raw = e.target.value
                        if (raw === '') { setForm(p => ({ ...p, quantity: '' })); return }
                        const n = Math.max(1, Math.min(999, parseInt(raw) || 1))
                        setForm(p => ({ ...p, quantity: n }))
                      }}
                      className="h-10 w-14 rounded-md border border-input bg-background px-2 text-sm text-center font-semibold" />
                  )}
                </div>
              </div>
            )
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

          {/* Длит + Цена (только для визита; в мульти-режиме — авто из корзины) */}
          {!isAppt && !hasMultiMode && (
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
                {hasMultiMode && items.length > 0 ? (
                  <div className="flex items-start gap-1.5">
                    <Scissors size={10} className="text-muted-foreground shrink-0 mt-0.5" />
                    <span>
                      {items.length} {isHe ? 'פריטים' : 'поз.'} — ₪{cartTotal.toFixed(2)}
                      {cartDuration > 0 && ` · ${cartDuration} ${isHe ? "ד'" : 'мин'}`}
                    </span>
                  </div>
                ) : (
                  !isAppt && svcName && <div className="flex items-center gap-1.5"><Scissors size={10} className="text-muted-foreground shrink-0" /><span>{svcName}{form.price ? ` — ₪${form.price}` : ''}</span></div>
                )}
                <div className="flex items-center gap-1.5"><Calendar size={10} className="text-muted-foreground shrink-0" /><span>{form.date} {isHe ? 'ב' : 'в'} {form.time}</span></div>
              </div>
            </div>
          )}

        </div>

        {/* ItemPickerSheet — портал поверх всего, рендерится только в мульти-режиме */}
        {hasMultiMode && (
          <ItemPickerSheet
            isOpen={pickerOpen}
            onClose={() => setPickerOpen(false)}
            isHe={isHe}
            onAdd={addItem}
          />
        )}
      </TrinityModalShell>
    </Modal>
  )
}

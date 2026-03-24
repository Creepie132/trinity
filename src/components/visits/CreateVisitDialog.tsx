'use client'

import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/hooks/useServices'
import { WizardModal } from '@/components/ui/WizardModal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Users, Calendar, FileText, CheckCircle2, Clock, Scissors, MapPin, Video, X } from 'lucide-react'
import { ClientSearch } from '@/components/ui/ClientSearch'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Israeli cities list ──────────────────────────────────────────────────────
const ISRAEL_CITIES = [
  'תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה', 'אשדוד', 'נתניה',
  'באר שבע', 'בני ברק', 'חולון', 'רמת גן', 'אשקלון', 'רחובות', 'בת ים',
  'בית שמש', 'כפר סבא', 'הרצליה', 'חדרה', 'מודיעין', 'לוד', 'נהריה',
  'רמלה', 'רעננה', 'גבעתיים', 'הוד השרון', 'עכו', 'אלעד', 'קרית גת',
  'אום אל-פחם', 'אילת', 'עפולה', 'טבריה', 'צפת', 'קרית אתא', 'ראש העין',
  'יבנה', 'נצרת', 'אריאל', 'שוהם', 'מזכרת בתיה', 'גדרה', 'קרית ביאליק',
  'קרית ים', 'קרית מוצקין', 'טירת כרמל', 'קרית שמונה', 'מעלה אדומים',
  'ביתר עילית', 'מודיעין עילית', 'בית שאן', 'דימונה', 'אופקים',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getDefaultTime = () => {
  const now = new Date()
  const minutes = now.getMinutes()
  const roundedMinutes = minutes < 30 ? 30 : 0
  const d = new Date(now)
  if (roundedMinutes === 0) d.setHours(d.getHours() + 1)
  d.setMinutes(roundedMinutes)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const getDefaultDate = () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}

// ─── Static data ──────────────────────────────────────────────────────────────
const DEFAULT_SERVICES = [
  'haircut','coloring','smoothing','facial','manicure',
  'pedicure','haircutColoring','hairTreatment','consultation','meeting','advertising','other',
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
  onVisitCreated?: (visitData: { clientName: string; clientPhone?: string; date: string; time: string }) => void
}

// ─── City Autocomplete Component ──────────────────────────────────────────────
function CityAutocomplete({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleInput = (v: string) => {
    onChange(v)
    if (v.length >= 2) {
      const matches = ISRAEL_CITIES.filter(c => c.startsWith(v) || c.includes(v))
      setSuggestions(matches.slice(0, 8))
      setOpen(matches.length > 0)
    } else {
      setSuggestions([])
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <Input
        value={value}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => value.length >= 2 && setOpen(suggestions.length > 0)}
        placeholder={placeholder}
        className="h-11"
        dir="rtl"
      />
      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-auto text-sm">
          {suggestions.map(city => (
            <li
              key={city}
              className="px-3 py-2 cursor-pointer hover:bg-indigo-50 text-gray-800"
              dir="rtl"
              onMouseDown={() => { onChange(city); setOpen(false) }}
            >
              {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Mobile single-screen visit creation ─────────────────────────────────────
function CreateVisitMobile({
  open, onClose,
  preselectedClientId, preselectedDate, preselectedTime,
  onVisitCreated,
}: {
  open: boolean; onClose: () => void
  preselectedClientId?: string; preselectedDate?: Date | string | null; preselectedTime?: string | null
  onVisitCreated?: (v: { clientName: string; clientPhone?: string; date: string; time: string }) => void
}) {
  const { t, language } = useLanguage()
  const { orgId } = useAuth()
  const queryClient = useQueryClient()
  const { data: customServices } = useServices()
  const isHe = language === 'he'

  const [isAppointment, setIsAppointment] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState({
    clientId: preselectedClientId || '',
    serviceId: '', service: '',
    date: preselectedDate
      ? (preselectedDate instanceof Date ? preselectedDate.toISOString().split('T')[0] : String(preselectedDate))
      : getDefaultDate(),
    time: preselectedTime || getDefaultTime(),
    duration: 60, price: '', quantity: 1,
    notes: '', city: '', address: '', meeting_link: '',
  })

  useEffect(() => { setMounted(true); return () => setMounted(false) }, [])
  useEffect(() => {
    if (open) {
      setForm(p => ({
        ...p,
        clientId: preselectedClientId || p.clientId,
        date: preselectedDate
          ? (preselectedDate instanceof Date ? preselectedDate.toISOString().split('T')[0] : String(preselectedDate))
          : p.date,
        time: preselectedTime || p.time,
      }))
    }
  }, [open, preselectedDate, preselectedTime, preselectedClientId])

  const services = (customServices && customServices.length > 0)
    ? customServices
    : DEFAULT_SERVICES.map(s => ({ id: s.value, name: t(s.labelKey), name_ru: t(s.labelKey), duration_minutes: 60, price: undefined }))

  const handleServiceChange = (serviceId: string) => {
    const svc = services.find((s: any) => s.id === serviceId)
    setForm(p => ({ ...p, serviceId, service: serviceId, price: svc?.price?.toString() || p.price, duration: svc?.duration_minutes || p.duration }))
  }

  const selectedSvc = services.find((s: any) => s.id === form.serviceId)
  const svcName = selectedSvc ? (isHe ? selectedSvc.name : (selectedSvc.name_ru || selectedSvc.name)) : ''
  const canSubmit = !!form.clientId && !!form.serviceId && !!form.date && !!form.time && (isAppointment || !!form.price)

  const handleClose = () => {
    onClose()
    setIsAppointment(false); setSelectedClient(null)
    setForm({ clientId: '', serviceId: '', service: '', date: getDefaultDate(), time: getDefaultTime(), duration: 60, price: '', quantity: 1, notes: '', city: '', address: '', meeting_link: '' })
  }

  const handleSubmit = async () => {
    if (!orgId || !canSubmit) return
    setIsSubmitting(true)
    try {
      let notesData = form.notes
      if (isAppointment && (form.city || form.address)) {
        const parts = []
        if (form.city) parts.push(`${isHe ? 'עיר' : 'Город'}: ${form.city}`)
        if (form.address) parts.push(`${isHe ? 'כתובת' : 'Адрес'}: ${form.address}`)
        if (form.notes) parts.push(form.notes)
        notesData = parts.join('\n')
      }
      const res = await fetch('/api/visits', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: form.clientId, serviceId: form.serviceId, service: form.service,
          date: form.date, time: form.time,
          duration: isAppointment ? null : form.duration,
          price: isAppointment ? '0' : form.price,
          quantity: form.quantity, notes: notesData,
          event_type: isAppointment ? 'meeting' : 'visit',
          meeting_link: isAppointment ? (form.meeting_link || null) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(t('common.success'))
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'visits' })
      if (onVisitCreated && selectedClient) {
        onVisitCreated({ clientName: `${selectedClient.first_name} ${selectedClient.last_name}`.trim(), clientPhone: selectedClient.phone, date: form.date, time: form.time })
      }
      handleClose()
    } catch (e: any) { toast.error(e.message || t('common.error')) }
    finally { setIsSubmitting(false) }
  }

  if (!mounted || typeof document === 'undefined') return null

  const sidebarBg = 'var(--trinity-sidebar-bg, #1a2620)'
  const accentBg = 'var(--trinity-accent-bg, rgba(45,106,79,0.27))'
  const accentText = 'var(--trinity-accent-text, #74c69d)'
  const accent = 'var(--trinity-accent, #2d6a4f)'

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 bg-black/50" style={{ zIndex: 9998 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: .2 }} onClick={handleClose} />
          <motion.div
            className="fixed bottom-0 left-0 right-0 flex flex-col outline-none"
            style={{ zIndex: 9999, height: 'calc(100dvh - 3rem)', background: 'var(--background, #fff)', borderRadius: '20px 20px 0 0', overflow: 'hidden' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            dir={isHe ? 'rtl' : 'ltr'}
          >
            {/* Handle */}
            <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Header */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 pb-3 pt-1 border-b border-border">
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: sidebarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Scissors size={16} style={{ color: accentText }} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="text-sm font-semibold text-foreground">{isHe ? 'צור ביקור' : 'Создать визит'}</div>
                <div className="text-xs text-muted-foreground">{isHe ? 'מלא את הפרטים' : 'Заполните данные'}</div>
              </div>
              <button onClick={handleClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground" style={{ border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>

            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ touchAction: 'pan-y' }}>

              {/* Visit / Meeting toggle */}
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.05)' }}>
                {[{ val: false, label: isHe ? 'ביקור' : 'Визит', icon: <Scissors size={13}/> },
                  { val: true,  label: isHe ? 'פגישה' : 'Встреча', icon: <MapPin size={13}/> }].map(opt => (
                  <button key={String(opt.val)} onClick={() => setIsAppointment(opt.val)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: isAppointment === opt.val ? 'white' : 'transparent', color: isAppointment === opt.val ? '#4f46e5' : 'var(--muted-foreground)', boxShadow: isAppointment === opt.val ? '0 1px 4px rgba(0,0,0,0.12)' : 'none', border: 'none', cursor: 'pointer' }}>
                    {opt.icon}{opt.label}
                  </button>
                ))}
              </div>

              {/* Client */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Users size={11}/>{t('visits.client')} *
                </label>
                <ClientSearch orgId={orgId || ''} onSelect={(c) => { setSelectedClient(c); setForm(p => ({ ...p, clientId: c?.id || '' })) }}
                  placeholder={t('visits.selectClient')} locale={language as 'he'|'ru'|'en'} value={selectedClient} />
              </div>

              {/* Service + qty */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Scissors size={11}/>{t('visits.service')} *
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={form.serviceId} onValueChange={handleServiceChange}>
                      <SelectTrigger className="h-10 w-full"><SelectValue placeholder={t('visits.selectService')} /></SelectTrigger>
                      <SelectContent>
                        {services.map((svc: any) => {
                          const name = isHe ? svc.name : (svc.name_ru || svc.name)
                          return <SelectItem key={svc.id} value={svc.id}>{name}{svc.price ? ` — ₪${svc.price}` : ''}</SelectItem>
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <input type="number" min={1} max={999} value={form.quantity}
                    onChange={e => setForm(p => ({ ...p, quantity: Math.max(1, Math.min(999, parseInt(e.target.value)||1)) }))}
                    className="h-10 w-14 rounded-md border border-input bg-background px-2 text-sm text-center font-semibold" />
                </div>
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Calendar size={11}/>{t('visits.date')} *</label>
                  <Input type="date" value={form.date} className="h-10" onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Clock size={11}/>{t('visits.time')} *</label>
                  <Input type="time" value={form.time} className="h-10" onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
                </div>
              </div>

              {/* Visit: duration + price / Meeting: city + address */}
              {!isAppointment ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('visits.duration')}</label>
                    <Select value={form.duration.toString()} onValueChange={v => setForm(p => ({ ...p, duration: parseInt(v) }))}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DURATIONS.map(d => <SelectItem key={d.value} value={d.value.toString()}>{t(d.labelKey)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('visits.price')} *</label>
                    <Input type="number" value={form.price} placeholder="₪" className="h-10" onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><MapPin size={11}/>{isHe ? 'עיר' : 'Город'}</label>
                    <CityAutocomplete value={form.city} onChange={v => setForm(p => ({ ...p, city: v }))} placeholder={isHe ? 'הקלד 2 תווים...' : '2 символа...'} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><MapPin size={11}/>{isHe ? 'כתובת' : 'Адрес'}</label>
                    <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="h-10" dir="rtl" placeholder="כתובת בעברית" />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><FileText size={11}/>{t('visits.notes')}</label>
                <Textarea value={form.notes} rows={2} placeholder={t('visits.notes')} className="resize-none"
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>

              {/* Summary */}
              {canSubmit && (
                <div className="rounded-xl p-3 space-y-2" style={{ background: accentBg, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: accentText }}>
                    <CheckCircle2 size={11}/>{isHe ? 'סיכום' : 'Сводка'}
                  </div>
                  <div className="space-y-1 text-xs" style={{ color: 'var(--foreground)' }}>
                    {selectedClient && <div className="flex items-center gap-1.5"><Users size={10} className="text-muted-foreground"/><span className="font-medium">{selectedClient.first_name} {selectedClient.last_name}</span></div>}
                    {svcName && <div className="flex items-center gap-1.5"><Scissors size={10} className="text-muted-foreground"/><span>{svcName}{!isAppointment && form.price ? ` — ₪${form.price}` : ''}{form.quantity > 1 ? ` ×${form.quantity}` : ''}</span></div>}
                    <div className="flex items-center gap-1.5"><Calendar size={10} className="text-muted-foreground"/><span>{form.date} {isHe ? 'ב' : 'в'} {form.time}</span></div>
                    {!isAppointment && <div className="flex items-center gap-1.5"><Clock size={10} className="text-muted-foreground"/><span>{form.duration} {isHe ? 'דקות' : 'мин'}</span></div>}
                  </div>
                </div>
              )}

              {/* Bottom padding */}
              <div className="h-4" />
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-4 pb-6 pt-3 border-t border-border flex gap-3">
              <button onClick={handleClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-muted-foreground"
                style={{ background: 'var(--muted)', border: 'none', cursor: 'pointer' }}>
                {isHe ? 'ביטול' : 'Отмена'}
              </button>
              <button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}
                className="flex-2 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ flex: 2, background: canSubmit && !isSubmitting ? accent : 'rgba(0,0,0,0.2)', border: 'none', cursor: canSubmit && !isSubmitting ? 'pointer' : 'not-allowed', transition: 'background .2s' }}>
                {isSubmitting ? '...' : (isHe ? 'צור ביקור' : 'Создать визит')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CreateVisitDialog({
  open, onOpenChange,
  preselectedClientId, preselectedDate, preselectedTime,
  onVisitCreated,
}: CreateVisitDialogProps) {
  const { t, language } = useLanguage()
  const { orgId } = useAuth()
  const queryClient = useQueryClient()
  const { data: customServices } = useServices()
  const dir = language === 'he' ? 'rtl' : 'ltr'
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // На мобиле — single-screen bottom sheet
  if (isMobile) {
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

  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAppointment, setIsAppointment] = useState(false) // false = визит, true = встреча
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [formData, setFormData] = useState({
    clientId: preselectedClientId || '',
    serviceId: '',
    service: '',
    date: preselectedDate
      ? (preselectedDate instanceof Date ? preselectedDate.toISOString().split('T')[0] : String(preselectedDate))
      : getDefaultDate(),
    time: preselectedTime || getDefaultTime(),
    duration: 60,
    price: '',
    quantity: 1,
    notes: '',
    city: '',
    address: '',
    meeting_link: '',
  })

  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        clientId: preselectedClientId || prev.clientId,
        date: preselectedDate
          ? (preselectedDate instanceof Date ? preselectedDate.toISOString().split('T')[0] : String(preselectedDate))
          : prev.date,
        time: preselectedTime || prev.time,
      }))
    }
  }, [open, preselectedDate, preselectedTime, preselectedClientId])

  const services = (customServices && customServices.length > 0)
    ? customServices
    : DEFAULT_SERVICES.map(s => ({
        id: s.value, name: t(s.labelKey), name_ru: t(s.labelKey),
        duration_minutes: 60, price: undefined,
      }))

  const handleServiceChange = (serviceId: string) => {
    const svc = services.find((s: any) => s.id === serviceId)
    setFormData(prev => ({
      ...prev,
      serviceId,
      service: serviceId,
      price: svc?.price?.toString() || prev.price,
      duration: svc?.duration_minutes || prev.duration,
    }))
  }

  const canProceed = step === 1
    ? !!formData.clientId && !!formData.serviceId
    : step === 2
    ? !!formData.date && !!formData.time && (isAppointment || !!formData.price)
    : true

  const handleClose = () => {
    onOpenChange(false)
    setStep(1)
    setIsAppointment(false)
    setSelectedClient(null)
    setFormData({
      clientId: '', serviceId: '', service: '',
      date: getDefaultDate(), time: getDefaultTime(),
      duration: 60, price: '', quantity: 1, notes: '', city: '', address: '', meeting_link: '',
    })
  }

  const handleSubmit = async () => {
    if (!orgId) { toast.error(t('clients.noOrgFound')); return }
    setIsSubmitting(true)
    try {
      let notesData = formData.notes
      if (isAppointment && (formData.city || formData.address)) {
        const parts = []
        if (formData.city) parts.push(`${language === 'he' ? 'עיר' : 'Город'}: ${formData.city}`)
        if (formData.address) parts.push(`${language === 'he' ? 'כתובת' : 'Адрес'}: ${formData.address}`)
        if (formData.notes) parts.push(formData.notes)
        notesData = parts.join('\n')
      }
      const response = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: formData.clientId,
          serviceId: formData.serviceId,
          service: formData.service,
          date: formData.date,
          time: formData.time,
          duration: isAppointment ? null : formData.duration,
          price: isAppointment ? '0' : formData.price,
          quantity: formData.quantity,
          notes: notesData,
          event_type: isAppointment ? 'meeting' : 'visit',
          meeting_link: isAppointment ? (formData.meeting_link || null) : null,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create visit')
      toast.success(t('common.success'))
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'visits' })
      if (onVisitCreated && selectedClient) {
        onVisitCreated({
          clientName: `${selectedClient.first_name} ${selectedClient.last_name}`.trim(),
          clientPhone: selectedClient.phone,
          date: formData.date, time: formData.time,
        })
      }
      handleClose()
    } catch (error: any) {
      toast.error(error.message || t('common.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Wizard steps config ─────────────────────────────────────────────────
  const wizardTitle = isAppointment
    ? (language === 'he' ? 'צור פגישה' : 'Создать встречу')
    : (language === 'he' ? 'צור ביקור' : 'Создать визит')

  const wizardSteps = [
    { label: language === 'he' ? 'לקוח ושירות' : 'Клиент и услуга', icon: Users },
    { label: language === 'he' ? 'תאריך ושעה'  : 'Дата и время',    icon: Calendar },
    { label: language === 'he' ? 'פרטים'       : 'Детали',          icon: FileText },
  ]

  const selectedSvc = services.find((s: any) => s.id === formData.serviceId)
  const svcName = selectedSvc
    ? (language === 'he' ? selectedSvc.name : (selectedSvc.name_ru || selectedSvc.name))
    : ''

  return (
    <WizardModal
      open={open}
      onClose={handleClose}
      title={wizardTitle}
      logoLabel="Trinity CRM"
      headerIcon={isAppointment ? <Calendar size={24} /> : <Scissors size={24} />}
      steps={wizardSteps}
      currentStep={step}
      onNext={() => setStep(n => n + 1)}
      onBack={() => setStep(n => n - 1)}
      canProceed={canProceed}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel={isAppointment
        ? (language === 'he' ? 'צור פגישה' : 'Создать встречу')
        : (language === 'he' ? 'צור ביקור' : 'Создать визит')}
      cancelLabel={t('common.cancel')}
      backLabel={language === 'he' ? 'חזור' : 'Назад'}
      nextLabel={language === 'he' ? 'הבא' : 'Далее'}
      dir={dir}
      size="md"
    >

      {/* ── Step 1: Client + Service + Toggle ── */}
      {step === 1 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">

          {/* Visit / Appointment toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex gap-1 p-1 bg-gray-200 rounded-lg">
              <button
                type="button"
                onClick={() => setIsAppointment(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  !isAppointment
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                {language === 'he' ? 'ביקור' : 'Визит'}
              </button>
              <button
                type="button"
                onClick={() => setIsAppointment(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  isAppointment
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                {language === 'he' ? 'פגישה' : 'Встреча'}
              </button>
            </div>
            {isAppointment && (
              <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg">
                {language === 'he' ? 'ייתוסף מיקום' : 'Добавится адрес'}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-gray-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              {t('visits.client')} *
            </Label>
            <ClientSearch
              orgId={orgId || ''}
              onSelect={(client) => {
                setSelectedClient(client)
                setFormData(prev => ({ ...prev, clientId: client?.id || '' }))
              }}
              placeholder={t('visits.selectClient')}
              locale={language as 'he' | 'ru' | 'en'}
              value={selectedClient}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-gray-700 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-indigo-500" />
              {t('visits.service')} *
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select value={formData.serviceId} onValueChange={handleServiceChange}>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder={t('visits.selectService')} />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((svc: any) => {
                      const name = language === 'he' ? svc.name : (svc.name_ru || svc.name)
                      return (
                        <SelectItem key={svc.id} value={svc.id}>
                          {name}{svc.price ? ` — ₪${svc.price}` : ''}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <input
                type="number" min={1} max={999} value={formData.quantity}
                onChange={e => {
                  const val = Math.max(1, Math.min(999, parseInt(e.target.value) || 1))
                  setFormData(p => ({ ...p, quantity: val }))
                }}
                className="h-11 w-16 rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-center font-semibold shrink-0"
              />
            </div>
          </div>

          {selectedClient && (
            <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm">
                {selectedClient.first_name?.[0]}{selectedClient.last_name?.[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-800">
                  {selectedClient.first_name} {selectedClient.last_name}
                </p>
                {selectedClient.phone && (
                  <p className="text-xs text-indigo-500">{selectedClient.phone}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}


      {/* ── Step 2: Date + Time + (Duration/Price OR City/Address) ── */}
      {step === 2 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-gray-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                {t('visits.date')} *
              </Label>
              <Input type="date" value={formData.date} className="h-11"
                onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-gray-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                {t('visits.time')} *
              </Label>
              <Input type="time" value={formData.time} className="h-11"
                onChange={e => setFormData(p => ({ ...p, time: e.target.value }))} />
            </div>
          </div>

          {isAppointment ? (
            /* Meeting mode: city autocomplete + address */
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  {language === 'he' ? 'עיר' : 'Город'}
                </Label>
                <CityAutocomplete
                  value={formData.city}
                  onChange={v => setFormData(p => ({ ...p, city: v }))}
                  placeholder={language === 'he' ? 'הקלד 2 תווים לחיפוש...' : 'Введите 2 символа для поиска...'}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {language === 'he'
                    ? 'הצעות יופיעו לאחר הקלדת 2 תווים'
                    : 'Предложения появятся после 2 символов'}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  {language === 'he' ? 'כתובת' : 'Адрес'}
                </Label>
                <Input
                  value={formData.address}
                  onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                  className="h-11"
                  dir="rtl"
                  placeholder={language === 'he' ? 'הזן כתובת בעברית בלבד' : 'הזן כתובת בעברית בלבד'}
                />
                {/* Hint — always in Hebrew regardless of interface language */}
                <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                  <span>⚠️</span>
                  כתובת בעברית בלבד
                </p>
              </div>
              {/* Meeting link — optional */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-indigo-500" />
                  {language === 'he' ? 'קישור לפגישה' : 'Ссылка на встречу'}
                  <span className="text-xs font-normal text-gray-400">({language === 'he' ? 'אופציונלי' : 'необязательно'})</span>
                </Label>
                <Input
                  value={formData.meeting_link}
                  onChange={e => setFormData(p => ({ ...p, meeting_link: e.target.value }))}
                  className="h-11"
                  placeholder="https://zoom.us/j/... или Google Meet"
                  type="url"
                />
              </div>
            </div>
          ) : (
            /* Visit mode: duration + price */
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">{t('visits.duration')} *</Label>
                <Select value={formData.duration.toString()}
                  onValueChange={v => setFormData(p => ({ ...p, duration: parseInt(v) }))}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map(d => (
                      <SelectItem key={d.value} value={d.value.toString()}>{t(d.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">{t('visits.price')} *</Label>
                <Input type="number" value={formData.price} placeholder="100" className="h-11"
                  onChange={e => setFormData(p => ({ ...p, price: e.target.value }))} />
              </div>
            </div>
          )}
        </div>
      )}


      {/* ── Step 3: Notes + Summary ── */}
      {step === 3 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="space-y-1.5">
            <Label className="font-semibold text-gray-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              {t('visits.notes')}
            </Label>
            <Textarea value={formData.notes} rows={3}
              placeholder={t('visits.notes')}
              className="resize-none max-h-[120px] overflow-y-auto"
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
          </div>

          {/* Summary card */}
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-2.5">
            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isAppointment
                ? (language === 'he' ? 'סיכום פגישה' : 'Сводка встречи')
                : (language === 'he' ? 'סיכום ביקור' : 'Сводка визита')}
            </p>
            <div className="space-y-1.5 text-sm text-indigo-800">
              {selectedClient && (
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="font-medium">
                    {selectedClient.first_name} {selectedClient.last_name}
                  </span>
                </div>
              )}
              {svcName && (
                <div className="flex items-center gap-2">
                  <Scissors className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>
                    {svcName}{!isAppointment && formData.price ? ` — ₪${formData.price}` : ''}
                    {formData.quantity > 1 && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-200 text-indigo-700 rounded text-xs font-bold">
                        ×{formData.quantity}
                      </span>
                    )}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{formData.date} {language === 'he' ? 'ב' : 'в'} {formData.time}</span>
              </div>
              {!isAppointment && (
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{formData.duration} {language === 'he' ? 'דקות' : 'мин'}</span>
                </div>
              )}
              {isAppointment && (formData.city || formData.address) && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span dir="rtl">
                    {formData.city}{formData.address ? `, ${formData.address}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </WizardModal>
  )
}

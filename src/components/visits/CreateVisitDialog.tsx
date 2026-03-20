'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/hooks/useServices'
import { useMeetingMode } from '@/hooks/useMeetingMode'
import { WizardModal } from '@/components/ui/WizardModal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Users, Calendar, FileText, CheckCircle2, Clock, Scissors, MapPin, Hash } from 'lucide-react'
import { ClientSearch } from '@/components/ui/ClientSearch'

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

// ─── Component ────────────────────────────────────────────────────────────────
export function CreateVisitDialog({
  open, onOpenChange,
  preselectedClientId, preselectedDate, preselectedTime,
  onVisitCreated,
}: CreateVisitDialogProps) {
  const { t, language } = useLanguage()
  const { orgId } = useAuth()
  const queryClient = useQueryClient()
  const meetingMode = useMeetingMode()
  const { data: customServices } = useServices()
  const dir = language === 'he' ? 'rtl' : 'ltr'

  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
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
  })

  // Sync preselected values when modal reopens
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

  // ─── canProceed per step ─────────────────────────────────────────────────
  const canProceed = step === 1
    ? !!formData.clientId && !!formData.serviceId
    : step === 2
    ? !!formData.date && !!formData.time && (meetingMode.isMeetingMode || !!formData.price)
    : true

  const handleClose = () => {
    onOpenChange(false)
    setStep(1)
    setSelectedClient(null)
    setFormData({
      clientId: '', serviceId: '', service: '',
      date: getDefaultDate(), time: getDefaultTime(),
      duration: 60, price: '', quantity: 1, notes: '', city: '', address: '',
    })
  }

  const handleSubmit = async () => {
    if (!orgId) { toast.error(t('clients.noOrgFound')); return }
    setIsSubmitting(true)
    try {
      let notesData = formData.notes
      if (meetingMode.isMeetingMode && (formData.city || formData.address)) {
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
          duration: meetingMode.isMeetingMode ? null : formData.duration,
          price: meetingMode.isMeetingMode ? '0' : formData.price,
          quantity: formData.quantity,
          notes: notesData,
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
  const wizardSteps = [
    { label: language === 'he' ? 'לקוח ושירות' : 'Клиент и услуга', icon: Users },
    { label: language === 'he' ? 'תאריך ושעה'  : 'Дата и время',    icon: Calendar },
    { label: language === 'he' ? 'פרטים'       : 'Детали',          icon: FileText },
  ]

  // Selected service name for summary
  const selectedSvc = services.find((s: any) => s.id === formData.serviceId)
  const svcName = selectedSvc
    ? (language === 'he' ? selectedSvc.name : (selectedSvc.name_ru || selectedSvc.name))
    : ''

  return (
    <WizardModal
      open={open}
      onClose={handleClose}
      title={meetingMode.t.createVisit}
      logoLabel="Trinity CRM"
      steps={wizardSteps}
      currentStep={step}
      onNext={() => setStep(n => n + 1)}
      onBack={() => setStep(n => n - 1)}
      canProceed={canProceed}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel={language === 'he' ? 'צור ביקור' : 'Создать визит'}
      cancelLabel={t('common.cancel')}
      backLabel={language === 'he' ? 'חזור' : 'Назад'}
      nextLabel={language === 'he' ? 'הבא' : 'Далее'}
      dir={dir}
      size="md"
    >

      {/* ── Step 1: Client + Service ── */}
      {step === 1 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
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
            <div className="grid grid-cols-[3fr_1fr] gap-2">
              {/* Service — 75% */}
              <Select value={formData.serviceId} onValueChange={handleServiceChange}>
                <SelectTrigger className="h-11">
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
              {/* Quantity — 25% */}
              <input
                type="number"
                min={1}
                max={999}
                value={formData.quantity}
                onChange={e => {
                  const val = Math.max(1, Math.min(999, parseInt(e.target.value) || 1))
                  setFormData(p => ({ ...p, quantity: val }))
                }}
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-center font-semibold"
              />
            </div>
          </div>
          {/* Client preview chip */}
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


      {/* ── Step 2: Date + Time + Duration/Price ── */}
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

          <div className="grid grid-cols-2 gap-4">
            {meetingMode.isMeetingMode ? (
              <>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                    {language === 'he' ? 'עיר' : 'Город'}
                  </Label>
                  <Input value={formData.city} className="h-11"
                    placeholder={language === 'he' ? 'הזן עיר' : 'Введите город'}
                    onChange={e => setFormData(p => ({ ...p, city: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">
                    {language === 'he' ? 'כתובת' : 'Адрес'}
                  </Label>
                  <Input value={formData.address} className="h-11"
                    placeholder={language === 'he' ? 'הזן כתובת' : 'Введите адрес'}
                    onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} />
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
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
              {language === 'he' ? 'סיכום ביקור' : 'Сводка визита'}
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
                    {svcName}{formData.price ? ` — ₪${formData.price}` : ''}
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
              {!meetingMode.isMeetingMode && (
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{formData.duration} {language === 'he' ? 'דקות' : 'мин'}</span>
                </div>
              )}
              {meetingMode.isMeetingMode && formData.city && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{formData.city}{formData.address ? `, ${formData.address}` : ''}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </WizardModal>
  )
}

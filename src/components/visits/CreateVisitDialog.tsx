'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/hooks/useServices'
import { useMeetingMode } from '@/hooks/useMeetingMode'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { ClientSearch } from '@/components/ui/ClientSearch'

// Get default time (rounded to next 30 min)
const getDefaultTime = () => {
  const now = new Date()
  const minutes = now.getMinutes()
  const roundedMinutes = minutes < 30 ? 30 : 0
  const defaultTime = new Date(now)
  if (roundedMinutes === 0) defaultTime.setHours(defaultTime.getHours() + 1)
  defaultTime.setMinutes(roundedMinutes)
  return `${String(defaultTime.getHours()).padStart(2, '0')}:${String(defaultTime.getMinutes()).padStart(2, '0')}`
}

// Get default date (tomorrow)
const getDefaultDate = () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}

interface CreateVisitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedClientId?: string
  preselectedDate?: Date | null
  onVisitCreated?: (visitData: { clientName: string; clientPhone?: string; date: string; time: string }) => void
}

// Default services (fallback if organization has no custom services)
const defaultServices = [
  { value: 'haircut', labelKey: 'service.haircut' },
  { value: 'coloring', labelKey: 'service.coloring' },
  { value: 'smoothing', labelKey: 'service.smoothing' },
  { value: 'facial', labelKey: 'service.facial' },
  { value: 'manicure', labelKey: 'service.manicure' },
  { value: 'pedicure', labelKey: 'service.pedicure' },
  { value: 'haircutColoring', labelKey: 'service.haircutColoring' },
  { value: 'hairTreatment', labelKey: 'service.hairTreatment' },
  { value: 'consultation', labelKey: 'service.consultation' },
  { value: 'meeting', labelKey: 'service.meeting' },
  { value: 'advertising', labelKey: 'service.advertising' },
  { value: 'other', labelKey: 'service.other' },
]

const durations = [
  { value: 30, labelKey: 'duration.30min' },
  { value: 45, labelKey: 'duration.45min' },
  { value: 60, labelKey: 'duration.60min' },
  { value: 90, labelKey: 'duration.90min' },
  { value: 120, labelKey: 'duration.120min' },
]

export function CreateVisitDialog({ open, onOpenChange, preselectedClientId, preselectedDate, onVisitCreated }: CreateVisitDialogProps) {
  const { t, language } = useLanguage()
  const { orgId } = useAuth()
  const queryClient = useQueryClient()
  const meetingMode = useMeetingMode()

  const { data: customServices } = useServices()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [formData, setFormData] = useState({
    clientId: preselectedClientId || '',
    serviceId: '',
    service: '',
    date: preselectedDate ? preselectedDate.toISOString().split('T')[0] : getDefaultDate(),
    time: getDefaultTime(),
    duration: 60,
    price: '',
    notes: '',
    city: '',
    address: '',
  })

  const services = (customServices && customServices.length > 0) 
    ? customServices 
    : defaultServices.map(s => ({ 
        id: s.value, 
        name: t(s.labelKey), 
        name_ru: t(s.labelKey),
        duration_minutes: 60, 
        price: undefined 
      }))

  const handleServiceChange = (serviceId: string) => {
    const selectedService = services.find((s: any) => s.id === serviceId)
    if (selectedService) {
      setFormData({
        ...formData,
        serviceId: serviceId,
        service: selectedService.id,
        price: selectedService.price?.toString() || '',
        duration: selectedService.duration_minutes || 60,
      })
    } else {
      setFormData({ 
        ...formData, 
        serviceId: serviceId,
        service: serviceId 
      })
    }
  }

  const handleSubmit = async () => {
    if (!orgId) {
      toast.error(t('clients.noOrgFound'))
      return
    }

    if (meetingMode.isMeetingMode) {
      if (!formData.clientId || !formData.serviceId || !formData.date || !formData.time) {
        toast.error(t('common.required'))
        return
      }
    } else {
      if (!formData.clientId || !formData.serviceId || !formData.date || !formData.time || !formData.price) {
        toast.error(t('common.required'))
        return
      }
    }

    setIsSubmitting(true)

    try {
      let notesData = formData.notes
      if (meetingMode.isMeetingMode && (formData.city || formData.address)) {
        const meetingInfo = []
        if (formData.city) meetingInfo.push(`${language === 'he' ? 'עיר' : 'Город'}: ${formData.city}`)
        if (formData.address) meetingInfo.push(`${language === 'he' ? 'כתובת' : 'Адрес'}: ${formData.address}`)
        if (formData.notes) meetingInfo.push(formData.notes)
        notesData = meetingInfo.join('\n')
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
          notes: notesData,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create visit')

      toast.success(t('common.success'))
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'visits' })
      
      if (onVisitCreated && selectedClient) {
        onVisitCreated({
          clientName: `${selectedClient.first_name} ${selectedClient.last_name}`.trim(),
          clientPhone: selectedClient.phone,
          date: formData.date,
          time: formData.time,
        })
      }
      
      onOpenChange(false)
      setFormData({
        clientId: '',
        serviceId: '',
        service: '',
        date: '',
        time: '',
        duration: 60,
        price: '',
        notes: '',
        city: '',
        address: '',
      })
    } catch (error: any) {
      toast.error(error.message || t('common.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={meetingMode.t.createVisit}
      subtitle={t('visits.subtitle')}
      width="520px"
      footer={
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 whitespace-nowrap disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? t('visits.creating') : t('common.add')}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Client selection */}
        <div className="space-y-2">
          <Label htmlFor="client">{t('visits.client')} *</Label>
          <ClientSearch
            orgId={orgId || ''}
            onSelect={(client) => {
              setSelectedClient(client)
              setFormData({ ...formData, clientId: client?.id || '' })
            }}
            placeholder={t('visits.selectClient')}
            locale={language as 'he' | 'ru' | 'en'}
            value={selectedClient}
          />
        </div>

        {/* Service selection */}
        <div className="space-y-2">
          <Label htmlFor="service">{t('visits.service')} *</Label>
          <Select value={formData.serviceId} onValueChange={handleServiceChange}>
            <SelectTrigger>
              <SelectValue placeholder={t('visits.selectService')} />
            </SelectTrigger>
            <SelectContent>
              {services.map((service: any) => {
                const serviceName = language === 'he' ? service.name : (service.name_ru || service.name)
                return (
                  <SelectItem key={service.id} value={service.id}>
                    {serviceName}
                    {service.price && ` - ₪${service.price}`}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">{t('visits.date')} *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">{t('visits.time')} *</Label>
            <Input
              id="time"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            />
          </div>
        </div>

        {/* Duration/Price or City/Address */}
        <div className="grid grid-cols-2 gap-4">
          {meetingMode.isMeetingMode ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="city">{language === 'he' ? 'עיר' : 'Город'}</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder={language === 'he' ? 'הזן עיר' : 'Введите город'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{language === 'he' ? 'כתובת' : 'Адрес'}</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={language === 'he' ? 'הזן כתובת' : 'Введите адрес'}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="duration">{t('visits.duration')} *</Label>
                <Select
                  value={formData.duration.toString()}
                  onValueChange={(value) => setFormData({ ...formData, duration: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durations.map((duration) => (
                      <SelectItem key={duration.value} value={duration.value.toString()}>
                        {t(duration.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">{t('visits.price')} *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="100.00"
                />
              </div>
            </>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">{t('visits.notes')}</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder={t('visits.notes')}
            rows={3}
          />
        </div>
      </div>
    </Modal>
  )
}

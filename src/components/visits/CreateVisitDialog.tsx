'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/hooks/useServices'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
import { ArrowRight, ArrowLeft } from 'lucide-react'
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

export function CreateVisitDialog({ open, onOpenChange, preselectedClientId, preselectedDate }: CreateVisitDialogProps) {
  const { t, language } = useLanguage()
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const queryClient = useQueryClient()

  // Load custom services from database
  const { data: customServices } = useServices()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [formData, setFormData] = useState({
    clientId: preselectedClientId || '',
    serviceId: '',
    service: '', // Legacy field for backward compatibility
    date: preselectedDate ? preselectedDate.toISOString().split('T')[0] : getDefaultDate(),
    time: getDefaultTime(),
    duration: 60,
    price: '',
    notes: '',
  })

  // Use custom services if available, otherwise fallback to default
  const services = (customServices && customServices.length > 0) 
    ? customServices 
    : defaultServices.map(s => ({ 
        id: s.value, 
        name: t(s.labelKey), 
        name_ru: t(s.labelKey),
        duration_minutes: 60, 
        price: undefined 
      }))

  // Handle service selection (auto-fill price and duration if available)
  const handleServiceChange = (serviceId: string) => {
    const selectedService = services.find((s: any) => s.id === serviceId)
    if (selectedService) {
      setFormData({
        ...formData,
        serviceId: serviceId,
        service: selectedService.id, // Legacy compatibility
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) {
      toast.error(t('clients.noOrgFound'))
      return
    }

    if (!formData.clientId || !formData.serviceId || !formData.date || !formData.time || !formData.price) {
      toast.error(t('common.required'))
      return
    }

    setIsSubmitting(true)

    try {
      // Call API route instead of direct insert
      const response = await fetch('/api/visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: formData.clientId,
          serviceId: formData.serviceId, // New field
          service: formData.service, // Legacy field for compatibility
          date: formData.date,
          time: formData.time,
          duration: formData.duration,
          price: formData.price,
          notes: formData.notes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create visit')
      }

      toast.success(t('common.success'))
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['visits'] })
      
      onOpenChange(false)
      
      // Reset form
      setFormData({
        clientId: '',
        serviceId: '',
        service: '',
        date: '',
        time: '',
        duration: 60,
        price: '',
        notes: '',
      })
    } catch (error: any) {
      console.error('Error creating visit:', error)
      toast.error(error.message || t('common.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] md:max-h-[90vh] h-full md:h-auto overflow-y-auto bg-white dark:bg-gray-800 p-0 md:p-6">
        <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 p-4 md:p-0 border-b md:border-b-0 border-gray-200 dark:border-gray-700">
          <DialogHeader className="relative">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 h-11 w-11 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label={t('common.back')}
            >
              {language === 'he' ? (
                <ArrowRight className="h-6 w-6" />
              ) : (
                <ArrowLeft className="h-6 w-6" />
              )}
            </Button>
            <DialogTitle className="text-xl md:text-2xl text-gray-900 dark:text-gray-100 pr-12">{t('visits.createNew')}</DialogTitle>
            <DialogDescription className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              {t('visits.subtitle')}
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col h-full md:h-auto">
          <div className="flex-1 overflow-y-auto p-4 md:p-0 space-y-4">
          {/* Client selection */}
          <div className="space-y-2">
            <Label htmlFor="client" className="text-gray-900 dark:text-gray-100">
              {t('visits.client')} *
            </Label>
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
            <Label htmlFor="service" className="text-gray-900 dark:text-gray-100">
              {t('visits.service')} *
            </Label>
            <Select
              value={formData.serviceId}
              onValueChange={handleServiceChange}
            >
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                <SelectValue placeholder={t('visits.selectService')} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                {services.map((service: any) => {
                  const serviceName = language === 'he' ? service.name : (service.name_ru || service.name)
                  return (
                    <SelectItem 
                      key={service.id} 
                      value={service.id}
                      className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      {serviceName}
                      {service.price && ` - ₪${service.price}`}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-gray-900 dark:text-gray-100">
                {t('visits.date')} *
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="text-gray-900 dark:text-gray-100">
                {t('visits.time')} *
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Duration and Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-gray-900 dark:text-gray-100">
                {t('visits.duration')} *
              </Label>
              <Select
                value={formData.duration.toString()}
                onValueChange={(value) => setFormData({ ...formData, duration: parseInt(value) })}
              >
                <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                  {durations.map((duration) => (
                    <SelectItem 
                      key={duration.value} 
                      value={duration.value.toString()}
                      className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      {t(duration.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="text-gray-900 dark:text-gray-100">
                {t('visits.price')} *
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="100.00"
                className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-900 dark:text-gray-100">
              {t('visits.notes')}
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('visits.notes')}
              rows={3}
              className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
            />
          </div>

          </div>

          {/* Actions - Fixed at bottom on mobile */}
          <div className="sticky md:static bottom-0 left-0 right-0 bg-white dark:bg-gray-800 p-4 md:p-0 border-t border-gray-200 dark:border-gray-700 mt-4 md:pt-4 flex flex-col md:flex-row md:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full md:w-auto h-11 md:h-10 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto h-11 md:h-10 bg-theme-primary text-white hover:opacity-90"
            >
              {isSubmitting ? t('visits.creating') : t('common.add')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

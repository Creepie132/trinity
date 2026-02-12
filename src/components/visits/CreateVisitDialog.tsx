'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useQuery } from '@tanstack/react-query'
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

interface CreateVisitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedClientId?: string
}

const services = [
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

export function CreateVisitDialog({ open, onOpenChange, preselectedClientId }: CreateVisitDialogProps) {
  const { t } = useLanguage()
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    clientId: preselectedClientId || '',
    service: '',
    date: '',
    time: '',
    duration: 60,
    price: '',
    notes: '',
  })

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', orgId],
    queryFn: async () => {
      if (!orgId) return []
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone')
        .eq('org_id', orgId)
        .order('first_name')
      
      if (error) throw error
      return data
    },
    enabled: !!orgId && open,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) {
      toast.error(t('clients.noOrgFound'))
      return
    }

    if (!formData.clientId || !formData.service || !formData.date || !formData.time || !formData.price) {
      toast.error(t('common.required'))
      return
    }

    setIsSubmitting(true)

    try {
      // Combine date and time
      const scheduledAt = new Date(`${formData.date}T${formData.time}`)

      const { error } = await supabase
        .from('visits')
        .insert({
          client_id: formData.clientId,
          org_id: orgId,
          service_type: formData.service,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: formData.duration,
          price: parseFloat(formData.price),
          notes: formData.notes || null,
          status: 'scheduled',
        })

      if (error) throw error

      toast.success(t('common.success'))
      onOpenChange(false)
      router.refresh()
      
      // Reset form
      setFormData({
        clientId: '',
        service: '',
        date: '',
        time: '',
        duration: 60,
        price: '',
        notes: '',
      })
    } catch (error) {
      console.error('Error creating visit:', error)
      toast.error(t('common.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">{t('visits.createNew')}</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            {t('visits.subtitle')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client selection */}
          <div className="space-y-2">
            <Label htmlFor="client" className="text-gray-900 dark:text-gray-100">
              {t('visits.client')} *
            </Label>
            <Select
              value={formData.clientId}
              onValueChange={(value) => setFormData({ ...formData, clientId: value })}
            >
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                <SelectValue placeholder={t('visits.selectClient')} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                {clients.map((client) => (
                  <SelectItem 
                    key={client.id} 
                    value={client.id}
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    {client.first_name} {client.last_name} - {client.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service selection */}
          <div className="space-y-2">
            <Label htmlFor="service" className="text-gray-900 dark:text-gray-100">
              {t('visits.service')} *
            </Label>
            <Select
              value={formData.service}
              onValueChange={(value) => setFormData({ ...formData, service: value })}
            >
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                <SelectValue placeholder={t('visits.selectService')} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                {services.map((service) => (
                  <SelectItem 
                    key={service.value} 
                    value={service.value}
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    {t(service.labelKey)}
                  </SelectItem>
                ))}
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

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-theme-primary text-white hover:opacity-90"
            >
              {isSubmitting ? t('visits.creating') : t('common.add')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

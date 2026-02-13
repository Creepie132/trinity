'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateService, useUpdateService } from '@/hooks/useServices'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Service } from '@/types/services'

interface CreateServiceDialogProps {
  open: boolean
  onClose: () => void
  service?: Service | null
}

const PRESET_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
]

export function CreateServiceDialog({ open, onClose, service }: CreateServiceDialogProps) {
  const { t } = useLanguage()
  const createService = useCreateService()
  const updateService = useUpdateService()

  const [name, setName] = useState('')
  const [nameRu, setNameRu] = useState('')
  const [price, setPrice] = useState<string>('')
  const [duration, setDuration] = useState<string>('60')
  const [color, setColor] = useState('#3B82F6')

  useEffect(() => {
    if (service && open) {
      setName(service.name)
      setNameRu(service.name_ru || '')
      setPrice(service.price?.toString() || '')
      setDuration(service.duration_minutes.toString())
      setColor(service.color)
    } else if (open) {
      setName('')
      setNameRu('')
      setPrice('')
      setDuration('60')
      setColor('#3B82F6')
    }
  }, [service, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name) {
      toast.error(t('common.fillRequired'))
      return
    }

    try {
      if (service) {
        await updateService.mutateAsync({
          id: service.id,
          data: {
            name,
            name_ru: nameRu || undefined,
            price: price ? parseFloat(price) : undefined,
            duration_minutes: parseInt(duration) || 60,
            color,
          },
        })
      } else {
        await createService.mutateAsync({
          name,
          name_ru: nameRu || undefined,
          price: price ? parseFloat(price) : undefined,
          duration_minutes: parseInt(duration) || 60,
          color,
        })
      }

      toast.success(t('common.success'))
      onClose()
    } catch (error: any) {
      toast.error(error.message || t('common.error'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {service ? t('services.edit') : t('services.newService')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name (Hebrew) */}
          <div>
            <Label htmlFor="name">
              {t('services.name')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('services.name')}
              required
              className="bg-white dark:bg-gray-800"
            />
          </div>

          {/* Name (Russian) */}
          <div>
            <Label htmlFor="nameRu">Название (русский)</Label>
            <Input
              id="nameRu"
              value={nameRu}
              onChange={(e) => setNameRu(e.target.value)}
              placeholder="Название на русском"
              className="bg-white dark:bg-gray-800"
            />
          </div>

          {/* Price */}
          <div>
            <Label htmlFor="price">{t('services.price')}</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="bg-white dark:bg-gray-800"
            />
          </div>

          {/* Duration */}
          <div>
            <Label htmlFor="duration">{t('services.duration')}</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="60"
              className="bg-white dark:bg-gray-800"
            />
          </div>

          {/* Color Picker */}
          <div>
            <Label>{t('services.color')}</Label>
            <div className="grid grid-cols-8 gap-2 mt-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className={`w-10 h-10 rounded border-2 transition-all ${
                    color === presetColor
                      ? 'border-gray-900 dark:border-white scale-110'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ backgroundColor: presetColor }}
                />
              ))}
            </div>
            <div className="mt-2">
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-full cursor-pointer"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createService.isPending || updateService.isPending}
            >
              {createService.isPending || updateService.isPending
                ? t('common.saving')
                : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

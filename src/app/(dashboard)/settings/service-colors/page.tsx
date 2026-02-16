'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#10b981', // green
  '#ef4444', // red
  '#f97316', // orange
  '#6b7280', // gray
  '#eab308', // yellow
  '#14b8a6', // teal
  '#8b5cf6', // violet
]

interface Service {
  id: string
  name: string
  name_ru: string | null
  color: string
}

export default function ServiceColorsPage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()

  const [services, setServices] = useState<Service[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (orgId) {
      loadServices()
    }
  }, [orgId])

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, name_ru, color')
        .eq('org_id', orgId)
        .order('name')

      if (error) throw error

      setServices(data || [])
    } catch (error) {
      console.error('Error loading services:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleColorChange = (serviceId: string, color: string) => {
    setServices(prev => 
      prev.map(service => 
        service.id === serviceId ? { ...service, color } : service
      )
    )
  }

  const handleSave = async () => {
    if (!orgId) return

    setIsSaving(true)
    try {
      // Update each service's color
      const updates = services.map(service => 
        supabase
          .from('services')
          .update({ color: service.color })
          .eq('id', service.id)
      )

      const results = await Promise.all(updates)
      
      const hasError = results.some(result => result.error)
      if (hasError) {
        throw new Error('Failed to update some services')
      }

      toast.success(t('common.success'))
    } catch (error) {
      console.error('Error saving service colors:', error)
      toast.error(t('common.error'))
    } finally {
      setIsSaving(false)
    }
  }

  const getServiceLabel = (service: Service): string => {
    if (language === 'ru' && service.name_ru) {
      return service.name_ru
    }
    return service.name
  }

  if (isLoading) {
    return <div className="text-center py-12">{t('common.loading')}</div>
  }

  if (services.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push('/settings')}
            className="mb-4"
          >
            {language === 'he' ? <ChevronRight className="w-4 h-4 ml-2" /> : <ChevronLeft className="w-4 h-4 mr-2" />}
            {t('display.back')}
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('settings.serviceColors')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('settings.serviceColors.desc')}</p>
        </div>

        {/* Empty State */}
        <Card className="p-12 text-center bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="text-6xl mb-4">🎨</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t('services.emptyState.title')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('services.emptyState.desc')}
          </p>
          <Button
            onClick={() => router.push('/settings/services')}
            className="bg-theme-primary text-white hover:opacity-90"
          >
            {t('services.addNew')}
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={() => router.push('/settings')}
          className="mb-4"
        >
          {language === 'he' ? <ChevronRight className="w-4 h-4 ml-2" /> : <ChevronLeft className="w-4 h-4 mr-2" />}
          {t('display.back')}
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('settings.serviceColors')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{t('settings.serviceColors.desc')}</p>
      </div>

      {/* Service Colors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <Card key={service.id} className="p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: service.color }}
                />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {getServiceLabel(service)}
                </span>
              </div>

              {/* Color Picker */}
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(service.id, color)}
                    className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${
                      service.color === color
                        ? 'border-gray-900 dark:border-white'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-theme-primary text-white hover:opacity-90"
        >
          {isSaving ? t('common.saving') : t('settings.serviceColors.save')}
        </Button>
      </div>
    </div>
  )
}

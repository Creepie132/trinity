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

const DEFAULT_SERVICE_COLORS: Record<string, string> = {
  haircut: '#3b82f6',
  coloring: '#a855f7',
  smoothing: '#ec4899',
  facial: '#10b981',
  manicure: '#ef4444',
  pedicure: '#f97316',
  meeting: '#6b7280',
  advertising: '#eab308',
  haircutColoring: '#14b8a6',
  hairTreatment: '#8b5cf6',
  consultation: '#3b82f6',
  other: '#6b7280',
}

const SERVICES = [
  'haircut',
  'coloring',
  'smoothing',
  'facial',
  'manicure',
  'pedicure',
  'haircutColoring',
  'hairTreatment',
  'consultation',
  'meeting',
  'advertising',
  'other',
]

export default function ServiceColorsPage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()

  const [serviceColors, setServiceColors] = useState<Record<string, string>>(DEFAULT_SERVICE_COLORS)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (orgId) {
      loadServiceColors()
    }
  }, [orgId])

  const loadServiceColors = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single()

      if (error) throw error

      if (data?.settings?.serviceColors) {
        setServiceColors({ ...DEFAULT_SERVICE_COLORS, ...data.settings.serviceColors })
      }
    } catch (error) {
      console.error('Error loading service colors:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleColorChange = (service: string, color: string) => {
    setServiceColors(prev => ({ ...prev, [service]: color }))
  }

  const handleSave = async () => {
    if (!orgId) return

    setIsSaving(true)
    try {
      // Load current settings
      const { data: org, error: fetchError } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single()

      if (fetchError) throw fetchError

      // Merge with existing settings
      const currentSettings = org?.settings || {}
      const updatedSettings = {
        ...currentSettings,
        serviceColors,
      }

      // Update settings
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ settings: updatedSettings })
        .eq('id', orgId)

      if (updateError) throw updateError

      toast.success(t('common.success'))
    } catch (error) {
      console.error('Error saving service colors:', error)
      toast.error(t('common.error'))
    } finally {
      setIsSaving(false)
    }
  }

  const getServiceLabel = (service: string): string => {
    return t(`service.${service}`)
  }

  if (isLoading) {
    return <div className="text-center py-12">{t('common.loading')}</div>
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
        {SERVICES.map((service) => (
          <Card key={service} className="p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: serviceColors[service] }}
                />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {getServiceLabel(service)}
                </span>
              </div>

              {/* Color Picker */}
              <div className="flex gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(service, color)}
                    className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${
                      serviceColors[service] === color
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

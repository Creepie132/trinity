'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type WidgetId = 'visits_month' | 'total_clients' | 'inactive_clients' | 'revenue_month' | 'today_bookings' | 'low_stock' | 'pending_bookings' | 'avg_visit'

const DEFAULT_WIDGETS: WidgetId[] = ['visits_month', 'total_clients', 'inactive_clients', 'revenue_month']

export default function DashboardSettingsPage() {
  const { t } = useLanguage()
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()

  const [widgets, setWidgets] = useState<WidgetId[]>(DEFAULT_WIDGETS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const allWidgets: { id: WidgetId; label: string }[] = [
    { id: 'visits_month', label: t('dashboard.widgets.visits_month') },
    { id: 'total_clients', label: t('dashboard.widgets.total_clients') },
    { id: 'inactive_clients', label: t('dashboard.widgets.inactive_clients') },
    { id: 'revenue_month', label: t('dashboard.widgets.revenue_month') },
    { id: 'today_bookings', label: t('dashboard.widgets.today_bookings') },
    { id: 'low_stock', label: t('dashboard.widgets.low_stock') },
    { id: 'pending_bookings', label: t('dashboard.widgets.pending_bookings') },
    { id: 'avg_visit', label: t('dashboard.widgets.avg_visit') },
  ]

  useEffect(() => {
    loadSettings()
  }, [orgId])

  const loadSettings = async () => {
    if (!orgId) return

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single()

      if (error) throw error

      if (data?.settings?.dashboard_widgets) {
        setWidgets(data.settings.dashboard_widgets)
      }
    } catch (error) {
      console.error('Error loading dashboard settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!orgId) return

    setSaving(true)
    try {
      const { data: currentData } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single()

      const updatedSettings = {
        ...(currentData?.settings || {}),
        dashboard_widgets: widgets
      }

      const { error } = await supabase
        .from('organizations')
        .update({ settings: updatedSettings })
        .eq('id', orgId)

      if (error) throw error

      toast.success(t('common.saved'))
    } catch (error) {
      console.error('Error saving dashboard settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const toggleWidget = (widgetId: WidgetId) => {
    if (widgets.includes(widgetId)) {
      setWidgets(widgets.filter(w => w !== widgetId))
    } else {
      if (widgets.length >= 8) {
        toast.error(t('dashboard.customize.maxDesktop'))
        return
      }
      setWidgets([...widgets, widgetId])
    }
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const newWidgets = [...widgets]
    const temp = newWidgets[index]
    newWidgets[index] = newWidgets[index - 1]
    newWidgets[index - 1] = temp
    setWidgets(newWidgets)
  }

  const moveDown = (index: number) => {
    if (index === widgets.length - 1) return
    const newWidgets = [...widgets]
    const temp = newWidgets[index]
    newWidgets[index] = newWidgets[index + 1]
    newWidgets[index + 1] = temp
    setWidgets(newWidgets)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('dashboard.customize.title')}
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
            {t('dashboard.customize.subtitle')}
          </p>
        </div>
      </div>

      {/* Selected Widgets */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('dashboard.customize.available')} ({widgets.length}/{window.innerWidth < 768 ? '4' : '8'})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {widgets.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              {t('common.noResults')}
            </p>
          ) : (
            widgets.map((widgetId, index) => {
              const widget = allWidgets.find(w => w.id === widgetId)
              if (!widget) return null

              return (
                <div
                  key={widgetId}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-medium">{widget.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="h-8 w-8 p-0"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveDown(index)}
                      disabled={index === widgets.length - 1}
                      className="h-8 w-8 p-0"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Switch
                      checked={true}
                      onCheckedChange={() => toggleWidget(widgetId)}
                    />
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Available Widgets */}
      <Card>
        <CardHeader>
          <CardTitle>Все виджеты / כל הווידג'טים</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {allWidgets
            .filter(widget => !widgets.includes(widget.id))
            .map(widget => (
              <div
                key={widget.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <span className="font-medium">{widget.label}</span>
                <Switch
                  checked={false}
                  onCheckedChange={() => toggleWidget(widget.id)}
                />
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pb-6">
        <Button
          onClick={saveSettings}
          disabled={saving}
          size="lg"
          className="w-full md:w-auto md:min-w-[200px]"
        >
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'

export default function DashboardSettingsPage() {
  const router = useRouter()
  const { t, dir } = useLanguage()
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()

  const [showCharts, setShowCharts] = useState({
    revenue: true,
    visits: true,
    topClients: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!orgId) return

      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('settings')
          .eq('id', orgId)
          .single()

        if (error) throw error

        if (data?.settings?.dashboard_charts) {
          setShowCharts(data.settings.dashboard_charts)
        }
      } catch (error) {
        console.error('Error loading dashboard settings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [orgId, supabase])

  // Save settings
  const handleSave = async () => {
    if (!orgId) return

    setSaving(true)
    try {
      // Get current settings
      const { data: currentData } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single()

      const currentSettings = currentData?.settings || {}

      // Update with new chart settings
      const { error } = await supabase
        .from('organizations')
        .update({
          settings: {
            ...currentSettings,
            dashboard_charts: showCharts
          }
        })
        .eq('id', orgId)

      if (error) throw error

      toast.success(t('settings.saved'))
    } catch (error) {
      console.error('Error saving dashboard settings:', error)
      toast.error(t('settings.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (chart: 'revenue' | 'visits' | 'topClients') => {
    setShowCharts(prev => ({
      ...prev,
      [chart]: !prev[chart]
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/settings')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowRight className={`w-6 h-6 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('dashboard.settings')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('dashboard.settingsSubtitle')}
          </p>
        </div>
      </div>

      {/* Charts Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('dashboard.chartsOnDashboard')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('dashboard.chartsDescription')}
          </p>
        </div>

        <div className="space-y-4">
          {/* Revenue Chart Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                📊 {t('stats.revenueByMonth')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('dashboard.revenueChartDesc')}
              </p>
            </div>
            <Switch
              checked={showCharts.revenue}
              onCheckedChange={() => handleToggle('revenue')}
            />
          </div>

          {/* Visits Chart Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                📈 {t('stats.visitsByMonth')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('dashboard.visitsChartDesc')}
              </p>
            </div>
            <Switch
              checked={showCharts.visits}
              onCheckedChange={() => handleToggle('visits')}
            />
          </div>

          {/* Top Clients Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                👥 {t('stats.topClients')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('dashboard.topClientsDesc')}
              </p>
            </div>
            <Switch
              checked={showCharts.topClients}
              onCheckedChange={() => handleToggle('topClients')}
            />
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          💡 {t('dashboard.chartsInfo')}
        </p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="px-8"
        >
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </div>
  )
}

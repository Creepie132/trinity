'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useOrganization } from '@/hooks/useOrganization'
import { useDemoMode } from '@/hooks/useDemoMode'

export default function DashboardSettingsPage() {
  const router = useRouter()
  const { t, dir } = useLanguage()
  const { orgId } = useAuth()
  const queryClient = useQueryClient()
  const { data: organization } = useOrganization()
  const { isDemo } = useDemoMode()

  const [showCharts, setShowCharts] = useState({
    revenue: true,
    visits: true,
    topClients: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Check if statistics module is enabled
  const enabledModules = organization?.features?.modules || {}
  const statisticsEnabled = enabledModules.statistics !== false && !isDemo

  // Load settings function (extracted for reuse)
  const loadSettings = async () => {
    if (!orgId) return

    try {
      const response = await fetch('/api/dashboard/settings')
      if (!response.ok) throw new Error('Failed to load settings')
      
      const data = await response.json()
      
      if (data.dashboard_charts) {
        setShowCharts({
          revenue: data.dashboard_charts.revenue !== false,
          visits: data.dashboard_charts.visits !== false,
          topClients: data.dashboard_charts.topClients !== false,
        })
      }
    } catch (error) {
      console.error('Error loading dashboard settings:', error)
    }
  }

  // Load settings on mount
  useEffect(() => {
    const load = async () => {
      await loadSettings()
      setLoading(false)
    }
    load()
  }, [orgId])

  // Save settings
  const handleSave = async () => {
    if (!orgId) return

    setSaving(true)
    const previousState = { ...showCharts } // Backup for rollback
    
    try {
      const response = await fetch('/api/dashboard/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dashboard_charts: showCharts
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error('Save failed')
      }

      // Reload settings from API to ensure perfect sync with DB
      await loadSettings()

      // Invalidate dashboard settings cache to trigger dashboard re-render
      await queryClient.invalidateQueries({ queryKey: ['dashboard-settings'] })

      toast.success(t('settings.saved'))
    } catch (error: any) {
      console.error('Error saving dashboard settings:', error)
      // Rollback to previous state on error
      setShowCharts(previousState)
      toast.error(t('settings.saveFailed') + ': ' + (error.message || ''))
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

      {/* Charts Settings - Only show if statistics module is enabled */}
      {statisticsEnabled && (
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
        
        {/* Info Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            💡 {t('dashboard.chartsInfo')}
          </p>
        </div>
      </div>
      )}

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

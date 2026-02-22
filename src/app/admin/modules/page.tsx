'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { MODULES } from '@/lib/modules-config'
import {
  Users,
  Calendar,
  BookOpen,
  Package,
  CreditCard,
  MessageSquare,
  Repeat,
  BarChart3,
  FileText,
  Bell,
  Award,
  Cake,
} from 'lucide-react'

const MODULE_ICONS: Record<string, any> = {
  clients: Users,
  visits: Calendar,
  booking: BookOpen,
  inventory: Package,
  payments: CreditCard,
  sms: MessageSquare,
  subscriptions: Repeat,
  statistics: BarChart3,
  reports: FileText,
  telegram: Bell,
  loyalty: Award,
  birthday: Cake,
}

export default function ModulesPage() {
  const { language } = useLanguage()
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [modules, setModules] = useState<Record<string, boolean>>({})
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, features')
        .order('name')

      if (error) throw error

      setOrganizations(data || [])
      if (data && data.length > 0 && !selectedOrg) {
        setSelectedOrg(data[0].id)
        setModules(data[0].features?.modules || getDefaultModules())
      }
    } catch (error) {
      console.error('Error loading organizations:', error)
      toast.error('שגיאה בטעינת ארגונים')
    } finally {
      setLoading(false)
    }
  }

  const getDefaultModules = () => {
    return {
      clients: true,
      visits: true,
      booking: true,
      inventory: false,
      payments: true,
      sms: false,
      subscriptions: false,
      statistics: true,
      reports: true,
      telegram: false,
      loyalty: false,
      birthday: false,
    }
  }

  const handleOrgChange = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId)
    if (org) {
      setSelectedOrg(orgId)
      setModules(org.features?.modules || getDefaultModules())
    }
  }

  const handleToggleModule = async (moduleKey: string, enabled: boolean) => {
    if (!selectedOrg) return

    const newModules = { ...modules, [moduleKey]: enabled }
    setModules(newModules)

    try {
      const org = organizations.find((o) => o.id === selectedOrg)
      const currentFeatures = org?.features || {}
      const updatedFeatures = {
        ...currentFeatures,
        modules: newModules,
      }

      const res = await fetch('/api/admin/organizations/features', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          org_id: selectedOrg,
          features: updatedFeatures,
        }),
      })

      if (!res.ok) throw new Error('Failed to update')

      toast.success(language === 'he' ? 'נשמר' : 'Сохранено')

      // Update local state
      setOrganizations((prev) =>
        prev.map((o) =>
          o.id === selectedOrg
            ? {
                ...o,
                features: updatedFeatures,
              }
            : o
        )
      )
    } catch (error) {
      console.error('Error updating module:', error)
      toast.error(language === 'he' ? 'שגיאה' : 'Ошибка')
      // Revert
      setModules({ ...modules, [moduleKey]: !enabled })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">טוען...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {language === 'he' ? 'ניהול מודולים' : 'Управление модулями'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {language === 'he' 
            ? 'הפעלה/כיבוי של מודולים עבור כל ארגון' 
            : 'Включение/выключение модулей для каждой организации'}
        </p>
      </div>

      {/* Organization Selector */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'he' ? 'בחר ארגון' : 'Выберите организацию'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedOrg || ''}
            onChange={(e) => handleOrgChange(e.target.value)}
            className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((module) => {
          const Icon = MODULE_ICONS[module.key]
          const isEnabled = module.alwaysVisible 
            ? (modules[module.key] !== false) // Always visible unless explicitly disabled
            : (modules[module.key] ?? false)

          const moduleName = language === 'he' ? module.name_he : module.name_ru
          const moduleDesc = language === 'he' ? module.desc_he : module.desc_ru

          return (
            <Card 
              key={module.key} 
              className={`${isEnabled ? 'border-purple-500 dark:border-purple-600' : ''} ${
                module.alwaysVisible ? 'opacity-90' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={`p-2 rounded-lg ${
                        isEnabled
                          ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300'
                          : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold dark:text-white">{moduleName}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {moduleDesc}
                      </p>
                      {module.alwaysVisible && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                          {language === 'he' ? '(תמיד זמין)' : '(Всегда доступен)'}
                        </p>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) =>
                      handleToggleModule(module.key, checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

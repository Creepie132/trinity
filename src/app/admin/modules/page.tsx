'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'
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

interface Module {
  key: string
  label: string
  description: string
  icon: any
}

const MODULES: Module[] = [
  {
    key: 'clients',
    label: 'לקוחות',
    description: 'ניהול לקוחות',
    icon: Users,
  },
  {
    key: 'visits',
    label: 'ביקורים',
    description: 'ניהול ביקורים ותורים',
    icon: Calendar,
  },
  {
    key: 'booking',
    label: 'הזמנות אונליין',
    description: 'מערכת הזמנות אונליין',
    icon: BookOpen,
  },
  {
    key: 'inventory',
    label: 'מלאי',
    description: 'ניהול מלאי ומוצרים',
    icon: Package,
  },
  {
    key: 'payments',
    label: 'תשלומים',
    description: 'מערכות תשלום',
    icon: CreditCard,
  },
  {
    key: 'sms',
    label: 'קמפיינים SMS',
    description: 'שליחת הודעות SMS',
    icon: MessageSquare,
  },
  {
    key: 'subscriptions',
    label: 'מנויים',
    description: 'ניהול מנויים חוזרים',
    icon: Repeat,
  },
  {
    key: 'statistics',
    label: 'סטטיסטיקה',
    description: 'דשבורד וגרפים',
    icon: BarChart3,
  },
  {
    key: 'reports',
    label: 'דוחות',
    description: 'דוחות עסקיים',
    icon: FileText,
  },
  {
    key: 'telegram',
    label: 'התראות טלגרם',
    description: 'התראות ב-Telegram',
    icon: Bell,
  },
  {
    key: 'loyalty',
    label: 'נקודות נאמנות',
    description: 'תוכנית נאמנות',
    icon: Award,
  },
  {
    key: 'birthday',
    label: 'הודעות יום הולדת',
    description: 'ברכות אוטומטיות',
    icon: Cake,
  },
]

export default function ModulesPage() {
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

      const { error } = await supabase
        .from('organizations')
        .update({
          features: {
            ...currentFeatures,
            modules: newModules,
          },
        })
        .eq('id', selectedOrg)

      if (error) throw error

      toast.success('מודול עודכן בהצלחה')

      // Update local state
      setOrganizations((prev) =>
        prev.map((o) =>
          o.id === selectedOrg
            ? {
                ...o,
                features: {
                  ...currentFeatures,
                  modules: newModules,
                },
              }
            : o
        )
      )
    } catch (error) {
      console.error('Error updating module:', error)
      toast.error('שגיאה בעדכון מודול')
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
        <h1 className="text-3xl font-bold">ניהול מודולים</h1>
        <p className="text-gray-600 mt-2">
          הפעלה/כיבוי של מודולים עבור כל ארגון
        </p>
      </div>

      {/* Organization Selector */}
      <Card>
        <CardHeader>
          <CardTitle>בחר ארגון</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedOrg || ''}
            onChange={(e) => handleOrgChange(e.target.value)}
            className="w-full p-2 border rounded-md"
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
          const Icon = module.icon
          const isEnabled = modules[module.key] ?? false

          return (
            <Card key={module.key} className={isEnabled ? 'border-purple-500' : ''}>
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
                      <h3 className="font-semibold">{module.label}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {module.description}
                      </p>
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

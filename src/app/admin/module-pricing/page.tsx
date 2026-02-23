'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { DollarSign, Save } from 'lucide-react'

interface ModulePricing {
  id: string
  module_key: string
  name_he: string
  name_ru: string
  price_monthly: number | null
  is_available: boolean
  sort_order: number
}

export default function ModulePricingPage() {
  const { language } = useLanguage()
  const [modules, setModules] = useState<ModulePricing[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const translations = {
    he: {
      title: 'תמחור מודולים',
      subtitle: 'הגדרת מחירים לכל מודול בנפרד',
      module: 'מודול',
      priceMonthly: 'מחיר/חודש (₪)',
      available: 'זמין',
      save: 'שמור',
      saving: 'שומר...',
      note: 'הערה: ודא שטבלת module_pricing קיימת במסד הנתונים',
      saved: 'נשמר בהצלחה',
      error: 'שגיאה בשמירה',
    },
    ru: {
      title: 'Цены модулей',
      subtitle: 'Настройка цен для каждого модуля отдельно',
      module: 'Модуль',
      priceMonthly: 'Цена/месяц (₪)',
      available: 'Доступен',
      save: 'Сохранить',
      saving: 'Сохранение...',
      note: 'Примечание: убедитесь что таблица module_pricing создана в БД',
      saved: 'Сохранено',
      error: 'Ошибка сохранения',
    },
  }

  const t = translations[language]

  useEffect(() => {
    loadModules()
  }, [])

  const loadModules = async () => {
    try {
      console.log('=== LOAD MODULE PRICING CLIENT ===')
      const res = await fetch('/api/admin/module-pricing')
      console.log('Response status:', res.status)

      if (res.ok) {
        const data = await res.json()
        console.log('Modules loaded:', data.length)
        setModules(data)
      } else {
        const errorText = await res.text()
        console.warn('Failed to load module pricing, status:', res.status, 'error:', errorText)
        setModules([])
      }
    } catch (error) {
      console.error('Error loading module pricing:', error)
      setModules([])
    } finally {
      setLoading(false)
    }
  }

  const updateModule = (id: string, field: string, value: any) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    )
  }

  const saveModules = async () => {
    setSaving(true)
    try {
      console.log('=== SAVE MODULE PRICING ===')
      console.log('Saving', modules.length, 'modules')

      const res = await fetch('/api/admin/module-pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules }),
      })

      const responseData = await res.json()
      console.log('Save response:', res.status, responseData)

      if (!res.ok) throw new Error('Failed to save')

      toast.success(t.saved)
      loadModules()
    } catch (error) {
      console.error('Error saving module pricing:', error)
      toast.error(t.error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">
          {language === 'he' ? 'טוען...' : 'Загрузка...'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-amber-600" />
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
          </div>
        </div>
        <Button onClick={saveModules} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? t.saving : t.save}
        </Button>
      </div>

      {/* Note */}
      {modules.length === 0 && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">ℹ️ {t.note}</p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-start p-3">{t.module}</th>
                  <th className="text-start p-3">{t.priceMonthly}</th>
                  <th className="text-start p-3">{t.available}</th>
                </tr>
              </thead>
              <tbody>
                {modules.map((module) => (
                  <tr key={module.id} className="border-b">
                    <td className="p-3 font-medium">
                      {language === 'he' ? module.name_he : module.name_ru}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">₪</span>
                        <Input
                          type="number"
                          value={module.price_monthly || ''}
                          onChange={(e) =>
                            updateModule(
                              module.id,
                              'price_monthly',
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                          className="w-32"
                          placeholder="0"
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <Switch
                        checked={module.is_available}
                        onCheckedChange={(val) =>
                          updateModule(module.id, 'is_available', val)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Save Button */}
      {modules.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={saveModules} disabled={saving} size="lg">
            <Save className="w-5 h-5 mr-2" />
            {saving ? t.saving : t.save}
          </Button>
        </div>
      )}
    </div>
  )
}

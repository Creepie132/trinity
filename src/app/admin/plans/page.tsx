'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useLanguage } from '@/contexts/LanguageContext'
import { MODULES } from '@/lib/modules-config'
import { toast } from 'sonner'
import { Shield, Plus, Trash2, Save } from 'lucide-react'

interface Plan {
  id: string
  key: string
  name_he: string
  name_ru: string
  desc_he: string
  desc_ru: string
  color: string
  modules: Record<string, boolean>
  client_limit: number | null
  price_monthly: number | null
  price_yearly: number | null
  is_active: boolean
  sort_order: number
}

export default function AdminPlansPage() {
  const { language } = useLanguage()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const translations = {
    he: {
      title: 'ניהול תוכניות תמחור',
      subtitle: 'הגדרות תוכניות מנוי - מודולים, מחירים, מגבלות',
      addPlan: 'הוסף תוכנית',
      save: 'שמור',
      delete: 'מחק',
      nameRu: 'שם רוסית',
      nameHe: 'שם עברית',
      descRu: 'תיאור רוסית',
      descHe: 'תיאור עברית',
      price: 'מחיר חודשי',
      clientLimit: 'מגבלת לקוחות',
      unlimited: 'ללא הגבלה',
      modules: 'מודולים',
      active: 'פעיל',
      color: 'צבע',
      key: 'מזהה',
      note: 'הערה: ודא שטבלת subscription_plans קיימת במסד הנתונים (SQL migration בתיעוד)',
    },
    ru: {
      title: 'Управление тарифными планами',
      subtitle: 'Настройки планов подписки - модули, цены, лимиты',
      addPlan: 'Добавить план',
      save: 'Сохранить',
      delete: 'Удалить',
      nameRu: 'Название (русский)',
      nameHe: 'Название (иврит)',
      descRu: 'Описание (русский)',
      descHe: 'Описание (иврит)',
      price: 'Цена/месяц',
      clientLimit: 'Лимит клиентов',
      unlimited: 'Безлимит',
      modules: 'Модули',
      active: 'Активен',
      color: 'Цвет',
      key: 'Ключ',
      note: 'Примечание: убедитесь что таблица subscription_plans создана в БД (SQL migration в документации)',
    },
  }

  const t = translations[language]

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      console.log('=== LOAD PLANS CLIENT ===')
      const res = await fetch('/api/admin/plans')
      console.log('Response status:', res.status)
      
      if (res.ok) {
        const data = await res.json()
        console.log('Plans loaded:', data.length, 'plans')
        console.log('Plans data:', JSON.stringify(data).substring(0, 200))
        setPlans(data)
      } else {
        // Table might not exist yet
        const errorText = await res.text()
        console.warn('Failed to load plans from DB, status:', res.status, 'error:', errorText)
        setPlans([])
      }
    } catch (error) {
      console.error('Error loading plans:', error)
      setPlans([])
    } finally {
      setLoading(false)
    }
  }

  const updatePlan = (id: string, field: string, value: any) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  const updatePlanModule = (id: string, moduleKey: string, enabled: boolean) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, modules: { ...p.modules, [moduleKey]: enabled } }
          : p
      )
    )
  }

  const savePlan = async (plan: Plan) => {
    setSaving(plan.id)
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      })

      if (!res.ok) throw new Error('Failed to save')

      toast.success(language === 'he' ? 'נשמר בהצלחה' : 'Сохранено')
      loadPlans()
    } catch (error) {
      console.error('Error saving plan:', error)
      toast.error(language === 'he' ? 'שגיאה בשמירה' : 'Ошибка сохранения')
    } finally {
      setSaving(null)
    }
  }

  const deletePlan = async (id: string) => {
    if (!confirm(language === 'he' ? 'למחוק תוכנית?' : 'Удалить план?')) return

    try {
      const res = await fetch('/api/admin/plans', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (!res.ok) throw new Error('Failed to delete')

      toast.success(language === 'he' ? 'נמחק' : 'Удалено')
      loadPlans()
    } catch (error) {
      console.error('Error deleting plan:', error)
      toast.error(language === 'he' ? 'שגיאה במחיקה' : 'Ошибка удаления')
    }
  }

  const addNewPlan = async () => {
    const newPlan = {
      key: `plan_${Date.now()}`,
      name_he: language === 'he' ? 'תוכנית חדשה' : 'Новый план',
      name_ru: language === 'ru' ? 'Новый план' : 'תוכנית חדשה',
      desc_he: '',
      desc_ru: '',
      color: 'gray',
      modules: {},
      client_limit: null,
      price_monthly: null,
      price_yearly: null,
      is_active: true,
      sort_order: plans.length,
    }

    try {
      console.log('=== CREATE PLAN ===')
      console.log('New plan data:', JSON.stringify(newPlan))
      
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlan),
      })

      console.log('Create response status:', res.status)
      const responseData = await res.json()
      console.log('Create plan response:', JSON.stringify(responseData))

      if (!res.ok) throw new Error('Failed to create')

      toast.success(language === 'he' ? 'תוכנית נוצרה' : 'План создан')
      loadPlans()
    } catch (error) {
      console.error('Error creating plan:', error)
      toast.error(language === 'he' ? 'שגיאה ביצירה' : 'Ошибка создания')
    }
  }

  const getColorClass = (color: string) => {
    const classes: Record<string, string> = {
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      amber: 'bg-amber-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      gray: 'bg-gray-500',
    }
    return classes[color] || 'bg-gray-500'
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
          <Shield className="w-8 h-8 text-amber-600" />
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
          </div>
        </div>
        <Button onClick={addNewPlan}>
          <Plus className="w-4 h-4 mr-2" />
          {t.addPlan}
        </Button>
      </div>

      {/* Note */}
      {plans.length === 0 && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">ℹ️ {t.note}</p>
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className="border-2 relative">
            {/* Color bar */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${getColorClass(
                plan.color
              )}`}
            />

            <CardHeader className="pt-6">
              <CardTitle className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{plan.key}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deletePlan(plan.id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t.nameRu}</Label>
                  <Input
                    value={plan.name_ru}
                    onChange={(e) => updatePlan(plan.id, 'name_ru', e.target.value)}
                    className="text-lg font-bold"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t.nameHe}</Label>
                  <Input
                    value={plan.name_he}
                    onChange={(e) => updatePlan(plan.id, 'name_he', e.target.value)}
                    dir="rtl"
                    className="text-lg font-bold"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t.descRu}</Label>
                  <Input
                    value={plan.desc_ru}
                    onChange={(e) => updatePlan(plan.id, 'desc_ru', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">{t.descHe}</Label>
                  <Input
                    value={plan.desc_he}
                    onChange={(e) => updatePlan(plan.id, 'desc_he', e.target.value)}
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Price & Client Limit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t.price}</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">₪</span>
                    <Input
                      type="number"
                      value={plan.price_monthly || ''}
                      onChange={(e) =>
                        updatePlan(
                          plan.id,
                          'price_monthly',
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{t.clientLimit}</Label>
                  <Input
                    type="number"
                    value={plan.client_limit || ''}
                    onChange={(e) =>
                      updatePlan(
                        plan.id,
                        'client_limit',
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    placeholder={t.unlimited}
                  />
                </div>
              </div>

              {/* Color */}
              <div>
                <Label className="text-xs">{t.color}</Label>
                <select
                  value={plan.color}
                  onChange={(e) => updatePlan(plan.id, 'color', e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="red">Red</option>
                  <option value="blue">Blue</option>
                  <option value="amber">Amber</option>
                  <option value="green">Green</option>
                  <option value="purple">Purple</option>
                  <option value="gray">Gray</option>
                </select>
              </div>

              {/* Modules */}
              <div>
                <Label className="text-xs mb-2 block">{t.modules}</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-3">
                  {MODULES.map((mod) => (
                    <div key={mod.key} className="flex items-center justify-between">
                      <span className="text-sm">
                        {language === 'he' ? mod.name_he : mod.name_ru}
                      </span>
                      <Switch
                        checked={plan.modules[mod.key] || false}
                        onCheckedChange={(val) =>
                          updatePlanModule(plan.id, mod.key, val)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Active status */}
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-sm font-medium">{t.active}</span>
                <Switch
                  checked={plan.is_active}
                  onCheckedChange={(val) => updatePlan(plan.id, 'is_active', val)}
                />
              </div>

              {/* Save button */}
              <Button
                onClick={() => savePlan(plan)}
                disabled={saving === plan.id}
                className="w-full"
              >
                {saving === plan.id ? (
                  <span>{language === 'he' ? 'שומר...' : 'Сохранение...'}</span>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t.save}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

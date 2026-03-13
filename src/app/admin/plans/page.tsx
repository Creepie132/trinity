'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { Package, Plus, Save, Trash2, Loader2 } from 'lucide-react'
import { MODULES } from '@/lib/modules-config'

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
  is_active: boolean
  sort_order: number
}

const COLORS = ['blue','green','amber','purple','red','gray']

export default function AdminPlansPage() {
  const { language } = useLanguage()
  const l = language === 'he'
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => { loadPlans() }, [])

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans')
      if (res.ok) setPlans(await res.json())
    } finally { setLoading(false) }
  }

  const update = (id: string, field: string, value: any) =>
    setPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))

  const updateModule = (id: string, key: string, val: boolean) =>
    setPlans(prev => prev.map(p =>
      p.id === id ? { ...p, modules: { ...p.modules, [key]: val } } : p))

  const save = async (plan: Plan) => {
    setSaving(plan.id)
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      })
      if (!res.ok) throw new Error()
      toast.success(l ? 'נשמר' : 'Сохранено')
      loadPlans()
    } catch { toast.error(l ? 'שגיאה' : 'Ошибка') }
    finally { setSaving(null) }
  }

  const remove = async (id: string) => {
    if (!confirm(l ? 'למחוק?' : 'Удалить?')) return
    try {
      await fetch('/api/admin/plans', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      toast.success(l ? 'נמחק' : 'Удалено'); loadPlans()
    } catch { toast.error(l ? 'שגיאה' : 'Ошибка') }
  }

  const addPlan = async () => {
    try {
      await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: `plan_${Date.now()}`,
          name_he: 'תוכנית חדשה', name_ru: 'Новый план',
          desc_he: '', desc_ru: '', color: 'blue',
          modules: {}, client_limit: null, price_monthly: null,
          is_active: true, sort_order: plans.length,
        }),
      })
      toast.success(l ? 'נוצר' : 'Создан'); loadPlans()
    } catch { toast.error(l ? 'שגיאה' : 'Ошибка') }
  }

  const colorDot: Record<string, string> = {
    blue:'bg-blue-500', green:'bg-green-500', amber:'bg-amber-500',
    purple:'bg-purple-500', red:'bg-red-500', gray:'bg-gray-400',
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-7 h-7 text-purple-600" />
          <h1 className="text-2xl font-bold">{l ? 'תוכניות תמחור' : 'Тарифные планы'}</h1>
          <Badge variant="outline">{plans.length}</Badge>
        </div>
        <Button onClick={addPlan} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          {l ? 'הוסף' : 'Добавить'}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {plans.map(plan => (
          <Card key={plan.id} className="overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${colorDot[plan.color] || 'bg-gray-400'}`} />
                <CardTitle className="text-base">
                  {l ? plan.name_he : plan.name_ru}
                </CardTitle>
                <Badge variant={plan.is_active ? 'default' : 'secondary'} className="text-xs">
                  {plan.is_active ? (l ? 'פעיל' : 'Активен') : (l ? 'לא פעיל' : 'Неактивен')}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => save(plan)} disabled={saving === plan.id}>
                  {saving === plan.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <><Save className="w-3 h-3 mr-1" />{l ? 'שמור' : 'Сохранить'}</>}
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600"
                  onClick={() => remove(plan.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{l ? 'שם עברית' : 'Название (ивр.)'}</Label>
                  <Input className="mt-1 h-8 text-sm" value={plan.name_he}
                    onChange={e => update(plan.id, 'name_he', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">{l ? 'שם רוסית' : 'Название (рус.)'}</Label>
                  <Input className="mt-1 h-8 text-sm" value={plan.name_ru}
                    onChange={e => update(plan.id, 'name_ru', e.target.value)} />
                </div>
              </div>

              {/* Price + Limit + Color + Active */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{l ? 'מחיר/חודש ₪' : 'Цена/мес ₪'}</Label>
                  <Input className="mt-1 h-8 text-sm" type="number"
                    value={plan.price_monthly ?? ''}
                    onChange={e => update(plan.id, 'price_monthly', e.target.value ? Number(e.target.value) : null)} />
                </div>
                <div>
                  <Label className="text-xs">{l ? 'מגבלת לקוחות' : 'Лимит клиентов'}</Label>
                  <Input className="mt-1 h-8 text-sm" type="number"
                    placeholder={l ? 'ללא הגבלה' : 'Безлимит'}
                    value={plan.client_limit ?? ''}
                    onChange={e => update(plan.id, 'client_limit', e.target.value ? Number(e.target.value) : null)} />
                </div>
                <div>
                  <Label className="text-xs">{l ? 'צבע' : 'Цвет'}</Label>
                  <div className="flex gap-1.5 mt-2">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => update(plan.id, 'color', c)}
                        className={`w-5 h-5 rounded-full ${colorDot[c]} ${plan.color === c ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <Switch checked={plan.is_active}
                    onCheckedChange={v => update(plan.id, 'is_active', v)} />
                  <Label className="text-xs">{l ? 'פעיל' : 'Активен'}</Label>
                </div>
              </div>

              {/* Modules */}
              <div>
                <Label className="text-xs mb-2 block">{l ? 'מודולים' : 'Модули'}</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {MODULES.map(mod => (
                    <div key={mod.key} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-2 py-1.5">
                      <Switch
                        checked={!!plan.modules?.[mod.key]}
                        onCheckedChange={v => updateModule(plan.id, mod.key, v)}
                        className="scale-75"
                      />
                      <span className="text-xs">{l ? mod.name_he : mod.name_ru}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

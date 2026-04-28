'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useFeatures } from '@/hooks/useFeatures'
import { toast } from 'sonner'
import { Plus, Trash2, RefreshCw, ArrowRight, ArrowLeft, Pencil, Check, X } from 'lucide-react'
import Link from 'next/link'

interface Plan {
  id: string
  name: string
  description: string | null
  price: number
  billing_cycle: 'monthly' | 'yearly' | 'custom'
  custom_days: number | null
  is_active: boolean
}

const emptyForm = { name: '', description: '', price: '', billing_cycle: 'monthly', custom_days: '' }

export default function RecurringPlansPage() {
  const { language } = useLanguage()
  const isHe = language === 'he'
  const features = useFeatures()

  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const t = {
    title:       isHe ? 'תוכניות מנוי חוזר' : 'Планы подписок',
    back:        isHe ? 'חזרה להגדרות' : 'Назад к настройкам',
    addPlan:     isHe ? 'הוסף תוכנית' : 'Добавить план',
    name:        isHe ? 'שם התוכנית' : 'Название',
    desc:        isHe ? 'תיאור (אופציונלי)' : 'Описание (необязательно)',
    price:       isHe ? 'מחיר (₪)' : 'Цена (₪)',
    cycle:       isHe ? 'תדירות חיוב' : 'Периодичность',
    monthly:     isHe ? 'חודשי' : 'Ежемесячно',
    yearly:      isHe ? 'שנתי' : 'Ежегодно',
    custom:      isHe ? 'מותאם' : 'Произвольно',
    customDays:  isHe ? 'מספר ימים' : 'Кол-во дней',
    save:        isHe ? 'שמור' : 'Сохранить',
    cancel:      isHe ? 'ביטול' : 'Отмена',
    empty:       isHe ? 'אין תוכניות עדיין' : 'Планов пока нет',
    emptyHint:   isHe ? 'צור תוכנית חיוב חוזר ללקוחות שלך' : 'Создайте план для автоматического списания с клиентов',
    noAccess:    isHe ? 'מודול המנויים אינו פעיל' : 'Модуль подписок не активен',
    perMonth:    isHe ? 'לחודש' : 'в мес.',
    perYear:     isHe ? 'לשנה' : 'в год',
    perDays:     isHe ? 'ימים' : 'дн.',
    deleteConfirm: isHe ? 'למחוק תוכנית זו?' : 'Удалить этот план?',
    namePlaceholder: isHe ? 'לדוגמה: מנוי חודשי VIP' : 'Например: VIP Абонемент',
  }

  useEffect(() => { fetchPlans() }, [])

  async function fetchPlans() {
    setLoading(true)
    try {
      const res = await fetch('/api/recurring-plans')
      if (res.ok) setPlans(await res.json())
    } catch {}
    setLoading(false)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price) {
      toast.error(isHe ? 'שם ומחיר חובה' : 'Название и цена обязательны')
      return
    }
    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: parseFloat(form.price),
        billing_cycle: form.billing_cycle,
        custom_days: form.billing_cycle === 'custom' ? parseInt(form.custom_days) : null,
      }

      if (editingId) {
        const res = await fetch(`/api/recurring-plans/${editingId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error()
        toast.success(isHe ? 'התוכנית עודכנה' : 'План обновлён')
      } else {
        const res = await fetch('/api/recurring-plans', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error()
        toast.success(isHe ? 'התוכנית נוצרה' : 'План создан')
      }
      setForm(emptyForm)
      setShowForm(false)
      setEditingId(null)
      await fetchPlans()
    } catch {
      toast.error(isHe ? 'שגיאה בשמירה' : 'Ошибка сохранения')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm(t.deleteConfirm)) return
    try {
      const res = await fetch(`/api/recurring-plans/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success(isHe ? 'התוכנית נמחקה' : 'План удалён')
      await fetchPlans()
    } catch {
      toast.error(isHe ? 'שגיאה במחיקה' : 'Ошибка удаления')
    }
  }

  function startEdit(plan: Plan) {
    setEditingId(plan.id)
    setForm({
      name: plan.name,
      description: plan.description || '',
      price: plan.price.toString(),
      billing_cycle: plan.billing_cycle,
      custom_days: plan.custom_days?.toString() || '',
    })
    setShowForm(true)
  }

  function cycleLabel(plan: Plan) {
    if (plan.billing_cycle === 'monthly') return `/ ${t.perMonth}`
    if (plan.billing_cycle === 'yearly') return `/ ${t.perYear}`
    return `/ ${plan.custom_days} ${t.perDays}`
  }

  if (!features.recurringEnabled) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <RefreshCw size={40} className="mx-auto mb-3 opacity-40" />
        <p>{t.noAccess}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8" dir={isHe ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground transition">
          {isHe ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <RefreshCw size={20} className="text-indigo-500" />
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isHe ? 'נהל תוכניות חיוב אוטומטי ללקוחות שלך' : 'Управляйте планами автоматического списания'}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm) }}
          className="ms-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
        >
          <Plus size={16} />
          {t.addPlan}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-5 rounded-2xl border bg-muted/20 space-y-4">
          <h2 className="font-semibold">
            {editingId ? (isHe ? 'עריכת תוכנית' : 'Редактировать план') : (isHe ? 'תוכנית חדשה' : 'Новый план')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">{t.name} *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t.namePlaceholder}
                className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t.price} *</label>
              <input
                type="number" min="0" step="0.01"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t.cycle}</label>
              <select
                value={form.billing_cycle}
                onChange={e => setForm(f => ({ ...f, billing_cycle: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
              >
                <option value="monthly">{t.monthly}</option>
                <option value="yearly">{t.yearly}</option>
                <option value="custom">{t.custom}</option>
              </select>
            </div>
            {form.billing_cycle === 'custom' && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t.customDays}</label>
                <input
                  type="number" min="1"
                  value={form.custom_days}
                  onChange={e => setForm(f => ({ ...f, custom_days: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                  dir="ltr"
                />
              </div>
            )}
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">{t.desc}</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {saving ? '...' : <><Check size={14} /> {t.save}</>}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm) }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium hover:bg-muted transition"
            >
              <X size={14} /> {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Plans list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {isHe ? 'טוען...' : 'Загрузка...'}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-muted rounded-2xl">
          <RefreshCw size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="font-medium text-muted-foreground">{t.empty}</p>
          <p className="text-sm text-muted-foreground mt-1">{t.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => (
            <div key={plan.id} className="flex items-center justify-between p-4 rounded-2xl border bg-background hover:bg-muted/20 transition">
              <div>
                <p className="font-semibold">{plan.name}</p>
                {plan.description && <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>}
                <p className="text-indigo-600 dark:text-indigo-400 font-bold mt-1">
                  ₪{plan.price.toLocaleString()} <span className="text-muted-foreground font-normal text-sm">{cycleLabel(plan)}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEdit(plan)}
                  className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-muted-foreground hover:text-red-500"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

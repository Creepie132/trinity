'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ArrowRight, ArrowLeft, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'

interface RecurringPlan {
  id: string
  org_id: string
  name: string
  description: string | null
  price: number
  billing_cycle: 'monthly' | 'yearly' | 'custom'
  custom_days: number | null
  is_active: boolean
  created_at: string
}

const CYCLE_LABELS = {
  he: { monthly: 'חודשי', yearly: 'שנתי', custom: 'מותאם' },
  ru: { monthly: 'Ежемесячно', yearly: 'Ежегодно', custom: 'Кастомный' },
}

export default function RecurringSettingsPage() {
  const { language } = useLanguage()
  const isHe = language === 'he'
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()

  const [plans, setPlans] = useState<RecurringPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<RecurringPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    billing_cycle: 'monthly' as 'monthly' | 'yearly' | 'custom',
    custom_days: '',
  })

  useEffect(() => {
    if (orgId) loadPlans()
  }, [orgId])

  async function loadPlans() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('recurring_plans')
        .select('*')
        .eq('org_id', orgId!)
        .order('created_at')
      if (error) throw error
      setPlans(data || [])
    } catch (e) {
      console.error('Load plans error:', e)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditingPlan(null)
    setForm({ name: '', description: '', price: '', billing_cycle: 'monthly', custom_days: '' })
    setModalOpen(true)
  }

  function openEdit(plan: RecurringPlan) {
    setEditingPlan(plan)
    setForm({
      name: plan.name,
      description: plan.description || '',
      price: String(plan.price),
      billing_cycle: plan.billing_cycle,
      custom_days: plan.custom_days ? String(plan.custom_days) : '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name || !form.price) {
      toast.error(isHe ? 'שם ומחיר הם שדות חובה' : 'Название и цена обязательны')
      return
    }
    setSaving(true)
    try {
      const payload = {
        org_id: orgId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: parseFloat(form.price),
        billing_cycle: form.billing_cycle,
        custom_days: form.billing_cycle === 'custom' ? parseInt(form.custom_days) || 30 : null,
        is_active: true,
      }

      if (editingPlan) {
        const { error } = await supabase
          .from('recurring_plans')
          .update(payload)
          .eq('id', editingPlan.id)
        if (error) throw error
        toast.success(isHe ? 'התוכנית עודכנה' : 'План обновлён')
      } else {
        const { error } = await supabase
          .from('recurring_plans')
          .insert(payload)
        if (error) throw error
        toast.success(isHe ? 'התוכנית נוספה' : 'План добавлен')
      }

      setModalOpen(false)
      await loadPlans()
    } catch (e: any) {
      toast.error(e.message || (isHe ? 'שגיאה' : 'Ошибка'))
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(plan: RecurringPlan) {
    try {
      const { error } = await supabase
        .from('recurring_plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id)
      if (error) throw error
      setPlans(plans.map(p => p.id === plan.id ? { ...p, is_active: !p.is_active } : p))
    } catch (e: any) {
      toast.error(e.message || (isHe ? 'שגיאה' : 'Ошибка'))
    }
  }

  async function handleDelete(planId: string) {
    if (!confirm(isHe ? 'האם למחוק את התוכנית?' : 'Удалить план?')) return
    setDeletingId(planId)
    try {
      const { error } = await supabase
        .from('recurring_plans')
        .delete()
        .eq('id', planId)
      if (error) throw error
      setPlans(plans.filter(p => p.id !== planId))
      toast.success(isHe ? 'התוכנית נמחקה' : 'План удалён')
    } catch (e: any) {
      toast.error(e.message || (isHe ? 'שגיאה' : 'Ошибка'))
    } finally {
      setDeletingId(null)
    }
  }

  function cycleName(plan: RecurringPlan) {
    const labels = CYCLE_LABELS[isHe ? 'he' : 'ru']
    if (plan.billing_cycle === 'custom') {
      return isHe
        ? `כל ${plan.custom_days} ימים`
        : `Каждые ${plan.custom_days} дней`
    }
    return labels[plan.billing_cycle]
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      {/* Back */}
      <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        {isHe ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
        {isHe ? 'חזרה להגדרות' : 'Назад к настройкам'}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
            <RefreshCw className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{isHe ? 'חיוב חוזר' : 'Рекуррентные платежи'}</h1>
            <p className="text-sm text-muted-foreground">
              {isHe ? 'נהל תוכניות חיוב אוטומטי ללקוחות' : 'Управляйте планами автоматического списания'}
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
        >
          <Plus size={16} />
          {isHe ? 'הוסף תוכנית' : 'Добавить план'}
        </button>
      </div>

      {/* Plans list */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">{isHe ? 'טוען...' : 'Загрузка...'}</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-muted">
          <RefreshCw className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">{isHe ? 'אין תוכניות חיוב' : 'Нет планов'}</p>
          <p className="text-sm text-muted-foreground mt-1">{isHe ? 'צור תוכנית ראשונה' : 'Создайте первый план'}</p>
          <button
            onClick={openCreate}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
          >
            {isHe ? 'צור תוכנית' : 'Создать план'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`p-5 rounded-2xl border bg-card transition ${plan.is_active ? 'border-border' : 'border-dashed opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base">{plan.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                      {cycleName(plan)}
                    </span>
                    {!plan.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                        {isHe ? 'לא פעיל' : 'Неактивен'}
                      </span>
                    )}
                  </div>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  )}
                  <p className="text-xl font-bold text-indigo-600 mt-2">₪{plan.price.toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle active */}
                  <button
                    onClick={() => handleToggleActive(plan)}
                    className={`w-10 h-6 rounded-full transition-colors flex items-center ${plan.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    title={plan.is_active ? (isHe ? 'כבה' : 'Отключить') : (isHe ? 'הפעל' : 'Включить')}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${plan.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <button
                    onClick={() => openEdit(plan)}
                    className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground"
                    title={isHe ? 'ערוך' : 'Редактировать'}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    disabled={deletingId === plan.id}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-red-500 hover:text-red-600 disabled:opacity-50"
                    title={isHe ? 'מחק' : 'Удалить'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPlan
          ? (isHe ? 'ערוך תוכנית' : 'Редактировать план')
          : (isHe ? 'תוכנית חדשה' : 'Новый план')}
        width="500px"
      >
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              {isHe ? 'שם התוכנית *' : 'Название *'}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder={isHe ? 'לדוגמה: מנוי חודשי' : 'Например: Ежемесячная подписка'}
              className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              {isHe ? 'תיאור' : 'Описание'}
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder={isHe ? 'תיאור אופציונלי...' : 'Описание (необязательно)...'}
              className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
            />
          </div>

          {/* Price */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              {isHe ? 'מחיר ₪ *' : 'Цена ₪ *'}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          {/* Billing Cycle */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              {isHe ? 'מחזור חיוב *' : 'Период списания *'}
            </label>
            <select
              value={form.billing_cycle}
              onChange={e => setForm({ ...form, billing_cycle: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="monthly">{isHe ? 'חודשי' : 'Ежемесячно'}</option>
              <option value="yearly">{isHe ? 'שנתי' : 'Ежегодно'}</option>
              <option value="custom">{isHe ? 'מותאם אישית' : 'Кастомный'}</option>
            </select>
          </div>

          {/* Custom days */}
          {form.billing_cycle === 'custom' && (
            <div>
              <label className="text-sm font-medium mb-1 block">
                {isHe ? 'מספר ימים' : 'Количество дней'}
              </label>
              <input
                type="number"
                min="1"
                value={form.custom_days}
                onChange={e => setForm({ ...form, custom_days: e.target.value })}
                placeholder="30"
                className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t">
          <button
            onClick={() => setModalOpen(false)}
            className="flex-1 py-2.5 rounded-xl border font-medium text-sm hover:bg-muted transition"
          >
            {isHe ? 'ביטול' : 'Отмена'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {saving ? (isHe ? 'שומר...' : 'Сохранение...') : (isHe ? 'שמור' : 'Сохранить')}
          </button>
        </div>
      </Modal>
    </div>
  )
}

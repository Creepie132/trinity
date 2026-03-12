'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { useFeatures } from '@/hooks/useFeatures'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'
import { CreditCard, Eye, EyeOff, ArrowRight, ArrowLeft, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
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

export default function PaymentSettingsPage() {
  const { language } = useLanguage()
  const isHe = language === 'he'
  const { orgId } = useAuth()
  const features = useFeatures()
  const supabase = createSupabaseBrowserClient()

  // Terminal settings state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showTokenPass, setShowTokenPass] = useState(false)
  const [terminalForm, setTerminalForm] = useState({
    tranzila_terminal: '',
    tranzila_password: '',
    tranzila_token_terminal: '',
    tranzila_token_password: '',
  })

  // Recurring plans state
  const [plans, setPlans] = useState<RecurringPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<RecurringPlan | null>(null)
  const [planSaving, setPlanSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    price: '',
    billing_cycle: 'monthly' as 'monthly' | 'yearly' | 'custom',
    custom_days: '',
  })

  useEffect(() => {
    if (orgId) {
      loadSettings()
      if (features.recurringEnabled) loadPlans()
    }
  }, [orgId, features.recurringEnabled])

  async function loadSettings() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('tranzila_terminal, tranzila_password, tranzila_token_terminal, tranzila_token_password')
        .eq('id', orgId!)
        .single()
      if (error) throw error
      if (data) {
        setTerminalForm({
          tranzila_terminal: data.tranzila_terminal || '',
          tranzila_password: data.tranzila_password || '',
          tranzila_token_terminal: data.tranzila_token_terminal || '',
          tranzila_token_password: data.tranzila_token_password || '',
        })
      }
    } catch (e) {
      console.error('Load payment settings error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveTerminal() {
    if (!orgId) return
    setSaving(true)
    try {
      const payload: Record<string, string | null> = {
        tranzila_terminal: terminalForm.tranzila_terminal.trim() || null,
        tranzila_password: terminalForm.tranzila_password.trim() || null,
      }
      if (features.recurringEnabled) {
        payload.tranzila_token_terminal = terminalForm.tranzila_token_terminal.trim() || null
        payload.tranzila_token_password = terminalForm.tranzila_token_password.trim() || null
      }
      const { error } = await supabase.from('organizations').update(payload).eq('id', orgId)
      if (error) throw error
      toast.success(isHe ? 'הגדרות נשמרו ✓' : 'Настройки сохранены ✓')
    } catch (e: any) {
      toast.error(e.message || (isHe ? 'שגיאה' : 'Ошибка'))
    } finally {
      setSaving(false)
    }
  }

  async function loadPlans() {
    setPlansLoading(true)
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
      setPlansLoading(false)
    }
  }

  function openCreate() {
    setEditingPlan(null)
    setPlanForm({ name: '', description: '', price: '', billing_cycle: 'monthly', custom_days: '' })
    setModalOpen(true)
  }

  function openEdit(plan: RecurringPlan) {
    setEditingPlan(plan)
    setPlanForm({
      name: plan.name,
      description: plan.description || '',
      price: String(plan.price),
      billing_cycle: plan.billing_cycle,
      custom_days: plan.custom_days ? String(plan.custom_days) : '',
    })
    setModalOpen(true)
  }

  async function handleSavePlan() {
    if (!planForm.name || !planForm.price) {
      toast.error(isHe ? 'שם ומחיר הם שדות חובה' : 'Название и цена обязательны')
      return
    }
    setPlanSaving(true)
    try {
      const payload = {
        org_id: orgId,
        name: planForm.name.trim(),
        description: planForm.description.trim() || null,
        price: parseFloat(planForm.price),
        billing_cycle: planForm.billing_cycle,
        custom_days: planForm.billing_cycle === 'custom' ? parseInt(planForm.custom_days) || 30 : null,
        is_active: true,
      }
      if (editingPlan) {
        const { error } = await supabase.from('recurring_plans').update(payload).eq('id', editingPlan.id)
        if (error) throw error
        toast.success(isHe ? 'התוכנית עודכנה' : 'План обновлён')
      } else {
        const { error } = await supabase.from('recurring_plans').insert(payload)
        if (error) throw error
        toast.success(isHe ? 'התוכנית נוספה' : 'План добавлен')
      }
      setModalOpen(false)
      await loadPlans()
    } catch (e: any) {
      toast.error(e.message || (isHe ? 'שגיאה' : 'Ошибка'))
    } finally {
      setPlanSaving(false)
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

  async function handleDeletePlan(planId: string) {
    if (!confirm(isHe ? 'האם למחוק את התוכנית?' : 'Удалить план?')) return
    setDeletingId(planId)
    try {
      const { error } = await supabase.from('recurring_plans').delete().eq('id', planId)
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
      return isHe ? `כל ${plan.custom_days} ימים` : `Каждые ${plan.custom_days} дней`
    }
    return labels[plan.billing_cycle]
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      {/* Back */}
      <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        {isHe ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
        {isHe ? 'חזרה להגדרות' : 'Назад к настройкам'}
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30">
          <CreditCard className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{isHe ? 'הגדרות תשלום' : 'Настройки платежей'}</h1>
          <p className="text-sm text-muted-foreground">
            {isHe ? 'Tranzila — חיבור וחיוב חוזר' : 'Tranzila — подключение и рекуррентные платежи'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">{isHe ? 'טוען...' : 'Загрузка...'}</div>
      ) : (
        <div className="space-y-8">

          {/* ═══ СЕКЦИЯ 1: Терминал Tranzila ═══ */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{isHe ? 'טרמינל Tranzila' : 'Терминал Tranzila'}</h2>

            <div className="p-5 rounded-2xl border bg-card space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">{isHe ? 'שם הטרמינל' : 'Имя терминала'}</label>
                <input
                  type="text"
                  value={terminalForm.tranzila_terminal}
                  onChange={e => setTerminalForm({ ...terminalForm, tranzila_terminal: e.target.value })}
                  placeholder="myterminal"
                  className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">{isHe ? 'סיסמה' : 'Пароль'}</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={terminalForm.tranzila_password}
                    onChange={e => setTerminalForm({ ...terminalForm, tranzila_password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pe-10 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {features.recurringEnabled && (
                <>
                  <hr className="border-muted" />
                  <p className="text-sm font-medium">{isHe ? 'טרמינל טוקנים (חיוב חוזר)' : 'Токен-терминал (рекуррентные платежи)'}</p>

                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-800 dark:text-amber-300">
                    💡 {isHe
                      ? 'בקש מחברת האשראי לבטל CVV בטרמינל הטוקנים'
                      : 'Попросите кредитную компанию отключить CVV на токен-терминале'}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">{isHe ? 'שם טרמינל הטוקנים' : 'Имя токен-терминала'}</label>
                    <input
                      type="text"
                      value={terminalForm.tranzila_token_terminal}
                      onChange={e => setTerminalForm({ ...terminalForm, tranzila_token_terminal: e.target.value })}
                      placeholder="mytokenterm"
                      className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">{isHe ? 'סיסמה לטרמינל הטוקנים' : 'Пароль токен-терминала'}</label>
                    <div className="relative">
                      <input
                        type={showTokenPass ? 'text' : 'password'}
                        value={terminalForm.tranzila_token_password}
                        onChange={e => setTerminalForm({ ...terminalForm, tranzila_token_password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 pe-10 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTokenPass(!showTokenPass)}
                        className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground"
                      >
                        {showTokenPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleSaveTerminal}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition disabled:opacity-50"
            >
              {saving ? (isHe ? 'שומר...' : 'Сохранение...') : (isHe ? 'שמור הגדרות' : 'Сохранить настройки')}
            </button>
          </div>

          {/* ═══ СЕКЦИЯ 2: Планы рекуррентных платежей ═══ */}
          {features.recurringEnabled && (
            <>
              <hr className="border-muted" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                      <RefreshCw className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{isHe ? 'תוכניות חיוב חוזר' : 'Планы рекуррентных платежей'}</h2>
                      <p className="text-sm text-muted-foreground">
                        {isHe ? 'צור תוכניות לחיוב אוטומטי מכרטיסי לקוחות' : 'Создайте планы для автоматического списания с карт клиентов'}
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

                {plansLoading ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">{isHe ? 'טוען...' : 'Загрузка...'}</div>
                ) : plans.length === 0 ? (
                  <div className="text-center py-10 rounded-2xl border-2 border-dashed border-muted">
                    <RefreshCw className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="font-medium text-sm">{isHe ? 'אין תוכניות חיוב' : 'Нет планов'}</p>
                    <p className="text-xs text-muted-foreground mt-1">{isHe ? 'צור תוכנית ראשונה' : 'Создайте первый план'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {plans.map(plan => (
                      <div
                        key={plan.id}
                        className={`p-4 rounded-2xl border bg-card transition ${plan.is_active ? 'border-border' : 'border-dashed opacity-60'}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm">{plan.name}</h3>
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
                              <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                            )}
                            <p className="text-lg font-bold text-indigo-600 mt-1">₪{plan.price.toLocaleString()}</p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleToggleActive(plan)}
                              className={`w-9 h-5 rounded-full transition-colors flex items-center ${plan.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                            >
                              <div className={`w-3.5 h-3.5 bg-white rounded-full shadow transform transition-transform ${plan.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </button>
                            <button
                              onClick={() => openEdit(plan)}
                              className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDeletePlan(plan.id)}
                              disabled={deletingId === plan.id}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-red-500 disabled:opacity-50"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Create/Edit Plan Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPlan
          ? (isHe ? 'ערוך תוכנית' : 'Редактировать план')
          : (isHe ? 'תוכנית חדשה' : 'Новый план')}
        width="500px"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">{isHe ? 'שם התוכנית *' : 'Название *'}</label>
            <input
              type="text"
              value={planForm.name}
              onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
              placeholder={isHe ? 'לדוגמה: מנוי חודשי' : 'Например: Ежемесячная подписка'}
              className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">{isHe ? 'תיאור' : 'Описание'}</label>
            <textarea
              value={planForm.description}
              onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
              rows={2}
              placeholder={isHe ? 'תיאור אופציונלי...' : 'Описание (необязательно)...'}
              className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">{isHe ? 'מחיר ₪ *' : 'Цена ₪ *'}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={planForm.price}
              onChange={e => setPlanForm({ ...planForm, price: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">{isHe ? 'מחזור חיוב *' : 'Период списания *'}</label>
            <select
              value={planForm.billing_cycle}
              onChange={e => setPlanForm({ ...planForm, billing_cycle: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="monthly">{isHe ? 'חודשי' : 'Ежемесячно'}</option>
              <option value="yearly">{isHe ? 'שנתי' : 'Ежегодно'}</option>
              <option value="custom">{isHe ? 'מותאם אישית' : 'Кастомный'}</option>
            </select>
          </div>

          {planForm.billing_cycle === 'custom' && (
            <div>
              <label className="text-sm font-medium mb-1 block">{isHe ? 'מספר ימים' : 'Количество дней'}</label>
              <input
                type="number"
                min="1"
                value={planForm.custom_days}
                onChange={e => setPlanForm({ ...planForm, custom_days: e.target.value })}
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
            onClick={handleSavePlan}
            disabled={planSaving}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {planSaving ? (isHe ? 'שומר...' : 'Сохранение...') : (isHe ? 'שמור' : 'Сохранить')}
          </button>
        </div>
      </Modal>
    </div>
  )
}

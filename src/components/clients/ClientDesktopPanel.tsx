'use client'

import { useState, useEffect } from 'react'
import { X, Phone, MessageCircle, Mail, Pencil, Calendar, CreditCard, MessageSquare, FileText, ChevronRight, RefreshCw, PauseCircle, PlayCircle, AlertCircle, Plus } from 'lucide-react'
import { TrinityButton } from '@/components/ui/TrinityButton'
import { useFeatures } from '@/hooks/useFeatures'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'

interface ClientDesktopPanelProps {
  client: any
  isOpen: boolean
  onClose: () => void
  onEdit: (client: any) => void
  onSaved?: (client: any) => void
  locale: 'he' | 'ru'
}

export function ClientDesktopPanel({ client, isOpen, onClose, onEdit, onSaved, locale }: ClientDesktopPanelProps) {
  const [activeTab, setActiveTab] = useState<'visits' | 'payments' | 'messages' | 'notes' | 'recurring'>('visits')
  const [visits, setVisits] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const features = useFeatures()
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()

  // Recurring state
  const [subscription, setSubscription] = useState<any>(null)
  const [recurringPlans, setRecurringPlans] = useState<any[]>([])
  const [charges, setCharges] = useState<any[]>([])
  const [recurringLoading, setRecurringLoading] = useState(false)
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [firstBillingDate, setFirstBillingDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0]
  })
  const [subscribing, setSubscribing] = useState(false)
  const [charging, setCharging] = useState(false)
  
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
    date_of_birth: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const isRTL = locale === 'he'
  const fullName = `${client?.first_name || ''} ${client?.last_name || ''}`.trim() || '—'
  const initials = `${(client?.first_name || '')[0] || ''}${(client?.last_name || '')[0] || ''}`.toUpperCase()
  
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500']
  const avatarColor = colors[(client?.first_name || '').charCodeAt(0) % colors.length]

  useEffect(() => {
    if (isOpen && client?.id) {
      loadData()
    }
  }, [isOpen, client?.id, activeTab])

  useEffect(() => {
    if (client) {
      setEditForm({
        first_name: client.first_name || '',
        last_name: client.last_name || '',
        phone: client.phone || '',
        email: client.email || '',
        address: client.address || '',
        date_of_birth: client.date_of_birth ? client.date_of_birth.split('T')[0] : '',
        notes: client.notes || '',
      })
      setIsEditing(false)
    }
  }, [client])

  async function loadData() {
    setLoading(true)
    try {
      if (activeTab === 'visits') {
        const res = await fetch(`/api/clients/${client.id}/visits`)
        if (res.ok) setVisits(await res.json())
      } else if (activeTab === 'payments') {
        const res = await fetch(`/api/clients/${client.id}/payments`)
        if (res.ok) setPayments(await res.json())
      } else if (activeTab === 'recurring') {
        await loadRecurringData()
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function loadRecurringData() {
    setRecurringLoading(true)
    try {
      const [subRes, plansRes, chargesRes] = await Promise.all([
        supabase.from('client_subscriptions').select('*').eq('client_id', client.id).in('status', ['active', 'paused']).maybeSingle(),
        supabase.from('recurring_plans').select('*').eq('org_id', orgId!).eq('is_active', true).order('created_at'),
        supabase.from('subscription_charges').select('*').eq('client_id', client.id).order('created_at', { ascending: false }).limit(5),
      ])
      setSubscription(subRes.data)
      setRecurringPlans(plansRes.data || [])
      setCharges(chargesRes.data || [])
    } catch (e) {
      console.error('Recurring load error:', e)
    } finally {
      setRecurringLoading(false)
    }
  }

  async function handleSubscribe() {
    if (!selectedPlanId) {
      toast.error(locale === 'he' ? 'בחר תוכנית' : 'Выберите план')
      return
    }
    const plan = recurringPlans.find(p => p.id === selectedPlanId)
    if (!plan) return
    setSubscribing(true)
    try {
      const { error } = await supabase.from('client_subscriptions').insert({
        org_id: plan.org_id,
        client_id: client.id,
        plan_id: plan.id,
        plan_name: plan.name,
        price: plan.price,
        currency: '₪',
        billing_cycle: plan.billing_cycle,
        custom_days: plan.custom_days,
        status: 'active',
        next_billing_date: firstBillingDate,
        card_token: client.card_token || null,
        card_last4: client.card_last4 || null,
      })
      if (error) throw error
      toast.success(locale === 'he' ? 'המנוי נוצר בהצלחה' : 'Подписка оформлена')
      setShowSubscribeModal(false)
      await loadRecurringData()
    } catch (e: any) {
      toast.error(e.message || (locale === 'he' ? 'שגיאה' : 'Ошибка'))
    } finally {
      setSubscribing(false)
    }
  }

  async function handleChargeNow() {
    if (!subscription) return
    if (!client.card_token) {
      toast.error(locale === 'he'
        ? 'אין טוקן כרטיס. הלקוח צריך לשלם ידנית תחילה.'
        : 'Токен карты не найден. Клиент должен сначала оплатить вручную.')
      return
    }
    setCharging(true)
    try {
      const res = await fetch('/api/payments/charge-recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_id: subscription.id,
          client_id: client.id,
          amount: subscription.price,
          card_token: client.card_token,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(locale === 'he' ? 'החיוב בוצע בהצלחה' : 'Списание выполнено успешно')
      await loadRecurringData()
    } catch (e: any) {
      toast.error(e.message || (locale === 'he' ? 'שגיאה בחיוב' : 'Ошибка при списании'))
    } finally {
      setCharging(false)
    }
  }

  async function handleToggleStatus() {
    if (!subscription) return
    const newStatus = subscription.status === 'active' ? 'paused' : 'active'
    try {
      const { error } = await supabase
        .from('client_subscriptions')
        .update({ status: newStatus })
        .eq('id', subscription.id)
      if (error) throw error
      setSubscription({ ...subscription, status: newStatus })
      toast.success(locale === 'he'
        ? (newStatus === 'paused' ? 'המנוי הושהה' : 'המנוי חודש')
        : (newStatus === 'paused' ? 'Подписка приостановлена' : 'Подписка возобновлена'))
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function handleCancelSubscription() {
    if (!subscription) return
    if (!confirm(locale === 'he' ? 'לבטל את המנוי?' : 'Отменить подписку?')) return
    try {
      const { error } = await supabase
        .from('client_subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', subscription.id)
      if (error) throw error
      setSubscription(null)
      toast.success(locale === 'he' ? 'המנוי בוטל' : 'Подписка отменена')
      await loadRecurringData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        const updated = await res.json()
        setIsEditing(false)
        if (onSaved) onSaved(updated)
      }
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const t = {
    he: {
      visits: 'היסטוריית ביקורים',
      payments: 'פיננסים',
      messages: 'הודעות',
      notes: 'הערות',
      totalSpent: 'סה"כ הוצאות',
      edit: 'עריכה',
      noVisits: 'אין ביקורים',
      noPayments: 'אין תשלומים',
      date: 'תאריך',
      status: 'סטטוס',
      price: 'מחיר',
      method: 'אמצעי',
      phone: 'טלפון',
      birthDate: 'תאריך לידה',
      address: 'כתובת',
      notesLabel: 'הערות',
      loading: 'טוען...',
      comingSoon: 'בקרוב',
      noNotes: 'אין הערות',
    },
    ru: {
      visits: 'История визитов',
      payments: 'Финансы',
      messages: 'Сообщения',
      notes: 'Заметки',
      totalSpent: 'Всего потрачено',
      edit: 'Изменить',
      noVisits: 'Нет визитов',
      noPayments: 'Нет платежей',
      date: 'Дата',
      status: 'Статус',
      price: 'Цена',
      method: 'Способ',
      phone: 'Телефон',
      birthDate: 'Дата рождения',
      address: 'Адрес',
      notesLabel: 'Заметки',
      loading: 'Загрузка...',
      comingSoon: 'Скоро',
      noNotes: 'Нет заметок',
    },
  }

  const l = t[locale]

  if (!isOpen || !client) return null

  const totalSpent = payments.reduce((sum: number, p: any) => sum + (p.amount || p.price || 0), 0)

  const tabs = [
    { key: 'visits', label: l.visits, icon: <Calendar size={16} /> },
    { key: 'payments', label: l.payments, icon: <CreditCard size={16} /> },
    { key: 'messages', label: l.messages, icon: <MessageSquare size={16} /> },
    { key: 'notes', label: l.notes, icon: <FileText size={16} /> },
    ...(features.recurringEnabled ? [{ key: 'recurring', label: locale === 'he' ? 'חיוב חוזר' : 'Рекурр.', icon: <RefreshCw size={16} /> }] : []),
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch"
      onClick={onClose}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Panel */}
      <div
        className="relative z-10 bg-background shadow-2xl flex h-full w-full max-w-5xl mx-auto my-4 rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'grid', gridTemplateColumns: '350px 1fr' }}
      >
        {/* === ЛЕВАЯ ПАНЕЛЬ — Профиль (30%) === */}
        <div className="p-6 flex flex-col border-e border-muted bg-muted/20 overflow-y-auto">
          {/* Закрыть */}
          <button
            onClick={onClose}
            className="self-end mb-4 text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>

          {/* Аватар */}
          <div className="flex flex-col items-center mb-6">
            <div className={`${avatarColor} w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-3`}>
              {initials}
            </div>
            <h2 className="text-xl font-bold text-center">{fullName}</h2>
          </div>

          {/* Быстрые контакты */}
          <div className="flex justify-center gap-3 mb-6">
            {client.phone && (
              <>
                <button
                  onClick={() => window.location.href = `tel:${client.phone}`}
                  className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 flex items-center justify-center transition"
                >
                  <Phone size={18} />
                </button>
                <button
                  onClick={() => window.open(`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`, '_blank')}
                  className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 flex items-center justify-center transition"
                >
                  <MessageCircle size={18} />
                </button>
              </>
            )}
            {client.email && (
              <button
                onClick={() => window.location.href = `mailto:${client.email}`}
                className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 flex items-center justify-center transition"
              >
                <Mail size={18} />
              </button>
            )}
          </div>

          {/* Данные клиента */}
          {isEditing ? (
            <div className="space-y-3 flex-1">
              <div>
                <label className="text-xs text-muted-foreground">{locale === 'he' ? 'שם פרטי' : 'Имя'}</label>
                <input
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                  className="w-full py-2 px-3 rounded-lg border bg-background text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{locale === 'he' ? 'שם משפחה' : 'Фамилия'}</label>
                <input
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                  className="w-full py-2 px-3 rounded-lg border bg-background text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{locale === 'he' ? 'טלפון' : 'Телефон'}</label>
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full py-2 px-3 rounded-lg border bg-background text-sm mt-1"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <input
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full py-2 px-3 rounded-lg border bg-background text-sm mt-1"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{locale === 'he' ? 'כתובת' : 'Адрес'}</label>
                <input
                  value={editForm.address}
                  onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                  className="w-full py-2 px-3 rounded-lg border bg-background text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{locale === 'he' ? 'תאריך לידה' : 'Дата рождения'}</label>
                <input
                  type="date"
                  value={editForm.date_of_birth}
                  onChange={(e) => setEditForm({...editForm, date_of_birth: e.target.value})}
                  className="w-full py-2 px-3 rounded-lg border bg-background text-sm mt-1"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{locale === 'he' ? 'הערות' : 'Заметки'}</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                  className="w-full py-2 px-3 rounded-lg border bg-background text-sm mt-1 resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {saving ? '...' : (locale === 'he' ? 'שמור' : 'Сохранить')}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition"
                >
                  {locale === 'he' ? 'ביטול' : 'Отмена'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {client.phone && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{l.phone}</span>
                  <span className="font-medium" dir="ltr">{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium" dir="ltr">{client.email}</span>
                </div>
              )}
              {client.date_of_birth && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{l.birthDate}</span>
                  <span className="font-medium">{new Date(client.date_of_birth).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}</span>
                </div>
              )}
              {client.address && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{l.address}</span>
                  <span className="font-medium">{client.address}</span>
                </div>
              )}
              {client.notes && (
                <div className="text-sm mt-4">
                  <span className="text-muted-foreground block mb-1">{l.notesLabel}</span>
                  <p className="whitespace-pre-wrap text-sm">{client.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Кнопка Edit внизу */}
          {!isEditing && (
            <TrinityButton
              variant="edit"
              fullWidth
              icon={<Pencil size={16} />}
              onClick={() => setIsEditing(true)}
              className="mt-4"
            >
              {l.edit}
            </TrinityButton>
          )}
        </div>

        {/* === ПРАВАЯ ПАНЕЛЬ — Activity Stream (70%) === */}
        <div className="flex flex-col">
          {/* KPI заголовок */}
          <div className="px-6 py-4 border-b border-muted flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{l.totalSpent}</p>
              <p className="text-2xl font-bold">₪{totalSpent.toLocaleString()}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-muted px-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {l.loading}
              </div>
            ) : activeTab === 'visits' ? (
              visits.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground text-sm">{l.noVisits}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-muted text-muted-foreground">
                      <th className="text-start py-2 font-medium">{l.date}</th>
                      <th className="text-start py-2 font-medium">{l.status}</th>
                      <th className="text-end py-2 font-medium">{l.price}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((v: any) => (
                      <tr key={v.id} className="border-b border-muted/50 hover:bg-muted/30 transition">
                        <td className="py-3">
                          {new Date(v.scheduled_at || v.created_at).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}
                        </td>
                        <td className="py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              v.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : v.status === 'in_progress'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : v.status === 'cancelled'
                                ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                        <td className="py-3 text-end font-medium">
                          {v.price ? `₪${v.price}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : activeTab === 'payments' ? (
              payments.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground text-sm">{l.noPayments}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-muted text-muted-foreground">
                      <th className="text-start py-2 font-medium">{l.date}</th>
                      <th className="text-start py-2 font-medium">{l.method}</th>
                      <th className="text-start py-2 font-medium">{l.status}</th>
                      <th className="text-end py-2 font-medium">{l.price}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p: any) => (
                      <tr key={p.id} className="border-b border-muted/50 hover:bg-muted/30 transition">
                        <td className="py-3">{new Date(p.created_at).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}</td>
                        <td className="py-3">{p.method || '—'}</td>
                        <td className="py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              p.status === 'completed' || p.status === 'success'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 text-end font-medium">₪{p.amount || p.price || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : activeTab === 'messages' ? (
              <p className="text-center py-12 text-muted-foreground text-sm">
                {l.comingSoon}
              </p>
            ) : activeTab === 'recurring' ? (
              recurringLoading ? (
                <p className="text-center py-12 text-muted-foreground text-sm">{l.loading}</p>
              ) : (
                <div className="space-y-5">
                  {/* Subscription block */}
                  {!subscription ? (
                    <div className="text-center py-8 border-2 border-dashed border-muted rounded-xl">
                      <RefreshCw className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                      <p className="font-medium mb-1">{locale === 'he' ? 'אין מנוי פעיל' : 'Нет активной подписки'}</p>
                      <p className="text-sm text-muted-foreground mb-4">{locale === 'he' ? 'הגדר חיוב אוטומטי ללקוח' : 'Настройте автоматическое списание для клиента'}</p>
                      <button
                        onClick={() => { setShowSubscribeModal(true); setSelectedPlanId(recurringPlans[0]?.id || '') }}
                        className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
                      >
                        <Plus size={16} />
                        {locale === 'he' ? 'הוסף מנוי' : 'Оформить подписку'}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border bg-indigo-50 dark:bg-indigo-900/20 p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-base">📋 {subscription.plan_name}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            💳 ₪{subscription.price} / {subscription.billing_cycle === 'monthly' ? (locale === 'he' ? 'חודש' : 'мес.') : subscription.billing_cycle === 'yearly' ? (locale === 'he' ? 'שנה' : 'год') : `${subscription.custom_days} ${locale === 'he' ? 'ימים' : 'дн.'}`}
                          </p>
                          {subscription.next_billing_date && (
                            <p className="text-sm text-muted-foreground">
                              📅 {locale === 'he' ? 'חיוב הבא:' : 'Следующее списание:'} {new Date(subscription.next_billing_date).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}
                            </p>
                          )}
                          {subscription.card_last4 && (
                            <p className="text-sm text-muted-foreground">🔑 **** {subscription.card_last4}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${subscription.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {subscription.status === 'active' ? (locale === 'he' ? 'פעיל' : 'Активен') : (locale === 'he' ? 'מושהה' : 'Пауза')}
                        </span>
                      </div>
                      <div className="flex gap-2 flex-wrap pt-1">
                        <button
                          onClick={handleChargeNow}
                          disabled={charging || subscription.status !== 'active'}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                        >
                          {charging ? '...' : (locale === 'he' ? 'חייב עכשיו' : 'Списать сейчас')}
                        </button>
                        <button
                          onClick={handleToggleStatus}
                          className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition"
                        >
                          {subscription.status === 'active'
                            ? (locale === 'he' ? 'השהה' : 'Пауза')
                            : (locale === 'he' ? 'חדש' : 'Возобновить')}
                        </button>
                        <button
                          onClick={handleCancelSubscription}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 transition"
                        >
                          {locale === 'he' ? 'בטל מנוי' : 'Отменить'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Charges history */}
                  {charges.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">{locale === 'he' ? 'היסטוריית חיובים' : 'История списаний'}</p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-muted text-muted-foreground">
                            <th className="text-start py-2 font-medium">{locale === 'he' ? 'תאריך' : 'Дата'}</th>
                            <th className="text-start py-2 font-medium">{locale === 'he' ? 'סכום' : 'Сумма'}</th>
                            <th className="text-start py-2 font-medium">{locale === 'he' ? 'סטטוס' : 'Статус'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {charges.map((c: any) => (
                            <tr key={c.id} className="border-b border-muted/50">
                              <td className="py-2 text-xs">{new Date(c.created_at).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}</td>
                              <td className="py-2 text-xs font-medium">₪{c.amount}</td>
                              <td className="py-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                  {c.status === 'success' ? (locale === 'he' ? 'הצליח' : 'Успех') : (locale === 'he' ? 'נכשל' : 'Ошибка')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="py-4">
                <p className="whitespace-pre-wrap text-sm">{client.notes || l.noNotes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subscribe Modal */}
      {showSubscribeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={() => setShowSubscribeModal(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 bg-background rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{locale === 'he' ? 'הוסף מנוי' : 'Оформить подписку'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">{locale === 'he' ? 'בחר תוכנית' : 'Выберите план'}</label>
                <select
                  value={selectedPlanId}
                  onChange={e => setSelectedPlanId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                >
                  <option value="">{locale === 'he' ? 'בחר...' : 'Выберите...'}</option>
                  {recurringPlans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ₪{p.price} / {p.billing_cycle === 'monthly' ? (locale === 'he' ? 'חודש' : 'мес.') : p.billing_cycle === 'yearly' ? (locale === 'he' ? 'שנה' : 'год') : `${p.custom_days} ${locale === 'he' ? 'ימים' : 'дн.'}`}
                    </option>
                  ))}
                </select>
                {selectedPlanId && (() => {
                  const p = recurringPlans.find(x => x.id === selectedPlanId)
                  return p ? (
                    <p className="text-xs text-muted-foreground mt-1">₪{p.price} / {p.billing_cycle}</p>
                  ) : null
                })()}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{locale === 'he' ? 'תאריך חיוב ראשון' : 'Дата первого списания'}</label>
                <input
                  type="date"
                  value={firstBillingDate}
                  onChange={e => setFirstBillingDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                />
              </div>
              {client.card_token ? (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-700 dark:text-emerald-300">
                  🔑 {locale === 'he' ? `כרטיס: **** ${client.card_last4}` : `Карта: **** ${client.card_last4}`}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-300">
                  ⚠️ {locale === 'he' ? 'טוקן הכרטיס יתקבל בתשלום הראשון' : 'Токен карты будет получен при первой оплате'}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowSubscribeModal(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition">
                {locale === 'he' ? 'ביטול' : 'Отмена'}
              </button>
              <button onClick={handleSubscribe} disabled={subscribing || !selectedPlanId} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50">
                {subscribing ? '...' : (locale === 'he' ? 'הוסף מנוי' : 'Оформить')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Calendar, DollarSign, MessageSquare, Trash2, Phone, MessageCircle, Pencil, ArrowRight, ArrowLeft, RefreshCw, Plus } from 'lucide-react'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EditClientSheet } from './EditClientSheet'
import { getClientName, getClientInitials } from '@/lib/client-utils'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

type Tab = 'main' | 'visits' | 'payments' | 'sms' | 'gdpr' | 'recurring'

interface ClientBottomSheetProps {
  client: {
    id: string
    first_name?: string
    last_name?: string
    name?: string // legacy
    phone?: string
    email?: string
    visits_count?: number
    last_visit?: string
    notes?: string
    created_at?: string
  }
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru'
  isDemo?: boolean
  enabledModules?: Record<string, boolean>
  onEdit?: (client: any) => void
  onDelete?: (clientId: string) => void
}

export function ClientBottomSheet({
  client,
  isOpen,
  onClose,
  locale,
  isDemo,
  enabledModules,
  onEdit,
  onDelete,
}: ClientBottomSheetProps) {
  const [activeTab, setActiveTab] = useState<Tab>('main')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [visits, setVisits] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loadingVisits, setLoadingVisits] = useState(false)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  // Recurring state
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()
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

  const clientName = getClientName(client)
  const initials = getClientInitials(client)
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500']
  const avatarColor = colors[clientName.charCodeAt(0) % colors.length]

  // RTL-aware back arrow
  const BackIcon = locale === 'he' ? ArrowRight : ArrowLeft

  // Загрузка визитов
  async function loadVisits() {
    setActiveTab('visits')
    setLoadingVisits(true)
    try {
      const res = await fetch(`/api/clients/${client.id}/visits`)
      if (res.ok) setVisits(await res.json())
    } catch (e) {
      console.error(e)
    }
    setLoadingVisits(false)
  }

  // Загрузка платежей
  async function loadPayments() {
    setActiveTab('payments')
    setLoadingPayments(true)
    try {
      const res = await fetch(`/api/clients/${client.id}/payments`)
      if (res.ok) setPayments(await res.json())
    } catch (e) {
      console.error(e)
    }
    setLoadingPayments(false)
  }

  async function loadRecurring() {
    setActiveTab('recurring')
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
      console.error(e)
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
        card_token: (client as any).card_token || null,
        card_last4: (client as any).card_last4 || null,
      })
      if (error) throw error
      toast.success(locale === 'he' ? 'המנוי נוצר בהצלחה' : 'Подписка оформлена')
      setShowSubscribeModal(false)
      await loadRecurring()
    } catch (e: any) {
      toast.error(e.message || (locale === 'he' ? 'שגיאה' : 'Ошибка'))
    } finally {
      setSubscribing(false)
    }
  }

  async function handleChargeNow() {
    if (!subscription) return
    if (!(client as any).card_token) {
      toast.error(locale === 'he' ? 'אין טוקן כרטיס' : 'Токен карты не найден')
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
          card_token: (client as any).card_token,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(locale === 'he' ? 'החיוב בוצע' : 'Списание выполнено')
      await loadRecurring()
    } catch (e: any) {
      toast.error(e.message || (locale === 'he' ? 'שגיאה' : 'Ошибка'))
    } finally {
      setCharging(false)
    }
  }

  async function handleToggleStatus() {
    if (!subscription) return
    const newStatus = subscription.status === 'active' ? 'paused' : 'active'
    try {
      const { error } = await supabase.from('client_subscriptions').update({ status: newStatus }).eq('id', subscription.id)
      if (error) throw error
      setSubscription({ ...subscription, status: newStatus })
      toast.success(locale === 'he' ? (newStatus === 'paused' ? 'המנוי הושהה' : 'המנוי חודש') : (newStatus === 'paused' ? 'Пауза' : 'Возобновлено'))
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function handleCancelSubscription() {
    if (!subscription) return
    if (!confirm(locale === 'he' ? 'לבטל את המנוי?' : 'Отменить подписку?')) return
    try {
      const { error } = await supabase.from('client_subscriptions').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', subscription.id)
      if (error) throw error
      setSubscription(null)
      toast.success(locale === 'he' ? 'המנוי בוטל' : 'Подписка отменена')
      await loadRecurring()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // Сброс при закрытии
  function handleClose() {
    setActiveTab('main')
    setConfirmDelete(false)
    onClose()
  }

  // Кнопка назад
  function BackButton() {
    return (
      <button
        onClick={() => {
          setActiveTab('main')
          setConfirmDelete(false)
        }}
        className="flex items-center gap-1 text-sm text-primary mb-4"
      >
        <BackIcon size={16} />
        {locale === 'he' ? 'חזרה' : 'Назад'}
      </button>
    )
  }

  return (
    <>
    <TrinityBottomDrawer isOpen={isOpen} onClose={handleClose} title={activeTab === 'main' ? clientName : undefined}>
      {/* ===== MAIN TAB ===== */}
      {activeTab === 'main' && (
        <>
          {/* Аватар + контакты */}
          <div className="flex flex-col items-center mb-5">
            <div
              className={`${avatarColor} w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2`}
            >
              {initials}
            </div>
            <h3 className="text-xl font-bold">{clientName}</h3>
            {client.phone && <p className="text-muted-foreground text-sm">{client.phone}</p>}
            {client.email && <p className="text-muted-foreground text-xs">{client.email}</p>}
          </div>

          {/* Быстрые действия — звонок, WhatsApp, редактирование */}
          <div className="flex justify-center gap-3 mb-5">
            {client.phone && (
              <a
                href={`tel:${client.phone}`}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              >
                <Phone size={20} />
              </a>
            )}
            {client.phone && (
              <a
                href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 rounded-full bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
              >
                <MessageCircle size={20} />
              </a>
            )}
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground"
            >
              <Pencil size={20} />
            </button>
          </div>

          {/* Краткая статистика */}
          <div className="flex justify-around py-3 mb-4 bg-muted/50 rounded-xl">
            <div className="text-center">
              <p className="text-lg font-bold">{client.visits_count || 0}</p>
              <p className="text-xs text-muted-foreground">{locale === 'he' ? 'ביקורים' : 'Визитов'}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">
                {client.last_visit
                  ? new Date(client.last_visit).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground">{locale === 'he' ? 'ביקור אחרון' : 'Последний'}</p>
            </div>
          </div>

          {/* Навигация 2x2 */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {/* Визиты */}
            <button
              onClick={loadVisits}
              disabled={isDemo || enabledModules?.visits === false}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border hover:bg-muted/50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <Calendar size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs font-medium">{locale === 'he' ? 'ביקורים' : 'Визиты'}</span>
            </button>

            {/* Платежи */}
            <button
              onClick={loadPayments}
              disabled={isDemo || enabledModules?.payments === false}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border hover:bg-muted/50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign size={20} className="text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xs font-medium">{locale === 'he' ? 'תשלומים' : 'Платежи'}</span>
            </button>

            {/* SMS */}
            <button
              onClick={() => setActiveTab('sms')}
              disabled={isDemo || enabledModules?.sms === false}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border hover:bg-muted/50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <MessageSquare size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-medium">SMS</span>
            </button>

            {/* GDPR / Удаление */}
            <button
              onClick={() => setActiveTab('gdpr')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border hover:bg-muted/50 transition"
            >
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <span className="text-xs font-medium">GDPR</span>
            </button>

            {/* Рекуррентные платежи */}
            {enabledModules?.recurring !== false && (
              <button
                onClick={loadRecurring}
                disabled={isDemo}
                className="col-span-2 flex flex-col items-center gap-2 p-4 rounded-xl bg-card border hover:bg-muted/50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <RefreshCw size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-xs font-medium">{locale === 'he' ? 'חיוב חוזר' : 'Рекурр. платежи'}</span>
              </button>
            )}
          </div>

          {/* Заметки */}
          {client.notes && (
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">{locale === 'he' ? 'הערות' : 'Заметки'}</p>
              <p className="text-sm">{client.notes}</p>
            </div>
          )}
        </>
      )}

      {/* ===== VISITS TAB ===== */}
      {activeTab === 'visits' && (
        <>
          <BackButton />
          <h4 className="font-semibold mb-3">{locale === 'he' ? 'היסטוריית ביקורים' : 'История визитов'}</h4>
          {loadingVisits ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {locale === 'he' ? 'טוען...' : 'Загрузка...'}
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {locale === 'he' ? 'אין ביקורים' : 'Визитов нет'}
            </div>
          ) : (
            <div className="space-y-2">
              {visits.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between py-2.5 border-b border-muted">
                  <div>
                    <p className="text-sm font-medium">{v.service_type || (locale === 'he' ? 'ביקור' : 'Визит')}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.scheduled_at || v.created_at).toLocaleDateString(
                        locale === 'he' ? 'he-IL' : 'ru-RU'
                      )}
                    </p>
                  </div>
                  <div className="text-end">
                    {v.price != null && <p className="text-sm font-bold">₪{v.price}</p>}
                    <StatusBadge status={v.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== PAYMENTS TAB ===== */}
      {activeTab === 'payments' && (
        <>
          <BackButton />
          <h4 className="font-semibold mb-3">{locale === 'he' ? 'היסטוריית תשלומים' : 'История платежей'}</h4>
          {loadingPayments ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {locale === 'he' ? 'טוען...' : 'Загрузка...'}
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {locale === 'he' ? 'אין תשלומים' : 'Платежей нет'}
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-muted">
                  <div>
                    <p className="text-sm font-medium">{p.description || (locale === 'he' ? 'תשלום' : 'Платёж')}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-bold">₪{p.amount}</p>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== SMS TAB ===== */}
      {activeTab === 'sms' && (
        <>
          <BackButton />
          <h4 className="font-semibold mb-3">SMS</h4>
          <div className="text-center py-8 text-muted-foreground text-sm">
            {locale === 'he' ? 'בקרוב...' : 'Скоро...'}
          </div>
        </>
      )}

      {/* ===== RECURRING TAB ===== */}
      {activeTab === 'recurring' && (
        <>
          <BackButton />
          <h4 className="font-semibold mb-4">{locale === 'he' ? 'חיוב חוזר' : 'Рекуррентные платежи'}</h4>
          {recurringLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">{locale === 'he' ? 'טוען...' : 'Загрузка...'}</div>
          ) : !subscription ? (
            <div className="text-center py-8 border-2 border-dashed border-muted rounded-xl">
              <RefreshCw className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium mb-1">{locale === 'he' ? 'אין מנוי פעיל' : 'Нет активной подписки'}</p>
              <p className="text-sm text-muted-foreground mb-4">{locale === 'he' ? 'הגדר חיוב אוטומטי' : 'Настройте автоматическое списание'}</p>
              <button
                onClick={() => { setShowSubscribeModal(true); setSelectedPlanId(recurringPlans[0]?.id || '') }}
                className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
              >
                <Plus size={16} />
                {locale === 'he' ? 'הוסף מנוי' : 'Оформить подписку'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border bg-indigo-50 dark:bg-indigo-900/20 p-4 space-y-2">
                <p className="font-semibold">📋 {subscription.plan_name}</p>
                <p className="text-sm text-muted-foreground">
                  💳 ₪{subscription.price} / {subscription.billing_cycle === 'monthly' ? (locale === 'he' ? 'חודש' : 'мес.') : subscription.billing_cycle === 'yearly' ? (locale === 'he' ? 'שנה' : 'год') : `${subscription.custom_days} ${locale === 'he' ? 'ימים' : 'дн.'}`}
                </p>
                {subscription.next_billing_date && (
                  <p className="text-sm text-muted-foreground">
                    📅 {locale === 'he' ? 'חיוב הבא:' : 'Следующее:'} {new Date(subscription.next_billing_date).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}
                  </p>
                )}
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${subscription.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {subscription.status === 'active' ? (locale === 'he' ? 'פעיל' : 'Активен') : (locale === 'he' ? 'מושהה' : 'Пауза')}
                </span>
                <div className="flex gap-2 flex-wrap pt-1">
                  <button
                    onClick={handleChargeNow}
                    disabled={charging || subscription.status !== 'active'}
                    className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {charging ? '...' : (locale === 'he' ? 'חייב עכשיו' : 'Списать')}
                  </button>
                  <button
                    onClick={handleToggleStatus}
                    className="flex-1 py-2 rounded-lg border text-xs font-medium hover:bg-muted transition"
                  >
                    {subscription.status === 'active' ? (locale === 'he' ? 'השהה' : 'Пауза') : (locale === 'he' ? 'חדש' : 'Возобновить')}
                  </button>
                  <button
                    onClick={handleCancelSubscription}
                    className="flex-1 py-2 rounded-lg border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 transition"
                  >
                    {locale === 'he' ? 'בטל' : 'Отменить'}
                  </button>
                </div>
              </div>

              {charges.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">{locale === 'he' ? 'היסטוריית חיובים' : 'История списаний'}</p>
                  <div className="space-y-1">
                    {charges.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between py-2 border-b border-muted text-sm">
                        <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}</span>
                        <span className="font-medium">₪{c.amount}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {c.status === 'success' ? (locale === 'he' ? 'הצליח' : 'Успех') : (locale === 'he' ? 'נכשל' : 'Ошибка')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subscribe Modal */}
          {showSubscribeModal && (
            <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setShowSubscribeModal(false)}>
              <div className="absolute inset-0 bg-black/40" />
              <div className="relative z-10 bg-background rounded-t-2xl shadow-xl p-6 w-full" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-bold mb-4">{locale === 'he' ? 'הוסף מנוי' : 'Оформить подписку'}</h3>
                <div className="space-y-3">
                  <select
                    value={selectedPlanId}
                    onChange={e => setSelectedPlanId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                  >
                    <option value="">{locale === 'he' ? 'בחר תוכנית...' : 'Выберите план...'}</option>
                    {recurringPlans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₪{p.price} / {p.billing_cycle === 'monthly' ? (locale === 'he' ? 'חודש' : 'мес.') : p.billing_cycle === 'yearly' ? (locale === 'he' ? 'שנה' : 'год') : `${p.custom_days} ${locale === 'he' ? 'ימים' : 'дн.'}`}
                      </option>
                    ))}
                  </select>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{locale === 'he' ? 'תאריך חיוב ראשון' : 'Дата первого списания'}</label>
                    <input
                      type="date"
                      value={firstBillingDate}
                      onChange={e => setFirstBillingDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                    />
                  </div>
                  {!(client as any).card_token && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-300">
                      ⚠️ {locale === 'he' ? 'טוקן הכרטיס יתקבל בתשלום הראשון' : 'Токен карты будет получен при первой оплате'}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setShowSubscribeModal(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-medium">
                    {locale === 'he' ? 'ביטול' : 'Отмена'}
                  </button>
                  <button onClick={handleSubscribe} disabled={subscribing || !selectedPlanId} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium disabled:opacity-50">
                    {subscribing ? '...' : (locale === 'he' ? 'הוסף' : 'Оформить')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== GDPR TAB ===== */}
      {activeTab === 'gdpr' && (
        <>
          <BackButton />
          <h4 className="font-semibold mb-3">
            {locale === 'he' ? 'מחיקת נתוני לקוח' : 'Удаление данных клиента'}
          </h4>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
            <p className="text-sm text-red-700 dark:text-red-400 mb-2 font-medium">
              {locale === 'he' ? '⚠️ פעולה זו בלתי הפיכה!' : '⚠️ Это действие необратимо!'}
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/80">
              {locale === 'he'
                ? 'מחיקת הלקוח תסיר את כל הנתונים שלו לצמיתות: פרטים אישיים, היסטוריית ביקורים, תשלומים והערות. לא ניתן לשחזר נתונים אלה.'
                : 'Удаление клиента навсегда удалит все его данные: личную информацию, историю визитов, платежей и заметки. Восстановление невозможно.'}
            </p>
          </div>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-3 rounded-xl border-2 border-red-500 text-red-600 dark:text-red-400 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              {locale === 'he' ? 'מחק לקוח (GDPR)' : 'Удалить клиента (GDPR)'}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-center text-sm font-medium text-red-600 dark:text-red-400">
                {locale === 'he' ? 'בטוח? לחץ שוב לאישור סופי' : 'Уверены? Нажмите ещё раз для подтверждения'}
              </p>
              <button
                onClick={() => {
                  onDelete?.(client.id)
                  handleClose()
                }}
                className="w-full py-3 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition"
              >
                {locale === 'he' ? '🗑️ כן, מחק לצמיתות' : '🗑️ Да, удалить навсегда'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="w-full py-3 rounded-xl bg-muted text-foreground font-medium text-sm"
              >
                {locale === 'he' ? 'ביטול' : 'Отмена'}
              </button>
            </div>
          )}
        </>
      )}
    </TrinityBottomDrawer>

    {/* Форма редактирования */}
    <EditClientSheet
      client={client}
      isOpen={editOpen}
      onClose={() => setEditOpen(false)}
      onSaved={(updated) => {
        // Обновить данные клиента в родителе через onClose
        onClose()
      }}
      locale={locale}
    />
  </>
  )
}

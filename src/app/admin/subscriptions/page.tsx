'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { Shield, CheckCircle, XCircle, Users, Package, Plus, Mail, Send, Loader2, ChevronRight, X, Pencil, CreditCard } from 'lucide-react'
import { MODULES } from '@/lib/modules-config'
import { EditOrganizationModal } from '@/components/modals/other/EditOrganizationModal'
import Modal from '@/components/ui/Modal'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface Organization {
  id: string
  name: string
  plan?: string
  subscription_status: string
  subscription_expires_at: string | null
  owner_name: string
  owner_email: string
  phone: string
  display_name: string
  features?: any
  billing_amount?: number
  billing_due_date?: string
  tranzila_card_token?: string
  tranzila_card_last4?: string
  payments_enabled?: boolean
  recurring_enabled?: boolean
  branches_enabled?: boolean
}

interface AccessRequest {
  id: string
  user_id: string
  email: string
  full_name: string
  requested_at: string
  status: string
}

const SUBSCRIPTION_STATUSES = [
  { value: 'active',   label_he: 'פעיל',     label_ru: 'Активный',    color: 'green'  },
  { value: 'inactive', label_he: 'לא פעיל',  label_ru: 'Неактивный',  color: 'red'    },
  { value: 'demo',     label_he: 'דמו',       label_ru: 'Демо',        color: 'yellow' },
]

export default function AdminSubscriptionsPage() {
  const { language } = useLanguage()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const searchParams = useSearchParams()
  const autopayHandled = useRef(false)

  // Core state
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Extend dialog
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [extendDialogOpen, setExtendDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<string>('active')
  const [newExpiryDate, setNewExpiryDate] = useState<string>('')

  // Modules modal
  const [modulesModalOpen, setModulesModalOpen] = useState(false)
  const [modulesOrg, setModulesOrg] = useState<Organization | null>(null)
  const [modulesState, setModulesState] = useState<Record<string, boolean>>({})
  const [savingModules, setSavingModules] = useState(false)

  // Org detail sheet/modal
  const [selectedOrgSheet, setSelectedOrgSheet] = useState<Organization | null>(null)

  // Edit org modal
  const [editOrgModalOpen, setEditOrgModalOpen] = useState(false)
  const [orgToEdit, setOrgToEdit] = useState<Organization | null>(null)

  // Invite modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)

  // Autopay modal
  const [autopayModalOpen, setAutopayModalOpen] = useState(false)
  const [autopayOrg, setAutopayOrg] = useState<Organization | null>(null)
  const [autopayAmount, setAutopayAmount] = useState<number>(199)
  const [autopayBillingDate, setAutopayBillingDate] = useState<string>('')
  const [autopayLoading, setAutopayLoading] = useState(false)
  const [autopaySuccess, setAutopaySuccess] = useState<{ email: string } | null>(null)

  const t = {
    he: {
      title: 'מנויים וגישה', organizations: 'ארגונים', accessRequests: 'בקשות גישה',
      extend: 'הארכה', extendAccess: 'הארכת גישה', modules: 'מודולים',
      status: 'סטטוס', expiryDate: 'תאריך תפוגה', save: 'שמור', cancel: 'ביטול',
      deactivate: 'השבת', approve: 'אשר (14 ימים)', reject: 'דחה',
      accessExtended: 'הגישה הוארכה', errorExtending: 'שגיאה בהארכה',
      deactivated: 'הושבת', errorDeactivating: 'שגיאה בהשבתה',
      requestApproved: 'הבקשה אושרה', errorApproving: 'שגיאה באישור',
      requestRejected: 'הבקשה נדחתה', errorRejecting: 'שגיאה בדחייה',
      confirmDeactivate: 'להשבית ארגון?',
      sendInvitation: 'שלח הזמנה', email: 'אימייל', message: 'הודעה',
      messagePlaceholder: 'הודעה אישית...', send: 'שלח', sending: 'שולח...',
      successSent: 'ההזמנה נשלחה ל', inviteUrl: 'קישור:', emailRequired: 'נדרש אימייל',
      autopayTitle: 'חיבור תשלום אוטומטי', autopayAmount: 'סכום (₪/חודש)',
      autopayDate: 'תאריך חיוב ראשון', sendLink: 'שלח קישור ללקוח',
      linkSent: 'הקישור נשלח!', close: 'סגור',
    },
    ru: {
      title: 'Подписки и доступ', organizations: 'Организации', accessRequests: 'Запросы на доступ',
      extend: 'Продлить', extendAccess: 'Продление доступа', modules: 'Модули',
      status: 'Статус', expiryDate: 'Дата окончания', save: 'Сохранить', cancel: 'Отмена',
      deactivate: 'Деактивировать', approve: 'Одобрить (14 дней)', reject: 'Отклонить',
      accessExtended: 'Доступ продлён', errorExtending: 'Ошибка продления',
      deactivated: 'Деактивировано', errorDeactivating: 'Ошибка деактивации',
      requestApproved: 'Запрос одобрен', errorApproving: 'Ошибка одобрения',
      requestRejected: 'Запрос отклонён', errorRejecting: 'Ошибка отклонения',
      confirmDeactivate: 'Деактивировать организацию?',
      sendInvitation: 'Отправить приглашение', email: 'Email', message: 'Сообщение',
      messagePlaceholder: 'Персональное сообщение...', send: 'Отправить', sending: 'Отправка...',
      successSent: 'Приглашение отправлено на', inviteUrl: 'Ссылка:', emailRequired: 'Требуется email',
      autopayTitle: 'Автоплатёж', autopayAmount: 'Сумма (₪/мес)',
      autopayDate: 'Дата первого списания', sendLink: 'Отправить ссылку клиенту',
      linkSent: 'Ссылка отправлена!', close: 'Закрыть',
    },
  }[language]

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (autopayHandled.current) return
    const autopay = searchParams.get('autopay')
    if (autopay === 'success') {
      autopayHandled.current = true
      toast.success(language === 'he' ? 'תשלום אוטומטי הופעל!' : 'Автоплатёж подключён!')
      loadData()
    } else if (autopay === 'failed') {
      autopayHandled.current = true
      toast.error(language === 'he' ? 'תשלום נכשל' : 'Ошибка автоплатежа')
    }
  }, [searchParams])

  const loadData = async () => {
    try {
      const res = await fetch('/api/admin/subscriptions-list', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setOrganizations(data.organizations || [])
      setAccessRequests(data.accessRequests || [])
    } catch (error) {
      toast.error('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    // Map legacy statuses
    const normalized = (status === 'manual' || status === 'active') ? 'active'
      : (status === 'trial' || status === 'demo') ? 'demo'
      : (status === 'expired' || status === 'none' || status === 'inactive') ? 'inactive'
      : status
    const cfg = SUBSCRIPTION_STATUSES.find(s => s.value === normalized)
    if (!cfg) return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">—</Badge>
    const colors: Record<string, string> = {
      green:  'bg-green-500/10 text-green-600 border-green-500/20',
      yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      red:    'bg-red-500/10 text-red-600 border-red-500/20',
    }
    return <Badge className={colors[cfg.color]}>{language === 'he' ? cfg.label_he : cfg.label_ru}</Badge>
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleExtend = (org: Organization) => {
    const fresh = organizations.find(o => o.id === org.id) || org
    setSelectedOrg(fresh)
    const s = fresh.subscription_status
    setNewStatus((s === 'active' || s === 'manual') ? 'active' : (s === 'trial' || s === 'demo') ? 'demo' : 'inactive')
    setNewExpiryDate(
      fresh.subscription_expires_at
        ? new Date(fresh.subscription_expires_at).toISOString().split('T')[0]
        : (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0] })()
    )
    setExtendDialogOpen(true)
  }

  const handleSaveExtension = async () => {
    if (!selectedOrg || !newExpiryDate) return
    try {
      const expiresAt = new Date(newExpiryDate)
      expiresAt.setHours(23, 59, 59, 999)
      const res = await fetch('/api/admin/organizations/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: selectedOrg.id,
          subscription_update: { subscription_status: newStatus, subscription_expires_at: expiresAt.toISOString() },
        }),
      })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || t.errorExtending, { duration: 8000 }); return }
      toast.success(t.accessExtended)
      setExtendDialogOpen(false)
      setSelectedOrgSheet(null)
      await loadData()
    } catch { toast.error(t.errorExtending) }
  }

  const handleOpenModules = (org: Organization) => {
    const fresh = organizations.find(o => o.id === org.id) || org
    setModulesOrg(fresh)
    const saved = fresh.features?.modules || {}
    const full: Record<string, boolean> = {}
    for (const m of MODULES) full[m.key] = saved[m.key] ?? false
    setModulesState(full)
    setModulesModalOpen(true)
  }

  const handleSaveModules = async () => {
    if (!modulesOrg) return
    setSavingModules(true)
    try {
      const res = await fetch('/api/admin/organizations/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: modulesOrg.id, features: { modules: modulesState } }),
      })
      if (!res.ok) throw new Error()
      toast.success(language === 'he' ? 'מודולים עודכנו' : 'Модули сохранены')
      setModulesModalOpen(false)
      await loadData()
    } catch { toast.error(language === 'he' ? 'שגיאה' : 'Ошибка') } finally { setSavingModules(false) }
  }

  const handleDeactivate = async (orgId: string) => {
    if (!confirm(t.confirmDeactivate)) return
    try {
      const res = await fetch('/api/admin/organizations/features', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, subscription_update: { subscription_status: 'inactive' } }),
      })
      if (!res.ok) throw new Error()
      toast.success(t.deactivated)
      loadData()
    } catch { toast.error(t.errorDeactivating) }
  }

  const handleApproveRequest = async (userId: string) => {
    try {
      const res = await fetch(`/api/access/review?user_id=${userId}&action=approve&token=admin`)
      if (!res.ok) throw new Error()
      toast.success(t.requestApproved); loadData()
    } catch { toast.error(t.errorApproving) }
  }

  const handleRejectRequest = async (userId: string) => {
    if (!confirm(language === 'he' ? 'לדחות בקשה?' : 'Отклонить запрос?')) return
    try {
      const res = await fetch(`/api/access/review?user_id=${userId}&action=reject&token=admin`)
      if (!res.ok) throw new Error()
      toast.success(t.requestRejected); loadData()
    } catch { toast.error(t.errorRejecting) }
  }

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) { toast.error(t.emailRequired); return }
    setSendingInvite(true)
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, message: inviteMessage || null }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      const data = await res.json()
      if (data.warning && data.message) toast.info(data.message, { duration: 8000 })
      else toast.success(`${t.successSent} ${inviteEmail}`)
      if (data.inviteUrl) toast.info(`${t.inviteUrl} ${data.inviteUrl}`, { duration: 10000 })
      setInviteEmail(''); setInviteMessage(''); setInviteModalOpen(false)
    } catch (err: any) { toast.error(err.message || 'Failed to send') } finally { setSendingInvite(false) }
  }

  const handleOpenAutopay = (org: Organization) => {
    setAutopayOrg(org)
    setAutopayAmount(org.billing_amount || 199)
    setAutopayBillingDate(org.billing_due_date || new Date().toISOString().split('T')[0])
    setAutopaySuccess(null)
    setAutopayModalOpen(true)
  }

  const handleSendAutopayLink = async () => {
    if (!autopayOrg) return
    setAutopayLoading(true)
    try {
      const res = await fetch('/api/admin/subscription-payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: autopayOrg.id, amount: autopayAmount, billing_due_date: autopayBillingDate }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      const data = await res.json()
      setAutopaySuccess({ email: data.email_sent_to })
      toast.success(language === 'he' ? 'הקישור נשלח' : 'Ссылка отправлена')
      loadData()
    } catch (err: any) { toast.error(err.message || 'Failed') } finally { setAutopayLoading(false) }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="text-gray-500">Загрузка...</div></div>
  }

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-amber-600" />
        <h1 className="text-2xl md:text-3xl font-bold">{t.title}</h1>
      </div>

      {/* Access Requests */}
      {accessRequests.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />{t.accessRequests} ({accessRequests.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accessRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-semibold">{req.full_name || req.email}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{req.email}</p>
                    <p className="text-xs text-gray-500">{new Date(req.requested_at).toLocaleString(language === 'he' ? 'he-IL' : 'ru-RU')}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApproveRequest(req.user_id)}><CheckCircle className="w-4 h-4 mr-2" />{t.approve}</Button>
                    <Button size="sm" variant="outline" onClick={() => handleRejectRequest(req.user_id)}><XCircle className="w-4 h-4 mr-2" />{t.reject}</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizations List */}
      <Card>
        <CardHeader><CardTitle>{t.organizations}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {organizations.map((org) => {
              const isPaid = ['active', 'manual', 'trial', 'demo'].includes(org.subscription_status)
              return (
                <button key={org.id} onClick={() => setSelectedOrgSheet(org)}
                  className="w-full flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 hover:shadow-sm transition-all duration-150 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {org.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{org.display_name || org.name}</span>
                      {getStatusBadge(org.subscription_status)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{org.owner_name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-red-400'}`} />
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Org Detail — Modal (desktop) or Bottom Sheet (mobile) */}
      {selectedOrgSheet && (() => {
        const org = selectedOrgSheet
        const content = (
          <>
            {/* Header */}
            <div className="flex items-start gap-4 mb-6 pb-5 border-b border-gray-100 dark:border-gray-800">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                {org.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight">{org.display_name || org.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{org.owner_email}</p>
                <div className="mt-2">{getStatusBadge(org.subscription_status)}</div>
              </div>
            </div>
            {/* Info rows */}
            <div className="space-y-0 divide-y divide-gray-50 dark:divide-gray-800">
              {[
                { label: language === 'he' ? 'בעלים' : 'Владелец', value: org.owner_name },
                { label: language === 'he' ? 'טלפון' : 'Телефон', value: org.phone || '—' },
                { label: language === 'he' ? 'תוקף' : 'Истекает', value: org.subscription_expires_at ? new Date(org.subscription_expires_at).toLocaleDateString(language === 'he' ? 'he-IL' : 'ru-RU') : '—' },
                { label: language === 'he' ? 'סכום מנוי' : 'Сумма подписки', value: org.billing_amount ? `₪${org.billing_amount}/мес` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</span>
                </div>
              ))}
            </div>
            {/* Feature toggles */}
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
              {([
                { key: 'payments_enabled' as const, labelHe: 'תשלומים רגילים', labelRu: 'Обычные платежи', value: org.payments_enabled ?? true },
                { key: 'recurring_enabled' as const, labelHe: 'תשלומים חוזרים', labelRu: 'Рекуррентные платежи', value: org.recurring_enabled ?? false },
                { key: 'branches_enabled' as const, labelHe: 'סניפים', labelRu: 'Филиалы', value: org.branches_enabled ?? false },
              ] as const).map(({ key, labelHe, labelRu, value }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{language === 'he' ? labelHe : labelRu}</span>
                  <button type="button" onClick={async () => {
                    try {
                      const res = await fetch('/api/admin/organizations/features', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: org.id, [key]: !value }) })
                      if (!res.ok) throw new Error()
                      setSelectedOrgSheet({ ...org, [key]: !value })
                      setOrganizations(prev => prev.map(o => o.id === org.id ? { ...o, [key]: !value } : o))
                      toast.success(language === 'he' ? 'עודכן' : 'Сохранено')
                    } catch { toast.error(language === 'he' ? 'שגיאה' : 'Ошибка') }
                  }} className={`flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 flex items-center ${value ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className={`flex gap-2 mt-6 ${isDesktop ? 'flex-row flex-wrap' : 'flex-col'}`}>
              <button onClick={() => { handleOpenAutopay(org); setSelectedOrgSheet(null) }}
                className={`py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 ${isDesktop ? 'flex-[1.5]' : 'w-full'}`}>
                <CreditCard className="w-4 h-4 flex-shrink-0" />
                <span>{language === 'he' ? 'חיבור תשלום אוטומטי' : 'Автоплатёж'}</span>
              </button>
              <button onClick={() => { handleExtend(org); setSelectedOrgSheet(null) }}
                className={`py-2.5 px-2 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors ${isDesktop ? 'flex-1' : 'w-full'}`}>
                {t.extend}
              </button>
              <button onClick={() => { handleOpenModules(org); setSelectedOrgSheet(null) }}
                className={`py-2.5 px-2 rounded-xl bg-violet-600 text-white font-medium text-sm hover:bg-violet-700 transition-colors flex items-center justify-center gap-1.5 ${isDesktop ? 'flex-1' : 'w-full'}`}>
                <Package className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{t.modules}</span>
              </button>
              <button onClick={() => { setOrgToEdit(org); setEditOrgModalOpen(true); setSelectedOrgSheet(null) }}
                className={`py-2.5 px-2 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 ${isDesktop ? 'flex-1' : 'w-full'}`}>
                <Pencil className="w-3.5 h-3.5 flex-shrink-0" /><span>{language === 'he' ? 'ערוך' : 'Ред.'}</span>
              </button>
              <button onClick={() => { handleDeactivate(org.id); setSelectedOrgSheet(null) }}
                className={`py-2.5 px-2 rounded-xl bg-red-50 text-red-500 font-medium text-sm hover:bg-red-100 border border-red-100 ${isDesktop ? 'flex-1' : 'w-full'}`}>
                {language === 'he' ? 'השבת' : 'Деактив.'}
              </button>
            </div>
          </>
        )
        return isDesktop ? (
          <Modal open={!!selectedOrgSheet} onClose={() => setSelectedOrgSheet(null)} size="md">{content}</Modal>
        ) : (
          <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setSelectedOrgSheet(null)} />
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" /></div>
              <div className="px-5 pb-8 pt-2">
                <button onClick={() => setSelectedOrgSheet(null)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
                {content}
              </div>
            </div>
          </>
        )
      })()}

      {/* Extend Dialog */}
      <Modal open={extendDialogOpen && !!selectedOrg} onClose={() => setExtendDialogOpen(false)}
        title={t.extendAccess} subtitle={selectedOrg?.name} size="md"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setExtendDialogOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">{t.cancel}</button>
            <button onClick={handleSaveExtension} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">{t.save}</button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">{t.status}</label>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {SUBSCRIPTION_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{language === 'he' ? s.label_he : s.label_ru}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">{t.expiryDate}</label>
            <input type="date" value={newExpiryDate} onChange={(e) => setNewExpiryDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
      </Modal>

      {/* Modules Modal */}
      <Modal open={modulesModalOpen && !!modulesOrg} onClose={() => setModulesModalOpen(false)}
        title={t.modules} subtitle={modulesOrg?.name} size="md"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setModulesModalOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">{t.cancel}</button>
            <button onClick={handleSaveModules} disabled={savingModules} className="flex-1 py-3 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50">{savingModules ? '...' : t.save}</button>
          </div>
        }
      >
        <div className="space-y-2">
          {MODULES.map((mod) => {
            const isEnabled = modulesState[mod.key] ?? false
            return (
              <div key={mod.key} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <span className={`text-sm font-medium ${isEnabled ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>{language === 'he' ? mod.name_he : mod.name_ru}</span>
                <button onClick={() => setModulesState(prev => ({ ...prev, [mod.key]: !isEnabled }))}
                  className={`relative w-10 h-6 rounded-full transition-colors ${isEnabled ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isEnabled ? 'left-5' : 'left-1'}`} />
                </button>
              </div>
            )
          })}
        </div>
      </Modal>

      {/* Invite Modal */}
      <Modal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title={t.sendInvitation} width="440px"
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={() => setInviteModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">{t.cancel}</button>
            <button type="submit" form="invite-form" disabled={sendingInvite} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {sendingInvite ? <><Loader2 className="w-4 h-4 animate-spin" />{t.sending}</> : <><Send className="w-4 h-4" />{t.send}</>}
            </button>
          </div>
        }
      >
        <form id="invite-form" onSubmit={handleSendInvitation} className="space-y-4">
          <div><Label htmlFor="invite-email">{t.email} *</Label><Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@example.com" required /></div>
          <div><Label htmlFor="invite-message">{t.message}</Label><Textarea id="invite-message" value={inviteMessage} onChange={(e) => setInviteMessage(e.target.value)} placeholder={t.messagePlaceholder} rows={3} /></div>
        </form>
      </Modal>

      {/* Autopay Modal */}
      <Modal open={autopayModalOpen} onClose={() => { setAutopayModalOpen(false); setAutopayOrg(null); setAutopaySuccess(null) }}
        title={t.autopayTitle} subtitle={autopayOrg?.name} width="440px"
        footer={autopaySuccess ? (
          <button onClick={() => { setAutopayModalOpen(false); setAutopayOrg(null); setAutopaySuccess(null) }} className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700">{t.close}</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => { setAutopayModalOpen(false); setAutopayOrg(null) }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">{t.cancel}</button>
            <button onClick={handleSendAutopayLink} disabled={autopayLoading} className="flex-[1.5] py-2.5 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
              {autopayLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t.sendLink}
            </button>
          </div>
        )}
      >
        {autopaySuccess ? (
          <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="font-semibold text-emerald-700 dark:text-emerald-300 mb-1">{t.linkSent}</p>
            <p className="text-sm text-emerald-600">{autopaySuccess.email}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div><Label>{t.autopayAmount}</Label>
              <div className="flex items-center gap-2"><span className="text-gray-400">₪</span>
                <Input type="number" value={autopayAmount} onChange={(e) => setAutopayAmount(parseFloat(e.target.value) || 0)} className="text-lg font-semibold" /></div>
            </div>
            <div><Label>{t.autopayDate}</Label><Input type="date" value={autopayBillingDate} onChange={(e) => setAutopayBillingDate(e.target.value)} /></div>
          </div>
        )}
      </Modal>

      {/* Edit Organization Modal */}
      <EditOrganizationModal isOpen={editOrgModalOpen} onClose={() => { setEditOrgModalOpen(false); setOrgToEdit(null) }} organization={orgToEdit} onSaved={loadData} />

      {/* FAB */}
      <SubscriptionsFab onInvite={() => setInviteModalOpen(true)} language={language} />
    </div>
  )
}

// FAB Component
function SubscriptionsFab({ onInvite, language }: { onInvite: () => void; language: 'he' | 'ru' }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <div className={`flex flex-col items-end gap-2 transition-all duration-200 ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="flex items-center gap-2">
          <span className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium px-3 py-1.5 rounded-full shadow-md border border-gray-100 dark:border-gray-700 whitespace-nowrap">
            {language === 'he' ? 'הזמן ארגון' : 'Пригласить организацию'}
          </span>
          <button onClick={() => { onInvite(); setOpen(false) }}
            className="w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors">
            <Mail className="w-5 h-5" />
          </button>
        </div>
      </div>
      <button onClick={() => setOpen(!open)}
        className={`w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center transition-all duration-300 ${open ? 'bg-gray-700 rotate-45' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
        {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
      {open && <div className="fixed inset-0 z-[-1]" onClick={() => setOpen(false)} />}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import {
  Building2, Search, ChevronRight, Plus, Mail, Send,
  CheckCircle, XCircle, AlertCircle, Loader2, X,
  Shield, Pencil, CreditCard, Settings,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { getPlan, PLANS, type PlanKey } from '@/lib/subscription-plans'
import { MODULES } from '@/lib/modules-config'
import { EditOrganizationModal } from '@/components/modals/other/EditOrganizationModal'
import { useMediaQuery } from '@/hooks/useMediaQuery'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Organization {
  id: string
  name: string
  display_name: string
  plan?: string
  subscription_status: string
  subscription_expires_at: string | null
  owner_name: string
  owner_email: string
  phone: string
  features?: any
  billing_amount?: number
  billing_due_date?: string
  billing_status?: string
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

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = [
  { value: 'none',    label_he: 'ללא גישה',   label_ru: 'Нет доступа',   color: 'gray'   },
  { value: 'trial',   label_he: 'ניסיון',      label_ru: 'Пробный',       color: 'yellow' },
  { value: 'active',  label_he: 'פעיל',        label_ru: 'Активна',       color: 'green'  },
  { value: 'manual',  label_he: 'גישה ידנית',  label_ru: 'Ручной доступ', color: 'blue'   },
  { value: 'expired', label_he: 'פג תוקף',     label_ru: 'Истекла',       color: 'red'    },
]

const STATUS_COLORS: Record<string, string> = {
  gray:   'bg-gray-500/10 text-gray-600 border-gray-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  green:  'bg-green-500/10 text-green-600 border-green-500/20',
  blue:   'bg-blue-500/10 text-blue-600 border-blue-500/20',
  red:    'bg-red-500/10 text-red-600 border-red-500/20',
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminOrganizationsPage() {
  const { language } = useLanguage()
  const l = language === 'he'
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // Data
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [dbPlans, setDbPlans] = useState<any[]>([])
  const [modulePricing, setModulePricing] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Org detail panel (bottom sheet on mobile, modal on desktop)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)

  // Extend access modal
  const [extendOpen, setExtendOpen] = useState(false)
  const [extendOrg, setExtendOrg] = useState<Organization | null>(null)
  const [extendStatus, setExtendStatus] = useState('trial')
  const [extendPlan, setExtendPlan] = useState<PlanKey>('demo')
  const [extendExpiry, setExtendExpiry] = useState('')
  const [extendModules, setExtendModules] = useState<Record<string, boolean>>({})
  const [extendModulePrices, setExtendModulePrices] = useState<Record<string, number>>({})
  const [extendSaving, setExtendSaving] = useState(false)

  // Autopay modal
  const [autopayOpen, setAutopayOpen] = useState(false)
  const [autopayOrg, setAutopayOrg] = useState<Organization | null>(null)
  const [autopayAmount, setAutopayAmount] = useState(199)
  const [autopayDate, setAutopayDate] = useState('')
  const [autopayLoading, setAutopayLoading] = useState(false)
  const [autopaySuccess, setAutopaySuccess] = useState<{ email: string } | null>(null)

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')
  const [inviteSending, setInviteSending] = useState(false)

  // Edit org modal
  const [editOpen, setEditOpen] = useState(false)
  const [editOrg, setEditOrg] = useState<Organization | null>(null)


  // ─── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [subRes, plansRes, pricingRes] = await Promise.all([
        fetch('/api/admin/subscriptions-list'),
        fetch('/api/admin/plans'),
        fetch('/api/admin/module-pricing'),
      ])
      const sub = await subRes.json()
      const plans = plansRes.ok ? await plansRes.json() : []
      const pricing = pricingRes.ok ? await pricingRes.json() : []
      setOrgs(sub.organizations || [])
      setRequests(sub.accessRequests || [])
      setDbPlans(plans)
      setModulePricing(pricing)
    } catch {
      toast.error(l ? 'שגיאה בטעינה' : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const getStatusBadge = (status: string) => {
    const s = STATUSES.find(x => x.value === status)
    if (!s) return <Badge className="bg-gray-100 text-gray-500">—</Badge>
    return <Badge className={STATUS_COLORS[s.color]}>{l ? s.label_he : s.label_ru}</Badge>
  }

  const getPlanName = (key?: string) => {
    if (!key) return '—'
    const db = dbPlans.find(p => p.key === key)
    if (db) return l ? db.name_he : db.name_ru
    const hc = getPlan(key as PlanKey)
    return hc ? (l ? hc.name_he : hc.name_ru) : key
  }

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.owner_email?.toLowerCase().includes(search.toLowerCase()) ||
    o.owner_name?.toLowerCase().includes(search.toLowerCase())
  )

  // ─── Handlers: Access Requests ─────────────────────────────────────────────

  const handleApprove = async (userId: string) => {
    await fetch(`/api/access/review?user_id=${userId}&action=approve&token=admin`)
    toast.success(l ? 'אושר' : 'Одобрено')
    loadData()
  }

  const handleReject = async (userId: string) => {
    if (!confirm(l ? 'לדחות?' : 'Отклонить?')) return
    await fetch(`/api/access/review?user_id=${userId}&action=reject&token=admin`)
    toast.success(l ? 'נדחה' : 'Отклонено')
    loadData()
  }

  // ─── Handlers: Feature Toggles ─────────────────────────────────────────────

  const handleToggleFeature = async (org: Organization, key: 'payments_enabled' | 'recurring_enabled' | 'branches_enabled', value: boolean) => {
    try {
      const res = await fetch('/api/admin/organizations/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: org.id, [key]: value }),
      })
      if (!res.ok) throw new Error()
      const updated = { ...org, [key]: value }
      setSelectedOrg(updated)
      setOrgs(prev => prev.map(o => o.id === org.id ? updated : o))
      toast.success(l ? 'עודכן' : 'Сохранено')
    } catch {
      toast.error(l ? 'שגיאה' : 'Ошибка')
    }
  }

  // ─── Handlers: Deactivate ──────────────────────────────────────────────────

  const handleDeactivate = async (org: Organization) => {
    if (!confirm(l ? 'להשבית ארגון?' : 'Деактивировать организацию?')) return
    try {
      const res = await fetch('/api/admin/organizations/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: org.id, subscription_update: { subscription_status: 'expired' } }),
      })
      if (!res.ok) throw new Error()
      toast.success(l ? 'הושבת' : 'Деактивировано')
      setSelectedOrg(null)
      loadData()
    } catch {
      toast.error(l ? 'שגיאה' : 'Ошибка')
    }
  }


  // ─── Handlers: Extend Access ───────────────────────────────────────────────

  const openExtend = (org: Organization) => {
    setExtendOrg(org)
    setExtendStatus(org.subscription_status === 'none' ? 'trial' : org.subscription_status)
    const planKey = (org.plan || 'demo') as PlanKey
    setExtendPlan(planKey)
    const dbPlan = dbPlans.find(p => p.key === planKey)
    setExtendModules(dbPlan?.modules || org.features?.modules || {})
    setExtendModulePrices(org.features?.custom_module_prices || {})
    const d = new Date(); d.setDate(d.getDate() + 14)
    setExtendExpiry(d.toISOString().split('T')[0])
    setSelectedOrg(null)
    setExtendOpen(true)
  }

  const handleExtendPlanChange = (planKey: PlanKey) => {
    setExtendPlan(planKey)
    if (planKey !== 'custom') {
      const dbPlan = dbPlans.find(p => p.key === planKey)
      if (dbPlan) { setExtendModules(dbPlan.modules || {}); return }
      const hc = getPlan(planKey)
      if (hc) setExtendModules(hc.modules)
    }
  }

  const handleExtendSave = async () => {
    if (!extendOrg) return
    setExtendSaving(true)
    try {
      const exp = new Date(extendExpiry); exp.setHours(23, 59, 59, 999)
      let modules: Record<string, boolean> = {}
      if (extendPlan === 'custom') {
        modules = extendModules
      } else {
        const dbPlan = dbPlans.find(p => p.key === extendPlan)
        modules = dbPlan?.modules || getPlan(extendPlan)?.modules || {}
      }
      const features = {
        ...(extendOrg.features || {}),
        modules,
        custom_module_prices: extendPlan === 'custom' ? extendModulePrices : {},
      }
      const res = await fetch('/api/admin/organizations/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: extendOrg.id,
          plan: extendPlan,
          features,
          subscription_update: {
            subscription_status: extendStatus,
            subscription_expires_at: exp.toISOString(),
          },
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(l ? 'הגישה הוארכה' : 'Доступ продлён')
      setExtendOpen(false)
      loadData()
    } catch {
      toast.error(l ? 'שגיאה' : 'Ошибка')
    } finally {
      setExtendSaving(false)
    }
  }

  // ─── Handlers: Autopay ─────────────────────────────────────────────────────

  const openAutopay = (org: Organization) => {
    setAutopayOrg(org)
    const dbPlan = dbPlans.find(p => p.key === org.plan)
    setAutopayAmount(org.billing_amount || dbPlan?.price_monthly || 199)
    setAutopayDate(org.billing_due_date || new Date().toISOString().split('T')[0])
    setAutopaySuccess(null)
    setSelectedOrg(null)
    setAutopayOpen(true)
  }

  const handleSendAutopay = async () => {
    if (!autopayOrg) return
    setAutopayLoading(true)
    try {
      const res = await fetch('/api/admin/subscription-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: autopayOrg.id, amount: autopayAmount, billing_due_date: autopayDate }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAutopaySuccess({ email: data.email_sent_to })
      toast.success(l ? 'הקישור נשלח' : 'Ссылка отправлена')
      loadData()
    } catch {
      toast.error(l ? 'שגיאה' : 'Ошибка')
    } finally {
      setAutopayLoading(false)
    }
  }

  // ─── Handlers: Invite ──────────────────────────────────────────────────────

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return
    setInviteSending(true)
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, message: inviteMsg || null }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${l ? 'נשלח ל-' : 'Отправлено на '}${inviteEmail}`)
      setInviteOpen(false); setInviteEmail(''); setInviteMsg('')
    } catch {
      toast.error(l ? 'שגיאה' : 'Ошибка')
    } finally {
      setInviteSending(false)
    }
  }


  // ─── Org detail panel content ──────────────────────────────────────────────

  const renderOrgDetail = (org: Organization) => {
    const isPaid = ['active','trial','manual'].includes(org.subscription_status)
    const TOGGLES: { key: 'payments_enabled' | 'recurring_enabled' | 'branches_enabled', labelHe: string, labelRu: string }[] = [
      { key: 'payments_enabled', labelHe: 'תשלומים רגילים', labelRu: 'Обычные платежи' },
      { key: 'recurring_enabled', labelHe: 'תשלומים חוזרים', labelRu: 'Рекуррентные' },
      { key: 'branches_enabled', labelHe: 'סניפים', labelRu: 'Филиалы' },
    ]
    return (
      <>
        {/* Header */}
        <div className="flex items-start gap-4 mb-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {org.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
              {org.display_name || org.name}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{org.owner_email}</p>
            <div className="mt-1.5">{getStatusBadge(org.subscription_status)}</div>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-0 divide-y divide-gray-50 dark:divide-gray-800 mb-5">
          {[
            [l ? 'בעלים' : 'Владелец', org.owner_name],
            [l ? 'טלפון' : 'Телефон', org.phone || '—'],
            [l ? 'תוכנית' : 'План', getPlanName(org.plan)],
            [l ? 'תוקף' : 'Истекает', org.subscription_expires_at
              ? new Date(org.subscription_expires_at).toLocaleDateString(l ? 'he-IL' : 'ru-RU')
              : '—'],
            [l ? 'סכום מנוי' : 'Сумма', org.billing_amount ? `₪${org.billing_amount}/мес` : '—'],
            ...(org.tranzila_card_last4 ? [[l ? 'כרטיס' : 'Карта', `**** ${org.tranzila_card_last4} ✅`]] : []),
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
            </div>
          ))}
        </div>

        {/* Feature toggles */}
        <div className="space-y-3 mb-5 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          {TOGGLES.map(({ key, labelHe, labelRu }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{l ? labelHe : labelRu}</span>
              <Switch
                checked={org[key] ?? (key === 'payments_enabled')}
                onCheckedChange={v => handleToggleFeature(org, key, v)}
              />
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className={`grid gap-2 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <button onClick={() => openAutopay(org)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors col-span-full">
            <CreditCard className="w-4 h-4" />
            {l ? 'חיבור תשלום אוטומטי' : 'Автоплатёж'}
          </button>
          <button onClick={() => openExtend(org)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Shield className="w-4 h-4" />
            {l ? 'הארכה' : 'Продлить'}
          </button>
          <button onClick={() => { setEditOrg(org); setEditOpen(true); setSelectedOrg(null) }}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
            <Pencil className="w-4 h-4" />
            {l ? 'ערוך' : 'Редактировать'}
          </button>
          <button onClick={() => handleDeactivate(org)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-50 text-red-500 text-sm font-medium hover:bg-red-100 border border-red-100 transition-colors col-span-full">
            <XCircle className="w-4 h-4" />
            {l ? 'השבת ארגון' : 'Деактивировать'}
          </button>
        </div>
      </>
    )
  }


  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-24">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold">{l ? 'ארגונים' : 'Организации'}</h1>
          <Badge variant="outline" className="text-sm">{orgs.length}</Badge>
        </div>
      </div>

      {/* Access Requests */}
      {requests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-3">
              <AlertCircle className="w-4 h-4" />
              {l ? `בקשות גישה (${requests.length})` : `Запросы доступа (${requests.length})`}
            </div>
            {requests.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{r.full_name || r.email}</p>
                  <p className="text-xs text-slate-500">{r.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(r.user_id)}>
                    <CheckCircle className="w-3 h-3 mr-1" />{l ? 'אשר' : 'Одобрить'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(r.user_id)}>
                    <XCircle className="w-3 h-3 mr-1" />{l ? 'דחה' : 'Отклонить'}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input className="pl-10" placeholder={l ? 'חיפוש...' : 'Поиск...'} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Org list */}
      <Card>
        <CardContent className="p-3 space-y-2">
          {filtered.map(org => {
            const paid = ['active','trial','manual'].includes(org.subscription_status)
            return (
              <button key={org.id} onClick={() => setSelectedOrg(org)}
                className="w-full flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-blue-200 hover:shadow-sm transition-all text-left">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {org.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{org.display_name || org.name}</span>
                    {getStatusBadge(org.subscription_status)}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{org.owner_name} · {getPlanName(org.plan)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`w-2 h-2 rounded-full ${paid ? 'bg-emerald-500' : 'bg-red-400'}`} />
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-center text-slate-400 py-8 text-sm">{l ? 'אין ארגונים' : 'Нет организаций'}</p>
          )}
        </CardContent>
      </Card>


      {/* ── Org Detail: Modal (desktop) / Bottom Sheet (mobile) ── */}
      {selectedOrg && isDesktop && (
        <Modal open={!!selectedOrg} onClose={() => setSelectedOrg(null)} size="md">
          {renderOrgDetail(selectedOrg)}
        </Modal>
      )}
      {selectedOrg && !isDesktop && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setSelectedOrg(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <button onClick={() => setSelectedOrg(null)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="w-5 h-5 text-gray-400" />
            </button>
            <div className="px-5 pb-8 pt-2">{renderOrgDetail(selectedOrg)}</div>
          </div>
        </>
      )}

      {/* ── Extend Access Modal ── */}
      <Modal open={extendOpen && !!extendOrg} onClose={() => setExtendOpen(false)}
        title={l ? 'הארכת גישה' : 'Продление доступа'} subtitle={extendOrg?.name} size="md"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setExtendOpen(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
              {l ? 'ביטול' : 'Отмена'}
            </button>
            <button onClick={handleExtendSave} disabled={extendSaving}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {extendSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (l ? 'שמור' : 'Сохранить')}
            </button>
          </div>
        }>
        <div className="space-y-4">
          {/* Plan */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">{l ? 'תוכנית' : 'Тарифный план'}</label>
            <select value={extendPlan} onChange={e => handleExtendPlanChange(e.target.value as PlanKey)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {PLANS.map(p => (
                <option key={p.key} value={p.key}>
                  {l ? p.name_he : p.name_ru}{p.price_monthly ? ` — ₪${p.price_monthly}` : ''}
                </option>
              ))}
            </select>
          </div>
          {/* Custom modules */}
          {extendPlan === 'custom' && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">{l ? 'מודולים' : 'Модули'}</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-xl p-3">
                {(modulePricing.length > 0 ? modulePricing : MODULES.map(m => ({ module_key: m.key, name_he: m.name_he, name_ru: m.name_ru, price_monthly: 0 }))).map(mod => {
                  const key = mod.module_key || (mod as any).key
                  const enabled = extendModules[key] || false
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch checked={enabled} onCheckedChange={v => setExtendModules(p => ({ ...p, [key]: v }))} />
                        <span className="text-sm">{l ? mod.name_he : mod.name_ru}</span>
                      </div>
                      <span className="text-xs text-gray-400">₪{extendModulePrices[key] ?? parseFloat(mod.price_monthly || 0)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {/* Status & Expiry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">{l ? 'סטטוס' : 'Статус'}</label>
              <select value={extendStatus} onChange={e => setExtendStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {STATUSES.map(s => <option key={s.value} value={s.value}>{l ? s.label_he : s.label_ru}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">{l ? 'תאריך תפוגה' : 'Дата окончания'}</label>
              <input type="date" value={extendExpiry} onChange={e => setExtendExpiry(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>
      </Modal>


      {/* ── Autopay Modal ── */}
      <Modal open={autopayOpen && !!autopayOrg} onClose={() => { setAutopayOpen(false); setAutopayOrg(null); setAutopaySuccess(null) }}
        title={l ? 'חיבור תשלום אוטומטי' : 'Подключить автоплатёж'} subtitle={autopayOrg?.name} size="sm"
        footer={
          autopaySuccess ? (
            <button onClick={() => { setAutopayOpen(false); setAutopayOrg(null); setAutopaySuccess(null) }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors">
              {l ? 'סגור' : 'Закрыть'}
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setAutopayOpen(false); setAutopayOrg(null) }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
                {l ? 'ביטול' : 'Отмена'}
              </button>
              <button onClick={handleSendAutopay} disabled={autopayLoading}
                className="flex-[1.5] py-2.5 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                {autopayLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {l ? 'שלח קישור' : 'Отправить ссылку'}
              </button>
            </div>
          )
        }>
        {autopaySuccess ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="font-semibold text-emerald-700 mb-1">{l ? 'הקישור נשלח!' : 'Ссылка отправлена!'}</p>
            <p className="text-sm text-gray-500">{autopaySuccess.email}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>{l ? 'סכום (₪/חודש)' : 'Сумма (₪/мес)'}</Label>
              <Input type="number" value={autopayAmount} onChange={e => setAutopayAmount(parseFloat(e.target.value) || 0)} className="mt-1 text-lg font-semibold" />
            </div>
            <div>
              <Label>{l ? 'תאריך חיוב ראשון' : 'Дата первого списания'}</Label>
              <Input type="date" value={autopayDate} onChange={e => setAutopayDate(e.target.value)} className="mt-1" />
            </div>
            <p className="text-xs text-blue-600 bg-blue-50 rounded-lg p-3">
              💡 {l ? 'הקישור יישלח לאימייל הבעלים.' : 'Ссылка отправится на email владельца.'}
            </p>
          </div>
        )}
      </Modal>

      {/* ── Invite Modal ── */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title={l ? 'הזמן ארגון' : 'Пригласить'} size="sm">
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input className="mt-1" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="owner@business.com" required />
          </div>
          <div>
            <Label>{l ? 'הודעה (אופציונלי)' : 'Сообщение (опционально)'}</Label>
            <Textarea className="mt-1" value={inviteMsg} onChange={e => setInviteMsg(e.target.value)} rows={3} />
          </div>
          <Button type="submit" className="w-full" disabled={inviteSending}>
            {inviteSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" />{l ? 'שלח' : 'Отправить'}</>}
          </Button>
        </form>
      </Modal>

      {/* ── Edit Org Modal ── */}
      <EditOrganizationModal
        isOpen={editOpen}
        onClose={() => { setEditOpen(false); setEditOrg(null) }}
        organization={editOrg}
        onSaved={loadData}
      />

      {/* ── FAB ── */}
      <OrgsFab onInvite={() => setInviteOpen(true)} language={language} />
    </div>
  )
}

// ─── FAB Component ────────────────────────────────────────────────────────────

function OrgsFab({ onInvite, language }: { onInvite: () => void; language: 'he' | 'ru' }) {
  const [open, setOpen] = useState(false)
  const l = language === 'he'
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <div className={`flex flex-col items-end gap-2 transition-all duration-200 ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="flex items-center gap-2">
          <span className="bg-white dark:bg-gray-800 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-full shadow-md border border-gray-100 whitespace-nowrap">
            {l ? 'הזמן ארגון' : 'Пригласить организацию'}
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

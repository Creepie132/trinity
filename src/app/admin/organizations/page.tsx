'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Shield, Pencil, CreditCard, Settings, Eye,
  Clock, TrendingUp, Users, Calendar, Activity,
  Zap, BarChart3, Wifi, WifiOff, AlertTriangle,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { getPlan, PLANS, type PlanKey } from '@/lib/subscription-plans'
import { MODULES } from '@/lib/modules-config'
import { EditOrganizationModal } from '@/components/modals/other/EditOrganizationModal'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useRouter } from 'next/navigation'

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
  tranzila_card_expiry?: string
  payments_enabled?: boolean
  recurring_enabled?: boolean
  branches_enabled?: boolean
  last_seen_at?: string | null
  created_at?: string
}

interface AccessRequest {
  id: string
  user_id: string
  email: string
  full_name: string
  requested_at: string
  status: string
}

interface OrgStats {
  totalClients: number
  visitsCount: number
  paymentsCount: number
  totalRevenue: number
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
  yellow: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  green:  'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  blue:   'bg-blue-500/10 text-blue-600 border-blue-500/20',
  red:    'bg-red-500/10 text-red-600 border-red-500/20',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLastSeen(dateStr: string | null | undefined, lang: 'he' | 'ru'): { label: string; urgent: boolean; warn: boolean } {
  if (!dateStr) return { label: lang === 'he' ? 'לא ידוע' : 'Неизвестно', urgent: false, warn: false }
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return { label: lang === 'he' ? 'עכשיו' : 'Сейчас', urgent: false, warn: false }
  if (mins < 60) return { label: lang === 'he' ? `${mins} ד' ago` : `${mins} мин назад`, urgent: false, warn: false }
  if (hours < 24) return { label: lang === 'he' ? `${hours} ש' ago` : `${hours} ч назад`, urgent: false, warn: false }
  if (days === 1) return { label: lang === 'he' ? 'אתמול' : 'Вчера', urgent: false, warn: true }
  if (days <= 3) return { label: lang === 'he' ? `${days} ימים` : `${days} дня`, urgent: false, warn: true }
  return { label: lang === 'he' ? `${days} ימים` : `${days} дней`, urgent: true, warn: false }
}

function getHealthDot(org: Organization): 'green' | 'yellow' | 'red' | 'gray' {
  const paid = ['active', 'trial', 'manual'].includes(org.subscription_status)
  if (!paid) return 'gray'
  const { urgent, warn } = formatLastSeen(org.last_seen_at, 'ru')
  if (urgent) return 'red'
  if (warn) return 'yellow'
  return 'green'
}


// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminOrganizationsPage() {
  const { language } = useLanguage()
  const l = language === 'he'
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const router = useRouter()

  // Data
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [dbPlans, setDbPlans] = useState<any[]>([])
  const [modulePricing, setModulePricing] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Org detail panel
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [orgStats, setOrgStats] = useState<OrgStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Modals
  const [extendOpen, setExtendOpen] = useState(false)
  const [extendOrg, setExtendOrg] = useState<Organization | null>(null)
  const [extendStatus, setExtendStatus] = useState('trial')
  const [extendPlan, setExtendPlan] = useState<PlanKey>('demo')
  const [extendExpiry, setExtendExpiry] = useState('')
  const [extendModules, setExtendModules] = useState<Record<string, boolean>>({})
  const [extendModulePrices, setExtendModulePrices] = useState<Record<string, number>>({})
  const [extendSaving, setExtendSaving] = useState(false)

  const [autopayOpen, setAutopayOpen] = useState(false)
  const [autopayOrg, setAutopayOrg] = useState<Organization | null>(null)
  const [autopayAmount, setAutopayAmount] = useState(199)
  const [autopayDate, setAutopayDate] = useState('')
  const [autopayLoading, setAutopayLoading] = useState(false)
  const [autopaySuccess, setAutopaySuccess] = useState<{ email: string } | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')
  const [inviteSending, setInviteSending] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editOrg, setEditOrg] = useState<Organization | null>(null)

  const [impersonating, setImpersonating] = useState<string | null>(null)

  // ─── Data loading ───────────────────────────────────────────────────────────

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

  const loadOrgStats = useCallback(async (orgId: string) => {
    setStatsLoading(true)
    setOrgStats(null)
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/stats?period=month`)
      if (res.ok) {
        const data = await res.json()
        setOrgStats(data.stats)
      }
    } catch {}
    finally { setStatsLoading(false) }
  }, [])

  const handleSelectOrg = (org: Organization) => {
    setSelectedOrg(org)
    loadOrgStats(org.id)
  }

  // ─── Impersonate ────────────────────────────────────────────────────────────

  const handleImpersonate = async (org: Organization, e: React.MouseEvent) => {
    e.stopPropagation()
    setImpersonating(org.id)
    try {
      const sessionRes = await fetch('/api/admin/check')
      const { isAdmin, adminEmail } = await sessionRes.json()
      if (!isAdmin) { toast.error('Нет доступа'); return }

      const res = await fetch('/api/admin/set-active-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: org.id }),
      })
      if (!res.ok) throw new Error()

      document.cookie = `trinity_active_branch=${org.id}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
      localStorage.setItem('trinity_active_branch', org.id)
      localStorage.setItem('admin_org_id', org.id)
      localStorage.setItem('impersonation_session', JSON.stringify({
        orgId: org.id, orgName: org.display_name || org.name,
        adminEmail, startedAt: new Date().toISOString()
      }))
      toast.success(l ? `נכנס בתור: ${org.name}` : `Вход от имени: ${org.name}`)
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error(l ? 'שגיאה' : 'Ошибка входа')
    } finally {
      setImpersonating(null)
    }
  }


  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getStatusBadge = (status: string) => {
    const s = STATUSES.find(x => x.value === status)
    if (!s) return <Badge className="bg-gray-100 text-gray-500">—</Badge>
    return <Badge className={`${STATUS_COLORS[s.color]} text-xs px-2 py-0.5`}>{l ? s.label_he : s.label_ru}</Badge>
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

  // ─── Access Requests ─────────────────────────────────────────────────────────

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

  // ─── Feature Toggles ─────────────────────────────────────────────────────────

  const handleToggleFeature = async (
    org: Organization,
    key: 'payments_enabled' | 'recurring_enabled' | 'branches_enabled',
    value: boolean
  ) => {
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

  // ─── Deactivate ──────────────────────────────────────────────────────────────

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

  // ─── Extend Access ────────────────────────────────────────────────────────────

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


  // ─── Autopay ──────────────────────────────────────────────────────────────────

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

  // ─── Invite ───────────────────────────────────────────────────────────────────

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

  // ─── Org Detail Panel ────────────────────────────────────────────────────────

  const renderOrgDetail = (org: Organization) => {
    const hasToken = !!org.tranzila_card_token
    const tokenActive = hasToken && org.subscription_status !== 'expired'
    const lastSeen = formatLastSeen(org.last_seen_at, language)
    const TOGGLES: { key: 'payments_enabled' | 'recurring_enabled' | 'branches_enabled', labelHe: string, labelRu: string }[] = [
      { key: 'payments_enabled', labelHe: 'תשלומים רגילים', labelRu: 'Обычные платежи' },
      { key: 'recurring_enabled', labelHe: 'תשלומים חוזרים', labelRu: 'Рекуррентные' },
      { key: 'branches_enabled', labelHe: 'סניפים', labelRu: 'Филиалы' },
    ]

    return (
      <div className="space-y-4">
        {/* ── Header ── */}
        <div className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg">
              {org.name?.charAt(0).toUpperCase()}
            </div>
            {/* Health dot */}
            <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white
              ${getHealthDot(org) === 'green' ? 'bg-emerald-500' :
                getHealthDot(org) === 'yellow' ? 'bg-yellow-500' :
                getHealthDot(org) === 'red' ? 'bg-red-500' : 'bg-gray-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">
              {org.display_name || org.name}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{org.owner_email}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {getStatusBadge(org.subscription_status)}
              {/* Last seen pill */}
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium
                ${lastSeen.urgent ? 'bg-red-100 text-red-600' :
                  lastSeen.warn ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-500'}`}>
                {lastSeen.urgent ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                {lastSeen.label}
              </span>
            </div>
          </div>
          {/* Impersonate button */}
          <button
            onClick={(e) => handleImpersonate(org, e)}
            disabled={impersonating === org.id}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            title={l ? 'כניסה בתור לקוח' : 'Войти от имени'}
          >
            {impersonating === org.id
              ? <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              : <Eye className="w-4 h-4 text-indigo-600" />
            }
          </button>
        </div>

        {/* ── Usage Stats ── */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {l ? 'סטטיסטיקה (30 יום)' : 'Статистика (30 дней)'}
          </p>
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : orgStats ? (
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Users, label: l ? 'לקוחות' : 'Клиенты', value: orgStats.totalClients, color: 'blue' },
                { icon: Calendar, label: l ? 'ביקורים' : 'Визиты', value: orgStats.visitsCount, color: 'purple' },
                { icon: BarChart3, label: l ? 'תשלומים' : 'Платежи', value: orgStats.paymentsCount, color: 'emerald' },
                { icon: TrendingUp, label: l ? 'הכנסות' : 'Выручка', value: `₪${orgStats.totalRevenue.toFixed(0)}`, color: 'amber' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className={`p-3 rounded-xl bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-100 dark:border-${color}-800`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`w-3.5 h-3.5 text-${color}-600`} />
                    <span className={`text-xs text-${color}-600 font-medium`}>{label}</span>
                  </div>
                  <p className={`text-xl font-bold text-${color}-700 dark:text-${color}-400`}>{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-400 text-center py-3">{l ? 'אין נתונים' : 'Нет данных'}</div>
          )}
        </div>

        {/* ── Billing Block ── */}
        <div className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {l ? 'פרטי תשלום' : 'Биллинг'}
          </p>
          <div className="space-y-0 divide-y divide-gray-50 dark:divide-gray-800">
            {[
              [l ? 'בעלים' : 'Владелец', org.owner_name],
              [l ? 'תוכנית' : 'Тарифная ставка',
                org.billing_amount
                  ? `₪${org.billing_amount} / ${l ? 'חודש' : 'мес'}`
                  : getPlanName(org.plan)],
              [l ? 'חיוב הבא' : 'Следующее списание',
                org.subscription_expires_at
                  ? new Date(org.subscription_expires_at).toLocaleDateString(l ? 'he-IL' : 'ru-RU')
                  : '—'],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
              </div>
            ))}
            {/* Token status */}
            <div className="flex items-center justify-between py-2 text-sm">
              <span className="text-gray-500">{l ? 'טוקן Tranzila' : 'Токен Tranzila'}</span>
              {hasToken ? (
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium
                  ${tokenActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {tokenActive
                    ? <><CheckCircle className="w-3 h-3" /> {l ? 'פעיל' : 'Активен'} *{org.tranzila_card_last4}</>
                    : <><AlertTriangle className="w-3 h-3" /> {l ? 'פג תוקף' : 'Истёк'}</>
                  }
                </span>
              ) : (
                <span className="text-xs text-gray-400">{l ? 'לא מחובר' : 'Не подключён'}</span>
              )}
            </div>
          </div>

          {/* Autopay button — green if active, normal otherwise */}
          <button
            onClick={() => openAutopay(org)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all
              ${org.recurring_enabled
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
          >
            <CreditCard className="w-4 h-4" />
            {org.recurring_enabled
              ? (l ? '✓ אוטוחיוב פעיל' : '✓ Автоплатёж активен')
              : (l ? 'חבר אוטוחיוב' : 'Подключить автоплатёж')}
          </button>
        </div>

        {/* ── Feature Toggles ── */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {l ? 'מודולים' : 'Модули'}
          </p>
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

        {/* ── Action Buttons ── */}
        <div className="grid grid-cols-2 gap-2">
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
            className="col-span-2 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-50 text-red-500 text-sm font-medium hover:bg-red-100 border border-red-100 transition-colors">
            <XCircle className="w-4 h-4" />
            {l ? 'השבת ארגון' : 'Деактивировать'}
          </button>
        </div>
      </div>
    )
  }


  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  // ─── Render ──────────────────────────────────────────────────────────────────

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

      {/* ── Org List ── */}
      <Card>
        <CardContent className="p-3 space-y-2">
          {filtered.map((org, idx) => {
            const paid = ['active', 'trial', 'manual'].includes(org.subscription_status)
            const health = getHealthDot(org)
            const lastSeen = formatLastSeen(org.last_seen_at, language)

            return (
              <button
                key={org.id}
                onClick={() => handleSelectOrg(org)}
                className="w-full flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-blue-200 hover:shadow-sm transition-all text-left group"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Avatar with health dot */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                    {org.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800
                    ${health === 'green' ? 'bg-emerald-500' :
                      health === 'yellow' ? 'bg-yellow-500 animate-pulse' :
                      health === 'red' ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">
                      {org.display_name || org.name}
                    </span>
                    {getStatusBadge(org.subscription_status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="truncate">{org.owner_name}</span>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">{getPlanName(org.plan)}</span>
                    {/* Last seen */}
                    {org.last_seen_at && (
                      <>
                        <span>·</span>
                        <span className={`flex items-center gap-1
                          ${lastSeen.urgent ? 'text-red-500 font-medium' :
                            lastSeen.warn ? 'text-yellow-600' : 'text-gray-400'}`}>
                          <Clock className="w-3 h-3 inline" />
                          {lastSeen.label}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right side: billing + impersonate */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {org.billing_amount && (
                    <span className="hidden md:inline text-xs text-gray-400 font-mono">
                      ₪{org.billing_amount}
                    </span>
                  )}
                  {/* Impersonate quick button */}
                  <button
                    onClick={(e) => handleImpersonate(org, e)}
                    disabled={impersonating === org.id}
                    className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-105 active:scale-95"
                    title={l ? 'כניסה' : 'Войти'}
                  >
                    {impersonating === org.id
                      ? <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                      : <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    }
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
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
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[88vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <button onClick={() => setSelectedOrg(null)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="w-5 h-5 text-gray-400" />
            </button>
            <div className="px-5 pb-10 pt-2">{renderOrgDetail(selectedOrg)}</div>
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

// ─── FAB ──────────────────────────────────────────────────────────────────────

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

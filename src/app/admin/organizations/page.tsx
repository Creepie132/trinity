'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import {
  Building2, Search, Plus, Mail, Send,
  CheckCircle, XCircle, AlertCircle, Loader2, X,
  Shield, Pencil, CreditCard, Eye,
  Clock, TrendingUp, Users, Calendar, BarChart3,
  Wifi, WifiOff, AlertTriangle, Trash2, EyeOff, Edit3, Check,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Switch } from '@/components/ui/switch'
import { getPlan, PLANS, type PlanKey } from '@/lib/subscription-plans'
import { MODULES } from '@/lib/modules-config'
import { EditOrganizationModal } from '@/components/modals/other/EditOrganizationModal'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Organization {
  id: string; name: string; display_name: string; plan?: string
  subscription_status: string; subscription_expires_at: string | null
  owner_name: string; owner_email: string; phone: string; features?: any
  billing_amount?: number; billing_due_date?: string; billing_status?: string
  tranzila_card_token?: string; tranzila_card_last4?: string; tranzila_card_expiry?: string
  payments_enabled?: boolean; recurring_enabled?: boolean; branches_enabled?: boolean
  last_seen_at?: string | null; created_at?: string
}

interface AccessRequest {
  id: string; user_id: string; email: string; full_name: string
  requested_at: string; status: string
}

interface OrgStats {
  totalClients: number; visitsCount: number; paymentsCount: number; totalRevenue: number
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
  gray:   'bg-gray-100 text-gray-600 border-gray-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue:   'bg-blue-50 text-blue-600 border-blue-200',
  red:    'bg-red-50 text-red-600 border-red-200',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLastSeen(dateStr: string | null | undefined, lang: 'he' | 'ru') {
  if (!dateStr) return { label: lang === 'he' ? 'לא ידוע' : 'Неизвестно', urgent: false, warn: false }
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000), hours = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000)
  if (mins < 1)   return { label: lang === 'he' ? 'עכשיו' : 'Сейчас', urgent: false, warn: false }
  if (mins < 60)  return { label: lang === 'he' ? `${mins} ד'` : `${mins} мин`, urgent: false, warn: false }
  if (hours < 24) return { label: lang === 'he' ? `${hours} ש'` : `${hours} ч`, urgent: false, warn: false }
  if (days === 1) return { label: lang === 'he' ? 'אתמול' : 'Вчера', urgent: false, warn: true }
  if (days <= 3)  return { label: lang === 'he' ? `${days} ימים` : `${days} дня`, urgent: false, warn: true }
  return { label: lang === 'he' ? `${days} ימים` : `${days} дн`, urgent: true, warn: false }
}

function getHealthColor(org: Organization): 'green' | 'yellow' | 'red' | 'gray' {
  const paid = ['active', 'trial', 'manual'].includes(org.subscription_status)
  if (!paid) return 'gray'
  const { urgent, warn } = formatLastSeen(org.last_seen_at, 'ru')
  return urgent ? 'red' : warn ? 'yellow' : 'green'
}

const HEALTH_DOT: Record<string, string> = {
  green:  'bg-emerald-500',
  yellow: 'bg-yellow-500 animate-pulse',
  red:    'bg-red-500 animate-pulse',
  gray:   'bg-gray-400',
}


// ─── BillingAmountRow Component ──────────────────────────────────────────────

function BillingAmountRow({
  org, lang, onSaved
}: {
  org: Organization; lang: 'he' | 'ru'
  onSaved: (amount: number | null) => void
}) {
  const l = lang === 'he'
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(org.billing_amount?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const isFree = org.billing_amount == null

  const handleSave = async () => {
    setSaving(true)
    try {
      const newAmount = value.trim() === '' ? null : Number(value)
      if (newAmount !== null && isNaN(newAmount)) {
        toast.error(l ? 'ערך לא תקין' : 'Неверное значение')
        return
      }
      const res = await fetch('/api/admin/organizations/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: org.id, billing_amount: newAmount }),
      })
      if (!res.ok) throw new Error()
      onSaved(newAmount)
      setEditing(false)
      toast.success(newAmount === null
        ? (l ? 'ללא עלות ∞' : 'Установлено ∞ (бесплатно)')
        : (l ? `עודכן: ₪${newAmount}` : `Обновлено: ₪${newAmount}`)
      )
    } catch {
      toast.error(l ? 'שגיאה' : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  const handleSetFree = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/organizations/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: org.id, billing_amount: null }),
      })
      if (!res.ok) throw new Error()
      setValue('')
      onSaved(null)
      setEditing(false)
      toast.success(l ? 'ללא עלות ∞' : 'Установлено ∞ (бесплатно)')
    } catch {
      toast.error(l ? 'שגיאה' : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center justify-between text-sm py-1.5">
      <span className="text-gray-500">{l ? 'תעריף' : 'Тарифная ставка'}</span>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <span className="text-gray-400 text-xs">₪</span>
            <input
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
              placeholder="0"
              autoFocus
              className="w-20 px-2 py-1 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:bg-gray-800 dark:border-indigo-600"
            />
          </div>
          {/* ∞ кнопка */}
          <button
            onClick={handleSetFree}
            disabled={saving}
            title={l ? 'ללא תשלום' : 'Бесплатно (∞)'}
            className="px-2 py-1 text-sm font-bold text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200"
          >∞</button>
          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-7 h-7 flex items-center justify-center bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </button>
          {/* Cancel */}
          <button onClick={() => setEditing(false)} className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setValue(org.billing_amount?.toString() ?? ''); setEditing(true) }}
          className="group flex items-center gap-1.5 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
        >
          <span className={`font-bold ${isFree ? 'text-emerald-600 text-lg' : 'text-gray-900 dark:text-gray-100'}`}>
            {isFree ? '∞' : `₪${org.billing_amount} / ${l ? 'חודש' : 'мес'}`}
          </span>
          <Edit3 className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  )
}

// ─── OrgCard Component ────────────────────────────────────────────────────────

function OrgCard({
  org, lang, getPlanName, getStatusBadge, onSelect, onImpersonate, impersonating
}: {
  org: Organization; lang: 'he' | 'ru'
  getPlanName: (k?: string) => string
  getStatusBadge: (s: string) => React.ReactNode
  onSelect: () => void
  onImpersonate: (e: React.MouseEvent) => void
  impersonating: boolean
}) {
  const l = lang === 'he'
  const health = getHealthColor(org)
  const lastSeen = formatLastSeen(org.last_seen_at, lang)
  const paid = ['active', 'trial', 'manual'].includes(org.subscription_status)
  const hasToken = !!org.tranzila_card_token

  // Avatar gradient by first letter
  const gradients = [
    'from-violet-500 to-purple-600', 'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',  'from-orange-500 to-amber-600',
    'from-pink-500 to-rose-600',     'from-cyan-500 to-blue-600',
  ]
  const gradIdx = org.name.charCodeAt(0) % gradients.length

  return (
    <div
      onClick={onSelect}
      className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-600 transition-all duration-200 cursor-pointer overflow-hidden"
    >
      {/* Top stripe - health color indicator */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl
        ${health === 'green' ? 'bg-emerald-400' : health === 'yellow' ? 'bg-yellow-400' :
          health === 'red' ? 'bg-red-400' : 'bg-gray-200'}`} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradients[gradIdx]} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
              {org.name?.charAt(0).toUpperCase()}
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${HEALTH_DOT[health]}`} />
          </div>

          {/* Name & meta */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate leading-tight">
              {org.display_name || org.name}
            </p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{org.owner_name}</p>
          </div>

          {/* Impersonate button */}
          <button
            onClick={onImpersonate}
            disabled={impersonating}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95"
            title={l ? 'כניסה' : 'Войти'}
          >
            {impersonating
              ? <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
              : <Eye className="w-3.5 h-3.5 text-indigo-600" />}
          </button>
        </div>

        {/* Status + plan row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {getStatusBadge(org.subscription_status)}
          <span className="text-xs text-gray-400">{getPlanName(org.plan)}</span>
          {org.billing_amount != null ? (
            <span className="ml-auto text-xs font-mono text-gray-500">₪{org.billing_amount}</span>
          ) : (
            <span className="ml-auto text-sm font-bold text-emerald-600 leading-none">∞</span>
          )}
        </div>

        {/* Footer row */}
        <div className="flex items-center gap-3 pt-3 border-t border-gray-50 dark:border-slate-700">
          {/* Last seen */}
          <span className={`flex items-center gap-1 text-xs
            ${lastSeen.urgent ? 'text-red-500 font-medium' : lastSeen.warn ? 'text-yellow-600' : 'text-gray-400'}`}>
            {lastSeen.urgent ? <WifiOff className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {lastSeen.label}
          </span>

          {/* Token badge */}
          {hasToken && (
            <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
              <CreditCard className="w-3 h-3" />
              {org.tranzila_card_last4 ? `*${org.tranzila_card_last4}` : l ? 'טוקן' : 'Токен'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}


// ─── DeleteOrgModal Component ─────────────────────────────────────────────────

function DeleteOrgModal({
  org, open, onClose, onDeleted, lang
}: {
  org: Organization | null; open: boolean
  onClose: () => void; onDeleted: () => void; lang: 'he' | 'ru'
}) {
  const l = lang === 'he'
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'confirm' | 'password'>('confirm')

  const handleClose = () => { onClose(); setPassword(''); setStep('confirm'); setShowPwd(false) }

  const handleDelete = async () => {
    if (!org || !password) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/organizations/${org.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || (l ? 'שגיאה' : 'Ошибка'))
        return
      }
      toast.success(l ? `הארגון נמחק: ${org.name}` : `Организация удалена: ${org.name}`)
      handleClose()
      onDeleted()
    } catch {
      toast.error(l ? 'שגיאת רשת' : 'Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  if (!org) return null

  return (
    <Modal open={open} onClose={handleClose} size="sm">
      <div className="space-y-4">
        {step === 'confirm' ? (
          <>
            {/* Warning icon */}
            <div className="flex flex-col items-center text-center pt-2 pb-1">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {l ? 'מחיקת ארגון' : 'Удалить организацию?'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-semibold text-gray-800 dark:text-gray-200">{org.display_name || org.name}</span>
              </p>
            </div>

            {/* Warning box */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1.5">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">
                {l ? 'יימחק לצמיתות:' : 'Будет удалено навсегда:'}
              </p>
              {[
                l ? 'כל לקוחות הארגון' : 'Все клиенты',
                l ? 'כל הביקורים' : 'Все визиты',
                l ? 'כל התשלומים' : 'Все платежи',
                l ? 'כל המשימות' : 'Все задачи',
                l ? 'כל המלאי (מוצרים)' : 'Весь склад (товары)',
                l ? 'כל שאר הנתונים' : 'Все остальные данные',
                l ? 'משתמשי המערכת (Auth)' : 'Пользователи из Auth (email)',
              ].map(item => (
                <div key={item} className="flex items-center gap-2 text-xs text-red-600">
                  <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                {l ? 'ביטול' : 'Отмена'}
              </button>
              <button onClick={() => setStep('password')}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors">
                {l ? 'המשך' : 'Продолжить'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center pt-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {l ? 'הכנס סיסמת מנהל:' : 'Введите пароль администратора:'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {l ? `"${org.name}" תימחק לצמיתות` : `"${org.name}" будет удалена безвозвратно`}
              </p>
            </div>

            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleDelete()}
                placeholder={l ? 'סיסמה...' : 'Пароль...'}
                autoFocus
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setStep('confirm'); setPassword('') }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                {l ? 'חזור' : 'Назад'}
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || !password}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {l ? 'מחק לצמיתות' : 'Удалить'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}


// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminOrganizationsPage() {
  const { language } = useLanguage()
  const l = language === 'he'
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const router = useRouter()

  const [orgs, setOrgs] = useState<Organization[]>([])
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [dbPlans, setDbPlans] = useState<any[]>([])
  const [modulePricing, setModulePricing] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [orgStats, setOrgStats] = useState<OrgStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

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

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteOrg, setDeleteOrg] = useState<Organization | null>(null)

  const [impersonating, setImpersonating] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
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
    setStatsLoading(true); setOrgStats(null)
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/stats?period=month`)
      if (res.ok) { const d = await res.json(); setOrgStats(d.stats) }
    } catch {} finally { setStatsLoading(false) }
  }, [])

  const handleSelectOrg = (org: Organization) => {
    setSelectedOrg(org); loadOrgStats(org.id)
  }


  const handleImpersonate = async (org: Organization, e: React.MouseEvent) => {
    e.stopPropagation(); setImpersonating(org.id)
    try {
      const sessionRes = await fetch('/api/admin/check')
      const { isAdmin, adminEmail } = await sessionRes.json()
      if (!isAdmin) { toast.error('Нет доступа'); return }
      const res = await fetch('/api/admin/set-active-org', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: org.id }),
      })
      if (!res.ok) throw new Error()
      document.cookie = `trinity_active_branch=${org.id}; path=/; max-age=${60*60*24*30}; samesite=lax`
      localStorage.setItem('trinity_active_branch', org.id)
      localStorage.setItem('admin_org_id', org.id)
      localStorage.setItem('impersonation_session', JSON.stringify({
        orgId: org.id, orgName: org.display_name || org.name,
        adminEmail, startedAt: new Date().toISOString()
      }))
      toast.success(l ? `נכנס בתור: ${org.name}` : `Вход от имени: ${org.name}`)
      router.push('/dashboard'); router.refresh()
    } catch { toast.error(l ? 'שגיאה' : 'Ошибка входа') }
    finally { setImpersonating(null) }
  }

  const getStatusBadge = (status: string) => {
    const s = STATUSES.find(x => x.value === status)
    if (!s) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">—</span>
    return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[s.color]}`}>
      {l ? s.label_he : s.label_ru}
    </span>
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

  const handleApprove = async (userId: string) => {
    await fetch(`/api/access/review?user_id=${userId}&action=approve&token=admin`)
    toast.success(l ? 'אושר' : 'Одобрено'); loadData()
  }
  const handleReject = async (userId: string) => {
    if (!confirm(l ? 'לדחות?' : 'Отклонить?')) return
    await fetch(`/api/access/review?user_id=${userId}&action=reject&token=admin`)
    toast.success(l ? 'נדחה' : 'Отклонено'); loadData()
  }

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
    setSelectedOrg(null); setExtendOpen(true)
  }

  const handleExtendPlanChange = (planKey: PlanKey) => {
    setExtendPlan(planKey)
    if (planKey !== 'custom') {
      const dbPlan = dbPlans.find(p => p.key === planKey)
      if (dbPlan) { setExtendModules(dbPlan.modules || {}); return }
      const hc = getPlan(planKey); if (hc) setExtendModules(hc.modules)
    }
  }

  const handleExtendSave = async () => {
    if (!extendOrg) return; setExtendSaving(true)
    try {
      const exp = new Date(extendExpiry); exp.setHours(23, 59, 59, 999)
      let modules: Record<string, boolean> = {}
      if (extendPlan === 'custom') { modules = extendModules }
      else {
        const dbPlan = dbPlans.find(p => p.key === extendPlan)
        modules = dbPlan?.modules || getPlan(extendPlan)?.modules || {}
      }
      const features = { ...(extendOrg.features || {}), modules, custom_module_prices: extendPlan === 'custom' ? extendModulePrices : {} }
      const res = await fetch('/api/admin/organizations/features', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: extendOrg.id, plan: extendPlan, features,
          subscription_update: { subscription_status: extendStatus, subscription_expires_at: exp.toISOString() } }),
      })
      if (!res.ok) throw new Error()
      toast.success(l ? 'הגישה הוארכה' : 'Доступ продлён')
      setExtendOpen(false); loadData()
    } catch { toast.error(l ? 'שגיאה' : 'Ошибка') }
    finally { setExtendSaving(false) }
  }


  const openAutopay = (org: Organization) => {
    setAutopayOrg(org)
    const dbPlan = dbPlans.find(p => p.key === org.plan)
    setAutopayAmount(org.billing_amount || dbPlan?.price_monthly || 199)
    setAutopayDate(org.billing_due_date || new Date().toISOString().split('T')[0])
    setAutopaySuccess(null); setSelectedOrg(null); setAutopayOpen(true)
  }

  const handleSendAutopay = async () => {
    if (!autopayOrg) return; setAutopayLoading(true)
    try {
      const res = await fetch('/api/admin/subscription-payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: autopayOrg.id, amount: autopayAmount, billing_due_date: autopayDate }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAutopaySuccess({ email: data.email_sent_to })
      toast.success(l ? 'הקישור נשלח' : 'Ссылка отправлена'); loadData()
    } catch { toast.error(l ? 'שגיאה' : 'Ошибка') }
    finally { setAutopayLoading(false) }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault(); if (!inviteEmail) return; setInviteSending(true)
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, message: inviteMsg || null }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${l ? 'נשלח ל-' : 'Отправлено на '}${inviteEmail}`)
      setInviteOpen(false); setInviteEmail(''); setInviteMsg('')
    } catch { toast.error(l ? 'שגיאה' : 'Ошибка') }
    finally { setInviteSending(false) }
  }

  // ─── Org Detail Panel ─────────────────────────────────────────────────────

  const renderOrgDetail = (org: Organization) => {
    const hasToken = !!org.tranzila_card_token
    const tokenActive = hasToken && org.subscription_status !== 'expired'
    const lastSeen = formatLastSeen(org.last_seen_at, language)

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {org.name?.charAt(0).toUpperCase()}
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${HEALTH_DOT[getHealthColor(org)]}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{org.display_name || org.name}</h2>
            <p className="text-xs text-gray-500 truncate">{org.owner_email}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {getStatusBadge(org.subscription_status)}
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium
                ${lastSeen.urgent ? 'bg-red-100 text-red-600' : lastSeen.warn ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                {lastSeen.urgent ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                {lastSeen.label}
              </span>
            </div>
          </div>
          <button onClick={(e) => handleImpersonate(org, e)} disabled={impersonating === org.id}
            className="w-10 h-10 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            title={l ? 'כניסה בתור לקוח' : 'Войти от имени'}>
            {impersonating === org.id ? <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" /> : <Eye className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>

        {/* Stats */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{l ? 'סטטיסטיקה (30 יום)' : 'Статистика (30 дней)'}</p>
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-2">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
          ) : orgStats ? (
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Users, label: l ? 'לקוחות' : 'Клиенты', value: orgStats.totalClients, cls: 'bg-blue-50 border-blue-100 text-blue-700' },
                { icon: Calendar, label: l ? 'ביקורים' : 'Визиты', value: orgStats.visitsCount, cls: 'bg-purple-50 border-purple-100 text-purple-700' },
                { icon: BarChart3, label: l ? 'תשלומים' : 'Платежи', value: orgStats.paymentsCount, cls: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
                { icon: TrendingUp, label: l ? 'הכנסות' : 'Выручка', value: `₪${orgStats.totalRevenue.toFixed(0)}`, cls: 'bg-amber-50 border-amber-100 text-amber-700' },
              ].map(({ icon: Icon, label, value, cls }) => (
                <div key={label} className={`p-3 rounded-xl border ${cls}`}>
                  <div className="flex items-center gap-1.5 mb-1 opacity-70">
                    <Icon className="w-3.5 h-3.5" /><span className="text-xs font-medium">{label}</span>
                  </div>
                  <p className="text-xl font-bold">{value}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-400 text-center py-3">{l ? 'אין נתונים' : 'Нет данных'}</p>}
        </div>

        {/* Billing */}
        <div className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{l ? 'פרטי תשלום' : 'Биллинг'}</p>
          {/* Владелец */}
          <div className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 dark:border-gray-800">
            <span className="text-gray-500">{l ? 'בעלים' : 'Владелец'}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{org.owner_name}</span>
          </div>
          {/* Следующее списание */}
          <div className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 dark:border-gray-800">
            <span className="text-gray-500">{l ? 'חיוב הבא' : 'Следующее списание'}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {org.subscription_expires_at ? new Date(org.subscription_expires_at).toLocaleDateString(l ? 'he-IL' : 'ru-RU') : '—'}
            </span>
          </div>
          {/* Тарифная ставка — inline редактор */}
          <BillingAmountRow
            org={org} lang={language}
            onSaved={(newAmount) => {
              const updated = { ...org, billing_amount: newAmount ?? undefined }
              setSelectedOrg(updated)
              setOrgs(prev => prev.map(o => o.id === org.id ? updated : o))
            }}
          />
          <div className="flex items-center justify-between text-sm py-1.5">
            <span className="text-gray-500">{l ? 'טוקן Tranzila' : 'Токен Tranzila'}</span>
            {hasToken ? (
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${tokenActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                {tokenActive ? <><CheckCircle className="w-3 h-3" /> {l ? 'פעיל' : 'Активен'} *{org.tranzila_card_last4}</> : <><AlertTriangle className="w-3 h-3" /> {l ? 'פג' : 'Истёк'}</>}
              </span>
            ) : <span className="text-xs text-gray-400">{l ? 'לא' : 'Нет'}</span>}
          </div>
          <button onClick={() => openAutopay(org)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all mt-1
              ${org.recurring_enabled ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
            <CreditCard className="w-4 h-4" />
            {org.recurring_enabled ? (l ? '✓ אוטוחיוב פעיל' : '✓ Автоплатёж активен') : (l ? 'חבר אוטוחיוב' : 'Подключить автоплатёж')}
          </button>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => openExtend(org)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Shield className="w-4 h-4" />{l ? 'הארכה' : 'Продлить'}
          </button>
          <button onClick={() => { setEditOrg(org); setEditOpen(true); setSelectedOrg(null) }}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
            <Pencil className="w-4 h-4" />{l ? 'ערוך' : 'Редактировать'}
          </button>
          {/* Delete button */}
          <button onClick={() => { setDeleteOrg(org); setDeleteOpen(true); setSelectedOrg(null) }}
            className="col-span-2 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 border border-red-200 transition-colors">
            <Trash2 className="w-4 h-4" />{l ? 'מחק ארגון לצמיתות' : 'Удалить организацию навсегда'}
          </button>
        </div>
      </div>
    )
  }


  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Building2 className="w-7 h-7 text-blue-600" />
        <h1 className="text-2xl font-bold">{l ? 'ארגונים' : 'Организации'}</h1>
        <span className="text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-500">{orgs.length}</span>
      </div>

      {/* Access Requests */}
      {requests.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 p-4 space-y-2">
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
                <button onClick={() => handleApprove(r.user_id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors">
                  <CheckCircle className="w-3.5 h-3.5" />{l ? 'אשר' : 'Одобрить'}
                </button>
                <button onClick={() => handleReject(r.user_id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors">
                  <XCircle className="w-3.5 h-3.5" />{l ? 'דחה' : 'Отклонить'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder={l ? 'חיפוש...' : 'Поиск...'}
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ── CARDS GRID ── */}
      {filtered.length === 0 ? (
        <p className="text-center text-slate-400 py-12 text-sm">{l ? 'אין ארגונים' : 'Нет организаций'}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((org) => (
            <OrgCard
              key={org.id}
              org={org}
              lang={language}
              getPlanName={getPlanName}
              getStatusBadge={getStatusBadge}
              onSelect={() => handleSelectOrg(org)}
              onImpersonate={(e) => handleImpersonate(org, e)}
              impersonating={impersonating === org.id}
            />
          ))}
        </div>
      )}

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
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" /></div>
            <button onClick={() => setSelectedOrg(null)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="w-5 h-5 text-gray-400" />
            </button>
            <div className="px-5 pb-10 pt-2">{renderOrgDetail(selectedOrg)}</div>
          </div>
        </>
      )}


      {/* ── Extend Modal ── */}
      <Modal open={extendOpen && !!extendOrg} onClose={() => setExtendOpen(false)}
        title={l ? 'הארכת גישה' : 'Продление доступа'} subtitle={extendOrg?.name} size="md"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setExtendOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">{l ? 'ביטול' : 'Отмена'}</button>
            <button onClick={handleExtendSave} disabled={extendSaving} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {extendSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (l ? 'שמור' : 'Сохранить')}
            </button>
          </div>}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">{l ? 'תוכנית' : 'Тарифный план'}</label>
            <select value={extendPlan} onChange={e => handleExtendPlanChange(e.target.value as PlanKey)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {PLANS.map(p => <option key={p.key} value={p.key}>{l ? p.name_he : p.name_ru}{p.price_monthly ? ` — ₪${p.price_monthly}` : ''}</option>)}
            </select>
          </div>
          {extendPlan === 'custom' && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">{l ? 'מודולים' : 'Модули'}</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-xl p-3">
                {(modulePricing.length > 0 ? modulePricing : MODULES.map(m => ({ module_key: m.key, name_he: m.name_he, name_ru: m.name_ru, price_monthly: 0 }))).map(mod => {
                  const key = mod.module_key || (mod as any).key
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch checked={extendModules[key] || false} onCheckedChange={v => setExtendModules(p => ({ ...p, [key]: v }))} />
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
        footer={autopaySuccess ? (
          <button onClick={() => { setAutopayOpen(false); setAutopayOrg(null); setAutopaySuccess(null) }} className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors">{l ? 'סגור' : 'Закрыть'}</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => { setAutopayOpen(false); setAutopayOrg(null) }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">{l ? 'ביטול' : 'Отмена'}</button>
            <button onClick={handleSendAutopay} disabled={autopayLoading} className="flex-[1.5] py-2.5 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
              {autopayLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {l ? 'שלח קישור' : 'Отправить ссылку'}
            </button>
          </div>
        )}>
        {autopaySuccess ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle className="w-6 h-6 text-emerald-600" /></div>
            <p className="font-semibold text-emerald-700 mb-1">{l ? 'הקישור נשלח!' : 'Ссылка отправлена!'}</p>
            <p className="text-sm text-gray-500">{autopaySuccess.email}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div><Label>{l ? 'סכום (₪/חודש)' : 'Сумма (₪/мес)'}</Label>
              <input type="number" value={autopayAmount} onChange={e => setAutopayAmount(parseFloat(e.target.value) || 0)} className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-lg font-semibold bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            <div><Label>{l ? 'תאריך חיוב ראשון' : 'Дата первого списания'}</Label>
              <input type="date" value={autopayDate} onChange={e => setAutopayDate(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            <p className="text-xs text-blue-600 bg-blue-50 rounded-lg p-3">💡 {l ? 'הקישור יישלח לאימייל הבעלים.' : 'Ссылка отправится на email владельца.'}</p>
          </div>
        )}
      </Modal>

      {/* ── Invite Modal ── */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title={l ? 'הזמן ארגון' : 'Пригласить'} size="sm">
        <form onSubmit={handleInvite} className="space-y-4">
          <div><Label>Email</Label><input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="owner@business.com" required className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><Label>{l ? 'הודעה' : 'Сообщение'}</Label><Textarea className="mt-1" value={inviteMsg} onChange={e => setInviteMsg(e.target.value)} rows={3} /></div>
          <button type="submit" disabled={inviteSending} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {inviteSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" />{l ? 'שלח' : 'Отправить'}</>}
          </button>
        </form>
      </Modal>

      {/* ── Edit Org Modal ── */}
      <EditOrganizationModal isOpen={editOpen} onClose={() => { setEditOpen(false); setEditOrg(null) }} organization={editOrg} onSaved={loadData} />

      {/* ── Delete Org Modal ── */}
      <DeleteOrgModal org={deleteOrg} open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeleteOrg(null) }} onDeleted={() => { setDeleteOpen(false); setDeleteOrg(null); loadData() }} lang={language} />

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
          <span className="bg-white dark:bg-gray-800 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-full shadow-md border border-gray-100 whitespace-nowrap">{l ? 'הזמן ארגון' : 'Пригласить организацию'}</span>
          <button onClick={() => { onInvite(); setOpen(false) }} className="w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors">
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

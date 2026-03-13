'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import {
  Building2, Search, ChevronRight, Plus, Mail, Send,
  Pencil, Shield, CheckCircle, XCircle, Clock, AlertCircle, Loader2, Copy
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { getPlan, type PlanKey } from '@/lib/subscription-plans'

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
  tranzila_card_last4?: string
  payments_enabled?: boolean
  recurring_enabled?: boolean
}

interface AccessRequest {
  id: string
  user_id: string
  email: string
  full_name: string
  requested_at: string
  status: string
}

const STATUSES = [
  { value: 'none',    label_he: 'ללא גישה',      label_ru: 'Нет доступа',     color: 'gray' },
  { value: 'trial',   label_he: 'ניסיון',         label_ru: 'Пробный период',   color: 'yellow' },
  { value: 'active',  label_he: 'פעיל',           label_ru: 'Активна',          color: 'green' },
  { value: 'manual',  label_he: 'גישה ידנית',     label_ru: 'Ручной доступ',    color: 'blue' },
  { value: 'expired', label_he: 'פג תוקף',        label_ru: 'Истекла',          color: 'red' },
]

const STATUS_COLORS: Record<string, string> = {
  gray:   'bg-gray-500/10 text-gray-600 border-gray-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  green:  'bg-green-500/10 text-green-600 border-green-500/20',
  blue:   'bg-blue-500/10 text-blue-600 border-blue-500/20',
  red:    'bg-red-500/10 text-red-600 border-red-500/20',
}

export default function AdminOrganizationsPage() {
  const { language } = useLanguage()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [dbPlans, setDbPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Extend access modal state
  const [extendOpen, setExtendOpen] = useState(false)
  const [extendOrg, setExtendOrg] = useState<Organization | null>(null)
  const [newStatus, setNewStatus] = useState('trial')
  const [newPlan, setNewPlan] = useState('demo')
  const [newExpiry, setNewExpiry] = useState('')
  const [saving, setSaving] = useState(false)

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')
  const [inviteSending, setInviteSending] = useState(false)

  const l = language === 'he'

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [subRes, plansRes] = await Promise.all([
        fetch('/api/admin/subscriptions-list'),
        fetch('/api/admin/plans'),
      ])
      const sub = await subRes.json()
      const plans = plansRes.ok ? await plansRes.json() : []
      setOrgs(sub.organizations || [])
      setRequests(sub.accessRequests || [])
      setDbPlans(plans)
    } catch { toast.error(l ? 'שגיאה בטעינה' : 'Ошибка загрузки') }
    finally { setLoading(false) }
  }

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

  const openExtend = (org: Organization) => {
    setExtendOrg(org)
    setNewStatus(org.subscription_status === 'none' ? 'trial' : org.subscription_status)
    setNewPlan(org.plan || 'demo')
    const d = new Date(); d.setDate(d.getDate() + 14)
    setNewExpiry(d.toISOString().split('T')[0])
    setExtendOpen(true)
  }

  const handleExtendSave = async () => {
    if (!extendOrg) return
    setSaving(true)
    try {
      const exp = new Date(newExpiry); exp.setHours(23, 59, 59, 999)
      const plan = dbPlans.find(p => p.key === newPlan)
      const res = await fetch('/api/admin/organizations/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: extendOrg.id,
          plan: newPlan,
          features: { ...(extendOrg.features || {}), modules: plan?.modules || {} },
          subscription_update: {
            subscription_status: newStatus,
            subscription_expires_at: exp.toISOString(),
          },
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(l ? 'הגישה הוארכה' : 'Доступ продлён')
      setExtendOpen(false)
      loadData()
    } catch { toast.error(l ? 'שגיאה' : 'Ошибка') }
    finally { setSaving(false) }
  }

  const handleApprove = async (userId: string) => {
    await fetch(`/api/access/review?user_id=${userId}&action=approve&token=admin`)
    toast.success(l ? 'אושר' : 'Одобрено'); loadData()
  }

  const handleReject = async (userId: string) => {
    if (!confirm(l ? 'לדחות?' : 'Отклонить?')) return
    await fetch(`/api/access/review?user_id=${userId}&action=reject&token=admin`)
    toast.success(l ? 'נדחה' : 'Отклонено'); loadData()
  }

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
    } catch { toast.error(l ? 'שגיאה' : 'Ошибка') }
    finally { setInviteSending(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold">{l ? 'ארגונים' : 'Организации'}</h1>
          <Badge variant="outline" className="text-sm">{orgs.length}</Badge>
        </div>
        <Button onClick={() => setInviteOpen(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          {l ? 'הזמן' : 'Пригласить'}
        </Button>
      </div>

      {/* Access Requests */}
      {requests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <AlertCircle className="w-4 h-4" />
              {l ? `בקשות גישה (${requests.length})` : `Запросы доступа (${requests.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{r.full_name || r.email}</p>
                  <p className="text-xs text-slate-500">{r.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(r.user_id)}>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {l ? 'אשר' : 'Одобрить'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(r.user_id)}>
                    <XCircle className="w-3 h-3 mr-1" />
                    {l ? 'דחה' : 'Отклонить'}
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
        <Input
          className="pl-10"
          placeholder={l ? 'חיפוש ארגון...' : 'Поиск организации...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Organizations list */}
      <Card>
        <CardContent className="p-3 space-y-2">
          {filtered.map(org => {
            const paid = ['active','trial','manual'].includes(org.subscription_status)
            return (
              <button
                key={org.id}
                onClick={() => { setSelectedOrg(org); setDetailOpen(true) }}
                className="w-full flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-blue-200 hover:shadow-sm transition-all text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {org.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{org.display_name || org.name}</span>
                    {getStatusBadge(org.subscription_status)}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {org.owner_name} · {getPlanName(org.plan)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`w-2 h-2 rounded-full ${paid ? 'bg-emerald-500' : 'bg-red-400'}`} />
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-center text-slate-400 py-8 text-sm">
              {l ? 'אין ארגונים' : 'Нет организаций'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Org detail modal */}
      {selectedOrg && (
        <Modal open={detailOpen} onClose={() => setDetailOpen(false)} width="480px"
          title={selectedOrg.display_name || selectedOrg.name}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                [l ? 'בעלים' : 'Владелец', selectedOrg.owner_name],
                [l ? 'אימייל' : 'Email', selectedOrg.owner_email],
                [l ? 'טלפון' : 'Телефон', selectedOrg.phone || '—'],
                [l ? 'תוכנית' : 'План', getPlanName(selectedOrg.plan)],
                [l ? 'סטטוס' : 'Статус', null],
                [l ? 'תוקף' : 'Истекает', selectedOrg.subscription_expires_at
                  ? new Date(selectedOrg.subscription_expires_at).toLocaleDateString(l ? 'he-IL' : 'ru-RU')
                  : '—'],
              ].map(([label, value], i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  {i === 4
                    ? getStatusBadge(selectedOrg.subscription_status)
                    : <p className="font-medium text-slate-800 dark:text-slate-200">{value}</p>}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => { setDetailOpen(false); openExtend(selectedOrg) }}>
                <Shield className="w-4 h-4 mr-2" />
                {l ? 'הארך גישה' : 'Продлить доступ'}
              </Button>
              <Button variant="outline" className="flex-1"
                onClick={() => { window.location.href = `mailto:${selectedOrg.owner_email}` }}>
                <Mail className="w-4 h-4 mr-2" />
                {l ? 'כתוב' : 'Написать'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Extend access modal */}
      {extendOrg && (
        <Modal open={extendOpen} onClose={() => setExtendOpen(false)} width="440px"
          title={l ? 'הארכת גישה' : 'Продление доступа'}
          footer={
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleExtendSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (l ? 'שמור' : 'Сохранить')}
              </Button>
              <Button variant="outline" onClick={() => setExtendOpen(false)}>{l ? 'ביטול' : 'Отмена'}</Button>
            </div>
          }>
          <div className="space-y-4">
            <div>
              <Label>{l ? 'סטטוס' : 'Статус'}</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {l ? s.label_he : s.label_ru}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{l ? 'תוכנית' : 'План'}</Label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dbPlans.map(p => (
                    <SelectItem key={p.key} value={p.key}>
                      {l ? p.name_he : p.name_ru}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{l ? 'תאריך תפוגה' : 'Дата окончания'}</Label>
              <Input type="date" className="mt-1" value={newExpiry}
                onChange={e => setNewExpiry(e.target.value)} />
            </div>
          </div>
        </Modal>
      )}

      {/* Invite modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} width="420px"
        title={l ? 'הזמן ארגון' : 'Пригласить организацию'}>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input className="mt-1" type="email" value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="owner@business.com" />
          </div>
          <div>
            <Label>{l ? 'הודעה (אופציונלי)' : 'Сообщение (опционально)'}</Label>
            <Textarea className="mt-1" value={inviteMsg}
              onChange={e => setInviteMsg(e.target.value)}
              placeholder={l ? 'הודעה אישית...' : 'Персональное сообщение...'} rows={3} />
          </div>
          <Button type="submit" className="w-full" disabled={inviteSending}>
            {inviteSending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><Send className="w-4 h-4 mr-2" />{l ? 'שלח' : 'Отправить'}</>}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

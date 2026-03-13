'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  useAdminStats, useRecentOrganizations,
  useOrganizationsByMonth, useAuditLog,
} from '@/hooks/useAdmin'
import {
  Building2, TrendingUp, UserPlus, XCircle,
  RefreshCw, Activity, Eye, Clock, AlertTriangle,
  User, Shield, ChevronRight, LogIn,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { format, formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// ── Animated number ───────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(0)
  useEffect(() => {
    const start = prev.current, end = value
    prev.current = end
    if (start === end) return
    const dur = 700, t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1)
      const e = 1 - Math.pow(1 - p, 3)
      const cur = start + (end - start) * e
      if (ref.current)
        ref.current.textContent = prefix +
          cur.toLocaleString('he-IL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value, prefix, suffix, decimals])
  return (
    <span ref={ref}>
      {prefix}{value.toLocaleString('he-IL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  )
}

// ── Gradient KPI card ─────────────────────────────────────────────────────────
function GradientCard({ label, sub, value, prefix, suffix, decimals, from, to, icon: Icon, alert, badge }: {
  label: string; sub?: string; value: number
  prefix?: string; suffix?: string; decimals?: number
  from: string; to: string; icon: any; alert?: boolean; badge?: string
}) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl p-5 text-white shadow-lg',
      'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-default',
      `bg-gradient-to-br ${from} ${to}`,
      alert && 'ring-2 ring-red-400/60'
    )}>
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
      <div className="absolute -right-2 -bottom-6 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-bold tracking-tight leading-none">
            <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
          </p>
          {sub && <p className="text-xs text-white/60 mt-1.5">{sub}</p>}
          {badge && <span className="inline-block mt-2 text-xs bg-white/20 rounded-full px-2 py-0.5">{badge}</span>}
        </div>
        <div className="bg-white/20 rounded-xl p-2.5 flex-shrink-0 ml-3">
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-gray-200 dark:bg-gray-700 rounded-2xl', className)} />
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg px-4 py-2.5 text-sm">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="font-bold text-indigo-600">{payload[0].value} ארגונים</p>
    </div>
  )
}

// ── Audit action label ────────────────────────────────────────────────────────
const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  impersonation_start: { label: 'כניסה כמשתמש', color: 'text-violet-600 bg-violet-50' },
  login:               { label: 'התחברות',      color: 'text-blue-600 bg-blue-50'   },
  client_create:       { label: 'לקוח נוצר',    color: 'text-emerald-600 bg-emerald-50' },
  client_delete:       { label: 'לקוח נמחק',    color: 'text-red-600 bg-red-50'     },
  payment_success:     { label: 'תשלום עבר',     color: 'text-emerald-600 bg-emerald-50' },
  payment_failed:      { label: 'תשלום נכשל',   color: 'text-red-600 bg-red-50'     },
  subscription_update: { label: 'מנוי עודכן',   color: 'text-amber-600 bg-amber-50'  },
  settings_update:     { label: 'הגדרות שונו',  color: 'text-gray-600 bg-gray-100'  },
}
const getAction = (a: string) => ACTION_LABELS[a] ?? { label: a, color: 'text-gray-500 bg-gray-100' }

// ── Impersonation modal ───────────────────────────────────────────────────────
function ImpersonateModal({ onClose }: { onClose: () => void }) {
  const [orgs, setOrgs] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [doing, setDoing] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('organizations').select('id, name, email, is_active')
      .eq('is_active', true).order('name')
      .then(({ data }) => { setOrgs(data || []); setLoading(false) })
  }, [])

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleImpersonate = async (orgId: string, orgName: string) => {
    setDoing(orgId)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      // Записываем API
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ orgId }),
      })
      if (!res.ok) throw new Error('Failed')

      // Переключаем activeOrgId на целевую org
      await fetch('/api/set-active-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      })

      // Сохраняем сессию импersonation + admin_org_id для возврата
      const adminOrg = orgs.find(o => o.email === 'creepie1357@gmail.com' || o.email === 'ambersolutions.systems@gmail.com')
      localStorage.setItem('admin_org_id', adminOrg?.id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      localStorage.setItem('impersonation_session', JSON.stringify({
        orgId, orgName, adminEmail: session?.user?.email, startedAt: new Date().toISOString()
      }))

      window.location.href = '/dashboard'
    } catch {
      alert('שגיאה בכניסה')
    } finally {
      setDoing(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-4 flex items-center gap-3">
          <div className="bg-white/20 rounded-lg p-2"><Eye className="w-5 h-5 text-white" /></div>
          <div>
            <h2 className="font-bold text-white">כניסה כמשתמש</h2>
            <p className="text-xs text-white/70">בחר ארגון לצפייה בשמו — הפעולה תירשם ביומן</p>
          </div>
        </div>
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש ארגון..."
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:outline-none focus:border-violet-400 transition-colors"
          />
        </div>
        <div className="overflow-y-auto max-h-72 p-2">
          {loading ? (
            <div className="space-y-2 p-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : filtered.map(org => (
            <button key={org.id} onClick={() => handleImpersonate(org.id, org.name)}
              disabled={doing === org.id}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/50 dark:to-purple-900/50 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-violet-600 dark:text-violet-300">{org.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">{org.name}</p>
                <p className="text-xs text-gray-400 truncate">{org.email}</p>
              </div>
              {doing === org.id
                ? <RefreshCw className="w-4 h-4 text-violet-500 animate-spin flex-shrink-0" />
                : <LogIn className="w-4 h-4 text-gray-300 group-hover:text-violet-500 flex-shrink-0 transition-colors" />
              }
            </button>
          ))}
          {!loading && filtered.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-6">לא נמצאו ארגונים</p>
          )}
        </div>
        <div className="px-4 pb-4 pt-2">
          <button onClick={onClose} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">סגור</button>
        </div>
      </div>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [showImpersonate, setShowImpersonate] = useState(false)

  const { data: stats, isLoading: statsLoading } = useAdminStats()
  const { data: recentOrgs, isLoading: orgsLoading } = useRecentOrganizations(5)
  const { data: orgsByMonth, isLoading: chartLoading } = useOrganizationsByMonth()
  const { data: auditLog, isLoading: auditLoading } = useAuditLog(5)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['admin'] })
    setTimeout(() => setRefreshing(false), 800)
  }, [queryClient])

  const formatDaysLeft = (d: string) => {
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
    return diff <= 1 ? 'מחר' : `${diff} ימים`
  }

  const hasAlerts = (stats?.expiringOrgs?.length || 0) + (stats?.failedAttempts?.length || 0) > 0

  return (
    <div className="space-y-6 pb-8">
      {showImpersonate && <ImpersonateModal onClose={() => setShowImpersonate(false)} />}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity className="w-7 h-7 text-indigo-500" />
            לוח בקרה
          </h1>
          <p className="text-gray-400 text-sm mt-1">Trinity CRM · Amber Solutions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImpersonate(true)}
            className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-400 transition-colors">
            <Eye className="w-3.5 h-3.5" />
            כניסה כמשתמש
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}
            className="gap-2 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            עדכן נתונים
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GradientCard icon={TrendingUp} label="MRR" sub="הכנסה חודשית חוזרת"
            value={stats?.mrr || 0} prefix="₪"
            from="from-emerald-500" to="to-teal-600"
            badge={`${stats?.activeOrgs || 0} מנויים`} />
          <GradientCard icon={Building2} label="ארגונים"
            value={stats?.activeOrgs || 0} suffix={` / ${stats?.totalOrgs || 0}`}
            sub="פעילים מתוך סה״כ"
            from="from-blue-500" to="to-indigo-600" />
          <GradientCard icon={UserPlus} label="חדשים השבוע"
            value={stats?.newOrgs7d || 0} sub="7 ימים אחרונים"
            from="from-violet-500" to="to-purple-600" />
          <GradientCard icon={XCircle} label="תשלומים כושלים"
            value={stats?.failedAttempts?.length || 0} sub="30 ימים אחרונים"
            from={(stats?.failedAttempts?.length || 0) > 0 ? 'from-red-500' : 'from-gray-400'}
            to={(stats?.failedAttempts?.length || 0) > 0 ? 'to-rose-600' : 'to-gray-500'}
            alert={(stats?.failedAttempts?.length || 0) > 0} />
        </div>
      )}

      {/* ── Alerts ───────────────────────────────────────────────────────── */}
      {hasAlerts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(stats?.expiringOrgs?.length || 0) > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-amber-100 dark:bg-amber-900/50 rounded-lg p-1.5"><Clock className="w-4 h-4 text-amber-600" /></div>
                <span className="font-semibold text-amber-800 dark:text-amber-300 text-sm">מנויים שפגים תוקפם</span>
                <Badge className="ml-auto bg-amber-200 text-amber-800 border-0 text-xs">{stats?.expiringOrgs?.length}</Badge>
              </div>
              <div className="space-y-2">
                {stats?.expiringOrgs?.map((org: any) => (
                  <div key={org.id} className="flex items-center justify-between bg-white/70 dark:bg-gray-800/50 rounded-xl px-3 py-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{org.name}</p>
                      <p className="text-xs text-gray-400 truncate">{org.email}</p>
                    </div>
                    <div className="flex-shrink-0 ml-3 text-right">
                      <span className="text-xs font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">{formatDaysLeft(org.subscription_expires_at)}</span>
                      {org.billing_amount && <p className="text-xs text-gray-400 mt-0.5">₪{org.billing_amount}/חודש</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(stats?.failedAttempts?.length || 0) > 0 && (
            <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-red-100 dark:bg-red-900/50 rounded-lg p-1.5"><AlertTriangle className="w-4 h-4 text-red-600" /></div>
                <span className="font-semibold text-red-800 dark:text-red-300 text-sm">תשלומים כושלים</span>
                <Badge className="ml-auto bg-red-200 text-red-800 border-0 text-xs">{stats?.failedAttempts?.length}</Badge>
              </div>
              <div className="space-y-2">
                {stats?.failedAttempts?.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between bg-white/70 dark:bg-gray-800/50 rounded-xl px-3 py-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{a.organizations?.name || '—'}</p>
                      <p className="text-xs text-gray-400 truncate">{a.error_message || 'שגיאת תשלום'}</p>
                    </div>
                    <div className="flex-shrink-0 ml-3 text-right">
                      <span className="text-xs font-semibold text-red-700 bg-red-100 rounded-full px-2 py-0.5">ניסיון {a.attempt_number}/{a.max_attempts}</span>
                      <p className="text-xs text-gray-400 mt-0.5">₪{a.amount}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Recent Orgs + Audit Log ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent orgs — max 5 */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-1.5"><Building2 className="w-4 h-4 text-blue-500" /></div>
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{t('admin.recentOrgs')}</h2>
          </div>
          {orgsLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : recentOrgs?.length ? (
            <div className="space-y-1">
              {recentOrgs.slice(0, 5).map((org) => (
                <div key={org.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/50 dark:to-blue-900/50 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">{org.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">{org.name}</p>
                    <p className="text-xs text-gray-400 truncate">{org.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                      org.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-500')}>
                      {org.is_active ? '● פעיל' : '○ לא פעיל'}
                    </span>
                    <span className="text-xs text-gray-400">{format(new Date(org.created_at), 'dd/MM/yy')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
              <Building2 className="w-8 h-8 opacity-30" />
              <p className="text-sm">{t('admin.noNewOrgs')}</p>
            </div>
          )}
        </div>

        {/* Audit log — last 5 actions */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-violet-50 dark:bg-violet-900/30 rounded-lg p-1.5"><Shield className="w-4 h-4 text-violet-500" /></div>
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">פעולות אחרונות</h2>
            <a href="/audit" className="ml-auto text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5 transition-colors">
              כל היומן <ChevronRight className="w-3 h-3" />
            </a>
          </div>
          {auditLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : auditLog?.length ? (
            <div className="space-y-1">
              {auditLog.map((entry) => {
                const { label, color } = getAction(entry.action)
                return (
                  <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                        {(entry as any).organizations?.name || entry.user_email?.split('@')[0] || '—'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{entry.user_email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', color)}>{label}</span>
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: he })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
              <Shield className="w-8 h-8 opacity-30" />
              <p className="text-sm">אין פעולות עדיין</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Growth Chart ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="bg-violet-50 dark:bg-violet-900/30 rounded-lg p-1.5"><TrendingUp className="w-4 h-4 text-violet-500" /></div>
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{t('admin.newOrgsByMonth')}</h2>
        </div>
        {chartLoading ? (
          <Skeleton className="h-52 w-full" />
        ) : orgsByMonth && orgsByMonth.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={orgsByMonth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="adminAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} reversed />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5}
                fill="url(#adminAreaGrad)"
                dot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                animationDuration={900} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-gray-300 dark:text-gray-600 gap-2">
            <TrendingUp className="w-10 h-10" />
            <p className="text-sm">אין מספיק נתונים</p>
          </div>
        )}
      </div>

    </div>
  )
}

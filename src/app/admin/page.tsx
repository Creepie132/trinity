'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  useAdminStats, useRecentOrganizations,
  useOrganizationsByMonth, useSystemHealth,
} from '@/hooks/useAdmin'
import {
  Building2, CheckCircle2, TrendingUp, Server,
  Database, MessageSquare, Banknote, AlertCircle,
  AlertTriangle, UserPlus, Clock, XCircle, RefreshCw,
  Activity, Zap,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

// ── Animated counter ──────────────────────────────────────────────────────────
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
          cur.toLocaleString('he-IL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) +
          suffix
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

// ── Gradient KPI Card ─────────────────────────────────────────────────────────
function GradientCard({ label, sub, value, prefix, suffix, decimals, from, to, icon: Icon, alert, badge }: {
  label: string; sub?: string; value: number
  prefix?: string; suffix?: string; decimals?: number
  from: string; to: string; icon: any
  alert?: boolean; badge?: string
}) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl p-5 text-white shadow-lg',
      'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
      `bg-gradient-to-br ${from} ${to}`,
      alert && 'ring-2 ring-red-400/60'
    )}>
      {/* bg blur circle */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
      <div className="absolute -right-2 -bottom-6 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-bold tracking-tight leading-none">
            <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
          </p>
          {sub && <p className="text-xs text-white/60 mt-1.5">{sub}</p>}
          {badge && (
            <span className="inline-block mt-2 text-xs bg-white/20 rounded-full px-2 py-0.5">
              {badge}
            </span>
          )}
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

// ── Pulse dot ─────────────────────────────────────────────────────────────────
function PulseDot({ ok }: { ok: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {ok && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
      <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', ok ? 'bg-emerald-500' : 'bg-red-500')} />
    </span>
  )
}

// ── Custom tooltip for chart ──────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg px-4 py-2.5 text-sm">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="font-bold text-indigo-600">{payload[0].value} ארגונים</p>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const { data: stats, isLoading: statsLoading } = useAdminStats()
  const { data: recentOrgs, isLoading: orgsLoading } = useRecentOrganizations(6)
  const { data: orgsByMonth, isLoading: chartLoading } = useOrganizationsByMonth()
  const { data: health, isLoading: healthLoading } = useSystemHealth()

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

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity className="w-7 h-7 text-indigo-500" />
            לוח בקרה
          </h1>
          <p className="text-gray-400 text-sm mt-1">Trinity CRM · Amber Solutions</p>
        </div>
        <Button
          variant="outline" size="sm"
          onClick={handleRefresh} disabled={refreshing}
          className="gap-2 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
          עדכן נתונים
        </Button>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GradientCard
            icon={TrendingUp} label="MRR" sub="הכנסה חודשית חוזרת"
            value={stats?.mrr || 0} prefix="₪"
            from="from-emerald-500" to="to-teal-600"
            badge={`${stats?.activeOrgs || 0} מנויים`}
          />
          <GradientCard
            icon={Building2} label="ארגונים"
            value={stats?.activeOrgs || 0}
            suffix={` / ${stats?.totalOrgs || 0}`}
            sub="פעילים מתוך סה״כ"
            from="from-blue-500" to="to-indigo-600"
          />
          <GradientCard
            icon={UserPlus} label="חדשים השבוע"
            value={stats?.newOrgs7d || 0} sub="7 ימים אחרונים"
            from="from-violet-500" to="to-purple-600"
          />
          <GradientCard
            icon={XCircle} label="תשלומים כושלים"
            value={stats?.failedAttempts?.length || 0} sub="30 ימים אחרונים"
            from={(stats?.failedAttempts?.length || 0) > 0 ? 'from-red-500' : 'from-gray-400'}
            to={(stats?.failedAttempts?.length || 0) > 0 ? 'to-rose-600' : 'to-gray-500'}
            alert={(stats?.failedAttempts?.length || 0) > 0}
          />
        </div>
      )}

      {/* ── Alerts ───────────────────────────────────────────────────────── */}
      {hasAlerts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {(stats?.expiringOrgs?.length || 0) > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-amber-100 dark:bg-amber-900/50 rounded-lg p-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <span className="font-semibold text-amber-800 dark:text-amber-300 text-sm">מנויים שפגים תוקפם</span>
                <Badge className="ml-auto bg-amber-200 text-amber-800 border-0 text-xs">{stats?.expiringOrgs?.length}</Badge>
              </div>
              <div className="space-y-2">
                {stats?.expiringOrgs?.map((org: any) => (
                  <div key={org.id} className="flex items-center justify-between bg-white/70 dark:bg-gray-800/50 rounded-xl px-3 py-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">{org.name}</p>
                      <p className="text-xs text-gray-400 truncate">{org.email}</p>
                    </div>
                    <div className="flex-shrink-0 ml-3 text-right">
                      <span className="text-xs font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                        {formatDaysLeft(org.subscription_expires_at)}
                      </span>
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
                <div className="bg-red-100 dark:bg-red-900/50 rounded-lg p-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <span className="font-semibold text-red-800 dark:text-red-300 text-sm">תשלומים כושלים</span>
                <Badge className="ml-auto bg-red-200 text-red-800 border-0 text-xs">{stats?.failedAttempts?.length}</Badge>
              </div>
              <div className="space-y-2">
                {stats?.failedAttempts?.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between bg-white/70 dark:bg-gray-800/50 rounded-xl px-3 py-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">{a.organizations?.name || '—'}</p>
                      <p className="text-xs text-gray-400 truncate">{a.error_message || 'שגיאת תשלום'}</p>
                    </div>
                    <div className="flex-shrink-0 ml-3 text-right">
                      <span className="text-xs font-semibold text-red-700 bg-red-100 rounded-full px-2 py-0.5">
                        ניסיון {a.attempt_number}/{a.max_attempts}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">₪{a.amount}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── System Health + Recent Orgs ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* System health */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-1.5">
              <Zap className="w-4 h-4 text-indigo-500" />
            </div>
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{t('admin.systemHealth')}</h2>
            {!healthLoading && (
              <span className="ml-auto text-xs text-gray-400">
                {health?.checks?.timestamp ? format(new Date(health.checks.timestamp), 'HH:mm') : ''}
              </span>
            )}
          </div>
          {healthLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="space-y-2">
              {([
                { icon: Database, label: 'Supabase Database', key: 'supabase' },
                { icon: Server, label: 'API Server', key: 'api' },
                { icon: MessageSquare, label: 'InforU SMS', key: 'sms' },
                { icon: Banknote, label: 'Tranzilla', key: 'payments' },
              ] as const).map(({ icon: Icon, label, key }) => {
                const ok = health?.checks?.[key] ?? false
                return (
                  <div key={key} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PulseDot ok={ok} />
                      <span className={cn('text-xs font-medium', ok ? 'text-emerald-600' : 'text-red-500')}>
                        {ok ? 'פעיל' : 'לא זמין'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent orgs */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-1.5">
              <Building2 className="w-4 h-4 text-blue-500" />
            </div>
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{t('admin.recentOrgs')}</h2>
          </div>
          {orgsLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : recentOrgs?.length ? (
            <div className="space-y-1.5">
              {recentOrgs.map((org) => (
                <div key={org.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/50 dark:to-blue-900/50 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">{org.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">{org.name}</p>
                      <p className="text-xs text-gray-400 truncate">{org.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-3">
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      org.is_active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    )}>
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
      </div>

      {/* ── Growth Chart ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="bg-violet-50 dark:bg-violet-900/30 rounded-lg p-1.5">
            <TrendingUp className="w-4 h-4 text-violet-500" />
          </div>
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
              <Area
                type="monotone" dataKey="count"
                stroke="#6366f1" strokeWidth={2.5}
                fill="url(#adminAreaGrad)"
                dot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                animationDuration={900} animationEasing="ease-out"
              />
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

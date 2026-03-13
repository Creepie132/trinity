'use client'

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  useAdminStats,
  useRecentOrganizations,
  useOrganizationsByMonth,
  useSystemHealth,
} from '@/hooks/useAdmin'
import {
  Building2, CheckCircle2, TrendingUp, Server,
  Database, MessageSquare, Banknote, AlertCircle,
  AlertTriangle, UserPlus, Clock, XCircle, RefreshCw,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

// ─── Animated counter ─────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react'

function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
}: {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(0)

  useEffect(() => {
    const start = prev.current
    const end = value
    prev.current = end
    if (start === end) return

    const duration = 600
    const startTime = performance.now()

    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      const current = start + (end - start) * eased
      if (ref.current) {
        ref.current.textContent =
          prefix + current.toLocaleString('he-IL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix
      }
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

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  sub,
  value,
  suffix,
  prefix,
  decimals,
  color,
  alert,
}: {
  icon: any; label: string; sub?: string
  value: number; suffix?: string; prefix?: string; decimals?: number
  color: string; alert?: boolean
}) {
  return (
    <Card className={cn(
      'hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5',
      alert && 'border-red-200 bg-red-50/30 dark:bg-red-950/10'
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-gray-500 truncate">{label}</p>
            <p className={cn('text-3xl font-bold mt-1 tabular-nums', color)}>
              <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
            </p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
          <div className={cn(
            'p-3 rounded-full flex-shrink-0',
            alert ? 'bg-red-100' : `${color.replace('text-', 'bg-').replace('-600', '-100')}`
          )}>
            <Icon className={cn('w-6 h-6', alert ? 'text-red-600' : color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Status Row ───────────────────────────────────────────────────────────────
function StatusRow({ icon: Icon, label, healthy }: { icon: any; label: string; healthy: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-gray-500" />
        <span className="font-medium text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {healthy
          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
          : <AlertCircle className="w-4 h-4 text-red-500" />}
        <Badge variant={healthy ? 'default' : 'destructive'} className="text-xs">
          {healthy ? 'פעיל' : 'לא זמין'}
        </Badge>
      </div>
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl', className)} />
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const { data: stats, isLoading: statsLoading } = useAdminStats()
  const { data: recentOrgs, isLoading: orgsLoading } = useRecentOrganizations(5)
  const { data: orgsByMonth, isLoading: chartLoading } = useOrganizationsByMonth()
  const { data: health, isLoading: healthLoading } = useSystemHealth()

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['admin'] })
    setTimeout(() => setRefreshing(false), 800)
  }, [queryClient])

  const formatDaysLeft = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
    return diff === 1 ? 'יום אחד' : `${diff} ימים`
  }


  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('admin.welcome')}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">{t('admin.subtitle')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2 text-sm"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          עדכן נתונים
        </Button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={TrendingUp}
            label="MRR (הכנסה חודשית)"
            sub="מנויים פעילים"
            value={stats?.mrr || 0}
            prefix="₪"
            color="text-emerald-600"
          />
          <KpiCard
            icon={Building2}
            label={t('admin.totalOrgs')}
            sub={`פעילים / סה״כ`}
            value={stats?.activeOrgs || 0}
            suffix={` / ${stats?.totalOrgs || 0}`}
            color="text-blue-600"
          />
          <KpiCard
            icon={UserPlus}
            label="חדשים (7 ימים)"
            sub="ארגונים חדשים"
            value={stats?.newOrgs7d || 0}
            color="text-purple-600"
          />
          <KpiCard
            icon={XCircle}
            label="תשלומים כושלים"
            sub="30 ימים אחרונים"
            value={stats?.failedAttempts?.length || 0}
            color={(stats?.failedAttempts?.length || 0) > 0 ? 'text-red-600' : 'text-gray-400'}
            alert={(stats?.failedAttempts?.length || 0) > 0}
          />
        </div>
      )}


      {/* ── Alert Rows (Expiring + Failed) ────────────────────────────────── */}
      {((stats?.expiringOrgs?.length || 0) > 0 || (stats?.failedAttempts?.length || 0) > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Expiring subscriptions */}
          {(stats?.expiringOrgs?.length || 0) > 0 && (
            <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-950/10 animate-in fade-in slide-in-from-top-2 duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-base">
                  <Clock className="w-4 h-4" />
                  מנויים שפגים תוקפם בקרוב
                  <Badge variant="outline" className="border-amber-400 text-amber-700 text-xs ml-auto">
                    {stats?.expiringOrgs?.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats?.expiringOrgs?.map((org: any, i: number) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-amber-100 transition-all hover:shadow-sm"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{org.name}</p>
                      <p className="text-xs text-gray-400">{org.email}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <Badge variant="outline" className="border-amber-400 text-amber-700 text-xs">
                        {formatDaysLeft(org.subscription_expires_at)}
                      </Badge>
                      {org.billing_amount && (
                        <p className="text-xs text-gray-400 mt-1">₪{org.billing_amount}/חודש</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Failed payment attempts */}
          {(stats?.failedAttempts?.length || 0) > 0 && (
            <Card className="border-red-200 bg-red-50/40 dark:bg-red-950/10 animate-in fade-in slide-in-from-top-2 duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400 text-base">
                  <AlertTriangle className="w-4 h-4" />
                  תשלומים כושלים — דורשים טיפול
                  <Badge variant="destructive" className="text-xs ml-auto">
                    {stats?.failedAttempts?.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats?.failedAttempts?.map((attempt: any, i: number) => (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-red-100 transition-all hover:shadow-sm"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{attempt.organizations?.name || '—'}</p>
                      <p className="text-xs text-gray-400">{attempt.error_message || 'שגיאת תשלום'}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <Badge variant="destructive" className="text-xs">
                        ניסיון {attempt.attempt_number}/{attempt.max_attempts}
                      </Badge>
                      <p className="text-xs text-gray-400 mt-1">₪{attempt.amount}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

        </div>
      )}


      {/* ── System Health + Recent Orgs ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* System health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="w-5 h-5" />
              {t('admin.systemHealth')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {healthLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)
            ) : (
              <>
                <StatusRow icon={Database} label="Supabase Database" healthy={health?.checks?.supabase ?? false} />
                <StatusRow icon={Server} label="API Server" healthy={health?.checks?.api ?? false} />
                <StatusRow icon={MessageSquare} label="InforU SMS" healthy={health?.checks?.sms ?? false} />
                <StatusRow icon={Banknote} label="Tranzilla" healthy={health?.checks?.payments ?? false} />
                {health?.checks?.timestamp && (
                  <p className="text-xs text-gray-400 text-center pt-1">
                    {t('admin.lastUpdate')}: {format(new Date(health.checks.timestamp), 'HH:mm:ss')}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent orgs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="w-5 h-5" />
              {t('admin.recentOrgs')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {orgsLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-14" />)
            ) : recentOrgs?.length ? (
              recentOrgs.map((org, i) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{org.name}</p>
                    <p className="text-xs text-gray-400 truncate">{org.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-3">
                    <Badge variant={org.is_active ? 'default' : 'secondary'} className="text-xs">
                      {org.is_active ? t('admin.orgs.active') : t('admin.orgs.inactive')}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {format(new Date(org.created_at), 'dd/MM/yy')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-gray-400 text-sm">{t('admin.noNewOrgs')}</p>
            )}
          </CardContent>
        </Card>

      </div>


      {/* ── Growth Chart ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin.newOrgsByMonth')}</CardTitle>
        </CardHeader>
        <CardContent>
          {chartLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : orgsByMonth && orgsByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={orgsByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} reversed />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 13 }}
                  cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="url(#adminLineGradient)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                  name="ארגונים חדשים"
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <TrendingUp className="w-8 h-8 opacity-30" />
              <p className="text-sm">אין מספיק נתונים להצגת גרף</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}

'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { useFeatures } from '@/hooks/useFeatures'
import { useQuery } from '@tanstack/react-query'
import { OnboardingWizard } from '@/components/OnboardingWizard'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } = {
  BarChart: dynamic(() => import('recharts').then(m => ({ default: m.BarChart })), { ssr: false }),
  Bar: dynamic(() => import('recharts').then(m => ({ default: m.Bar })), { ssr: false }),
  LineChart: dynamic(() => import('recharts').then(m => ({ default: m.LineChart })), { ssr: false }),
  Line: dynamic(() => import('recharts').then(m => ({ default: m.Line })), { ssr: false }),
  XAxis: dynamic(() => import('recharts').then(m => ({ default: m.XAxis })), { ssr: false }),
  YAxis: dynamic(() => import('recharts').then(m => ({ default: m.YAxis })), { ssr: false }),
  CartesianGrid: dynamic(() => import('recharts').then(m => ({ default: m.CartesianGrid })), { ssr: false }),
  Tooltip: dynamic(() => import('recharts').then(m => ({ default: m.Tooltip })), { ssr: false }),
  ResponsiveContainer: dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false }),
  Cell: dynamic(() => import('recharts').then(m => ({ default: m.Cell })), { ssr: false }),
}

export function DashboardClient({ orgId }: { orgId: string }) {
  const router = useRouter()
  const features = useFeatures()
  const supabase = createSupabaseBrowserClient()

  // Check organization status
  useEffect(() => {
    if (!features.isLoading && !features.isActive) {
      router.push('/blocked')
    }
  }, [features.isActive, features.isLoading, router])

  // Activate invitation if token exists in localStorage
  useEffect(() => {
    const activateInvitation = async () => {
      const invitationToken = localStorage.getItem('invitation_token')
      
      if (invitationToken) {
        console.log('[dashboard] Found invitation token, activating...', invitationToken)
        
        try {
          const response = await fetch('/api/access/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: invitationToken }),
          })

          const data = await response.json()

          if (response.ok) {
            console.log('[dashboard] Invitation activated successfully:', data)
            // Remove token from localStorage after successful activation
            localStorage.removeItem('invitation_token')
            // Optionally show success message
            // toast.success('Welcome! Your trial has been activated.')
          } else {
            console.error('[dashboard] Failed to activate invitation:', data)
            // Still remove token to prevent retry loop
            localStorage.removeItem('invitation_token')
          }
        } catch (error) {
          console.error('[dashboard] Error activating invitation:', error)
          // Remove token even on error to prevent retry loop
          localStorage.removeItem('invitation_token')
        }
      }
    }

    activateInvitation()
  }, [])

  // Fetch dashboard settings for chart visibility
  const { data: dashboardSettings } = useQuery({
    queryKey: ['dashboard-settings', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const response = await fetch('/api/dashboard/settings')
      if (!response.ok) throw new Error('Failed to load settings')
      const data = await response.json()
      return data.dashboard_charts || { revenue: true, visits: true, topClients: true }
    },
  })

  // Check if onboarding is needed
  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding-check', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      if (!orgId) return { showOnboarding: false, organizationName: '', modules: {} }

      const { data: org } = await supabase
        .from('organizations')
        .select('name, features')
        .eq('id', orgId)
        .single()

      const { data: services, count } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)

      const onboardingCompleted = org?.features?.onboarding_completed ?? false
      const hasServices = (count || 0) > 0
      const modules = org?.features?.modules || {}

      return {
        showOnboarding: !onboardingCompleted || !hasServices,
        organizationName: org?.name || '',
        modules: modules,
      }
    },
  })

  // Fetch revenue chart data (only if enabled)
  const { data: revenueData = [] } = useQuery({
    queryKey: ['dashboard-revenue', orgId],
    enabled: !!orgId && dashboardSettings?.revenue !== false,
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/revenue?org_id=${orgId}&days=7`)
      return response.json()
    },
  })

  // Fetch visits chart data (only if enabled)
  const { data: visitsData = [] } = useQuery({
    queryKey: ['dashboard-visits', orgId],
    enabled: !!orgId && dashboardSettings?.visits !== false,
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/visits-chart?org_id=${orgId}&days=30`)
      return response.json()
    },
  })

  // Fetch top services (only if enabled)
  const { data: topServices = [] } = useQuery({
    queryKey: ['dashboard-top-services', orgId],
    enabled: !!orgId && dashboardSettings?.topClients !== false,
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/top-services?org_id=${orgId}`)
      return response.json()
    },
  })

  // Check if statistics module is enabled
  const statisticsEnabled = onboardingData?.modules?.statistics !== false
  
  // Check if any charts are visible
  const hasVisibleCharts = statisticsEnabled && (dashboardSettings?.revenue !== false || dashboardSettings?.visits !== false)

  return (
    <>
      {/* Charts Row 1 - Only render if statistics enabled and at least one chart is visible */}
      {hasVisibleCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          {dashboardSettings?.revenue !== false && (
            <Card className="bg-[#111827] border-gray-800">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Выручка за последние 7 дней
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="day" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      formatter={(value: any) => [`₪${value}`, 'Выручка']}
                    />
                    <Bar dataKey="amount" fill="url(#revenueGradient)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Visits Chart */}
          {dashboardSettings?.visits !== false && (
            <Card className="bg-[#111827] border-gray-800">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Визиты за последние 30 дней
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={visitsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="dateLabel" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      formatter={(value: any) => [value, 'Визитов']}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Top Services Chart */}
      {dashboardSettings?.topClients !== false && topServices.length > 0 && (
        <Card className="bg-[#111827] border-gray-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Топ-5 услуг за месяц
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topServices} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="name" type="category" width={150} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: any) => [value, 'Визитов']}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {topServices.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Onboarding Wizard */}
      {onboardingData?.showOnboarding && (
        <OnboardingWizard
          open={true}
          organizationName={onboardingData.organizationName}
        />
      )}
    </>
  )
}

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  useAdminStats, 
  useRecentOrganizations, 
  useOrganizationsByMonth,
  useSystemHealth 
} from '@/hooks/useAdmin'
import { 
  Building2, 
  CheckCircle2, 
  CreditCard, 
  TrendingUp,
  Server,
  Database,
  MessageSquare,
  Banknote,
  AlertCircle
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { useLanguage } from '@/contexts/LanguageContext'

export default function AdminDashboard() {
  const { t } = useLanguage()
  const { data: stats, isLoading: statsLoading } = useAdminStats()
  const { data: recentOrgs, isLoading: orgsLoading } = useRecentOrganizations(5)
  const { data: orgsByMonth, isLoading: chartLoading } = useOrganizationsByMonth()
  const { data: health, isLoading: healthLoading } = useSystemHealth()

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    )
  }

  const getStatusColor = (isHealthy: boolean) => {
    return isHealthy ? 'text-green-500' : 'text-red-500'
  }

  const getStatusIcon = (isHealthy: boolean) => {
    return isHealthy ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.welcome')}</h1>
        <p className="text-gray-600 mt-1">{t('admin.subtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('admin.totalOrgs')}</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {stats?.totalOrgs || 0}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('admin.activeOrgs')}</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {stats?.activeOrgs || 0}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('common.total')} {t('admin.billing.invoice')}</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {stats?.totalTransactions || 0}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('admin.monthlyRevenue')}</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  ₪{stats?.monthlyRevenue.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              {t('admin.systemHealth')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="text-center py-4 text-gray-500">{t('common.loading')}</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-gray-600" />
                    <span className="font-medium">Supabase Database</span>
                  </div>
                  <div className={`flex items-center gap-2 ${getStatusColor(health?.checks?.supabase)}`}>
                    {getStatusIcon(health?.checks?.supabase)}
                    <Badge variant={health?.checks?.supabase ? 'default' : 'destructive'}>
                      {health?.checks?.supabase ? t('common.active') : t('common.notAvailable')}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Server className="w-5 h-5 text-gray-600" />
                    <span className="font-medium">API Server</span>
                  </div>
                  <div className={`flex items-center gap-2 ${getStatusColor(health?.checks?.api)}`}>
                    {getStatusIcon(health?.checks?.api)}
                    <Badge variant={health?.checks?.api ? 'default' : 'destructive'}>
                      {health?.checks?.api ? t('common.active') : t('common.notAvailable')}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                    <span className="font-medium">InforU SMS Provider</span>
                  </div>
                  <div className={`flex items-center gap-2 ${getStatusColor(health?.checks?.sms)}`}>
                    {getStatusIcon(health?.checks?.sms)}
                    <Badge variant={health?.checks?.sms ? 'default' : 'destructive'}>
                      {health?.checks?.sms ? t('admin.connected') : t('admin.notConfigured')}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Banknote className="w-5 h-5 text-gray-600" />
                    <span className="font-medium">Tranzilla Payment Provider</span>
                  </div>
                  <div className={`flex items-center gap-2 ${getStatusColor(health?.checks?.payments)}`}>
                    {getStatusIcon(health?.checks?.payments)}
                    <Badge variant={health?.checks?.payments ? 'default' : 'destructive'}>
                      {health?.checks?.payments ? t('admin.connected') : t('admin.notConfigured')}
                    </Badge>
                  </div>
                </div>

                <div className="text-xs text-gray-500 text-center mt-4">
                  {t('admin.lastUpdate')}: {health?.checks?.timestamp ? format(new Date(health.checks.timestamp), 'HH:mm:ss') : '-'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Organizations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {t('admin.recentOrgs')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orgsLoading ? (
              <div className="text-center py-4 text-gray-500">{t('common.loading')}</div>
            ) : (
              <div className="space-y-3">
                {recentOrgs?.map((org) => (
                  <div key={org.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-sm text-gray-500">{org.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={org.is_active ? 'default' : 'secondary'}>
                        {org.is_active ? t('admin.orgs.active') : t('admin.orgs.inactive')}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {format(new Date(org.created_at), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  </div>
                ))}
                {(!recentOrgs || recentOrgs.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    {t('admin.noNewOrgs')}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Organizations Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.newOrgsByMonth')}</CardTitle>
        </CardHeader>
        <CardContent>
          {chartLoading ? (
            <div className="text-center py-12 text-gray-500">{t('admin.loadingChart')}</div>
          ) : orgsByMonth && orgsByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={orgsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  reversed={true}
                />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="ארגונים חדשים"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              אין מספיק נתונים להצגת גרף
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

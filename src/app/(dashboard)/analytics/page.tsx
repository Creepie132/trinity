'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useFeatures } from '@/hooks/useFeatures'
import { useLanguage } from '@/contexts/LanguageContext'
import { useQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DollarSign, TrendingUp, CreditCard } from 'lucide-react'

interface PaymentData {
  payment_method: string
  amount: number
  created_at: string
}

export default function AnalyticsPage() {
  const router = useRouter()
  const features = useFeatures()
  const { t } = useLanguage()
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()

  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all')
  const [periodFilter, setPeriodFilter] = useState<string>('monthly')

  // Check organization status
  useEffect(() => {
    if (!features.isLoading && !features.isActive) {
      router.push('/blocked')
    }
  }, [features.isActive, features.isLoading, router])

  // Fetch payments data
  const { data: paymentsData = [], isLoading } = useQuery({
    queryKey: ['analytics-payments', orgId, paymentMethodFilter],
    queryFn: async () => {
      if (!orgId) return []

      let query = supabase
        .from('payments')
        .select('payment_method, amount, created_at')
        .eq('org_id', orgId)
        .eq('status', 'completed')
        .order('created_at', { ascending: true })

      if (paymentMethodFilter !== 'all') {
        query = query.eq('payment_method', paymentMethodFilter)
      }

      const { data, error } = await query

      if (error) throw error
      return data as PaymentData[]
    },
    enabled: !!orgId,
  })

  // Calculate payment methods distribution
  const paymentMethodsData = paymentsData.reduce((acc: any[], payment) => {
    const method = payment.payment_method || 'unknown'
    const existing = acc.find(item => item.name === method)
    
    if (existing) {
      existing.value += Number(payment.amount)
    } else {
      acc.push({
        name: method,
        value: Number(payment.amount),
      })
    }
    
    return acc
  }, [])

  // Calculate revenue over time
  const revenueOverTime = paymentsData.reduce((acc: any[], payment) => {
    const date = new Date(payment.created_at)
    let key: string

    if (periodFilter === 'daily') {
      key = date.toISOString().split('T')[0]
    } else if (periodFilter === 'weekly') {
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      key = weekStart.toISOString().split('T')[0]
    } else {
      // monthly
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    }

    const existing = acc.find(item => item.date === key)
    
    if (existing) {
      existing.amount += Number(payment.amount)
    } else {
      acc.push({
        date: key,
        amount: Number(payment.amount),
      })
    }
    
    return acc
  }, [])

  // Calculate stats
  const totalRevenue = paymentsData.reduce((sum, p) => sum + Number(p.amount), 0)
  const avgTransaction = paymentsData.length > 0 ? totalRevenue / paymentsData.length : 0
  const totalTransactions = paymentsData.length

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  const getMethodLabel = (method: string): string => {
    const labels: Record<string, string> = {
      cash: t('payments.method.cash'),
      bit: t('payments.method.bit'),
      credit_card: t('payments.method.credit'),
      stripe: 'Stripe',
      bank_transfer: t('payments.method.bankTransfer'),
      phone_credit: t('payments.method.phoneCredit'),
      unknown: t('common.notAvailable'),
    }
    return labels[method] || method
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('analytics.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{t('analytics.subtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('analytics.totalRevenue')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">₪{totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('analytics.avgTransaction')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">₪{avgTransaction.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('analytics.totalTransactions')}
            </CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalTransactions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('analytics.filterByMethod')}</label>
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                <SelectItem value="all" className="text-gray-900 dark:text-white">{t('analytics.allMethods')}</SelectItem>
                <SelectItem value="cash" className="text-gray-900 dark:text-white">💵 {t('payments.method.cash')}</SelectItem>
                <SelectItem value="bit" className="text-gray-900 dark:text-white">📱 {t('payments.method.bit')}</SelectItem>
                <SelectItem value="credit_card" className="text-gray-900 dark:text-white">💳 {t('payments.method.credit')}</SelectItem>
                <SelectItem value="stripe" className="text-gray-900 dark:text-white">🟣 Stripe</SelectItem>
                <SelectItem value="bank_transfer" className="text-gray-900 dark:text-white">🏦 {t('payments.method.bankTransfer')}</SelectItem>
                <SelectItem value="phone_credit" className="text-gray-900 dark:text-white">📞 {t('payments.method.phoneCredit')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('analytics.period')}</label>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                <SelectItem value="daily" className="text-gray-900 dark:text-white">{t('analytics.daily')}</SelectItem>
                <SelectItem value="weekly" className="text-gray-900 dark:text-white">{t('analytics.weekly')}</SelectItem>
                <SelectItem value="monthly" className="text-gray-900 dark:text-white">{t('analytics.monthly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>

      {/* Charts */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
      ) : paymentsData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart - Payment Methods Distribution */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">{t('analytics.paymentMethods')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethodsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={((props: any) => `${getMethodLabel(props.name || '')} (${((props.percent || 0) * 100).toFixed(0)}%)`) as any}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentMethodsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₪${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bar Chart - Revenue Over Time */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">{t('analytics.revenueOverTime')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    formatter={(value: number) => `₪${value.toFixed(2)}`}
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="amount" fill="#3b82f6" name={t('analytics.totalRevenue')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">{t('stats.noData')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

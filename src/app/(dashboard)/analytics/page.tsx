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
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DollarSign, TrendingUp, CreditCard, PieChartIcon, TrendingUpIcon } from 'lucide-react'

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

  // Check organization status and feature access
  useEffect(() => {
    if (!features.isLoading) {
      if (!features.isActive) {
        router.push('/blocked')
      } else if (!features.hasAnalytics) {
        router.push('/dashboard')
      }
    }
  }, [features.isActive, features.hasAnalytics, features.isLoading, router])

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

  const COLORS = ['#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#fb7185', '#f59e0b']

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
      <div className="space-y-3 md:space-y-0">
        {/* Mobile: First 2 cards in a row */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md aspect-square flex flex-col items-center justify-between p-4 text-center"
            style={{ animation: 'fadeInScale 0.4s ease-out 0s both' }}
          >
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              ₪{totalRevenue.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{t('analytics.totalRevenue')}</div>
          </div>

          <div 
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md aspect-square flex flex-col items-center justify-between p-4 text-center"
            style={{ animation: 'fadeInScale 0.4s ease-out 0.1s both' }}
          >
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ₪{avgTransaction.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{t('analytics.avgTransaction')}</div>
          </div>
        </div>

        {/* Mobile: Third card centered below */}
        <div className="flex justify-center md:hidden">
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md aspect-square flex flex-col items-center justify-between p-4 text-center"
            style={{ maxWidth: '50%', animation: 'fadeInScale 0.4s ease-out 0.2s both' }}
          >
            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full">
              <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {totalTransactions}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{t('analytics.totalTransactions')}</div>
          </div>
        </div>

        {/* Desktop: Original layout */}
        <div className="hidden md:grid md:grid-cols-3 gap-4">
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 animate-fadeInUp">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
                <PieChartIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('analytics.paymentMethods')}</h3>
            </div>
            <ResponsiveContainer width="100%" height={320} className="min-h-[250px]">
              <PieChart>
                <defs>
                  {COLORS.map((color, index) => (
                    <linearGradient key={`gradient-${index}`} id={`pieGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={color} stopOpacity={1} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  data={paymentMethodsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={((props: any) => {
                    const RADIAN = Math.PI / 180
                    const radius = props.innerRadius + (props.outerRadius - props.innerRadius) * 1.25
                    const x = props.cx + radius * Math.cos(-props.midAngle * RADIAN)
                    const y = props.cy + radius * Math.sin(-props.midAngle * RADIAN)
                    
                    return (
                      <text
                        x={x}
                        y={y}
                        fill="currentColor"
                        className="text-gray-900 dark:text-gray-100"
                        textAnchor={x > props.cx ? 'start' : 'end'}
                        dominantBaseline="central"
                        style={{
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      >
                        {`${((props.percent || 0) * 100).toFixed(0)}%`}
                      </text>
                    )
                  }) as any}
                  outerRadius={90}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1000}
                >
                  {paymentMethodsData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#pieGradient-${index % COLORS.length})`}
                      stroke="white"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={((value: any) => `₪${Number(value).toFixed(2)}`) as any}
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    color: '#111827'
                  }}
                  wrapperClassName="dark:[&>div]:bg-gray-900 dark:[&>div]:text-white"
                  labelFormatter={(label) => getMethodLabel(label)}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => getMethodLabel(value)}
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Area Chart - Revenue Over Time */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
                <TrendingUpIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('analytics.revenueOverTime')}</h3>
            </div>
            <ResponsiveContainer width="100%" height={320} className="min-h-[250px]">
              <AreaChart data={revenueOverTime}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af" 
                  style={{ fontSize: '12px' }}
                  className="dark:stroke-gray-400"
                />
                <YAxis 
                  stroke="#9ca3af" 
                  style={{ fontSize: '12px' }}
                  className="dark:stroke-gray-400"
                />
                <Tooltip 
                  formatter={((value: any) => [`₪${Number(value).toFixed(2)}`, t('analytics.totalRevenue')]) as any}
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    color: '#111827'
                  }}
                  wrapperClassName="dark:[&>div]:bg-gray-900 dark:[&>div]:text-white"
                  cursor={{ stroke: '#fbbf24', strokeWidth: 2, strokeDasharray: '5 5' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  fill="url(#colorRevenue)"
                  animationBegin={0}
                  animationDuration={1200}
                  dot={{ 
                    fill: '#f59e0b', 
                    stroke: 'white', 
                    strokeWidth: 2, 
                    r: 4 
                  }}
                  activeDot={{ 
                    r: 6,
                    fill: '#f59e0b',
                    stroke: 'white',
                    strokeWidth: 2
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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

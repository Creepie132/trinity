'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/hooks/useAuth'
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

interface StaffStats {
  email: string
  visits_count: number
  revenue: number
  average_check: number
  revenue_percent: number
}

interface ServiceStats {
  service_name: string
  count: number
  revenue: number
  revenue_percent: number
}

interface ClientStats {
  new_clients: number
  returning_clients: number
  avg_interval_days: number
}

export default function ReportsPage() {
  const router = useRouter()
  const { orgId, role } = useAuth()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('week')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [staffReport, setStaffReport] = useState<StaffStats[]>([])
  const [servicesReport, setServicesReport] = useState<ServiceStats[]>([])
  const [clientsReport, setClientsReport] = useState<ClientStats | null>(null)
  const [totals, setTotals] = useState({ total_revenue: 0, total_visits: 0 })

  // Check role access
  useEffect(() => {
    if (role && role !== 'owner' && role !== 'moderator') {
      toast.error('Доступ запрещён')
      router.push('/dashboard')
    }
  }, [role, router])

  useEffect(() => {
    if (orgId && (role === 'owner' || role === 'moderator')) {
      loadReports()
    }
  }, [orgId, role, period, customFrom, customTo])

  const getDateRange = () => {
    const now = new Date()
    let from: Date
    let to = now

    switch (period) {
      case 'today':
        from = new Date(now.setHours(0, 0, 0, 0))
        break
      case 'week':
        from = new Date(now.setDate(now.getDate() - 7))
        break
      case 'month':
        from = new Date(now.setMonth(now.getMonth() - 1))
        break
      case 'custom':
        if (!customFrom || !customTo) return null
        from = new Date(customFrom)
        to = new Date(customTo)
        break
      default:
        from = new Date(now.setDate(now.getDate() - 7))
    }

    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    }
  }

  const loadReports = async () => {
    if (!orgId) return

    const dateRange = getDateRange()
    if (!dateRange) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/dashboard/reports?org_id=${orgId}&from=${dateRange.from}&to=${dateRange.to}`
      )

      if (!response.ok) throw new Error('Failed to load reports')

      const data = await response.json()
      setStaffReport(data.staff || [])
      setServicesReport(data.services || [])
      setClientsReport(data.clients || null)
      setTotals(data.totals || { total_revenue: 0, total_visits: 0 })
    } catch (error) {
      console.error('Load reports error:', error)
      toast.error('Ошибка загрузки отчётов')
    } finally {
      setLoading(false)
    }
  }

  if (role !== 'owner' && role !== 'moderator') {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <BarChart3 className="w-8 h-8" />
          Отчёты / דוחות
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Аналитика по сотрудникам, услугам и клиентам
        </p>
      </div>

      {/* Period Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Период отчёта</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <Label>Выберите период</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Сегодня</SelectItem>
                <SelectItem value="week">Неделя</SelectItem>
                <SelectItem value="month">Месяц</SelectItem>
                <SelectItem value="custom">Произвольный</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {period === 'custom' && (
            <>
              <div className="flex-1 min-w-[150px]">
                <Label>От</Label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <Label>До</Label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="mt-2"
                />
              </div>
            </>
          )}

          <Button onClick={loadReports}>Обновить</Button>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-r from-blue-900 to-indigo-900 border-blue-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-800 rounded-full">
                <DollarSign className="w-6 h-6 text-blue-200" />
              </div>
              <div>
                <div className="text-sm text-blue-200">Общая выручка</div>
                <div className="text-2xl font-bold text-white">
                  ₪{totals.total_revenue.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-900 to-pink-900 border-purple-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-800 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-200" />
              </div>
              <div>
                <div className="text-sm text-purple-200">Всего визитов</div>
                <div className="text-2xl font-bold text-white">{totals.total_visits}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Report */}
      <Card>
        <CardHeader>
          <CardTitle>Отчёт по сотрудникам</CardTitle>
        </CardHeader>
        <CardContent>
          {staffReport.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Нет данных</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сотрудник</TableHead>
                    <TableHead className="text-right">Визитов</TableHead>
                    <TableHead className="text-right">Выручка</TableHead>
                    <TableHead className="text-right">Средний чек</TableHead>
                    <TableHead className="text-right">% от выручки</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffReport.map((staff, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{staff.email}</TableCell>
                      <TableCell className="text-right">{staff.visits_count}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ₪{staff.revenue.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ₪{staff.average_check.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {staff.revenue_percent.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services Report */}
      <Card>
        <CardHeader>
          <CardTitle>Популярные услуги</CardTitle>
        </CardHeader>
        <CardContent>
          {servicesReport.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Нет данных</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Услуга</TableHead>
                    <TableHead className="text-right">Количество</TableHead>
                    <TableHead className="text-right">Выручка</TableHead>
                    <TableHead className="text-right">% от выручки</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servicesReport.map((service, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{service.service_name}</TableCell>
                      <TableCell className="text-right">{service.count}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ₪{service.revenue.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {service.revenue_percent.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Активность клиентов</CardTitle>
        </CardHeader>
        <CardContent>
          {clientsReport && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Новых клиентов
                    </div>
                    <div className="text-2xl font-bold">{clientsReport.new_clients}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Вернувшихся
                    </div>
                    <div className="text-2xl font-bold">
                      {clientsReport.returning_clients}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Средний интервал
                    </div>
                    <div className="text-2xl font-bold">
                      {clientsReport.avg_interval_days || 0} дней
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

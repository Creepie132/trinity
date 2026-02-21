'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { DollarSign, MessageSquare, CreditCard, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface DebtEntry {
  client_id: string
  first_name: string
  last_name: string
  phone: string
  unpaid_visits: number
  total_debt: number
  oldest_debt_date: string
  visit_ids: string[]
}

export default function DebtsPage() {
  const { orgId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [debts, setDebts] = useState<DebtEntry[]>([])
  const [totalDebt, setTotalDebt] = useState(0)
  const [minAmount, setMinAmount] = useState('')
  const [daysFilter, setDaysFilter] = useState('all')
  const [orgName, setOrgName] = useState('')
  const [orgPhone, setOrgPhone] = useState('')

  useEffect(() => {
    loadDebts()
    loadOrgInfo()
  }, [orgId, minAmount, daysFilter])

  const loadOrgInfo = async () => {
    if (!orgId) return

    try {
      const response = await fetch(`/api/organizations/${orgId}`)
      if (response.ok) {
        const { data } = await response.json()
        setOrgName(data?.name || '')
        setOrgPhone(data?.phone || '')
      }
    } catch (error) {
      console.error('Failed to load org info:', error)
    }
  }

  const loadDebts = async () => {
    if (!orgId) return

    setLoading(true)
    try {
      let url = `/api/dashboard/debts?org_id=${orgId}`
      if (minAmount) url += `&min_amount=${minAmount}`
      if (daysFilter !== 'all') url += `&days_back=${daysFilter}`

      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to load debts')

      const data = await response.json()
      setDebts(data.debts || [])
      setTotalDebt(data.total || 0)
    } catch (error) {
      console.error('Load debts error:', error)
      toast.error('Ошибка загрузки задолженностей')
    } finally {
      setLoading(false)
    }
  }

  const handleSendReminder = async (debt: DebtEntry) => {
    if (!orgId) return

    try {
      const message = `שלום ${debt.first_name}, יש לך חוב ב-${orgName} בסך ${debt.total_debt.toFixed(2)}₪. נשמח להסדיר. ${orgPhone}`

      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          phone: debt.phone,
          message,
        }),
      })

      if (!response.ok) throw new Error('Failed to send SMS')

      toast.success(`SMS отправлен ${debt.first_name} ${debt.last_name}`)
    } catch (error) {
      console.error('Send reminder error:', error)
      toast.error('Ошибка отправки SMS')
    }
  }

  const handleSendPaymentLink = async (debt: DebtEntry) => {
    if (!orgId) return

    try {
      // Create payment for the total debt
      const response = await fetch('/api/payments/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          client_id: debt.client_id,
          amount: debt.total_debt,
          description: `Оплата задолженности (${debt.unpaid_visits} визитов)`,
        }),
      })

      if (!response.ok) throw new Error('Failed to create payment link')

      const data = await response.json()
      
      if (data.payment_url) {
        // Send SMS with link
        const message = `שלום ${debt.first_name}, ניתן לשלם את החוב בסך ${debt.total_debt.toFixed(2)}₪ כאן: ${data.payment_url}`

        await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            org_id: orgId,
            phone: debt.phone,
            message,
          }),
        })

        toast.success(`Ссылка на оплату отправлена ${debt.first_name} ${debt.last_name}`)
      }
    } catch (error) {
      console.error('Send payment link error:', error)
      toast.error('Ошибка отправки ссылки')
    }
  }

  const getDaysAgo = (date: string) => {
    const days = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    )
    return days
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Задолженности / חובות
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Клиенты с неоплаченными визитами
        </p>
      </div>

      {/* Total Debt Card */}
      <Card className="bg-gradient-to-r from-red-900 to-orange-900 border-red-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-800 rounded-full">
                <DollarSign className="w-8 h-8 text-red-200" />
              </div>
              <div>
                <div className="text-sm text-red-200">Общая сумма задолженностей</div>
                <div className="text-3xl font-bold text-white mt-1">
                  ₪{totalDebt.toFixed(2)}
                </div>
                <div className="text-sm text-red-200 mt-1">
                  {debts.length} клиентов с задолженностью
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="min-amount">Минимальная сумма (₪)</Label>
            <Input
              id="min-amount"
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="0"
              className="mt-2"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="days-filter">Давность</Label>
            <Select value={daysFilter} onValueChange={setDaysFilter}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="30">Старше 30 дней</SelectItem>
                <SelectItem value="60">Старше 60 дней</SelectItem>
                <SelectItem value="90">Старше 90 дней</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Debts Table */}
      <Card>
        <CardContent className="p-0">
          {debts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Нет задолженностей</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead className="text-right">Неоплаченных визитов</TableHead>
                    <TableHead className="text-right">Сумма долга</TableHead>
                    <TableHead>Давность</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debts.map((debt) => {
                    const daysAgo = getDaysAgo(debt.oldest_debt_date)
                    return (
                      <TableRow key={debt.client_id}>
                        <TableCell className="font-medium">
                          {debt.first_name} {debt.last_name}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {debt.phone}
                        </TableCell>
                        <TableCell className="text-right">{debt.unpaid_visits}</TableCell>
                        <TableCell className="text-right font-bold text-red-600 dark:text-red-400">
                          ₪{debt.total_debt.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              daysAgo > 90
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                : daysAgo > 60
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            }`}
                          >
                            {daysAgo} дней назад
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendReminder(debt)}
                              className="gap-1"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Напомнить
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSendPaymentLink(debt)}
                              className="gap-1"
                            >
                              <CreditCard className="w-4 h-4" />
                              Ссылка на оплату
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

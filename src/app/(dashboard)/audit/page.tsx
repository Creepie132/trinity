'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'

interface AuditLog {
  id: string
  user_email: string
  action: string
  entity_type: string
  entity_id: string | null
  created_at: string
  new_data?: any
  old_data?: any
}

export default function AuditPage() {
  const { orgId } = useAuth()
  const permissions = usePermissions()
  const router = useRouter()
  const { t } = useLanguage()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('7d')

  useEffect(() => {
    if (!permissions.canManageUsers) {
      router.push('/dashboard')
      return
    }

    loadLogs()
  }, [permissions, orgId, actionFilter, dateFilter])

  async function loadLogs() {
    if (!orgId) return

    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()

      // Calculate date filter
      const now = new Date()
      const dateThreshold = new Date()
      if (dateFilter === '1d') dateThreshold.setDate(now.getDate() - 1)
      else if (dateFilter === '7d') dateThreshold.setDate(now.getDate() - 7)
      else if (dateFilter === '30d') dateThreshold.setDate(now.getDate() - 30)

      let query = supabase
        .from('audit_log')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (dateFilter !== 'all') {
        query = query.gte('created_at', dateThreshold.toISOString())
      }

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Failed to load audit logs:', error)
        return
      }

      setLogs(data || [])
    } finally {
      setLoading(false)
    }
  }

  function getActionBadge(action: string) {
    const colors: Record<string, string> = {
      create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      send_sms: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      export: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      login: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    }
    return colors[action] || 'bg-gray-100 text-gray-800'
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!permissions.canManageUsers) {
    return null
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>יומן ביקורת / Audit Log</CardTitle>
          <CardDescription>
            תיעוד פעולות במערכת / System activity log
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="w-48">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="סוג פעולה / Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל / All</SelectItem>
                  <SelectItem value="create">יצירה / Create</SelectItem>
                  <SelectItem value="update">עדכון / Update</SelectItem>
                  <SelectItem value="delete">מחיקה / Delete</SelectItem>
                  <SelectItem value="send_sms">SMS</SelectItem>
                  <SelectItem value="export">ייצוא / Export</SelectItem>
                  <SelectItem value="login">התחברות / Login</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="תקופה / Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">יום אחרון / Last day</SelectItem>
                  <SelectItem value="7d">שבוע אחרון / Last week</SelectItem>
                  <SelectItem value="30d">חודש אחרון / Last month</SelectItem>
                  <SelectItem value="all">הכל / All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8">טוען... / Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              אין רשומות / No records
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>תאריך / Date</TableHead>
                    <TableHead>משתמש / User</TableHead>
                    <TableHead>פעולה / Action</TableHead>
                    <TableHead>סוג / Type</TableHead>
                    <TableHead>פרטים / Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.user_email || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionBadge(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{log.entity_type}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                        {log.entity_id ? log.entity_id.substring(0, 8) + '...' : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

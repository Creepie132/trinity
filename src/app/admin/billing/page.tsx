'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  useBillingStats,
  useBillingOrganizations,
  useMarkAsPaid,
  useUpdateOrgPlan,
  useToggleOrgActive,
} from '@/hooks/useAdmin'
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Lock,
  Unlock,
} from 'lucide-react'
import { format } from 'date-fns'
import { Organization } from '@/types/database'
import { useLanguage } from '@/contexts/LanguageContext'

export default function BillingPage() {
  const { t } = useLanguage()
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: stats, isLoading: statsLoading } = useBillingStats()
  const { data: organizations, isLoading: orgsLoading } = useBillingOrganizations(statusFilter)
  
  const markAsPaid = useMarkAsPaid()
  const updatePlan = useUpdateOrgPlan()
  const toggleActive = useToggleOrgActive()

  const handleMarkAsPaid = (orgId: string) => {
    if (confirm(t('admin.billing.markPaidConfirm'))) {
      markAsPaid.mutate(orgId)
    }
  }

  const handleUpdatePlan = (orgId: string, plan: string) => {
    updatePlan.mutate({ orgId, plan })
  }

  const handleToggleActive = (orgId: string, isActive: boolean) => {
    if (confirm(t('admin.billing.toggleActiveConfirm'))) {
      toggleActive.mutate({ orgId, isActive })
    }
  }

  const getBillingStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-500 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {t('admin.billing.paid')}
          </Badge>
        )
      case 'trial':
        return (
          <Badge className="bg-yellow-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {t('admin.billing.trial')}
          </Badge>
        )
      case 'overdue':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {t('admin.billing.overdue')}
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant="secondary">
            {t('admin.billing.cancelled')}
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPlanLabel = (plan: string) => {
    const planKeys: Record<string, string> = {
      basic: 'admin.orgs.basic',
      pro: 'admin.orgs.pro',
      enterprise: 'admin.orgs.enterprise',
    }
    return t(planKeys[plan]) || plan
  }

  const isOverdue = (org: Organization) => {
    if (!org.billing_due_date) return false
    const dueDate = new Date(org.billing_due_date)
    return dueDate < new Date() && org.billing_status !== 'paid'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.billing.title')}</h1>
        <p className="text-gray-600 mt-1">{t('admin.billing.subtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('admin.billing.paid')}</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {stats?.paid || 0}
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
                <p className="text-sm text-gray-600">{t('admin.billing.trial')}</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">
                  {stats?.trial || 0}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('admin.billing.overdue')}</p>
                <p className="text-3xl font-bold text-red-600 mt-1">
                  {stats?.overdue || 0}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {t('admin.billing.title')}
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('admin.billing.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('payments.all')}</SelectItem>
                <SelectItem value="paid">{t('admin.billing.paid')}</SelectItem>
                <SelectItem value="trial">{t('admin.billing.trial')}</SelectItem>
                <SelectItem value="overdue">{t('admin.billing.overdue')}</SelectItem>
                <SelectItem value="cancelled">{t('admin.billing.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {orgsLoading ? (
            <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{t('admin.orgs.name')}</TableHead>
                  <TableHead className="text-right">{t('admin.orgs.plan')}</TableHead>
                  <TableHead className="text-right">{t('admin.billing.paid')}</TableHead>
                  <TableHead className="text-right">{t('admin.billing.dueDate')}</TableHead>
                  <TableHead className="text-right">{t('admin.orgs.status')}</TableHead>
                  <TableHead className="text-right">{t('clients.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations?.map((org: Organization) => (
                  <TableRow 
                    key={org.id}
                    className={isOverdue(org) ? 'bg-red-50' : ''}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-sm text-gray-500">{org.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={org.plan} 
                        onValueChange={(value) => handleUpdatePlan(org.id, value)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue>
                            {getPlanLabel(org.plan)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">{t('admin.orgs.basic')}</SelectItem>
                          <SelectItem value="pro">{t('admin.orgs.pro')}</SelectItem>
                          <SelectItem value="enterprise">{t('admin.orgs.enterprise')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {getBillingStatusBadge(org.billing_status)}
                    </TableCell>
                    <TableCell>
                      {org.billing_due_date ? (
                        <div className={isOverdue(org) ? 'text-red-600 font-medium' : ''}>
                          {format(new Date(org.billing_due_date), 'dd/MM/yyyy')}
                          {isOverdue(org) && (
                            <p className="text-xs text-red-500">{t('admin.billing.paymentOverdue')}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">{t('admin.billing.notSet')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.is_active ? 'default' : 'secondary'}>
                        {org.is_active ? t('admin.orgs.active') : t('admin.orgs.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {org.billing_status !== 'paid' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleMarkAsPaid(org.id)}
                            disabled={markAsPaid.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 ml-1" />
                            {t('admin.billing.markPaid')}
                          </Button>
                        )}
                        
                        {org.is_active ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleToggleActive(org.id, false)}
                            disabled={toggleActive.isPending}
                          >
                            <Lock className="w-4 h-4 ml-1" />
                            {t('admin.billing.block')}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleToggleActive(org.id, true)}
                            disabled={toggleActive.isPending}
                          >
                            <Unlock className="w-4 h-4 ml-1" />
                            {t('admin.billing.activate')}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!organizations || organizations.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      {t('admin.billing.noOrgs')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

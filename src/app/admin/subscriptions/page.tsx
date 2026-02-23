'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { Shield, Calendar, CheckCircle, XCircle, Clock, AlertCircle, Users } from 'lucide-react'

interface Organization {
  id: string
  name: string
  subscription_status: string
  subscription_expires_at: string | null
  owner_name: string
  owner_email: string
  phone: string
  display_name: string
}

interface AccessRequest {
  id: string
  user_id: string
  email: string
  full_name: string
  requested_at: string
  status: string
}

export default function AdminSubscriptionsPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const supabase = createSupabaseBrowserClient()
  
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [extendDialogOpen, setExtendDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<string>('trial')
  const [newExpiryDate, setNewExpiryDate] = useState<string>('')

  const translations = {
    he: {
      title: 'מנויים וגישה',
      organizations: 'ארגונים',
      accessRequests: 'בקשות גישה',
      name: 'שם',
      owner: 'בעלים',
      email: 'אימייל',
      phone: 'טלפון',
      status: 'סטטוס',
      expires: 'תוקף',
      actions: 'פעולות',
      extend: 'הארך',
      deactivate: 'השבת',
      approve: 'אשר (14 ימים)',
      reject: 'דחה',
      requestDate: 'תאריך בקשה',
      extendAccess: 'הארכת גישה',
      selectStatus: 'בחר סטטוס',
      expiryDate: 'תאריך תפוגה',
      save: 'שמור',
      cancel: 'ביטול',
      statuses: {
        none: 'אין גישה',
        trial: 'תקופת ניסיון',
        active: 'פעיל',
        manual: 'ידני',
        expired: 'פג תוקף',
      },
    },
    ru: {
      title: 'Подписки и доступ',
      organizations: 'Организации',
      accessRequests: 'Запросы на доступ',
      name: 'Название',
      owner: 'Владелец',
      email: 'Email',
      phone: 'Телефон',
      status: 'Статус',
      expires: 'Истекает',
      actions: 'Действия',
      extend: 'Продлить',
      deactivate: 'Деактивировать',
      approve: 'Одобрить (14 дней)',
      reject: 'Отклонить',
      requestDate: 'Дата запроса',
      extendAccess: 'Продление доступа',
      selectStatus: 'Выберите статус',
      expiryDate: 'Дата окончания',
      save: 'Сохранить',
      cancel: 'Отмена',
      statuses: {
        none: 'Нет доступа',
        trial: 'Пробный период',
        active: 'Активна',
        manual: 'Ручной доступ',
        expired: 'Истекла',
      },
    },
  }

  const t = translations[language]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load organizations with subscription info
      const { data: orgs } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          features,
          subscription_status,
          subscription_expires_at,
          org_users!inner (
            role,
            user_id,
            profiles:user_id (
              full_name,
              email
            )
          )
        `)
        .eq('org_users.role', 'owner')

      const formattedOrgs = orgs?.map((org: any) => {
        const businessInfo = org.features?.business_info || {}
        return {
          id: org.id,
          name: org.name,
          display_name: businessInfo.display_name || org.name,
          subscription_status: org.subscription_status || 'none',
          subscription_expires_at: org.subscription_expires_at,
          owner_name: businessInfo.owner_name || org.org_users[0]?.profiles?.full_name || '—',
          owner_email: org.org_users[0]?.profiles?.email || '—',
          phone: businessInfo.mobile || '—',
        }
      }) || []

      setOrganizations(formattedOrgs)

      // Load pending access requests
      const { data: requests } = await supabase
        .from('access_requests')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false })

      setAccessRequests(requests || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">{t.statuses.active}</Badge>
      case 'trial':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">{t.statuses.trial}</Badge>
      case 'manual':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">{t.statuses.manual}</Badge>
      case 'expired':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">{t.statuses.expired}</Badge>
      default:
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">{t.statuses.none}</Badge>
    }
  }

  const handleExtend = (org: Organization) => {
    setSelectedOrg(org)
    setNewStatus(org.subscription_status === 'none' ? 'trial' : org.subscription_status)
    const defaultDate = new Date()
    defaultDate.setDate(defaultDate.getDate() + 14)
    setNewExpiryDate(defaultDate.toISOString().split('T')[0])
    setExtendDialogOpen(true)
  }

  const handleDeactivate = async (orgId: string) => {
    if (!confirm('Деактивировать организацию?')) return

    try {
      const response = await fetch('/api/admin/organizations/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          subscription_update: {
            subscription_status: 'expired',
          },
        }),
      })

      if (!response.ok) throw new Error('Failed to deactivate')

      toast.success('Деактивировано')
      loadData()
    } catch (error) {
      console.error('Error deactivating:', error)
      toast.error('Ошибка деактивации')
    }
  }

  const handleSaveExtension = async () => {
    if (!selectedOrg || !newExpiryDate) return

    try {
      const expiresAt = new Date(newExpiryDate)
      expiresAt.setHours(23, 59, 59, 999)

      const response = await fetch('/api/admin/organizations/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: selectedOrg.id,
          subscription_update: {
            subscription_status: newStatus,
            subscription_expires_at: expiresAt.toISOString(),
          },
        }),
      })

      if (!response.ok) throw new Error('Failed to extend')

      toast.success('Доступ продлён')
      setExtendDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Error extending:', error)
      toast.error('Ошибка продления')
    }
  }

  const handleApproveRequest = async (userId: string) => {
    try {
      const response = await fetch(`/api/access/review?user_id=${userId}&action=approve&token=admin`, {
        method: 'GET',
      })

      if (!response.ok) throw new Error('Failed to approve')

      toast.success('Запрос одобрен')
      loadData()
    } catch (error) {
      console.error('Error approving:', error)
      toast.error('Ошибка одобрения')
    }
  }

  const handleRejectRequest = async (userId: string) => {
    if (!confirm('Отклонить запрос?')) return

    try {
      const response = await fetch(`/api/access/review?user_id=${userId}&action=reject&token=admin`, {
        method: 'GET',
      })

      if (!response.ok) throw new Error('Failed to reject')

      toast.success('Запрос отклонён')
      loadData()
    } catch (error) {
      console.error('Error rejecting:', error)
      toast.error('Ошибка отклонения')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-amber-600" />
        <h1 className="text-3xl font-bold">{t.title}</h1>
      </div>

      {/* Access Requests */}
      {accessRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t.accessRequests} ({accessRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accessRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <p className="font-semibold">{request.full_name || request.email}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{request.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {new Date(request.requested_at).toLocaleString(language === 'he' ? 'he-IL' : 'ru-RU')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApproveRequest(request.user_id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {t.approve}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectRequest(request.user_id)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {t.reject}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t.organizations}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-start p-3">{t.name}</th>
                  <th className="text-start p-3">{t.owner}</th>
                  <th className="text-start p-3">{t.phone}</th>
                  <th className="text-start p-3">{t.email}</th>
                  <th className="text-start p-3">{t.status}</th>
                  <th className="text-start p-3">{t.expires}</th>
                  <th className="text-start p-3">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id} className="border-b">
                    <td className="p-3">{org.display_name}</td>
                    <td className="p-3">{org.owner_name}</td>
                    <td className="p-3 whitespace-nowrap">{org.phone}</td>
                    <td className="p-3">{org.owner_email}</td>
                    <td className="p-3">{getStatusBadge(org.subscription_status)}</td>
                    <td className="p-3">
                      {org.subscription_expires_at
                        ? new Date(org.subscription_expires_at).toLocaleDateString(
                            language === 'he' ? 'he-IL' : 'ru-RU'
                          )
                        : '-'}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleExtend(org)}>
                          <Calendar className="w-4 h-4 mr-2" />
                          {t.extend}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeactivate(org.id)}
                        >
                          {t.deactivate}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Extend Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t.extendAccess} - {selectedOrg?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedOrg?.owner_email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>{t.selectStatus}</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">{t.statuses.trial}</SelectItem>
                  <SelectItem value="active">{t.statuses.active}</SelectItem>
                  <SelectItem value="manual">{t.statuses.manual}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t.expiryDate}</Label>
              <Input
                type="date"
                value={newExpiryDate}
                onChange={(e) => setNewExpiryDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
                {t.cancel}
              </Button>
              <Button onClick={handleSaveExtension}>{t.save}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

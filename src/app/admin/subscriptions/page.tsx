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
import { Switch } from '@/components/ui/switch'
import { PLANS, getPlan, type PlanKey } from '@/lib/subscription-plans'
import { MODULES } from '@/lib/modules-config'

interface Organization {
  id: string
  name: string
  plan?: string
  subscription_status: string
  subscription_expires_at: string | null
  owner_name: string
  owner_email: string
  phone: string
  display_name: string
  features?: any
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
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('demo')
  const [customModules, setCustomModules] = useState<Record<string, boolean>>({})
  const [customClientLimit, setCustomClientLimit] = useState<number>(0)

  const translations = {
    he: {
      title: 'מנויים וגישה',
      organizations: 'ארגונים',
      accessRequests: 'בקשות גישה',
      name: 'שם',
      owner: 'בעלים',
      email: 'אימייל',
      phone: 'טלפון',
      plan: 'תוכנית',
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
      selectPlan: 'בחר תוכנית',
      includedModules: 'מודולים כלולים',
      clientLimit: 'מגבלת לקוחות',
      selectModules: 'בחר מודולים',
      unlimited: 'ללא הגבלה',
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
      plan: 'План',
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
      selectPlan: 'Выберите план',
      includedModules: 'Включённые модули',
      clientLimit: 'Лимит клиентов',
      selectModules: 'Выберите модули',
      unlimited: 'Безлимит',
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
          plan,
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
          plan: org.plan || 'demo',
          display_name: businessInfo.display_name || org.name,
          subscription_status: org.subscription_status || 'none',
          subscription_expires_at: org.subscription_expires_at,
          owner_name: businessInfo.owner_name || org.org_users[0]?.profiles?.full_name || '—',
          owner_email: org.org_users[0]?.profiles?.email || '—',
          phone: businessInfo.mobile || '—',
          features: org.features,
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

  const getPlanBadge = (planKey: string) => {
    const plan = getPlan(planKey as PlanKey)
    if (!plan) return <Badge variant="outline">—</Badge>

    const colorClasses: Record<string, string> = {
      red: 'bg-red-500/10 text-red-600 border-red-500/20',
      blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      green: 'bg-green-500/10 text-green-600 border-green-500/20',
      purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    }

    return (
      <Badge className={colorClasses[plan.color] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'}>
        {language === 'he' ? plan.name_he : plan.name_ru}
      </Badge>
    )
  }

  const handleExtend = (org: Organization) => {
    setSelectedOrg(org)
    setNewStatus(org.subscription_status === 'none' ? 'trial' : org.subscription_status)
    setSelectedPlan((org.plan || 'demo') as PlanKey)
    
    // Initialize custom modules from current features
    const currentModules = org.features?.modules || {}
    setCustomModules(currentModules)
    setCustomClientLimit(org.features?.client_limit || 0)
    
    const defaultDate = new Date()
    defaultDate.setDate(defaultDate.getDate() + 14)
    setNewExpiryDate(defaultDate.toISOString().split('T')[0])
    setExtendDialogOpen(true)
  }

  const handlePlanChange = (planKey: PlanKey) => {
    setSelectedPlan(planKey)
    
    // If not custom, load plan's modules
    if (planKey !== 'custom') {
      const plan = getPlan(planKey)
      if (plan) {
        setCustomModules(plan.modules)
        setCustomClientLimit(plan.client_limit || 0)
      }
    }
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

      // Get plan configuration
      const plan = getPlan(selectedPlan)
      let modules = {}
      let clientLimit = null

      if (selectedPlan === 'custom') {
        modules = customModules
        clientLimit = customClientLimit || null
      } else if (plan) {
        modules = plan.modules
        clientLimit = plan.client_limit
      }

      // Merge with existing features
      const currentFeatures = selectedOrg.features || {}
      const updatedFeatures = {
        ...currentFeatures,
        modules: modules,
        client_limit: clientLimit,
      }

      const response = await fetch('/api/admin/organizations/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: selectedOrg.id,
          plan: selectedPlan,
          features: updatedFeatures,
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
                  <th className="text-start p-3">{t.plan}</th>
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
                    <td className="p-3">{getPlanBadge(org.plan || 'demo')}</td>
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
            {/* Plan Selection */}
            <div>
              <Label>{t.selectPlan}</Label>
              <Select value={selectedPlan} onValueChange={handlePlanChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((plan) => (
                    <SelectItem key={plan.key} value={plan.key}>
                      {language === 'he' ? plan.name_he : plan.name_ru}
                      {plan.price_monthly !== null && ` — ₪${plan.price_monthly}/мес`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Show modules info for non-custom plans */}
            {selectedPlan !== 'custom' && (() => {
              const plan = getPlan(selectedPlan)
              if (!plan) return null
              
              return (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                  <p className="font-medium mb-2">{t.includedModules}:</p>
                  <div className="space-y-1">
                    {Object.entries(plan.modules).map(([key, enabled]) => {
                      const module = MODULES.find((m) => m.key === key)
                      if (!module) return null
                      
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className={enabled ? 'text-green-500' : 'text-red-400'}>
                            {enabled ? '✅' : '❌'}
                          </span>
                          <span>{language === 'he' ? module.name_he : module.name_ru}</span>
                        </div>
                      )
                    })}
                  </div>
                  {plan.client_limit !== null && (
                    <p className="mt-3 text-muted-foreground">
                      {t.clientLimit}: {plan.client_limit}
                    </p>
                  )}
                  {plan.client_limit === null && (
                    <p className="mt-3 text-green-600 font-medium">
                      {t.unlimited}
                    </p>
                  )}
                </div>
              )
            })()}

            {/* Custom plan: module toggles */}
            {selectedPlan === 'custom' && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="font-medium mb-3 text-sm">{t.selectModules}:</p>
                <div className="space-y-2">
                  {MODULES.map((mod) => (
                    <div key={mod.key} className="flex items-center justify-between">
                      <span className="text-sm">
                        {language === 'he' ? mod.name_he : mod.name_ru}
                      </span>
                      <Switch
                        checked={customModules[mod.key] || false}
                        onCheckedChange={(val) =>
                          setCustomModules((prev) => ({ ...prev, [mod.key]: val }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Label className="text-sm">{t.clientLimit}:</Label>
                  <Input
                    type="number"
                    value={customClientLimit}
                    onChange={(e) => setCustomClientLimit(parseInt(e.target.value) || 0)}
                    placeholder="0 = безлимит"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Status & Expiry */}
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

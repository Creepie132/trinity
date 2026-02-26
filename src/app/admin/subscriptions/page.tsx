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
import { Shield, Calendar, CheckCircle, XCircle, Clock, AlertCircle, Users, Package, Plus, Trash2, Save, Settings } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { PLANS, getPlan, type PlanKey } from '@/lib/subscription-plans'
import { MODULES } from '@/lib/modules-config'
import { ResponsiveDataView } from '@/components/ui/ResponsiveDataView'

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

interface Plan {
  id: string
  key: string
  name_he: string
  name_ru: string
  desc_he: string
  desc_ru: string
  color: string
  modules: Record<string, boolean>
  client_limit: number | null
  price_monthly: number | null
  price_yearly: number | null
  is_active: boolean
  sort_order: number
}

const SUBSCRIPTION_STATUSES = [
  { value: 'none', label_he: 'ללא גישה', label_ru: 'Нет доступа', color: 'gray' },
  { value: 'trial', label_he: 'ניסיון', label_ru: 'Пробный период', color: 'yellow' },
  { value: 'active', label_he: 'פעיל', label_ru: 'Активна', color: 'green' },
  { value: 'manual', label_he: 'גישה ידנית', label_ru: 'Ручной доступ', color: 'blue' },
  { value: 'expired', label_he: 'פג תוקף', label_ru: 'Истекла', color: 'red' },
]

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
  const [dbPlans, setDbPlans] = useState<any[]>([]) // Plans from database
  const [modulePricing, setModulePricing] = useState<any[]>([])
  const [priceMode, setPriceMode] = useState<'auto' | 'manual'>('auto')
  const [manualPrice, setManualPrice] = useState<number>(0)

  // Plans management modal
  const [plansModalOpen, setPlansModalOpen] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [savingPlan, setSavingPlan] = useState<string | null>(null)

  const translations = {
    he: {
      title: 'מנויים וגישה',
      managePlans: 'ניהול תוכניות',
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
      priceMode: 'מצב תמחור',
      auto: 'אוטומטי',
      manual: 'ידני',
      calculatedPrice: 'מחושב לפי מודולים',
      perMonth: 'לחודש',
      manualPriceInput: 'מחיר ידני',
      save: 'שמור',
      cancel: 'ביטול',
      statuses: {
        none: 'אין גישה',
        trial: 'תקופת ניסיון',
        active: 'פעיל',
        manual: 'ידני',
        expired: 'פג תוקף',
      },
      // Plans modal
      plansTitle: 'ניהול תוכניות תמחור',
      addPlan: 'הוסף תוכנית',
      nameRu: 'שם רוסית',
      nameHe: 'שם עברית',
      descRu: 'תיאור רוסית',
      descHe: 'תיאור עברית',
      price: 'מחיר חודשי',
      modules: 'מודולים',
      active: 'פעיל',
      color: 'צבע',
      key: 'מזהה',
      delete: 'מחק',
    },
    ru: {
      title: 'Подписки и доступ',
      managePlans: 'Управление планами',
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
      priceMode: 'Режим цены',
      auto: 'Авто',
      manual: 'Вручную',
      calculatedPrice: 'Рассчитано по модулям',
      perMonth: 'в месяц',
      manualPriceInput: 'Цена вручную',
      save: 'Сохранить',
      cancel: 'Отмена',
      statuses: {
        none: 'Нет доступа',
        trial: 'Пробный период',
        active: 'Активна',
        manual: 'Ручной доступ',
        expired: 'Истекла',
      },
      // Plans modal
      plansTitle: 'Управление тарифными планами',
      addPlan: 'Добавить план',
      nameRu: 'Название (русский)',
      nameHe: 'Название (иврит)',
      descRu: 'Описание (русский)',
      descHe: 'Описание (иврит)',
      price: 'Цена/месяц',
      modules: 'Модули',
      active: 'Активен',
      color: 'Цвет',
      key: 'Ключ',
      delete: 'Удалить',
    },
  }

  const t = translations[language]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load plans from database
      try {
        const plansRes = await fetch('/api/admin/plans')
        if (plansRes.ok) {
          const plansData = await plansRes.json()
          setDbPlans(plansData || [])
          setPlans(plansData || [])
        }
      } catch (err) {
        console.warn('Failed to load plans from DB, using hardcoded plans')
      }

      // Load module pricing
      try {
        const pricingRes = await fetch('/api/admin/module-pricing')
        if (pricingRes.ok) {
          const pricingData = await pricingRes.json()
          setModulePricing(pricingData || [])
        }
      } catch (err) {
        console.warn('Failed to load module pricing')
      }

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
          org_users (
            role,
            user_id,
            email
          )
        `)

      const formattedOrgs = orgs?.map((org: any) => {
        const businessInfo = org.features?.business_info || {}
        // Find owner from org_users
        const owner = org.org_users?.find((u: any) => u.role === 'owner')
        
        return {
          id: org.id,
          name: org.name,
          plan: org.plan || 'demo',
          display_name: businessInfo.display_name || org.name,
          subscription_status: org.subscription_status || 'none',
          subscription_expires_at: org.subscription_expires_at,
          owner_name: businessInfo.owner_name || '—',
          owner_email: owner?.email || businessInfo.email || '—',
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
    const statusConfig = SUBSCRIPTION_STATUSES.find(s => s.value === status)
    if (!statusConfig) {
      return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">—</Badge>
    }

    const colorClasses: Record<string, string> = {
      gray: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
      yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      green: 'bg-green-500/10 text-green-600 border-green-500/20',
      blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      red: 'bg-red-500/10 text-red-600 border-red-500/20',
    }

    const label = language === 'he' ? statusConfig.label_he : statusConfig.label_ru

    return (
      <Badge className={colorClasses[statusConfig.color] || colorClasses.gray}>
        {label}
      </Badge>
    )
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
    
    // Initialize price mode
    setPriceMode(org.features?.price_mode || 'auto')
    setManualPrice(org.features?.manual_price || 0)
    
    const defaultDate = new Date()
    defaultDate.setDate(defaultDate.getDate() + 14)
    setNewExpiryDate(defaultDate.toISOString().split('T')[0])
    setExtendDialogOpen(true)
  }

  const handlePlanChange = (planKey: PlanKey) => {
    setSelectedPlan(planKey)
    
    // If not custom, load plan's modules
    if (planKey !== 'custom') {
      // Try database plans first
      const dbPlan = dbPlans.find((p) => p.key === planKey)
      if (dbPlan) {
        setCustomModules(dbPlan.modules || {})
        setCustomClientLimit(dbPlan.client_limit || 0)
        return
      }
      
      // Fallback to hardcoded plans
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

      // Get plan configuration (try database first, then hardcoded)
      let modules = {}
      let clientLimit = null

      if (selectedPlan === 'custom') {
        modules = customModules
        clientLimit = customClientLimit || null
      } else {
        // Try database plans first
        const dbPlan = dbPlans.find((p) => p.key === selectedPlan)
        if (dbPlan) {
          modules = dbPlan.modules || {}
          clientLimit = dbPlan.client_limit
        } else {
          // Fallback to hardcoded plans
          const plan = getPlan(selectedPlan)
          if (plan) {
            modules = plan.modules
            clientLimit = plan.client_limit
          }
        }
      }

      // Calculate monthly price
      const autoPrice = modulePricing.reduce((sum, mod) => {
        const moduleKey = mod.module_key as string
        if ((modules as any)[moduleKey]) {
          return sum + parseFloat(mod.price_monthly || 0)
        }
        return sum
      }, 0)

      const monthlyPrice = priceMode === 'auto' ? autoPrice : manualPrice

      // Merge with existing features
      const currentFeatures = selectedOrg.features || {}
      const updatedFeatures = {
        ...currentFeatures,
        modules: modules,
        client_limit: clientLimit,
        price_mode: priceMode,
        manual_price: manualPrice,
        monthly_price: monthlyPrice,
      }

      console.log('=== SAVE EXTENSION ===')
      console.log('Org ID:', selectedOrg.id)
      console.log('Plan:', selectedPlan)
      console.log('Features:', JSON.stringify(updatedFeatures))
      console.log('Subscription Update:', { subscription_status: newStatus, subscription_expires_at: expiresAt.toISOString() })

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

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', JSON.stringify(data))

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

  // Plans management functions
  const updatePlan = (id: string, field: string, value: any) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  const updatePlanModule = (id: string, moduleKey: string, enabled: boolean) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, modules: { ...p.modules, [moduleKey]: enabled } }
          : p
      )
    )
  }

  const savePlan = async (plan: Plan) => {
    setSavingPlan(plan.id)
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      })

      if (!res.ok) throw new Error('Failed to save')

      toast.success(language === 'he' ? 'נשמר בהצלחה' : 'Сохранено')
      loadData()
    } catch (error) {
      console.error('Error saving plan:', error)
      toast.error(language === 'he' ? 'שגיאה בשמירה' : 'Ошибка сохранения')
    } finally {
      setSavingPlan(null)
    }
  }

  const deletePlan = async (id: string) => {
    if (!confirm(language === 'he' ? 'למחוק תוכנית?' : 'Удалить план?')) return

    try {
      const res = await fetch('/api/admin/plans', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (!res.ok) throw new Error('Failed to delete')

      toast.success(language === 'he' ? 'נמחק' : 'Удалено')
      loadData()
    } catch (error) {
      console.error('Error deleting plan:', error)
      toast.error(language === 'he' ? 'שגיאה במחיקה' : 'Ошибка удаления')
    }
  }

  const addNewPlan = async () => {
    const newPlan = {
      key: `plan_${Date.now()}`,
      name_he: language === 'he' ? 'תוכנית חדשה' : 'Новый план',
      name_ru: language === 'ru' ? 'Новый план' : 'תוכנית חדשה',
      desc_he: '',
      desc_ru: '',
      color: 'gray',
      modules: {},
      client_limit: null,
      price_monthly: null,
      price_yearly: null,
      is_active: true,
      sort_order: plans.length,
    }

    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlan),
      })

      if (!res.ok) throw new Error('Failed to create')

      toast.success(language === 'he' ? 'תוכנית נוצרה' : 'План создан')
      loadData()
    } catch (error) {
      console.error('Error creating plan:', error)
      toast.error(language === 'he' ? 'שגיאה ביצירה' : 'Ошибка создания')
    }
  }

  const getColorClass = (color: string) => {
    const classes: Record<string, string> = {
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      amber: 'bg-amber-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      gray: 'bg-gray-500',
    }
    return classes[color] || 'bg-gray-500'
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-amber-600" />
          <h1 className="text-3xl font-bold">{t.title}</h1>
        </div>
        <Button 
          onClick={() => setPlansModalOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Settings className="w-4 h-4 mr-2" />
          {t.managePlans}
        </Button>
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
          <ResponsiveDataView
            columns={[
              {
                key: 'display_name',
                label: t.name,
                compact: true,
              },
              {
                key: 'owner_name',
                label: t.owner,
                compact: true,
              },
              {
                key: 'phone',
                label: t.phone,
              },
              {
                key: 'plan',
                label: t.plan,
                render: (val) => getPlanBadge(val || 'demo'),
              },
              {
                key: 'subscription_status',
                label: t.status,
                compact: true,
                render: (val) => getStatusBadge(val),
              },
              {
                key: 'subscription_expires_at',
                label: t.expires,
                render: (val) =>
                  val
                    ? new Date(val).toLocaleDateString(
                        language === 'he' ? 'he-IL' : 'ru-RU'
                      )
                    : '-',
              },
            ]}
            data={organizations}
            titleKey="display_name"
            subtitleKey="owner_name"
            badgeKey="subscription_status"
            badgeColorMap={{
              trial: 'yellow',
              active: 'green',
              manual: 'blue',
              expired: 'red',
              none: 'gray',
            }}
            actions={(org) => [
              {
                label: t.extend,
                onClick: () => handleExtend(org),
              },
              {
                label: t.deactivate,
                onClick: () => handleDeactivate(org.id),
                variant: 'destructive',
              },
            ]}
            locale={language}
          />
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
                  {/* Use DB plans if available, otherwise hardcoded */}
                  {(dbPlans.length > 0 ? dbPlans : PLANS).map((plan) => (
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
              // Try DB plan first, then hardcoded
              const dbPlan = dbPlans.find((p) => p.key === selectedPlan)
              const plan = dbPlan || getPlan(selectedPlan)
              if (!plan) return null
              
              return (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                  <p className="font-medium mb-2">{t.includedModules}:</p>
                  <div className="space-y-1">
                    {Object.entries(plan.modules || {}).map(([key, enabled]) => {
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
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {modulePricing.length > 0 ? (
                    modulePricing.map((mod) => (
                      <div key={mod.module_key} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {language === 'he' ? mod.name_he : mod.name_ru}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ₪{mod.price_monthly || 0}
                          </span>
                        </div>
                        <Switch
                          checked={customModules[mod.module_key] || false}
                          onCheckedChange={(val) =>
                            setCustomModules((prev) => ({ ...prev, [mod.module_key]: val }))
                          }
                        />
                      </div>
                    ))
                  ) : (
                    MODULES.map((mod) => (
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
                    ))
                  )}
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

                {/* Auto price calculation */}
                {modulePricing.length > 0 && (() => {
                  const autoPrice = modulePricing.reduce((sum, mod) => {
                    if (customModules[mod.module_key]) {
                      return sum + parseFloat(mod.price_monthly || 0)
                    }
                    return sum
                  }, 0)

                  return (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">{t.priceMode}:</p>
                      <div className="flex gap-2 mb-3">
                        <Button
                          size="sm"
                          variant={priceMode === 'auto' ? 'default' : 'outline'}
                          onClick={() => setPriceMode('auto')}
                        >
                          {t.auto}
                        </Button>
                        <Button
                          size="sm"
                          variant={priceMode === 'manual' ? 'default' : 'outline'}
                          onClick={() => setPriceMode('manual')}
                        >
                          {t.manual}
                        </Button>
                      </div>

                      {priceMode === 'auto' ? (
                        <div className="text-sm">
                          <span className="font-bold text-lg">₪{autoPrice}</span>
                          <span className="text-muted-foreground">/{t.perMonth}</span>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t.calculatedPrice}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <Label className="text-sm">{t.manualPriceInput}:</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-muted-foreground">₪</span>
                            <Input
                              type="number"
                              value={manualPrice}
                              onChange={(e) => setManualPrice(parseFloat(e.target.value) || 0)}
                              className="w-32"
                            />
                            <span className="text-sm text-muted-foreground">/{t.perMonth}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
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
                  {SUBSCRIPTION_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {language === 'he' ? status.label_he : status.label_ru}
                    </SelectItem>
                  ))}
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

      {/* Plans Management Modal */}
      <Dialog open={plansModalOpen} onOpenChange={setPlansModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-6 h-6 text-amber-600" />
                {t.plansTitle}
              </div>
              <Button onClick={addNewPlan} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                {t.addPlan}
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {plans.map((plan) => (
              <Card key={plan.id} className="border-2 relative">
                {/* Color bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${getColorClass(
                    plan.color
                  )}`}
                />

                <CardHeader className="pt-6">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{plan.key}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deletePlan(plan.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Names */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">{t.nameRu}</Label>
                      <Input
                        value={plan.name_ru}
                        onChange={(e) => updatePlan(plan.id, 'name_ru', e.target.value)}
                        className="text-sm font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t.nameHe}</Label>
                      <Input
                        value={plan.name_he}
                        onChange={(e) => updatePlan(plan.id, 'name_he', e.target.value)}
                        dir="rtl"
                        className="text-sm font-bold"
                      />
                    </div>
                  </div>

                  {/* Price & Client Limit */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">{t.price}</Label>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-sm">₪</span>
                        <Input
                          type="number"
                          value={plan.price_monthly || ''}
                          onChange={(e) =>
                            updatePlan(
                              plan.id,
                              'price_monthly',
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                          placeholder="0"
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">{t.clientLimit}</Label>
                      <Input
                        type="number"
                        value={plan.client_limit || ''}
                        onChange={(e) =>
                          updatePlan(
                            plan.id,
                            'client_limit',
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        placeholder={t.unlimited}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <Label className="text-xs">{t.color}</Label>
                    <select
                      value={plan.color}
                      onChange={(e) => updatePlan(plan.id, 'color', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      <option value="red">Red</option>
                      <option value="blue">Blue</option>
                      <option value="amber">Amber</option>
                      <option value="green">Green</option>
                      <option value="purple">Purple</option>
                      <option value="gray">Gray</option>
                    </select>
                  </div>

                  {/* Modules */}
                  <div>
                    <Label className="text-xs mb-1 block">{t.modules}</Label>
                    <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2 text-sm">
                      {MODULES.map((mod) => (
                        <div key={mod.key} className="flex items-center justify-between text-xs">
                          <span>
                            {language === 'he' ? mod.name_he : mod.name_ru}
                          </span>
                          <Switch
                            checked={plan.modules[mod.key] || false}
                            onCheckedChange={(val) =>
                              updatePlanModule(plan.id, mod.key, val)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active status */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs font-medium">{t.active}</span>
                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={(val) => updatePlan(plan.id, 'is_active', val)}
                    />
                  </div>

                  {/* Save button */}
                  <Button
                    onClick={() => savePlan(plan)}
                    disabled={savingPlan === plan.id}
                    className="w-full"
                    size="sm"
                  >
                    {savingPlan === plan.id ? (
                      <span>{language === 'he' ? 'שומר...' : 'Сохранение...'}</span>
                    ) : (
                      <>
                        <Save className="w-3 h-3 mr-2" />
                        {t.save}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

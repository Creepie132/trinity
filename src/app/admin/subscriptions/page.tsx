'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { Shield, Calendar, CheckCircle, XCircle, Clock, AlertCircle, Users, Package, Plus, Trash2, Save, Settings, Mail, Send, Loader2, ChevronRight, X, Pencil, CreditCard, Copy, ExternalLink } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { PLANS, getPlan, type PlanKey } from '@/lib/subscription-plans'
import { MODULES } from '@/lib/modules-config'
import { ResponsiveDataView } from '@/components/ui/ResponsiveDataView'
import { EditOrganizationModal } from '@/components/modals/other/EditOrganizationModal'
import Modal from '@/components/ui/Modal'
import { useMediaQuery } from '@/hooks/useMediaQuery'

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
  // Billing fields
  billing_amount?: number
  billing_due_date?: string
  billing_status?: string
  tranzila_card_token?: string
  tranzila_card_last4?: string
  payments_enabled?: boolean
  recurring_enabled?: boolean
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
  const { language } = useLanguage()

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [extendDialogOpen, setExtendDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<string>('trial')
  const [newExpiryDate, setNewExpiryDate] = useState<string>('')
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('demo')
  const [customModules, setCustomModules] = useState<Record<string, boolean>>({})
  const [customModulePrices, setCustomModulePrices] = useState<Record<string, number>>({})
  const [customClientLimit, setCustomClientLimit] = useState<number>(0)
  const [dbPlans, setDbPlans] = useState<any[]>([]) // Plans from database
  const [modulePricing, setModulePricing] = useState<any[]>([])
  const [priceMode, setPriceMode] = useState<'auto' | 'manual'>('auto')
  const [manualPrice, setManualPrice] = useState<number>(0)

  // Plans management modal
  const [plansModalOpen, setPlansModalOpen] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [savingPlan, setSavingPlan] = useState<string | null>(null)

  // Invitation modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)

  // Edit organization modal
  const [editOrgModalOpen, setEditOrgModalOpen] = useState(false)
  const [orgToEdit, setOrgToEdit] = useState<Organization | null>(null)

  // Bottom sheet for org details
  const [selectedOrgSheet, setSelectedOrgSheet] = useState<Organization | null>(null)

  // Autopayment modal
  const [autopayModalOpen, setAutopayModalOpen] = useState(false)
  const [autopayOrg, setAutopayOrg] = useState<Organization | null>(null)
  const [autopayAmount, setAutopayAmount] = useState<number>(199)
  const [autopayBillingDate, setAutopayBillingDate] = useState<string>('')
  const [autopayLoading, setAutopayLoading] = useState(false)
  const [autopaySuccess, setAutopaySuccess] = useState<{ email: string } | null>(null)

  // Responsive: desktop uses Modal, mobile uses bottom sheet
  const isDesktop = useMediaQuery('(min-width: 768px)')

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
      payment: 'תשלום',
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
      // Invitation modal
      inviteOrg: 'הזמן ארגון',
      sendInvitation: 'שלח הזמנה',
      message: 'הודעה',
      messagePlaceholder: 'הודעה אישית למקבל...',
      send: 'שלח',
      sending: 'שולח...',
      successSent: 'ההזמנה נשלחה ל',
      inviteUrl: 'קישור הזמנה:',
      copied: 'הקישור הועתק',
      emailRequired: 'נדרש אימייל',
      // Toast messages
      accessExtended: 'הגישה הוארכה',
      errorExtending: 'שגיאה בהארכה',
      deactivated: 'הושבת',
      errorDeactivating: 'שגיאה בהשבתה',
      requestApproved: 'הבקשה אושרה',
      errorApproving: 'שגיאה באישור',
      requestRejected: 'הבקשה נדחתה',
      errorRejecting: 'שגיאה בדחייה',
      planSaved: 'נשמר בהצלחה',
      errorSaving: 'שגיאה בשמירה',
      planDeleted: 'נמחק',
      errorDeleting: 'שגיאה במחיקה',
      planCreated: 'תוכנית נוצרה',
      errorCreating: 'שגיאה ביצירה',
      confirmDeactivate: 'להשבית ארגון?',
      confirmDeletePlan: 'למחוק תוכנית?',
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
      payment: 'Оплата',
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
      // Invitation modal
      inviteOrg: 'Пригласить организацию',
      sendInvitation: 'Отправить приглашение',
      message: 'Сообщение',
      messagePlaceholder: 'Персональное сообщение для получателя...',
      send: 'Отправить',
      sending: 'Отправка...',
      successSent: 'Приглашение отправлено на',
      inviteUrl: 'Ссылка приглашения:',
      copied: 'Ссылка скопирована',
      emailRequired: 'Требуется email',
      // Toast messages
      accessExtended: 'Доступ продлён',
      errorExtending: 'Ошибка продления',
      deactivated: 'Деактивировано',
      errorDeactivating: 'Ошибка деактивации',
      requestApproved: 'Запрос одобрен',
      errorApproving: 'Ошибка одобрения',
      requestRejected: 'Запрос отклонён',
      errorRejecting: 'Ошибка отклонения',
      planSaved: 'Сохранено',
      errorSaving: 'Ошибка сохранения',
      planDeleted: 'Удалено',
      errorDeleting: 'Ошибка удаления',
      planCreated: 'План создан',
      errorCreating: 'Ошибка создания',
      confirmDeactivate: 'Деактивировать организацию?',
      confirmDeletePlan: 'Удалить план?',
    },
  }

  const t = translations[language]
  const searchParams = useSearchParams()
  const autopayHandled = useRef(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (autopayHandled.current) return
    const autopay = searchParams.get('autopay')
    if (autopay === 'success') {
      autopayHandled.current = true
      toast.success(language === 'he' ? 'תשלום אוטומטי הופעל בהצלחה!' : 'Автоплатёж успешно подключён!')
      loadData()
    } else if (autopay === 'failed') {
      autopayHandled.current = true
      toast.error(language === 'he' ? 'תשלום נכשל' : 'Ошибка подключения автоплатежа')
    }
  }, [searchParams])

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

      // Load organizations + access requests via API (service role, bypasses RLS)
      const res = await fetch('/api/admin/subscriptions-list')
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setOrganizations(data.organizations || [])
      setAccessRequests(data.accessRequests || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Ошибка загрузки данных')
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
    
    // Initialize custom module prices from current features
    const currentModulePrices = org.features?.custom_module_prices || {}
    setCustomModulePrices(currentModulePrices)
    
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

  const handleEditOrg = (org: Organization) => {
    setOrgToEdit(org)
    setEditOrgModalOpen(true)
  }

  const handleDeactivate = async (orgId: string) => {
    if (!confirm(t.confirmDeactivate)) return

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

      toast.success(t.deactivated)
      loadData()
    } catch (error) {
      console.error('Error deactivating:', error)
      toast.error(t.errorDeactivating)
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
          // Use custom price if set, otherwise use default price
          const customPrice = selectedPlan === 'custom' ? customModulePrices[moduleKey] : undefined
          const price = customPrice !== undefined ? customPrice : parseFloat(mod.price_monthly || 0)
          return sum + price
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
        custom_module_prices: selectedPlan === 'custom' ? customModulePrices : {},
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

      if (!response.ok) {
        // Log detailed error
        console.error('❌ SAVE EXTENSION FAILED:', {
          status: response.status,
          error: data.error,
          code: data.code,
          details: data.details,
          hint: data.hint,
          org_id: data.org_id,
        })
        
        // Show detailed error to user
        const errorMessage = data.error || 'Failed to extend'
        const detailsMessage = data.details ? `\n\nDetails: ${data.details}` : ''
        const hintMessage = data.hint ? `\n\nHint: ${data.hint}` : ''
        
        toast.error(`${errorMessage}${detailsMessage}${hintMessage}`, {
          duration: 10000, // Show for 10 seconds
        })
        
        throw new Error(errorMessage)
      }

      toast.success(t.accessExtended)
      setExtendDialogOpen(false)
      loadData()
    } catch (error: any) {
      console.error('❌ Error extending access:', {
        error,
        message: error?.message,
        stack: error?.stack,
      })
      
      // Only show generic error if we haven't already shown a detailed one
      if (!error?.message?.includes('Database error')) {
        toast.error(t.errorExtending)
      }
    }
  }

  const handleApproveRequest = async (userId: string) => {
    try {
      const response = await fetch(`/api/access/review?user_id=${userId}&action=approve&token=admin`, {
        method: 'GET',
      })

      if (!response.ok) throw new Error('Failed to approve')

      toast.success(t.requestApproved)
      loadData()
    } catch (error) {
      console.error('Error approving:', error)
      toast.error(t.errorApproving)
    }
  }

  const handleRejectRequest = async (userId: string) => {
    if (!confirm(language === 'he' ? 'לדחות בקשה?' : 'Отклонить запрос?')) return

    try {
      const response = await fetch(`/api/access/review?user_id=${userId}&action=reject&token=admin`, {
        method: 'GET',
      })

      if (!response.ok) throw new Error('Failed to reject')

      toast.success(t.requestRejected)
      loadData()
    } catch (error) {
      console.error('Error rejecting:', error)
      toast.error(t.errorRejecting)
    }
  }

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inviteEmail) {
      toast.error(t.emailRequired)
      return
    }

    setSendingInvite(true)

    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, message: inviteMessage || null }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send invitation')
      }

      const data = await response.json()

      // Show warning if user already exists
      if (data.warning && data.message) {
        toast.info(data.message, {
          duration: 8000,
        })
      } else {
        toast.success(`${t.successSent} ${inviteEmail}`)
      }
      
      // Show invite URL
      if (data.inviteUrl) {
        toast.info(`${t.inviteUrl} ${data.inviteUrl}`, {
          duration: 10000,
        })
      }

      setInviteEmail('')
      setInviteMessage('')
      setInviteModalOpen(false)
    } catch (error: any) {
      console.error('Error sending invitation:', error)
      toast.error(error.message || 'Failed to send invitation')
    } finally {
      setSendingInvite(false)
    }
  }

  const handleOpenAutopay = (org: Organization) => {
    setAutopayOrg(org)
    // Получаем цену из плана
    const dbPlan = dbPlans.find((p) => p.key === org.plan)
    const defaultPrice = dbPlan?.price_monthly || 199
    setAutopayAmount(org.billing_amount || defaultPrice)
    
    // Дата первого списания — сегодня по умолчанию
    const today = new Date().toISOString().split('T')[0]
    setAutopayBillingDate(org.billing_due_date || today)
    
    setAutopaySuccess(null)
    setAutopayModalOpen(true)
  }

  const handleSendAutopayLink = async () => {
    if (!autopayOrg) return
    
    setAutopayLoading(true)
    try {
      const response = await fetch('/api/admin/subscription-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: autopayOrg.id,
          amount: autopayAmount,
          billing_due_date: autopayBillingDate,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send payment link')
      }

      const data = await response.json()
      setAutopaySuccess({ email: data.email_sent_to })
      toast.success(language === 'he' ? 'הקישור נשלח' : 'Ссылка отправлена')
      
      // Обновляем данные
      loadData()
    } catch (error: any) {
      console.error('Error sending autopay link:', error)
      toast.error(error.message || 'Failed to send payment link')
    } finally {
      setAutopayLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    toast.success(language === 'he' ? 'הועתק' : 'Скопировано')
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

      toast.success(t.planSaved)
      loadData()
    } catch (error) {
      console.error('Error saving plan:', error)
      toast.error(t.errorSaving)
    } finally {
      setSavingPlan(null)
    }
  }

  const deletePlan = async (id: string) => {
    if (!confirm(t.confirmDeletePlan)) return

    try {
      const res = await fetch('/api/admin/plans', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (!res.ok) throw new Error('Failed to delete')

      toast.success(t.planDeleted)
      loadData()
    } catch (error) {
      console.error('Error deleting plan:', error)
      toast.error(t.errorDeleting)
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

      toast.success(t.planCreated)
      loadData()
    } catch (error) {
      console.error('Error creating plan:', error)
      toast.error(t.errorCreating)
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
          <h1 className="text-2xl md:text-3xl font-bold">{t.title}</h1>
        </div>
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

      {/* Organizations List - Compact Rows */}
      <Card>
        <CardHeader>
          <CardTitle>{t.organizations}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {organizations.map((org) => {
              const isPaid = org.subscription_status === 'active' || org.subscription_status === 'trial' || org.subscription_status === 'manual'
              const planInfo = (() => {
                const dbPlan = dbPlans.find((p) => p.key === org.plan)
                if (dbPlan) return language === 'he' ? dbPlan.name_he : dbPlan.name_ru
                const plan = getPlan((org.plan || 'demo') as PlanKey)
                return plan ? (language === 'he' ? plan.name_he : plan.name_ru) : org.plan
              })()

              return (
                <button
                  key={org.id}
                  onClick={() => setSelectedOrgSheet(org)}
                  className="w-full flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 hover:shadow-sm transition-all duration-150 text-left"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {org.name?.charAt(0).toUpperCase()}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                        {org.display_name || org.name}
                      </span>
                      {getStatusBadge(org.subscription_status)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {org.owner_name} · {planInfo}
                    </p>
                  </div>

                  {/* Payment indicator + arrow */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-red-400'}`}
                      title={isPaid ? (language === 'he' ? 'שולם' : 'Оплачено') : (language === 'he' ? 'לא שולם' : 'Не оплачено')}
                    />
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Organization Details — Adaptive: Modal on desktop, Bottom Sheet on mobile */}
      {selectedOrgSheet && (() => {
        const orgSheetContent = (
          <>
            {/* Header with avatar */}
            <div className="flex items-start gap-4 mb-6 pb-5 border-b border-gray-100 dark:border-gray-800">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                {selectedOrgSheet.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                  {selectedOrgSheet.display_name || selectedOrgSheet.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {selectedOrgSheet.owner_email}
                </p>
                <div className="mt-2">
                  {getStatusBadge(selectedOrgSheet.subscription_status)}
                </div>
              </div>
            </div>

            {/* Info rows */}
            <div className="space-y-0 divide-y divide-gray-50 dark:divide-gray-800">
              {[
                { label: language === 'he' ? 'בעלים' : 'Владелец', value: selectedOrgSheet.owner_name },
                { label: language === 'he' ? 'טלפון' : 'Телефон', value: selectedOrgSheet.phone || '—' },
                { 
                  label: language === 'he' ? 'תוכנית' : 'План', 
                  value: (() => {
                    const dbPlan = dbPlans.find((p) => p.key === selectedOrgSheet.plan)
                    if (dbPlan) return language === 'he' ? dbPlan.name_he : dbPlan.name_ru
                    const plan = getPlan((selectedOrgSheet.plan || 'demo') as PlanKey)
                    return plan ? (language === 'he' ? plan.name_he : plan.name_ru) : selectedOrgSheet.plan
                  })()
                },
                { 
                  label: language === 'he' ? 'תשלום' : 'Оплата', 
                  value: (() => {
                    const isPaid = selectedOrgSheet.subscription_status === 'active' || 
                                   selectedOrgSheet.subscription_status === 'trial' || 
                                   selectedOrgSheet.subscription_status === 'manual'
                    return (
                      <span className={`inline-flex items-center gap-1.5 ${isPaid ? 'text-emerald-600' : 'text-red-500'}`}>
                        <span className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-red-400'}`} />
                        {isPaid ? (language === 'he' ? 'שולם' : 'Оплачено') : (language === 'he' ? 'לא שולם' : 'Не оплачено')}
                      </span>
                    )
                  })()
                },
                { 
                  label: language === 'he' ? 'תוקף' : 'Истекает', 
                  value: selectedOrgSheet.subscription_expires_at 
                    ? new Date(selectedOrgSheet.subscription_expires_at).toLocaleDateString(language === 'he' ? 'he-IL' : 'ru-RU')
                    : '—'
                },
                // Billing info
                { 
                  label: language === 'he' ? 'סכום מנוי' : 'Сумма подписки', 
                  value: selectedOrgSheet.billing_amount 
                    ? `₪${selectedOrgSheet.billing_amount}/${language === 'he' ? 'חודש' : 'мес'}`
                    : '—'
                },
                ...(selectedOrgSheet.recurring_enabled ? [
                  {
                    label: language === 'he' ? 'כרטיס' : 'Карта',
                    value: selectedOrgSheet.tranzila_card_token
                      ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {`**** ${selectedOrgSheet.tranzila_card_last4 || '****'}`} ✅
                        </span>
                      )
                      : (
                        <span className="text-gray-400">
                          {language === 'he' ? 'לא מחובר' : 'Не подключена'}
                        </span>
                      )
                  },
                  {
                    label: language === 'he' ? 'חיוב הבא' : 'Следующее списание',
                    value: selectedOrgSheet.billing_due_date
                      ? new Date(selectedOrgSheet.billing_due_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'ru-RU')
                      : '—'
                  },
                ] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</span>
                </div>
              ))}
            </div>

            {/* Payment toggles */}
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
              {/* payments_enabled */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {language === 'he' ? 'תשלומים רגילים' : 'Обычные платежи'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {language === 'he' ? 'אפשרות לקבל תשלומים' : 'Возможность принимать платежи'}
                  </p>
                </div>
                <Switch
                  checked={selectedOrgSheet.payments_enabled ?? true}
                  onCheckedChange={async (checked) => {
                    try {
                      const res = await fetch('/api/admin/organizations/features', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ org_id: selectedOrgSheet.id, payments_enabled: checked }),
                      })
                      if (!res.ok) throw new Error('Failed')
                      setSelectedOrgSheet({ ...selectedOrgSheet, payments_enabled: checked })
                      setOrganizations((prev) =>
                        prev.map((o) => o.id === selectedOrgSheet.id ? { ...o, payments_enabled: checked } : o)
                      )
                      toast.success(language === 'he' ? 'עודכן' : 'Сохранено')
                    } catch {
                      toast.error(language === 'he' ? 'שגיאה' : 'Ошибка')
                    }
                  }}
                />
              </div>

              {/* recurring_enabled */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {language === 'he' ? 'תשלומים חוזרים' : 'Рекуррентные платежи'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {language === 'he' ? 'חיוב אוטומטי חודשי' : 'Автоматическое ежемесячное списание'}
                  </p>
                </div>
                <Switch
                  checked={selectedOrgSheet.recurring_enabled ?? false}
                  onCheckedChange={async (checked) => {
                    try {
                      const res = await fetch('/api/admin/organizations/features', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ org_id: selectedOrgSheet.id, recurring_enabled: checked }),
                      })
                      if (!res.ok) throw new Error('Failed')
                      setSelectedOrgSheet({ ...selectedOrgSheet, recurring_enabled: checked })
                      setOrganizations((prev) =>
                        prev.map((o) => o.id === selectedOrgSheet.id ? { ...o, recurring_enabled: checked } : o)
                      )
                      toast.success(language === 'he' ? 'עודכן' : 'Сохранено')
                    } catch {
                      toast.error(language === 'he' ? 'שגיאה' : 'Ошибка')
                    }
                  }}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className={`flex gap-2 mt-6 ${isDesktop ? 'flex-row flex-wrap' : 'flex-col'}`}>
              {/* Автоплатёж — всегда видна */}
              <button
                onClick={() => {
                  handleOpenAutopay(selectedOrgSheet)
                  setSelectedOrgSheet(null)
                }}
                className={`py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap min-w-0 ${isDesktop ? 'flex-[1.5]' : 'w-full'}`}
              >
                <CreditCard className="w-4 h-4 flex-shrink-0" />
                <span>{language === 'he' ? 'חיבור תשלום אוטומטי' : 'Автоплатёж'}</span>
              </button>

              {/* Продлить — primary */}
              <button
                onClick={() => {
                  handleExtend(selectedOrgSheet)
                  setSelectedOrgSheet(null)
                }}
                className={`py-2.5 px-2 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors whitespace-nowrap min-w-0 ${isDesktop ? 'flex-1' : 'w-full'}`}
              >
                {language === 'he' ? 'הארכה' : 'Продлить'}
              </button>

              {/* Редактировать — secondary */}
              <button
                onClick={() => {
                  handleEditOrg(selectedOrgSheet)
                  setSelectedOrgSheet(null)
                }}
                className={`py-2.5 px-2 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap min-w-0 ${isDesktop ? 'flex-1' : 'w-full'}`}
              >
                <Pencil className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{language === 'he' ? 'ערוך' : 'Ред.'}</span>
              </button>

              {/* Деактивировать — destructive */}
              <button
                onClick={() => {
                  handleDeactivate(selectedOrgSheet.id)
                  setSelectedOrgSheet(null)
                }}
                className={`py-2.5 px-2 rounded-xl bg-red-50 text-red-500 font-medium text-sm hover:bg-red-100 transition-colors border border-red-100 whitespace-nowrap min-w-0 ${isDesktop ? 'flex-1' : 'w-full'}`}
              >
                {language === 'he' ? 'השבת' : 'Деактив.'}
              </button>
            </div>
          </>
        )

        return isDesktop ? (
          // Desktop: Modal
          <Modal
            open={!!selectedOrgSheet}
            onClose={() => setSelectedOrgSheet(null)}
            size="md"
          >
            {orgSheetContent}
          </Modal>
        ) : (
          // Mobile: Bottom Sheet
          <>
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300"
              onClick={() => setSelectedOrgSheet(null)}
            />
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>
              <div className="px-5 pb-8 pt-2">
                <button
                  onClick={() => setSelectedOrgSheet(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
                {orgSheetContent}
              </div>
            </div>
          </>
        )
      })()}

      {/* Extend Dialog — Modern Bottom Sheet */}
      {extendDialogOpen && selectedOrg && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            onClick={() => setExtendDialogOpen(false)}
          />

          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>

            <div className="px-5 pb-8 pt-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {language === 'he' ? 'הארכת גישה' : 'Продление доступа'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {selectedOrg.name}
                  </p>
                </div>
                <button
                  onClick={() => setExtendDialogOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Plan Selection */}
              <div className="mb-5">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                  {language === 'he' ? 'תוכנית' : 'Тарифный план'}
                </label>
                <select
                  value={selectedPlan}
                  onChange={(e) => handlePlanChange(e.target.value as PlanKey)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {(dbPlans.length > 0 ? dbPlans : PLANS).map((plan) => (
                    <option key={plan.key} value={plan.key}>
                      {language === 'he' ? plan.name_he : plan.name_ru}
                      {plan.price_monthly !== null && ` — ₪${plan.price_monthly}/мес`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modules — Compact cards */}
              <div className="mb-6">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 block">
                  {language === 'he' ? 'מודולים' : 'Модули'}
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(modulePricing.length > 0 ? modulePricing : MODULES.map(m => ({ module_key: m.key, name_he: m.name_he, name_ru: m.name_ru, price_monthly: 0 }))).map((mod) => {
                    const moduleKey = mod.module_key || (mod as any).key
                    const isEnabled = customModules[moduleKey] || false
                    const currentPrice = customModulePrices[moduleKey] !== undefined
                      ? customModulePrices[moduleKey]
                      : parseFloat(mod.price_monthly || 0)

                    return (
                      <div
                        key={moduleKey}
                        className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          {/* Toggle */}
                          <button
                            onClick={() => setCustomModules((prev) => ({ ...prev, [moduleKey]: !isEnabled }))}
                            className={`relative w-10 h-6 rounded-full transition-colors ${isEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                          >
                            <span
                              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isEnabled ? 'left-5' : 'left-1'}`}
                            />
                          </button>
                          <span className={`text-sm font-medium ${isEnabled ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
                            {language === 'he' ? mod.name_he : mod.name_ru}
                          </span>
                        </div>

                        {/* Price */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">₪</span>
                          <input
                            type="number"
                            value={currentPrice}
                            onChange={(e) => setCustomModulePrices((prev) => ({ ...prev, [moduleKey]: parseFloat(e.target.value) || 0 }))}
                            disabled={!isEnabled}
                            className="w-14 text-right text-sm font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-b border-gray-200 dark:border-gray-600 focus:outline-none focus:border-indigo-400 disabled:text-gray-300 dark:disabled:text-gray-600"
                          />
                          <span className="text-xs text-gray-400">/мес</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Total */}
              {(() => {
                const totalPrice = (modulePricing.length > 0 ? modulePricing : MODULES.map(m => ({ module_key: m.key, price_monthly: 0 }))).reduce((sum, mod) => {
                  const moduleKey = mod.module_key || (mod as any).key
                  if (customModules[moduleKey]) {
                    const customPrice = customModulePrices[moduleKey]
                    const price = customPrice !== undefined ? customPrice : parseFloat(mod.price_monthly || 0)
                    return sum + price
                  }
                  return sum
                }, 0)

                return (
                  <div className="flex items-center justify-between py-4 border-t border-gray-100 dark:border-gray-800 mb-5">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {language === 'he' ? 'סה"כ לחודש' : 'Итого в месяц'}
                    </span>
                    <span className="text-xl font-bold text-indigo-600">
                      ₪{totalPrice.toFixed(0)}
                    </span>
                  </div>
                )
              })()}

              {/* Status & Expiry — Compact */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                    {language === 'he' ? 'סטטוס' : 'Статус'}
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {SUBSCRIPTION_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {language === 'he' ? status.label_he : status.label_ru}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                    {language === 'he' ? 'תאריך תפוגה' : 'Дата окончания'}
                  </label>
                  <input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Buttons — Row */}
              <div className="flex gap-3">
                <button
                  onClick={() => setExtendDialogOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {language === 'he' ? 'ביטול' : 'Отмена'}
                </button>
                <button
                  onClick={handleSaveExtension}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  {language === 'he' ? 'שמור' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Invitation Modal */}
      <Modal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title={t.sendInvitation}
        width="440px"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setInviteModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              form="invite-form"
              disabled={sendingInvite}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sendingInvite ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.sending}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {t.send}
                </>
              )}
            </button>
          </div>
        }
      >
        <form id="invite-form" onSubmit={handleSendInvitation} className="space-y-4">
          <div>
            <Label htmlFor="invite-email">{t.email} *</Label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="invite-message">{t.message}</Label>
            <Textarea
              id="invite-message"
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              placeholder={t.messagePlaceholder}
              rows={3}
            />
          </div>
        </form>
      </Modal>

      {/* Plans Management Modal */}
      <Modal
        open={plansModalOpen}
        onClose={() => setPlansModalOpen(false)}
        title={t.plansTitle}
        subtitle={language === 'he' ? 'ניהול תוכניות מנוי' : 'Управление тарифными планами'}
        width="900px"
      >
        <div className="flex items-center justify-end mb-4">
          <Button onClick={addNewPlan} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            {t.addPlan}
          </Button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </Modal>

      {/* Edit Organization Modal */}
      <EditOrganizationModal
        isOpen={editOrgModalOpen}
        onClose={() => {
          setEditOrgModalOpen(false)
          setOrgToEdit(null)
        }}
        organization={orgToEdit}
        onSaved={loadData}
      />

      {/* Autopayment Modal */}
      <Modal
        open={autopayModalOpen}
        onClose={() => {
          setAutopayModalOpen(false)
          setAutopayOrg(null)
          setAutopaySuccess(null)
        }}
        title={language === 'he' ? 'חיבור תשלום אוטומטי' : 'Подключить автоплатёж'}
        subtitle={autopayOrg?.name}
        width="440px"
        footer={
          autopaySuccess ? (
            <button
              onClick={() => {
                setAutopayModalOpen(false)
                setAutopayOrg(null)
                setAutopaySuccess(null)
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors whitespace-nowrap"
            >
              {language === 'he' ? 'סגור' : 'Закрыть'}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAutopayModalOpen(false)
                  setAutopayOrg(null)
                }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                {language === 'he' ? 'ביטול' : 'Отмена'}
              </button>
              <button
                onClick={handleSendAutopayLink}
                disabled={autopayLoading}
                className="flex-[1.5] py-2.5 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
              >
                {autopayLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {language === 'he' ? 'שלח קישור ללקוח' : 'Отправить ссылку клиенту'}
              </button>
            </div>
          )
        }
      >
        {autopaySuccess ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                {language === 'he' ? 'הקישור נשלח!' : 'Ссылка отправлена!'}
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {autopaySuccess.email}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {language === 'he'
                ? 'לאחר התשלום, הכרטיס יישמר אוטומטית לחיובים עתידיים.'
                : 'После оплаты карта автоматически сохранится для будущих списаний.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Сумма подписки */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                {language === 'he' ? 'סכום מנוי (₪/חודש)' : 'Сумма подписки (₪/мес)'}
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-lg">₪</span>
                <Input
                  type="number"
                  value={autopayAmount}
                  onChange={(e) => setAutopayAmount(parseFloat(e.target.value) || 0)}
                  className="text-lg font-semibold"
                />
              </div>
            </div>

            {/* Дата первого списания */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                {language === 'he' ? 'תאריך חיוב ראשון' : 'Дата первого списания'}
              </Label>
              <Input
                type="date"
                value={autopayBillingDate}
                onChange={(e) => setAutopayBillingDate(e.target.value)}
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 {language === 'he' 
                  ? 'הקישור יישלח לאימייל הבעלים של הארגון. לאחר תשלום מוצלח, הכרטיס יישמר לחיובים אוטומטיים.'
                  : 'Ссылка будет отправлена на email владельца организации. После оплаты карта сохранится для автоматических списаний.'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* FAB Button */}
      <SubscriptionsFab
        onInvite={() => setInviteModalOpen(true)}
        onManagePlans={() => setPlansModalOpen(true)}
        language={language}
      />
    </div>
  )
}

// FAB Component
function SubscriptionsFab({ 
  onInvite, 
  onManagePlans,
  language 
}: { 
  onInvite: () => void
  onManagePlans: () => void
  language: 'he' | 'ru'
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {/* Menu items — appear bottom to top */}
      <div className={`flex flex-col items-end gap-2 transition-all duration-200 ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        {/* Manage Plans */}
        <div className="flex items-center gap-2">
          <span className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium px-3 py-1.5 rounded-full shadow-md border border-gray-100 dark:border-gray-700 whitespace-nowrap">
            {language === 'he' ? 'ניהול תוכניות' : 'Управление планами'}
          </span>
          <button
            onClick={() => { onManagePlans(); setOpen(false) }}
            className="w-12 h-12 rounded-full bg-orange-500 text-white shadow-lg flex items-center justify-center hover:bg-orange-600 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Invite Organization */}
        <div className="flex items-center gap-2">
          <span className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium px-3 py-1.5 rounded-full shadow-md border border-gray-100 dark:border-gray-700 whitespace-nowrap">
            {language === 'he' ? 'הזמן ארגון' : 'Пригласить организацию'}
          </span>
          <button
            onClick={() => { onInvite(); setOpen(false) }}
            className="w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors"
          >
            <Mail className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main FAB button */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center transition-all duration-300 ${open ? 'bg-gray-700 rotate-45' : 'bg-indigo-600 hover:bg-indigo-700'}`}
      >
        {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>

      {/* Backdrop when open */}
      {open && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
}

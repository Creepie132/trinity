'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, CheckCircle, XCircle, Calendar, Clock, List, CalendarDays, Play, X, MessageCircle, MessageSquare, CheckCircle2, Mail, Download, Scissors, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useFeatures } from '@/hooks/useFeatures'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMeetingMode } from '@/hooks/useMeetingMode'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useModalStore } from '@/store/useModalStore'
import { CalendarView } from '@/components/visits/CalendarView'
import { VisitCard } from '@/components/visits/VisitCard'
import { ActiveVisitCard } from '@/components/visits/ActiveVisitCard'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'
import { MeetingDetailCard } from '@/components/visits/MeetingDetailCard'
import { VisitDetailModal } from '@/components/visits/VisitDetailModal'
import { format } from 'date-fns'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Visit } from '@/types/visits'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ExportButton } from '@/components/ExportButton'

export default function VisitsPage() {
  const router = useRouter()
  const features = useFeatures()
  const { t, language } = useLanguage()
  const meetingMode = useMeetingMode()
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()
  const queryClient = useQueryClient()

  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null)
  const { openModal } = useModalStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('week')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [serviceColors, setServiceColors] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [allClients, setAllClients] = useState<any[]>([])
  const [newVisitNotify, setNewVisitNotify] = useState<any>(null)
  const [paymentVisit, setPaymentVisit] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [receiptVisit, setReceiptVisit] = useState<any>(null)
  const [createVisitPrefill, setCreateVisitPrefill] = useState<any>(null)
  
  // Bookings hook
  // Bookings view removed - online bookings now show in main list with badge

  // Load all clients for names lookup
  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then(setAllClients)
      .catch(console.error)
  }, [])

  function getClientName(visit: any): string {
    const client = allClients?.find((c: any) => c.id === visit.client_id)
    if (client) return `${client.first_name || ''} ${client.last_name || ''}`.trim()
    return ''
  }

  function getClientPhone(visit: any): string {
    if (!visit?.client_id) return ''
    const client = allClients.find((c: any) => c.id === visit.client_id)
    return client?.phone || ''
  }

  function getClientEmail(visit: any): string {
    if (!visit?.client_id) return ''
    const client = allClients.find((c: any) => c.id === visit.client_id)
    return client?.email || ''
  }

  function getServiceName(visit: any): string {
    // Get from joined services table
    if (visit?.services) {
      return language === 'he' ? visit.services.name : (visit.services.name_ru || visit.services.name)
    }
    // Fallback: empty string (service name should come from JOIN)
    return ''
  }

  function getLastVisitDate(visit: any): string {
    if (!visit?.client_id || !visitsData?.data) return ''
    const clientVisits = visitsData.data
      .filter((v: any) => v.client_id === visit.client_id && v.id !== visit.id && v.status === 'completed')
      .sort((a: any, b: any) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
    if (clientVisits.length === 0) return ''
    return new Date(clientVisits[0].scheduled_at).toLocaleDateString(language === 'he' ? 'he-IL' : 'ru-RU')
  }

  // Check organization status and feature access
  useEffect(() => {
    if (!features.isLoading) {
      if (!features.isActive) {
        router.push('/blocked')
      } else if (!features.hasVisits) {
        router.push('/dashboard')
      }
    }
  }, [features.isActive, features.hasVisits, features.isLoading, router])

  // Load service colors from organization settings
  useEffect(() => {
    if (orgId) {
      supabase
        .from('organizations')
        .select('features')
        .eq('id', orgId)
        .single()
        .then(({ data }) => {
          if (data?.features?.serviceColors) {
            setServiceColors(data.features.serviceColors)
          }
        })
    }
  }, [orgId])

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [dateFilter, statusFilter, searchQuery])

  // Fetch visits with pagination
  const { data: visitsData, isLoading, refetch } = useQuery({
    queryKey: ['visits', orgId, dateFilter, statusFilter, searchQuery, page],
    queryFn: async () => {
      if (!orgId) return { data: [], count: 0 }

      // Build query with count
      let query = supabase
        .from('visits')
        .select(`
          *,
          status,
          clients (
            first_name,
            last_name,
            phone,
            email
          ),
          services (
            id,
            name,
            name_ru,
            duration_minutes,
            price
          ),
          visit_services (
            id,
            visit_id,
            service_id,
            service_name,
            service_name_ru,
            price,
            duration_minutes,
            created_at
          )
        `, { count: 'exact' })
        .eq('org_id', orgId)
        .order('scheduled_at', { ascending: false })

      // Status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      // Date filter
      if (dateFilter !== 'all') {
        const now = new Date()
        let startDate = new Date()

        if (dateFilter === 'today') {
          // Today: from start of today
          startDate.setHours(0, 0, 0, 0)
        } else if (dateFilter === 'week') {
          // Week: from start of this week (Sunday)
          const dayOfWeek = now.getDay()
          startDate.setDate(now.getDate() - dayOfWeek)
          startDate.setHours(0, 0, 0, 0)
        } else if (dateFilter === 'month') {
          // Month: from start of this month
          startDate.setDate(1)
          startDate.setHours(0, 0, 0, 0)
        }

        query = query.gte('scheduled_at', startDate.toISOString())
      }

      // Search filter
      if (searchQuery) {
        // Note: This is not ideal for large datasets, but works for basic search
        // For better performance, consider full-text search or dedicated search service
      }

      // Pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Supabase error fetching visits:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        throw error
      }

      // Client search filter (client-side for now)
      let filteredData = data as Visit[]
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase()
        filteredData = filteredData.filter((visit: Visit) => 
          (visit.clients?.first_name || '').toLowerCase().includes(lowerQuery) ||
          (visit.clients?.last_name || '').toLowerCase().includes(lowerQuery) ||
          (visit.clients?.phone || '').includes(searchQuery)
        )
      }

      return { data: filteredData, count: count || 0 }
    },
    enabled: !!orgId,
  })

  const visits = visitsData?.data || []
  const totalCount = visitsData?.count || 0
  const totalPages = Math.ceil(totalCount / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)


  // Sort visits by status groups
  const statusOrder: Record<string, number> = {
    'scheduled': 0,
    'in_progress': 0,
    'completed': 1,
    'cancelled': 2,
    'no_show': 2,
  }

  const sortedVisits = [...visits].sort((a, b) => {
    const groupA = statusOrder[a.status] ?? 1
    const groupB = statusOrder[b.status] ?? 1
    
    // Sort by group first
    if (groupA !== groupB) return groupA - groupB
    
    // Within "upcoming" group (scheduled, in_progress): nearest first (ASC)
    if (groupA === 0) {
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    }
    
    // Within "completed" and "cancelled" groups: latest first (DESC)
    const dateA = new Date(a.updated_at || a.scheduled_at).getTime()
    const dateB = new Date(b.updated_at || b.scheduled_at).getTime()
    return dateB - dateA
  })

  // Group visits by status
  const scheduledVisits = sortedVisits.filter(v => v.status === 'scheduled' || v.status === 'in_progress')
  const completedVisits = sortedVisits.filter(v => v.status === 'completed')
  const cancelledVisits = sortedVisits.filter(v => v.status === 'cancelled' || v.status === 'no_show')

  const getServiceLabel = (service: string): string => {
    const serviceMap: Record<string, string> = {
      haircut: 'service.haircut',
      coloring: 'service.coloring',
      smoothing: 'service.smoothing',
      facial: 'service.facial',
      manicure: 'service.manicure',
      pedicure: 'service.pedicure',
      haircutColoring: 'service.haircutColoring',
      hairTreatment: 'service.hairTreatment',
      consultation: 'service.consultation',
      other: 'service.other',
    }
    return t(serviceMap[service] || 'service.other')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Calendar className="w-3 h-3 ml-1" />
            {t('visits.scheduled')}
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 ml-1" />
            {t('visits.completed')}
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 ml-1" />
            {t('visits.cancelled')}
          </Badge>
        )
      case 'no_show':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            {t('visits.noShow')}
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleCompleteVisit = (visit: Visit) => {
    setPaymentVisit(visit)
    setPaymentMethod('') // Reset payment method
  }

  const handleCancelVisit = async (visitId: string) => {
    if (!confirm(t('common.deleteConfirm'))) return

    try {
      const { error } = await supabase
        .from('visits')
        .update({ status: 'cancelled' })
        .eq('id', visitId)

      if (error) throw error

      toast.success(t('common.success'))
      refetch()
    } catch (error) {
      console.error('Error cancelling visit:', error)
      toast.error(t('common.error'))
    }
  }

  const handleStartVisit = async (visitId: string) => {
    try {
      const { error } = await supabase
        .from('visits')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', visitId)

      if (error) throw error

      toast.success(t('visits.startVisit') + ' ✓')
      refetch()
    } catch (error) {
      console.error('Error starting visit:', error)
      toast.error(t('common.error'))
    }
  }

  function handleVisitClick(visit: any) {
    // Открываем detail panel на всех устройствах (используем один компонент)
    setSelectedVisit(visit)
  }

  async function updateVisitStatus(visitId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('visits')
        .update({ status: newStatus })
        .eq('id', visitId)

      if (error) throw error

      toast.success('✓')
      refetch()
    } catch (error) {
      console.error('Error updating visit status:', error)
      toast.error(t('common.error'))
    }
  }

  // Show loading screen while fetching data
  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{meetingMode.t.visits}</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
            {t('common.total')}: {totalCount} {meetingMode.t.visits}
          </p>
        </div>
        {/* Desktop Buttons */}
        <div className="flex gap-2">
          <ExportButton type="visits" />
          <Button onClick={() => openModal('visit-create')} className="hidden md:flex bg-theme-primary text-white hover:opacity-90">
            <Plus className="w-4 h-4 ml-2" />
            {meetingMode.t.newVisit}
          </Button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'bg-theme-primary text-white' : 'text-gray-700 dark:text-gray-300'}
          >
            <List className="w-4 h-4 ml-2" />
            {t('visits.listView')}
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('calendar')}
            className={viewMode === 'calendar' ? 'bg-theme-primary text-white' : 'text-gray-700 dark:text-gray-300'}
          >
            <CalendarDays className="w-4 h-4 ml-2" />
            {t('visits.calendarView')}
          </Button>
        </div>
      </div>

      {/* Filters (only show in list view) */}
      {viewMode === 'list' && (
      <div className="space-y-3">
        {/* Search - Full Width on Mobile */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder={t('visits.filterByClient')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
          />
        </div>

        {/* Desktop Dropdowns */}
        <div className="hidden md:grid md:grid-cols-2 gap-4">
          {/* Date filter */}
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
              <SelectValue placeholder={t('visits.filterByDate')} />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
              <SelectItem value="all" className="text-gray-900 dark:text-white">{t('visits.all')}</SelectItem>
              <SelectItem value="today" className="text-gray-900 dark:text-white">{t('visits.today')}</SelectItem>
              <SelectItem value="week" className="text-gray-900 dark:text-white">{t('visits.week')}</SelectItem>
              <SelectItem value="month" className="text-gray-900 dark:text-white">{t('visits.month')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
              <SelectValue placeholder={t('visits.filterByStatus')} />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
              <SelectItem value="all" className="text-gray-900 dark:text-white">{t('visits.all')}</SelectItem>
              <SelectItem value="scheduled" className="text-gray-900 dark:text-white">{t('visits.scheduled')}</SelectItem>
              <SelectItem value="completed" className="text-gray-900 dark:text-white">{t('visits.completed')}</SelectItem>
              <SelectItem value="cancelled" className="text-gray-900 dark:text-white">{t('visits.cancelled')}</SelectItem>
              <SelectItem value="no_show" className="text-gray-900 dark:text-white">{t('visits.noShow')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile Horizontal Chips */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {/* Date chips */}
          {['all', 'today', 'week', 'month'].map((value) => (
            <button
              key={value}
              onClick={() => setDateFilter(value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                dateFilter === value
                  ? 'bg-theme-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t(`visits.${value}`)}
            </button>
          ))}
          
          <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />
          
          {/* Status chips */}
          {['all', 'scheduled', 'completed', 'cancelled', 'no_show'].map((value) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === value
                  ? 'bg-theme-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t(value === 'all' ? 'visits.all' : value === 'no_show' ? 'visits.noShow' : `visits.${value}`)}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {/* Desktop Table (hidden on mobile) */}
          <div className="hidden md:block bg-card rounded-2xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-muted bg-muted/30">
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{language === 'he' ? 'לקוח' : 'Клиент'}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{language === 'he' ? 'תאריך' : 'Дата'}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{language === 'he' ? 'שעה' : 'Время'}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{language === 'he' ? 'סטטוס' : 'Статус'}</th>
                  <th className="text-end py-3 px-4 font-medium text-muted-foreground">{language === 'he' ? 'מחיר' : 'Цена'}</th>
                </tr>
              </thead>
              <tbody>
                {sortedVisits.map((visit: any) => (
                  <tr
                    key={visit.id}
                    onClick={() => handleVisitClick(visit)}
                    className={`border-b border-muted/50 hover:bg-muted/30 cursor-pointer transition ${
                      visit.status === 'cancelled' ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-medium">{getClientName(visit) || '—'}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(visit.scheduled_at).toLocaleDateString(language === 'he' ? 'he-IL' : 'ru-RU')}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(visit.scheduled_at).toLocaleTimeString(language === 'he' ? 'he-IL' : 'ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          visit.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : visit.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-700'
                            : visit.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {visit.status === 'completed'
                          ? language === 'he'
                            ? 'הושלם'
                            : 'Завершён'
                          : visit.status === 'in_progress'
                          ? language === 'he'
                            ? 'בביצוע'
                            : 'В процессе'
                          : visit.status === 'scheduled'
                          ? language === 'he'
                            ? 'מתוכנן'
                            : 'Запланирован'
                          : visit.status === 'cancelled'
                          ? language === 'he'
                            ? 'בוטל'
                            : 'Отменён'
                          : visit.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-end font-medium">{visit.price ? `₪${visit.price}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (visible only on mobile) - Using VisitCard component */}
          <div className="md:hidden space-y-3">
            {sortedVisits.length > 0 ? (
              <>
                {/* Upcoming visits */}
                {scheduledVisits.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-2 py-2 bg-gray-50 dark:bg-gray-900 rounded">
                      {language === 'he' ? 'תורים קרובים' : language === 'ru' ? 'Предстоящие' : 'Upcoming'}
                    </h3>
                    {scheduledVisits.map((visit) => (
                      <VisitCard
                        key={visit.id}
                        visit={visit}
                        locale={language === 'he' ? 'he' : 'ru'}
                        isMeetingMode={meetingMode.isMeetingMode}
                        onStart={handleStartVisit}
                        onComplete={() => handleCompleteVisit(visit)}
                        onCancel={handleCancelVisit}
                        onClick={handleVisitClick}
                      />
                    ))}
                  </>
                )}
                
                {/* Completed visits */}
                {completedVisits.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-2 py-2 bg-gray-50 dark:bg-gray-900 rounded mt-4">
                      {language === 'he' ? 'הושלמו' : language === 'ru' ? 'Завершённые' : 'Completed'}
                    </h3>
                    {completedVisits.map((visit) => (
                      <VisitCard
                        key={visit.id}
                        visit={visit}
                        locale={language === 'he' ? 'he' : 'ru'}
                        isMeetingMode={meetingMode.isMeetingMode}
                        onStart={handleStartVisit}
                        onComplete={() => handleCompleteVisit(visit)}
                        onCancel={handleCancelVisit}
                        onClick={handleVisitClick}
                      />
                    ))}
                  </>
                )}
                
                {/* Cancelled visits */}
                {cancelledVisits.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-2 py-2 bg-gray-50 dark:bg-gray-900 rounded mt-4">
                      {language === 'he' ? 'בוטלו' : language === 'ru' ? 'Отменённые' : 'Cancelled'}
                    </h3>
                    <div className="space-y-3">
                      {cancelledVisits.map((visit) => (
                        <VisitCard
                          key={visit.id}
                          visit={visit}
                          locale={language === 'he' ? 'he' : 'ru'}
                          isMeetingMode={meetingMode.isMeetingMode}
                          onStart={handleStartVisit}
                          onComplete={() => handleCompleteVisit(visit)}
                          onCancel={handleCancelVisit}
                          onClick={handleVisitClick}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 mb-4">{t('visits.noVisits')}</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  variant="outline"
                >
                  {t('common.previous')}
                </Button>
                <Button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  variant="outline"
                >
                  {t('common.next')}
                </Button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {t('common.showing')} <span className="font-medium">{from}</span> {t('common.outOf')} <span className="font-medium">{to}</span> {t('common.of')}{' '}
                    <span className="font-medium">{totalCount}</span> {t('common.items')}
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <Button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      variant="outline"
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md"
                    >
                      <span className="sr-only">{t('common.previous')}</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (page <= 3) {
                        pageNum = i + 1
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = page - 2 + i
                      }
                      return (
                        <Button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          variant={page === pageNum ? "default" : "outline"}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
                            page === pageNum
                              ? 'z-10 bg-theme-primary text-white'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                    <Button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      variant="outline"
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md"
                    >
                      <span className="sr-only">{t('common.next')}</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <CalendarView
          visits={visits || []}
          onVisitClick={(visit) => handleVisitClick(visit)}
          onDateClick={(date) => {
            setSelectedDate(date)
            openModal('visit-create')
          }}
          serviceColors={serviceColors}
        />
      )}

      {/* Dialogs managed by ModalManager */}

      {/* Notify client after visit creation */}
      {newVisitNotify && (
        <TrinityBottomDrawer
          isOpen={!!newVisitNotify}
          onClose={() => setNewVisitNotify(null)}
          title={language === 'he' ? 'שלח הודעה ללקוח' : 'Уведомить клиента'}
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-400 text-center mb-4">
              {language === 'he' 
                ? 'שלח ללקוח הודעה על התור החדש' 
                : 'Отправить клиенту уведомление о визите'}
            </p>

            {newVisitNotify.clientPhone && (
              <>
                <button
                  onClick={() => {
                    const orgAddress = '' // TODO: подтянуть из org settings
                    const msg = language === 'he'
                      ? `שלום ${newVisitNotify.clientName}, נקבע לך תור ל-${newVisitNotify.date} בשעה ${newVisitNotify.time}${orgAddress ? `. כתובת: ${orgAddress}` : ''}`
                      : `Здравствуйте ${newVisitNotify.clientName}, для вас забронирован визит на ${newVisitNotify.date} в ${newVisitNotify.time}${orgAddress ? `. Адрес: ${orgAddress}` : ''}`
                    window.open(
                      `https://wa.me/${newVisitNotify.clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`,
                      '_blank'
                    )
                    setNewVisitNotify(null)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 text-white text-sm font-semibold"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </button>

                <button
                  onClick={() => {
                    toast.info(language === 'he' ? 'SMS בקרוב' : 'SMS скоро')
                    setNewVisitNotify(null)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-semibold"
                >
                  <MessageSquare size={16} />
                  SMS
                </button>
              </>
            )}

            <button
              onClick={() => setNewVisitNotify(null)}
              className="w-full py-3 rounded-2xl bg-slate-100 text-slate-500 text-sm font-medium"
            >
              {language === 'he' ? 'דלג' : 'Пропустить'}
            </button>
          </div>
        </TrinityBottomDrawer>
      )}

      {/* Payment flow after visit completion */}
      {paymentVisit && (
        <TrinityBottomDrawer
          isOpen={!!paymentVisit}
          onClose={() => setPaymentVisit(null)}
          title={language === 'he' ? 'תשלום' : 'Оплата'}
        >
          <div className="space-y-4">
            {/* Сумма */}
            <div className="text-center py-4">
              <p className="text-sm text-slate-400">{language === 'he' ? 'סכום לתשלום' : 'К оплате'}</p>
              <p className="text-4xl font-bold mt-1">₪{paymentVisit.price || 0}</p>
            </div>

            {/* Способы оплаты */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'cash', label: language === 'he' ? 'מזומן' : 'Наличные', emoji: '💵' },
                { key: 'card', label: language === 'he' ? 'כרטיס' : 'Карта', emoji: '💳' },
                { key: 'transfer', label: language === 'he' ? 'העברה' : 'Перевод', emoji: '🏦' },
                { key: 'bit', label: 'Bit', emoji: '📱' },
              ].map(m => (
                <button
                  key={m.key}
                  onClick={() => setPaymentMethod(m.key)}
                  className={`py-3 rounded-2xl text-sm font-medium transition ${
                    paymentMethod === m.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>

            {/* Кнопки */}
            <button
              onClick={async () => {
                await updateVisitStatus(paymentVisit.id, 'completed')
                // TODO: создать запись платежа
                
                // Открыть окно квитанции
                const clientData = allClients?.find((c: any) => c.id === paymentVisit.client_id)
                setReceiptVisit({
                  ...paymentVisit,
                  client_phone: clientData?.phone,
                  clientName: clientData ? `${clientData.first_name} ${clientData.last_name}`.trim() : '',
                })
                setPaymentVisit(null)
              }}
              disabled={!paymentMethod}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              {language === 'he' ? 'אשר תשלום' : 'Подтвердить оплату'}
            </button>

            <button
              onClick={() => setPaymentVisit(null)}
              className="w-full py-3 rounded-2xl bg-slate-100 text-slate-500 text-sm font-medium"
            >
              {language === 'he' ? 'צא' : 'Выйти'}
            </button>
          </div>
        </TrinityBottomDrawer>
      )}

      {/* Receipt and next visit after payment */}
      {receiptVisit && (
        <TrinityBottomDrawer
          isOpen={!!receiptVisit}
          onClose={() => setReceiptVisit(null)}
          title={language === 'he' ? 'הביקור הושלם' : 'Визит завершён'}
        >
          <div className="space-y-4">
            {/* Успех */}
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <p className="text-lg font-bold">₪{receiptVisit.price || 0}</p>
              <p className="text-sm text-slate-400">
                {language === 'he' ? 'התשלום התקבל' : 'Оплата получена'}
              </p>
            </div>

            {/* Отправить квитанцию */}
            <p className="text-xs text-slate-400 text-center">
              {language === 'he' ? 'שלח קבלה' : 'Отправить квитанцию'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const phone = receiptVisit.client_phone || ''
                  const msg = language === 'he'
                    ? `קבלה: תשלום ₪${receiptVisit.price} התקבל. תודה!`
                    : `Квитанция: оплата ₪${receiptVisit.price} получена. Спасибо!`
                  window.open(
                    `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`,
                    '_blank'
                  )
                }}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-medium"
              >
                <MessageCircle size={16} />
                WhatsApp
              </button>

              <button
                onClick={() => toast.info(language === 'he' ? 'בקרוב' : 'Скоро')}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 text-white text-sm font-medium"
              >
                <Mail size={16} />
                Email
              </button>

              <button
                onClick={() => toast.info(language === 'he' ? 'SMS בקרוב' : 'SMS скоро')}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-500 text-white text-sm font-medium"
              >
                <MessageSquare size={16} />
                SMS
              </button>

              <button
                onClick={() => toast.success(language === 'he' ? 'נשמר' : 'Сохранено')}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-200 text-slate-600 text-sm font-medium"
              >
                <Download size={16} />
                {language === 'he' ? 'שמור' : 'Сохранить'}
              </button>
            </div>

            {/* Следующий визит */}
            <button
              onClick={() => {
                const nextDate = new Date()
                nextDate.setDate(nextDate.getDate() + 14)
                setReceiptVisit(null)
                
                // Открыть форму создания визита с prefill
                setCreateVisitPrefill({
                  clientId: receiptVisit.client_id,
                  clientName: receiptVisit.clientName,
                  date: nextDate.toISOString().split('T')[0],
                })
                openModal('visit-create')
              }}
              className="w-full py-3.5 rounded-2xl border-2 border-blue-600 text-blue-600 text-sm font-semibold"
            >
              {language === 'he' ? 'תור הבא (+2 שבועות)' : 'Следующий визит (+2 недели)'}
            </button>

            <button
              onClick={() => setReceiptVisit(null)}
              className="w-full py-3 rounded-2xl bg-slate-100 text-slate-500 text-sm font-medium"
            >
              {language === 'he' ? 'צא' : 'Выйти'}
            </button>
          </div>
        </TrinityBottomDrawer>
      )}

      {/* Mobile FAB (Floating Action Button) */}
      <button
        onClick={() => openModal('visit-create')}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-theme-primary text-white rounded-full shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all z-50"
        aria-label={meetingMode.t.newVisit}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Visit Detail Modal - for all devices */}
      {selectedVisit && console.log('selectedVisit:', selectedVisit)}
      <VisitDetailModal
        visit={selectedVisit}
        isOpen={!!selectedVisit}
        onClose={() => setSelectedVisit(null)}
        locale={language === 'he' ? 'he' : 'ru'}
        clientName={selectedVisit ? getClientName(selectedVisit) : ''}
        clientPhone={selectedVisit ? getClientPhone(selectedVisit) : ''}
        clientEmail={selectedVisit ? getClientEmail(selectedVisit) : ''}
        serviceName={selectedVisit ? getServiceName(selectedVisit) : ''}
        onStart={() => {
          if (selectedVisit) {
            updateVisitStatus(selectedVisit.id, 'in_progress')
            setSelectedVisit(null)
          }
        }}
        onComplete={() => {
          if (selectedVisit) {
            handleCompleteVisit(selectedVisit)
            setSelectedVisit(null)
          }
        }}
        onCancel={() => {
          if (selectedVisit) {
            updateVisitStatus(selectedVisit.id, 'cancelled')
            setSelectedVisit(null)
          }
        }}
        onEdit={() => {
          if (selectedVisit) {
            openModal('edit-visit', { visitId: selectedVisit.id, visit: selectedVisit })
            setSelectedVisit(null)
          }
        }}
        lastVisitDate={selectedVisit ? getLastVisitDate(selectedVisit) : ''}
        onShowHistory={() => {
          // TODO: implement history
          setSelectedVisit(null)
        }}
      />
    </div>
  )
}

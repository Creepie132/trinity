'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, CheckCircle, XCircle, Calendar, Clock, List, CalendarDays, Play } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useFeatures } from '@/hooks/useFeatures'
import { useLanguage } from '@/contexts/LanguageContext'
import { useQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { CreateVisitDialog } from '@/components/visits/CreateVisitDialog'
import { CompleteVisitPaymentDialog } from '@/components/visits/CompleteVisitPaymentDialog'
import { CalendarView } from '@/components/visits/CalendarView'
import { VisitCard } from '@/components/visits/VisitCard'
import { ActiveVisitCard } from '@/components/visits/ActiveVisitCard'
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

export default function VisitsPage() {
  const router = useRouter()
  const features = useFeatures()
  const { t } = useLanguage()
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [serviceColors, setServiceColors] = useState<Record<string, string>>({})

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
        .select('settings')
        .eq('id', orgId)
        .single()
        .then(({ data }) => {
          if (data?.settings?.serviceColors) {
            setServiceColors(data.settings.serviceColors)
          }
        })
    }
  }, [orgId])

  // Fetch visits
  const { data: visits = [], isLoading, refetch } = useQuery({
    queryKey: ['visits', orgId, dateFilter, statusFilter, searchQuery],
    queryFn: async () => {
      if (!orgId) return []

      let query = supabase
        .from('visits')
        .select(`
          *,
          clients (
            first_name,
            last_name,
            phone,
            email
          )
        `)
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
          startDate.setHours(0, 0, 0, 0)
        } else if (dateFilter === 'week') {
          startDate.setDate(now.getDate() - 7)
        } else if (dateFilter === 'month') {
          startDate.setMonth(now.getMonth() - 1)
        }

        query = query.gte('scheduled_at', startDate.toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      // Client search filter
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase()
        return data.filter((visit: Visit) => 
          (visit.clients?.first_name || '').toLowerCase().includes(lowerQuery) ||
          (visit.clients?.last_name || '').toLowerCase().includes(lowerQuery) ||
          (visit.clients?.phone || '').includes(searchQuery)
        )
      }

      return data as Visit[]
    },
    enabled: !!orgId,
  })

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
    setSelectedVisit(visit)
    setPaymentDialogOpen(true)
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

  // Show loading screen while fetching data
  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('visits.title')}</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
            {t('common.total')}: {visits.length} {t('visits.title')}
          </p>
        </div>
        {/* Desktop Add Button */}
        <Button onClick={() => setAddDialogOpen(true)} className="hidden md:flex bg-theme-primary text-white hover:opacity-90">
          <Plus className="w-4 h-4 ml-2" />
          {t('visits.addNew')}
        </Button>
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
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {visits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="text-right text-gray-700 dark:text-gray-300">{t('visits.client')}</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-gray-300">{t('visits.service')}</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-gray-300">{t('visits.date')}</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-gray-300">{t('visits.time')}</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-gray-300">{t('visits.duration')}</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-gray-300">{t('visits.price')}</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-gray-300">{t('visits.status')}</TableHead>
                  <TableHead className="text-left text-gray-700 dark:text-gray-300">{t('visits.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((visit) => {
                  // Render ActiveVisitCard for in_progress visits
                  if (visit.status === 'in_progress') {
                    return (
                      <TableRow key={visit.id} className="bg-amber-50 dark:bg-amber-900/10">
                        <TableCell colSpan={8} className="p-4">
                          <div className="border-2 border-amber-400 dark:border-amber-600 rounded-lg">
                            <ActiveVisitCard 
                              visit={visit} 
                              onFinish={() => handleCompleteVisit(visit)} 
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  }
                  
                  // Regular row for other statuses
                  return (
                    <TableRow key={visit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                        {visit.clients?.first_name} {visit.clients?.last_name}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">{getServiceLabel(visit.service_type)}</TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {format(new Date(visit.scheduled_at), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" />
                          {format(new Date(visit.scheduled_at), 'HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">{visit.duration_minutes || 0} דק׳</TableCell>
                      <TableCell className="font-bold text-theme-primary">₪{visit.price || 0}</TableCell>
                      <TableCell>{getStatusBadge(visit.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-start">
                          {visit.status === 'scheduled' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleStartVisit(visit.id)}
                                className="bg-green-600 text-white hover:bg-green-700"
                              >
                                <Play className="w-3 h-3 ml-1" />
                                {t('visits.startVisit')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCompleteVisit(visit)}
                                className="bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                              >
                                <CheckCircle className="w-3 h-3 ml-1" />
                                {t('visits.complete')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelVisit(visit.id)}
                                className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30"
                              >
                                <XCircle className="w-3 h-3 ml-1" />
                                {t('visits.cancel')}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">{t('visits.noVisits')}</p>
            </div>
          )}
          </div>

          {/* Mobile Cards (visible only on mobile) - Using VisitCard component */}
          <div className="md:hidden space-y-3">
            {visits.length > 0 ? (
              visits.map((visit) => (
                <VisitCard
                  key={visit.id}
                  visit={visit}
                  onComplete={handleCompleteVisit}
                />
              ))
            ) : (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 mb-4">{t('visits.noVisits')}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <CalendarView
          visits={visits || []}
          onVisitClick={(visit) => {
            setSelectedVisit(visit as any)
            setPaymentDialogOpen(true)
          }}
          onDateClick={(date) => {
            setSelectedDate(date)
            setAddDialogOpen(true)
          }}
          serviceColors={serviceColors}
        />
      )}

      {/* Dialogs */}
      <CreateVisitDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen}
        preselectedDate={selectedDate}
      />
      <CompleteVisitPaymentDialog 
        visit={selectedVisit} 
        open={paymentDialogOpen} 
        onOpenChange={setPaymentDialogOpen} 
      />

      {/* Mobile FAB (Floating Action Button) */}
      <button
        onClick={() => setAddDialogOpen(true)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-theme-primary text-white rounded-full shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all z-50"
        aria-label={t('visits.addNew')}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
}

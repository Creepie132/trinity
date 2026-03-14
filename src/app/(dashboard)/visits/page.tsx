'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus, Search, Calendar, CalendarDays, List,
  ChevronDown, ChevronUp, Clock, TrendingUp,
  Play, CheckCircle, X, Pencil
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/contexts/BranchContext'
import { useFeatures } from '@/hooks/useFeatures'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMeetingMode } from '@/hooks/useMeetingMode'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useModalStore } from '@/store/useModalStore'
import { CalendarView } from '@/components/visits/CalendarView'
import { VisitCard } from '@/components/visits/VisitCard'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'
import { VisitDetailModal } from '@/components/visits/VisitDetailModal'
import {
  MessageCircle, MessageSquare, CheckCircle2, Mail, Download
} from 'lucide-react'
import { toast } from 'sonner'
import { Visit } from '@/types/visits'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ExportButton } from '@/components/ExportButton'

// ─── helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function avatarColor(status: string): string {
  if (status === 'in_progress') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
  if (status === 'cancelled' || status === 'no_show') return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
}

function statusBadge(status: string, lang: string) {
  const map: Record<string, { ru: string; he: string; cls: string }> = {
    scheduled:   { ru: 'Запланирован', he: 'מתוכנן',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    in_progress: { ru: 'В процессе',   he: 'בתהליך',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    completed:   { ru: 'Завершён',     he: 'הושלם',   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    cancelled:   { ru: 'Отменён',      he: 'בוטל',    cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
    no_show:     { ru: 'Не пришёл',    he: 'לא הגיע', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
  }
  const s = map[status] ?? { ru: status, he: status, cls: 'bg-slate-100 text-slate-500' }
  return { label: lang === 'he' ? s.he : s.ru, cls: s.cls }
}

const DATE_FILTERS = ['today', 'week', 'month', 'all'] as const
const STATUS_FILTERS = ['all', 'scheduled', 'completed', 'cancelled'] as const
const pageSize = 30

// ─── component ──────────────────────────────────────────────────────────────

export default function VisitsPage() {
  const router = useRouter()
  const features = useFeatures()
  const { t, language } = useLanguage()
  const meetingMode = useMeetingMode()
  const { orgId: authOrgId } = useAuth()
  const { activeOrgId } = useBranch()
  const orgId = activeOrgId || authOrgId
  const supabase = createSupabaseBrowserClient()
  const queryClient = useQueryClient()

  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null)
  const { openModal } = useModalStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('week')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [cancelledOpen, setCancelledOpen] = useState(false)
  const [serviceColors, setServiceColors] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [allClients, setAllClients] = useState<any[]>([])
  const [newVisitNotify, setNewVisitNotify] = useState<any>(null)
  const [receiptVisit, setReceiptVisit] = useState<any>(null)
  const [createVisitPrefill, setCreateVisitPrefill] = useState<any>(null)

  const loc = language === 'he' ? 'he-IL' : 'ru-RU'
  const isHe = language === 'he'

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then(setAllClients)
      .catch(console.error)
  }, [])

  function getClientName(visit: any): string {
    if (visit.clients?.first_name || visit.clients?.last_name) {
      return `${visit.clients.first_name || ''} ${visit.clients.last_name || ''}`.trim()
    }
    const client = allClients?.find((c: any) => c.id === visit.client_id)
    if (client) return `${client.first_name || ''} ${client.last_name || ''}`.trim()
    return ''
  }
  function getClientPhone(visit: any): string {
    return visit.clients?.phone || allClients.find((c: any) => c.id === visit.client_id)?.phone || ''
  }
  function getClientEmail(visit: any): string {
    return visit.clients?.email || allClients.find((c: any) => c.id === visit.client_id)?.email || ''
  }
  function getServiceName(visit: any): string {
    if (visit?.services) return isHe ? visit.services.name : (visit.services.name_ru || visit.services.name)
    return ''
  }
  function getServiceDuration(visit: any): number {
    return visit?.services?.duration_minutes || visit?.duration_minutes || 0
  }
  function getLastVisitDate(visit: any): string {
    if (!visit?.client_id || !visitsData?.data) return ''
    const clientVisits = visitsData.data
      .filter((v: any) => v.client_id === visit.client_id && v.id !== visit.id && v.status === 'completed')
      .sort((a: any, b: any) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
    if (!clientVisits.length) return ''
    return new Date(clientVisits[0].scheduled_at).toLocaleDateString(loc)
  }

  useEffect(() => {
    if (!features.isLoading) {
      if (!features.isActive) router.push('/blocked')
      else if (!features.hasVisits) router.push('/dashboard')
    }
  }, [features.isActive, features.hasVisits, features.isLoading, router])

  useEffect(() => {
    if (orgId) {
      supabase.from('organizations').select('features').eq('id', orgId).single().then(({ data }) => {
        if (data?.features?.serviceColors) setServiceColors(data.features.serviceColors)
      })
    }
  }, [orgId])

  useEffect(() => { setPage(1) }, [dateFilter, statusFilter, searchQuery])

  // ── fetch ──────────────────────────────────────────────────────────────────
  const { data: visitsData, isLoading, refetch } = useQuery({
    queryKey: ['visits', orgId, dateFilter, statusFilter, searchQuery, page],
    queryFn: async () => {
      if (!orgId) return { data: [], count: 0 }

      let query = supabase
        .from('visits')
        .select(`*, status, clients(first_name,last_name,phone,email), services(id,name,name_ru,duration_minutes,price), visit_services(id,visit_id,service_id,service_name,service_name_ru,price,duration_minutes,created_at)`, { count: 'exact' })
        .eq('org_id', orgId)
        .order('scheduled_at', { ascending: false })

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)

      if (dateFilter !== 'all') {
        const now = new Date()
        const start = new Date()
        if (dateFilter === 'today') { start.setHours(0, 0, 0, 0) }
        else if (dateFilter === 'week') { start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0) }
        else if (dateFilter === 'month') { start.setDate(1); start.setHours(0, 0, 0, 0) }
        query = query.gte('scheduled_at', start.toISOString())
      }

      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1)

      const { data, error, count } = await query
      if (error) throw error

      let filtered = data as Visit[]
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        filtered = filtered.filter((v: Visit) =>
          (v.clients?.first_name || '').toLowerCase().includes(q) ||
          (v.clients?.last_name || '').toLowerCase().includes(q) ||
          (v.clients?.phone || '').includes(searchQuery)
        )
      }
      return { data: filtered, count: count || 0 }
    },
    enabled: !!orgId,
  })

  const visits = visitsData?.data || []
  const totalCount = visitsData?.count || 0
  const totalPages = Math.ceil(totalCount / pageSize)
  const fromItem = (page - 1) * pageSize + 1
  const toItem = Math.min(page * pageSize, totalCount)

  // ── derived data ──────────────────────────────────────────────────────────

  const statusOrder: Record<string, number> = { scheduled: 0, in_progress: 0, completed: 1, cancelled: 2, no_show: 2 }
  const sortedVisits = useMemo(() => [...visits].sort((a, b) => {
    const ga = statusOrder[a.status] ?? 1
    const gb = statusOrder[b.status] ?? 1
    if (ga !== gb) return ga - gb
    if (ga === 0) return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    return new Date(b.updated_at || b.scheduled_at).getTime() - new Date(a.updated_at || a.scheduled_at).getTime()
  }), [visits])

  const activeVisits    = sortedVisits.filter(v => v.status === 'scheduled' || v.status === 'in_progress')
  const completedVisits = sortedVisits.filter(v => v.status === 'completed')
  const cancelledVisits = sortedVisits.filter(v => v.status === 'cancelled' || v.status === 'no_show')

  // ── stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const completed = visits.filter(v => v.status === 'completed')
    const revenue = completed.reduce((s, v) => s + (v.price || 0), 0)
    const cancelledCount = visits.filter(v => v.status === 'cancelled' || v.status === 'no_show').length
    const activeCount = visits.filter(v => v.status === 'scheduled' || v.status === 'in_progress').length
    return { total: visits.length, completed: completed.length, revenue, cancelledCount, activeCount }
  }, [visits])

  // ── next upcoming visit ───────────────────────────────────────────────────

  const nextVisit = useMemo(() => {
    const now = Date.now()
    return activeVisits
      .filter(v => new Date(v.scheduled_at).getTime() >= now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0] || null
  }, [activeVisits])

  function minutesUntil(dt: string): number {
    return Math.round((new Date(dt).getTime() - Date.now()) / 60000)
  }

  // ── actions ────────────────────────────────────────────────────────────────

  async function updateVisitStatus(visitId: string, newStatus: string) {
    try {
      const { error } = await supabase.from('visits').update({ status: newStatus }).eq('id', visitId)
      if (error) throw error
      toast.success('✓')
      refetch()
    } catch { toast.error(t('common.error')) }
  }

  const handleCompleteVisit = (visit: Visit) => {
    if (!features.paymentsEnabled) { updateVisitStatus(visit.id, 'completed'); return }
    const clientData = allClients?.find((c: any) => c.id === visit.client_id)
    const preloadedItems = ((visit as any).visit_services || []).map((vs: any) => ({
      id: vs.id,
      name: isHe ? (vs.service_name || vs.service_name_ru) : (vs.service_name_ru || vs.service_name),
      price: vs.price || 0,
    }))
    openModal('client-sale', {
      client: clientData || { id: visit.client_id, first_name: getClientName(visit), last_name: '', phone: getClientPhone(visit), email: getClientEmail(visit) },
      locale: isHe ? 'he' : 'ru',
      visitId: visit.id,
      preloadedItems,
    })
  }

  const handleCancelVisit = async (visitId: string) => {
    if (!confirm(t('common.deleteConfirm'))) return
    try {
      const { error } = await supabase.from('visits').update({ status: 'cancelled' }).eq('id', visitId)
      if (error) throw error
      toast.success(t('common.success'))
      refetch()
    } catch { toast.error(t('common.error')) }
  }

  const handleStartVisit = async (visitId: string) => {
    try {
      const { error } = await supabase.from('visits').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', visitId)
      if (error) throw error
      toast.success(t('visits.startVisit') + ' ✓')
      refetch()
    } catch { toast.error(t('common.error')) }
  }

  if (isLoading) return <LoadingScreen />

  // ── label helpers ──────────────────────────────────────────────────────────

  const dateFilterLabel: Record<string, string> = {
    today: isHe ? 'היום' : 'Сегодня',
    week:  isHe ? 'שבוע'  : 'Неделя',
    month: isHe ? 'חודש'  : 'Месяц',
    all:   isHe ? 'הכל'   : 'Всё',
  }
  const statusFilterLabel: Record<string, string> = {
    all:       isHe ? 'הכל'      : 'Все статусы',
    scheduled: isHe ? 'מתוכנן'   : 'Запланированные',
    completed: isHe ? 'הושלמו'   : 'Завершённые',
    cancelled: isHe ? 'בוטלו'    : 'Отменённые',
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 min-h-screen pb-20">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {meetingMode.t.visits}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {totalCount} {isHe ? 'תורים' : 'визитов'}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton type="visits" />
          <Button
            onClick={() => openModal('visit-create')}
            className="hidden md:flex bg-theme-primary text-white hover:opacity-90"
          >
            <Plus className="w-4 h-4 ml-2" />
            {meetingMode.t.newVisit}
          </Button>
        </div>
      </div>

      {/* ── View toggle ── */}
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

      {/* ── Calendar view ── */}
      {viewMode === 'calendar' && (
        <CalendarView
          visits={visits || []}
          onVisitClick={(visit) => setSelectedVisit(visit)}
          onDateClick={(date) => { setSelectedVisit(null); openModal('visit-create') }}
          serviceColors={serviceColors}
        />
      )}

      {/* ── List view ── */}
      {viewMode === 'list' && (
        <>
          {/* ─ Stats bar ─ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: isHe ? 'סה"כ' : 'Всего',
                value: stats.total,
                sub: `${stats.activeCount} ${isHe ? 'פעילים' : 'активных'}`,
                icon: <Calendar className="w-4 h-4" />,
              },
              {
                label: isHe ? 'הושלמו' : 'Завершено',
                value: stats.completed,
                sub: `${stats.cancelledCount} ${isHe ? 'בוטלו' : 'отменено'}`,
                icon: <CheckCircle className="w-4 h-4" />,
              },
              {
                label: isHe ? 'הכנסות' : 'Выручка',
                value: `₪${stats.revenue.toLocaleString()}`,
                sub: isHe ? 'מהושלמים' : 'от завершённых',
                icon: <TrendingUp className="w-4 h-4" />,
              },
              {
                label: isHe ? 'ממוצע' : 'Средний чек',
                value: stats.completed > 0 ? `₪${Math.round(stats.revenue / stats.completed)}` : '—',
                sub: isHe ? 'לביקור' : 'за визит',
                icon: <TrendingUp className="w-4 h-4" />,
              },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 md:p-4">
                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mb-1">
                  {s.icon}
                  <span className="text-xs">{s.label}</span>
                </div>
                <p className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">{s.value}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* ─ Next visit highlight ─ */}
          {nextVisit && (() => {
            const name = getClientName(nextVisit)
            const svc  = getServiceName(nextVisit)
            const dur  = getServiceDuration(nextVisit)
            const mins = minutesUntil(nextVisit.scheduled_at)
            const time = new Date(nextVisit.scheduled_at).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
            return (
              <div
                className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
                onClick={() => setSelectedVisit(nextVisit)}
              >
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 min-w-[58px]">{time}</div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${avatarColor(nextVisit.status)}`}>
                  {getInitials(name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {svc}{dur > 0 ? ` · ${dur} ${isHe ? "ד'" : 'мин'}` : ''}{nextVisit.price ? ` · ₪${nextVisit.price}` : ''}
                  </p>
                </div>
                <span className="text-xs bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-full px-3 py-1 flex-shrink-0">
                  {mins <= 0
                    ? (isHe ? 'עכשיו' : 'Сейчас')
                    : mins < 60
                    ? `${isHe ? 'בעוד' : 'через'} ${mins} ${isHe ? 'ד׳' : 'мин'}`
                    : `${isHe ? 'בעוד' : 'через'} ${Math.round(mins / 60)} ${isHe ? 'ש׳' : 'ч'}`}
                </span>
              </div>
            )
          })()}

          {/* ─ Filters ─ */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={isHe ? 'חיפוש לפי לקוח...' : 'Поиск по клиенту или телефону...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {DATE_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setDateFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    dateFilter === f
                      ? 'bg-theme-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {dateFilterLabel[f]}
                </button>
              ))}
              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === f
                      ? 'bg-theme-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {statusFilterLabel[f]}
                </button>
              ))}
            </div>
          </div>

          {/* ─ Desktop table ─ */}
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">

            {/* Active / Upcoming */}
            {activeVisits.length > 0 && (
              <>
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {isHe ? 'פעיל ומתוכנן' : 'Активные и запланированные'} · {activeVisits.length}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="text-start py-2.5 px-4 font-medium text-gray-400 dark:text-gray-500 text-xs">{isHe ? 'לקוח' : 'Клиент'}</th>
                      <th className="text-start py-2.5 px-4 font-medium text-gray-400 dark:text-gray-500 text-xs">{isHe ? 'תאריך · שעה' : 'Дата · Время'}</th>
                      <th className="text-start py-2.5 px-4 font-medium text-gray-400 dark:text-gray-500 text-xs">{isHe ? 'שירות' : 'Услуга'}</th>
                      <th className="text-start py-2.5 px-4 font-medium text-gray-400 dark:text-gray-500 text-xs">{isHe ? 'סטטוס' : 'Статус'}</th>
                      <th className="text-end py-2.5 px-4 font-medium text-gray-400 dark:text-gray-500 text-xs">{isHe ? 'מחיר' : 'Цена'}</th>
                      <th className="py-2.5 px-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {activeVisits.map((visit) => {
                      const name = getClientName(visit)
                      const svc  = getServiceName(visit)
                      const dur  = getServiceDuration(visit)
                      const { label: stLabel, cls: stCls } = statusBadge(visit.status, language)
                      return (
                        <tr
                          key={visit.id}
                          onClick={() => setSelectedVisit(visit)}
                          className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition group"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${avatarColor(visit.status)}`}>
                                {getInitials(name)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{name || '—'}</p>
                                {getClientPhone(visit) && (
                                  <p className="text-xs text-gray-400">{getClientPhone(visit)}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-gray-700 dark:text-gray-300">
                              {new Date(visit.scheduled_at).toLocaleDateString(loc)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(visit.scheduled_at).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            {svc && (
                              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                {svc}
                              </span>
                            )}
                            {dur > 0 && (
                              <span className="ml-2 text-xs text-gray-400">{dur} {isHe ? "ד'" : 'мин'}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${stCls}`}>{stLabel}</span>
                          </td>
                          <td className="py-3 px-4 text-end font-medium text-gray-900 dark:text-gray-100">
                            {visit.price ? `₪${visit.price}` : '—'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              {visit.status === 'scheduled' && (
                                <button
                                  onClick={() => handleStartVisit(visit.id)}
                                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200 transition"
                                >
                                  {isHe ? 'התחל' : 'Начать'}
                                </button>
                              )}
                              <button
                                onClick={() => handleCompleteVisit(visit)}
                                className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 transition"
                              >
                                {isHe ? 'סיים' : 'Завершить'}
                              </button>
                              <button
                                onClick={() => handleCancelVisit(visit.id)}
                                className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 transition"
                              >
                                {isHe ? 'בטל' : 'Отменить'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </>
            )}

            {/* Completed */}
            {completedVisits.length > 0 && (
              <>
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {isHe ? 'הושלמו' : 'Завершённые'} · {completedVisits.length}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {completedVisits.map((visit) => {
                      const name = getClientName(visit)
                      const svc  = getServiceName(visit)
                      const dur  = getServiceDuration(visit)
                      return (
                        <tr
                          key={visit.id}
                          onClick={() => setSelectedVisit(visit)}
                          className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${avatarColor(visit.status)}`}>
                                {getInitials(name)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{name || '—'}</p>
                                {getClientPhone(visit) && <p className="text-xs text-gray-400">{getClientPhone(visit)}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-gray-700 dark:text-gray-300">{new Date(visit.scheduled_at).toLocaleDateString(loc)}</p>
                            <p className="text-xs text-gray-400">{new Date(visit.scheduled_at).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}</p>
                          </td>
                          <td className="py-3 px-4">
                            {svc && <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{svc}</span>}
                            {dur > 0 && <span className="ml-2 text-xs text-gray-400">{dur} {isHe ? "ד'" : 'мин'}</span>}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              {isHe ? 'הושלם' : 'Завершён'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-end font-medium text-gray-900 dark:text-gray-100">
                            {visit.price ? `₪${visit.price}` : '—'}
                          </td>
                          <td className="py-3 px-4" />
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </>
            )}

            {/* Cancelled — collapsible */}
            {cancelledVisits.length > 0 && (
              <>
                <button
                  onClick={() => setCancelledOpen((v) => !v)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 flex-1 text-start">
                    {isHe ? 'בוטלו' : 'Отменённые'} · {cancelledVisits.length}
                  </span>
                  {cancelledOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {cancelledOpen && (
                  <table className="w-full text-sm">
                    <tbody>
                      {cancelledVisits.map((visit) => {
                        const name = getClientName(visit)
                        const svc  = getServiceName(visit)
                        return (
                          <tr
                            key={visit.id}
                            onClick={() => setSelectedVisit(visit)}
                            className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition opacity-50"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-500">
                                  {getInitials(name)}
                                </div>
                                <p className="font-medium text-gray-700 dark:text-gray-300">{name || '—'}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                              {new Date(visit.scheduled_at).toLocaleDateString(loc)} · {new Date(visit.scheduled_at).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                              {svc && <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">{svc}</span>}
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500">
                                {isHe ? 'בוטל' : 'Отменён'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-end text-gray-500">
                              {visit.price ? `₪${visit.price}` : '—'}
                            </td>
                            <td className="py-3 px-4" />
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {/* Empty state */}
            {!activeVisits.length && !completedVisits.length && !cancelledVisits.length && (
              <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>{t('visits.noVisits')}</p>
              </div>
            )}
          </div>

          {/* ─ Mobile cards ─ */}
          <div className="md:hidden space-y-3">
            {activeVisits.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {isHe ? 'פעיל ומתוכנן' : 'Активные и запланированные'}
                  </h3>
                </div>
                {activeVisits.map((visit) => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    locale={isHe ? 'he' : 'ru'}
                    isMeetingMode={meetingMode.isMeetingMode}
                    onStart={handleStartVisit}
                    onComplete={() => handleCompleteVisit(visit)}
                    onCancel={handleCancelVisit}
                    onClick={setSelectedVisit}
                  />
                ))}
              </>
            )}
            {completedVisits.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-1 mt-4">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {isHe ? 'הושלמו' : 'Завершённые'}
                  </h3>
                </div>
                {completedVisits.map((visit) => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    locale={isHe ? 'he' : 'ru'}
                    isMeetingMode={meetingMode.isMeetingMode}
                    onStart={handleStartVisit}
                    onComplete={() => handleCompleteVisit(visit)}
                    onCancel={handleCancelVisit}
                    onClick={setSelectedVisit}
                  />
                ))}
              </>
            )}
            {cancelledVisits.length > 0 && (
              <>
                <button
                  onClick={() => setCancelledOpen((v) => !v)}
                  className="flex items-center gap-2 px-1 mt-4 w-full"
                >
                  <span className="w-2 h-2 rounded-full bg-gray-300" />
                  <h3 className="text-xs font-medium text-gray-400">{isHe ? 'בוטלו' : 'Отменённые'} · {cancelledVisits.length}</h3>
                  {cancelledOpen ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                </button>
                {cancelledOpen && cancelledVisits.map((visit) => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    locale={isHe ? 'he' : 'ru'}
                    isMeetingMode={meetingMode.isMeetingMode}
                    onStart={handleStartVisit}
                    onComplete={() => handleCompleteVisit(visit)}
                    onCancel={handleCancelVisit}
                    onClick={setSelectedVisit}
                  />
                ))}
              </>
            )}
            {!activeVisits.length && !completedVisits.length && !cancelledVisits.length && (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-gray-400 dark:text-gray-500">{t('visits.noVisits')}</p>
              </div>
            )}
          </div>

          {/* ─ Pagination ─ */}
          {totalCount > pageSize && (
            <div className="flex items-center justify-between px-2 py-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {fromItem}–{toItem} {isHe ? 'מתוך' : 'из'} {totalCount}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  {isHe ? '‹' : '‹'}
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i
                  return (
                    <Button
                      key={p}
                      variant={page === p ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(p)}
                      className={page === p ? 'bg-theme-primary text-white' : ''}
                    >
                      {p}
                    </Button>
                  )
                })}
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                  ›
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Mobile FAB ── */}
      <button
        onClick={() => openModal('visit-create')}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-theme-primary text-white rounded-full shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all z-50"
        aria-label={meetingMode.t.newVisit}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* ── Notify drawer ── */}
      {newVisitNotify && (
        <TrinityBottomDrawer
          isOpen={!!newVisitNotify}
          onClose={() => setNewVisitNotify(null)}
          title={isHe ? 'שלח הודעה ללקוח' : 'Уведомить клиента'}
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-400 text-center mb-4">
              {isHe ? 'שלח ללקוח הודעה על התור החדש' : 'Отправить клиенту уведомление о визите'}
            </p>
            {newVisitNotify.clientPhone && (
              <>
                <button
                  onClick={() => {
                    const msg = isHe
                      ? `שלום ${newVisitNotify.clientName}, נקבע לך תור ל-${newVisitNotify.date} בשעה ${newVisitNotify.time}`
                      : `Здравствуйте ${newVisitNotify.clientName}, для вас забронирован визит на ${newVisitNotify.date} в ${newVisitNotify.time}`
                    window.open(`https://wa.me/${newVisitNotify.clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
                    setNewVisitNotify(null)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 text-white text-sm font-semibold"
                >
                  <MessageCircle size={16} />WhatsApp
                </button>
                <button
                  onClick={() => { toast.info(isHe ? 'SMS בקרוב' : 'SMS скоро'); setNewVisitNotify(null) }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-semibold"
                >
                  <MessageSquare size={16} />SMS
                </button>
              </>
            )}
            <button onClick={() => setNewVisitNotify(null)} className="w-full py-3 rounded-2xl bg-slate-100 text-slate-500 text-sm font-medium">
              {isHe ? 'דלג' : 'Пропустить'}
            </button>
          </div>
        </TrinityBottomDrawer>
      )}

      {/* ── Receipt drawer ── */}
      {receiptVisit && (
        <TrinityBottomDrawer
          isOpen={!!receiptVisit}
          onClose={() => setReceiptVisit(null)}
          title={isHe ? 'הביקור הושלם' : 'Визит завершён'}
        >
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <p className="text-lg font-bold">₪{receiptVisit.price || 0}</p>
              <p className="text-sm text-slate-400">{isHe ? 'התשלום התקבל' : 'Оплата получена'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const msg = isHe ? `קבלה: תשלום ₪${receiptVisit.price} התקבל. תודה!` : `Квитанция: оплата ₪${receiptVisit.price} получена. Спасибо!`
                  window.open(`https://wa.me/${(receiptVisit.client_phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
                }}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-medium"
              >
                <MessageCircle size={16} />WhatsApp
              </button>
              <button onClick={() => toast.info(isHe ? 'בקרוב' : 'Скоро')} className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 text-white text-sm font-medium">
                <Mail size={16} />Email
              </button>
            </div>
            <button
              onClick={() => {
                const next = new Date(); next.setDate(next.getDate() + 14)
                setReceiptVisit(null)
                setCreateVisitPrefill({ clientId: receiptVisit.client_id, clientName: receiptVisit.clientName, date: next.toISOString().split('T')[0] })
                openModal('visit-create')
              }}
              className="w-full py-3.5 rounded-2xl border-2 border-blue-600 text-blue-600 text-sm font-semibold"
            >
              {isHe ? 'תור הבא (+2 שבועות)' : 'Следующий визит (+2 недели)'}
            </button>
            <button onClick={() => setReceiptVisit(null)} className="w-full py-3 rounded-2xl bg-slate-100 text-slate-500 text-sm font-medium">
              {isHe ? 'צא' : 'Выйти'}
            </button>
          </div>
        </TrinityBottomDrawer>
      )}

      {/* ── Visit detail modal ── */}
      <VisitDetailModal
        visit={selectedVisit}
        isOpen={!!selectedVisit}
        onClose={() => setSelectedVisit(null)}
        locale={isHe ? 'he' : 'ru'}
        clientName={selectedVisit ? getClientName(selectedVisit) : ''}
        clientPhone={selectedVisit ? getClientPhone(selectedVisit) : ''}
        clientEmail={selectedVisit ? getClientEmail(selectedVisit) : ''}
        serviceName={selectedVisit ? getServiceName(selectedVisit) : ''}
        onStart={() => { if (selectedVisit) { updateVisitStatus(selectedVisit.id, 'in_progress'); setSelectedVisit(null) } }}
        onComplete={() => { if (selectedVisit) { handleCompleteVisit(selectedVisit); setSelectedVisit(null) } }}
        onCancel={() => { if (selectedVisit) { updateVisitStatus(selectedVisit.id, 'cancelled'); setSelectedVisit(null) } }}
        onEdit={() => { if (selectedVisit) { openModal('edit-visit', { visitId: selectedVisit.id, visit: selectedVisit }); setSelectedVisit(null) } }}
        lastVisitDate={selectedVisit ? getLastVisitDate(selectedVisit) : ''}
        onShowHistory={() => setSelectedVisit(null)}
      />
    </div>
  )
}

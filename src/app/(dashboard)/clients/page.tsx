'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Eye, Users, Phone, Calendar, TrendingUp, MessageCircle, Filter, Loader2, Download, ArrowUpDown } from 'lucide-react'
import { useClients } from '@/hooks/useClients'
import { useDebounce } from '@/hooks/useDebounce'
import { useQueryClient } from '@tanstack/react-query'
import { ClientSummary } from '@/types/database'
import { useModalStore } from '@/store/useModalStore'
import { format, differenceInDays } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useFeatures } from '@/hooks/useFeatures'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDemoMode } from '@/hooks/useDemoMode'
import { DemoSectionBanner } from '@/components/demo/DemoSectionBanner'
import { DemoLimitModal } from '@/components/demo/DemoLimitModal'
import { ClientCard } from '@/components/clients/ClientCard'
import { DraftSaleIndicator } from '@/components/clients/DraftSaleIndicator'
import { EmptyState } from '@/components/ui/EmptyState'
import { useClientSelfEditRealtime } from '@/hooks/useClientSelfEditRealtime'

// ── Аватар с инициалами ───────────────────────────────────────────────────────
function ClientAvatar({ firstName, lastName, size = 'md' }: { firstName: string; lastName: string; size?: 'sm' | 'md' }) {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  const colors = [
    'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700',
    'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700',
  ]
  const colorIdx = (firstName?.charCodeAt(0) || 0) % colors.length
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${colors[colorIdx]}`}>
      {initials || '?'}
    </div>
  )
}

// ── Индикатор активности с recency bar ───────────────────────────────────────
function ActivityBadge({ lastVisit, locale }: { lastVisit: string | null; locale: string }) {
  if (!lastVisit) return <span className="text-xs text-gray-300">—</span>
  const days = differenceInDays(new Date(), new Date(lastVisit))
  // Recency bar: 0–7 дней = 100%, 30 дней = 50%, 90+ дней = 10%
  const barPct = Math.max(10, Math.round(Math.max(0, 1 - days / 90) * 100))
  const barColor =
    days <= 14 ? 'bg-emerald-400' :
    days <= 45 ? 'bg-amber-400' :
    'bg-gray-300'

  const label =
    days <= 30
      ? (locale === 'he' ? `לפני ${days}י` : `${days}д назад`)
      : days <= 90
      ? (locale === 'he' ? `לפני ${Math.floor(days / 30)}ח` : `${Math.floor(days / 30)}мес назад`)
      : (locale === 'he' ? 'לא פעיל' : 'Давно')

  const textColor =
    days <= 30 ? 'text-emerald-600' :
    days <= 90 ? 'text-amber-600' :
    'text-gray-400'

  return (
    <div className="flex flex-col gap-1 min-w-[80px]">
      <span className={`text-xs font-medium ${textColor}`}>{label}</span>
      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${barPct}%` }}
        />
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const router = useRouter()
  const features = useFeatures()
  const { t, language } = useLanguage()
  const { isDemo, clientLimit } = useDemoMode()
  const { role, orgId } = useAuth()
  const isOwner = role === 'owner'

  // Realtime toast когда клиент обновляет профиль через self-edit ссылку
  useClientSelfEditRealtime(orgId, language as 'he' | 'ru')
  const [demoLimitOpen, setDemoLimitOpen] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('created_at')
  const [draftClients, setDraftClients] = useState<Set<string>>(new Set())
  const [noVisitToday, setNoVisitToday] = useState(false)
  const { openModal } = useModalStore()
  const pageSize = 25

  // ── Debounce: инпут обновляется мгновенно, API дёргается через 350мс ──
  const debouncedSearch = useDebounce(searchQuery, 350)
  // Пустая строка или < 2 символов → не гоним текстовый поиск к БД
  const activeSearch = debouncedSearch.length >= 2 ? debouncedSearch : ''

  const { data: clientsData, isLoading, isFetching } = useClients(activeSearch, page, pageSize, undefined, sortBy)
  const clients = clientsData?.data || []
  const totalCount = clientsData?.count || 0
  const clientCount = totalCount
  const totalPages = Math.ceil(totalCount / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, sortBy])

  // Scan localStorage for draft sales and update on focus
  useEffect(() => {
    const scan = () => {
      const drafts = new Set<string>()
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('draft_sale_')) {
          drafts.add(key.replace('draft_sale_', ''))
        }
      }
      setDraftClients(drafts)
    }
    scan()
    window.addEventListener('focus', scan)
    window.addEventListener('storage', scan)
    return () => {
      window.removeEventListener('focus', scan)
      window.removeEventListener('storage', scan)
    }
  }, [])

  // Check organization status and feature access
  // Фильтрация "без визита сегодня" — клиентская, по already-loaded данным
  const today = new Date().toISOString().slice(0, 10)
  const displayedClients = noVisitToday
    ? clients.filter(c => !c.last_visit || c.last_visit.slice(0, 10) !== today)
    : clients
  useEffect(() => {
    if (!features.isLoading) {
      if (!features.isActive) {
        router.push('/blocked')
      } else if (!features.hasClients) {
        router.push('/dashboard')
      }
    }
  }, [features.isActive, features.hasClients, features.isLoading, router])

  async function handleExport() {
    if (!orgId || exportLoading) return
    setExportLoading(true)
    try {
      const params = new URLSearchParams({ type: 'clients', org_id: orgId, format: 'csv' })
      const res = await fetch(`/api/export?${params}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clients_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (e) {
      console.error(e)
    } finally {
      setExportLoading(false)
    }
  }

  const handleClientClick = (client: ClientSummary) => {
    openModal('client-details', {
      client,
      locale: language === 'he' ? 'he' : 'ru',
      enabledModules: {
        appointments: features.hasVisits,
      },
    })
  }

  async function handleDeleteClient(clientId: string) {
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    } catch (e) {
      console.error('Failed to delete client:', e)
    }
  }

  // Never show full-screen loader — use inline skeleton instead
  // features redirect

  return (
    <div className="space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('clients.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('common.total')}: {totalCount || 0} {t('clients.title')}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Кнопка Экспорт — только для owner, десктоп */}
          {isOwner && (
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 relative overflow-hidden transition-all duration-200 hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-100 dark:hover:shadow-emerald-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(16,185,129,0.05))' }}
            >
              {/* Shimmer sweep */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(52,211,153,0.18) 50%, transparent 100%)',
                  animation: 'shimmer-wave 2.4s ease-in-out infinite',
                }}
              />
              {exportLoading
                ? <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                : <Download className="w-4 h-4 relative z-10" />}
              <span className="relative z-10">{language === 'he' ? 'ייצוא' : 'Экспорт'}</span>
            </button>
          )}
          <Button 
            onClick={() => {
              if (isDemo && clientCount >= 10) { setDemoLimitOpen(true); return }
              openModal('client-add')
            }}
            className="hidden md:flex bg-theme-primary text-white hover:opacity-90"
          >
            <Plus className="w-4 h-4 ml-2" />
            {t('clients.addNew')}
          </Button>
        </div>
      </div>

      {/* DEMO limit banner */}
      {isDemo && (
        <DemoSectionBanner section="clients" used={clientCount} />
      )}
      <DemoLimitModal open={demoLimitOpen} onClose={() => setDemoLimitOpen(false)} section="clients" />

      {/* Search */}
      <div className="relative">
        {/* Иконка справа: лупа ↔ спиннер — независимые слои, без конфликта transition/animate */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none">
          {/* Лупа — исчезает при загрузке */}
          <Search
            style={{
              position: 'absolute', inset: 0,
              transition: 'opacity 250ms ease, transform 250ms ease',
              opacity: isFetching ? 0 : 1,
              transform: isFetching ? 'scale(0.6) rotate(-30deg)' : 'scale(1) rotate(0deg)',
            }}
            className="w-5 h-5 text-gray-400 dark:text-gray-500"
          />
          {/* Спиннер — появляется при загрузке, spin управляется отдельно */}
          <Loader2
            style={{
              position: 'absolute', inset: 0,
              transition: 'opacity 250ms ease, transform 250ms ease',
              opacity: isFetching ? 1 : 0,
              transform: isFetching ? 'scale(1)' : 'scale(0.6)',
              animation: isFetching ? 'spin 0.8s linear infinite' : 'none',
            }}
            className="w-5 h-5 text-indigo-500"
          />
        </div>
        <Input
          placeholder={t('clients.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
        />
      </div>

      {/* Sort controls */}
      {(() => {
        const sorts = [
          { key: 'created_at', ru: 'По дате добавления', he: 'לפי תאריך הוספה' },
          { key: 'alphabet',   ru: 'По алфавиту',        he: 'לפי א-ב' },
          { key: 'last_visit', ru: 'По последнему визиту', he: 'לפי ביקור אחרון' },
          { key: 'last_sale',  ru: 'По сумме сделок',    he: 'לפי סכום עסקאות' },
        ]
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            {sorts.map(s => (
              <button
                key={s.key}
                onClick={() => setSortBy(s.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  sortBy === s.key
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200/60'
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                {language === 'he' ? s.he : s.ru}
              </button>
            ))}
          </div>
        )
      })()}

      {/* Desktop — современный список */}
      <div className="hidden md:block">
        {/* Заголовок колонок — адаптивный: md=3кол, lg=5кол, xl=6кол */}
        <div className="grid grid-cols-[2fr_1fr_80px] lg:grid-cols-[2fr_1fr_1fr_80px_100px] xl:grid-cols-[2fr_1fr_1fr_80px_100px_90px] gap-4 px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
          <span>{t('clients.name')}</span>
          <span>{t('clients.phone')}</span>
          <span className="hidden lg:block">{t('clients.lastVisit')}</span>
          <span>{t('clients.visits')}</span>
          <span className="hidden lg:block">{t('clients.totalSpent')}</span>
          <span className="hidden xl:block"></span>
        </div>

        {/* Скелетон */}
        {isFetching && clients.length === 0 ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_80px] lg:grid-cols-[2fr_1fr_1fr_80px_100px] xl:grid-cols-[2fr_1fr_1fr_80px_100px_80px] gap-4 px-4 py-3 items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse" />
                  <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse w-28" />
                </div>
                <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse w-24" />
                <div className="hidden lg:block h-5 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse w-16" />
                <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse w-8 mx-auto" />
                <div className="hidden lg:block h-4 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse w-14" />
                <div className="hidden xl:block h-7 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : clients && clients.length > 0 ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {clients.map((client) => {
              const fullName = `${client.first_name} ${client.last_name}`.trim()
              const totalPaid = Number(client.total_paid || 0)
              return (
                <div
                  key={client.id}
                  onClick={() => handleClientClick(client)}
                  className={`grid grid-cols-[2fr_1fr_80px] lg:grid-cols-[2fr_1fr_1fr_80px_100px] xl:grid-cols-[2fr_1fr_1fr_80px_100px_90px] gap-4 px-4 py-2 items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group ${
                    draftClients.has(client.id) ? 'draft-glow' : ''
                  }`}
                >
                  {/* Имя + аватар */}
                  <div className="flex items-center gap-3 min-w-0">
                    <ClientAvatar firstName={client.first_name} lastName={client.last_name} />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{fullName || '—'}</p>
                      {client.email && (
                        <p className="text-xs text-gray-400 truncate">{client.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Телефон */}
                  <span className="text-sm text-gray-600 dark:text-gray-300 tabular-nums truncate">
                    {client.phone || '—'}
                  </span>

                  {/* Последний визит — скрыт до lg */}
                  <div className="hidden lg:block">
                    <ActivityBadge lastVisit={client.last_visit} locale={language === 'he' ? 'he' : 'ru'} />
                  </div>

                  {/* Кол-во визитов */}
                  <div className="flex justify-center">
                    <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                      client.total_visits >= 10 ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      : client.total_visits >= 3 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-500'
                    }`}>
                      {client.total_visits}
                    </span>
                  </div>

                  {/* Сумма — скрыта до lg */}
                  <span className={`hidden lg:block text-sm font-semibold ${totalPaid > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300'}`}>
                    {totalPaid > 0 ? `₪${totalPaid.toLocaleString()}` : '—'}
                  </span>

                  {/* Действия — скрыты до xl */}
                  <div className="hidden xl:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <DraftSaleIndicator clientId={client.id} client={client} locale={language === 'he' ? 'he' : 'ru'} />
                    {client.phone && (
                      <a
                        href={`https://wa.me/${client.phone.replace(/\D/g, '').replace(/^0/, '972')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-400 hover:text-emerald-600 transition-colors"
                        title={language === 'he' ? 'שלח הודעה ב-WhatsApp' : 'WhatsApp'}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {client.phone && (
                      <a href={`tel:${client.phone}`}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-emerald-600 transition-colors"
                        title={language === 'he' ? 'התקשר' : 'Позвонить'}>
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={() => handleClientClick(client)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"
                      title={language === 'he' ? 'פתח' : 'Открыть'}>
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-4">{t('clients.noClients')}</p>
            <Button onClick={() => openModal('client-add')} className="bg-theme-primary text-white hover:opacity-90">
              <Plus className="w-4 h-4 ml-2" />
              {t('clients.addFirst')}
            </Button>
          </div>
        )}
      </div>

      {/* Desktop pagination — server-side */}
      {totalPages > 1 && (
        <div className="hidden md:flex items-center justify-center gap-2 mt-2 pb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            {language === 'he' ? 'הקודם' : '← Назад'}
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 5) pageNum = i + 1
            else if (page <= 3) pageNum = i + 1
            else if (page >= totalPages - 2) pageNum = totalPages - 4 + i
            else pageNum = page - 2 + i
            return (
              <Button
                key={pageNum}
                variant={page === pageNum ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPage(pageNum)}
              >
                {pageNum}
              </Button>
            )
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            {language === 'he' ? 'הבא' : 'Вперёд →'}
          </Button>
          <span className="text-sm text-gray-500 mr-2">
            {from}–{to} {language === 'he' ? 'מתוך' : 'из'} {totalCount}
          </span>
        </div>
      )}

      {/* Mobile - фильтр-чип "без визита сегодня" */}
      <div className="md:hidden flex items-center gap-2 pb-1">
        <button
          onClick={() => setNoVisitToday(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            noVisitToday
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200/50'
              : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
          }`}
        >
          <Filter className="w-3 h-3" />
          {language === 'he' ? 'ללא ביקור היום' : 'Без визита сегодня'}
        </button>
        {noVisitToday && (
          <span className="text-xs text-indigo-500 font-medium">
            {displayedClients.length} {language === 'he' ? 'לקוחות' : 'клиентов'}
          </span>
        )}
      </div>

      {/* Mobile - ClientCard */}
      <div className="md:hidden space-y-2">
        {/* Skeleton — показывается пока данные грузятся */}
        {(isLoading || (isFetching && clients.length === 0)) ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full w-32" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full w-24" />
                </div>
                <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full w-12" />
              </div>
            ))}
          </div>
        ) : displayedClients && displayedClients.length > 0 ? (
          displayedClients.map((client) => (
            <ClientCard
              key={client.id}
              client={{
                id: client.id,
                first_name: client.first_name,
                last_name: client.last_name,
                phone: client.phone || undefined,
                email: client.email || undefined,
                address: client.address || undefined,
                city: client.city || undefined,
                date_of_birth: client.date_of_birth || undefined,
                description: client.description || undefined,
                paint_code: client.paint_code || undefined,
                visits_count: client.total_visits,
                last_visit: client.last_visit || undefined,
                total_paid: client.total_paid,
                notes: client.notes || undefined,
                created_at: client.created_at || undefined,
              }}
              locale={language === 'he' ? 'he' : 'ru'}
              isDemo={isDemo}
              enabledModules={{ appointments: features.hasVisits, recurring: features.recurringEnabled }}
              onDelete={handleDeleteClient}
            />
          ))
        ) : (
          <EmptyState
            icon={<Users size={28} />}
            title={
              noVisitToday
                ? (language === 'he' ? 'כולם ביקרו היום 🎉' : 'Все уже были сегодня 🎉')
                : (language === 'he' ? 'אין לקוחות עדיין' : 'Клиентов пока нет')
            }
            description={
              noVisitToday
                ? (language === 'he' ? 'כל הלקוחות כבר ביקרו היום' : 'Все клиенты уже посетили вас сегодня')
                : (language === 'he' ? 'הוסף את הלקוח הראשון שלך' : 'Добавьте первого клиента')
            }
            action={noVisitToday ? undefined : {
              label: language === 'he' ? 'הוסף לקוח' : 'Добавить',
              onClick: () => {
                if (isDemo && clientCount >= 10) { setDemoLimitOpen(true); return }
                openModal('client-add')
              },
            }}
          />
        )}

        {/* Search results */}
        {searchQuery && searchQuery.length >= 2 && (
          <div className="mt-4 px-4 text-sm text-gray-600 dark:text-gray-400">
            {language === 'he' 
              ? `נמצאו ${clients.length} לקוחות` 
              : `Найдено ${clients.length} клиентов`}
          </div>
        )}

        {/* Pagination — server-side */}
        {clients.length > 0 && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3 pb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-10 h-10 p-0 text-lg"
            >
              {language === 'he' ? '›' : '‹'}
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-10 h-10 p-0 text-lg"
            >
              {language === 'he' ? '‹' : '›'}
            </Button>
          </div>
        )}

      </div>

      {/* Mobile FAB (Floating Action Button) */}
      {/* Mobile FAB — RTL-aware: end-6 = right в LTR, left в RTL */}
      <button
        onClick={() => {
          if (isDemo && clientCount >= 10) { setDemoLimitOpen(true); return }
          openModal('client-add')
        }}
        disabled={isDemo && clientCount >= 10}
        className="md:hidden fixed bottom-6 end-6 w-14 h-14 rounded-full shadow-xl shadow-indigo-300/40 flex items-center justify-center active:scale-95 transition-all z-50 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-indigo-600 to-indigo-500 text-white hover:shadow-2xl hover:shadow-indigo-300/60"
        aria-label={t('clients.addNew')}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
}

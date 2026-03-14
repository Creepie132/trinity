'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Eye, Upload, Users, Phone, Calendar, TrendingUp, MessageCircle } from 'lucide-react'
import { useClients } from '@/hooks/useClients'
import { useQueryClient } from '@tanstack/react-query'
import { ClientSummary } from '@/types/database'
import { useModalStore } from '@/store/useModalStore'
import { format, differenceInDays } from 'date-fns'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useFeatures } from '@/hooks/useFeatures'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDemoMode } from '@/hooks/useDemoMode'
import { ExportButton } from '@/components/ExportButton'
import { ClientCard } from '@/components/clients/ClientCard'
import { DraftSaleIndicator } from '@/components/clients/DraftSaleIndicator'
import { EmptyState } from '@/components/ui/EmptyState'

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

// ── Индикатор активности ──────────────────────────────────────────────────────
function ActivityBadge({ lastVisit, locale }: { lastVisit: string | null; locale: string }) {
  if (!lastVisit) return <span className="text-xs text-gray-300">—</span>
  const days = differenceInDays(new Date(), new Date(lastVisit))
  if (days <= 30) return <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
    {locale === 'he' ? `לפני ${days}י` : `${days}д назад`}
  </span>
  if (days <= 90) return <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
    {locale === 'he' ? `לפני ${Math.floor(days/30)}ח` : `${Math.floor(days/30)}мес назад`}
  </span>
  return <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
    {locale === 'he' ? 'לא פעיל' : 'Давно'}
  </span>
}

export default function ClientsPage() {
  const router = useRouter()
  const features = useFeatures()
  const { t, language } = useLanguage()
  const { isDemo, clientLimit } = useDemoMode()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  const { openModal } = useModalStore()

  const pageSize = 25

  // Debounce search — 300ms, не мигаем интерфейсом при каждом символе
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.length >= 2 ? searchQuery : '')
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const activeSearch = debouncedSearch
  const { data: clientsData, isLoading, isFetching } = useClients(activeSearch, page, pageSize)
  const clients = clientsData?.data || []

  // No client-side filtering needed — server does it
  const filteredClients = clients
  const paginatedClients = clients

  const totalCount = clientsData?.count || 0
  const clientCount = totalCount
  const totalPages = Math.ceil(totalCount / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  // Check organization status and feature access
  useEffect(() => {
    if (!features.isLoading) {
      if (!features.isActive) {
        router.push('/blocked')
      } else if (!features.hasClients) {
        router.push('/dashboard')
      }
    }
  }, [features.isActive, features.hasClients, features.isLoading, router])

  const handleClientClick = (client: ClientSummary) => {
    openModal('client-details', {
      client,
      locale: language === 'he' ? 'he' : 'ru',
      enabledModules: {
        appointments: features.hasVisits,
      },
    })
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
          <ExportButton type="clients" />
          <Link href="/clients/import">
            <Button variant="outline" className="hidden md:flex gap-2">
              <Upload className="w-4 h-4" />
              Импорт из Excel
            </Button>
          </Link>
          <Button 
            onClick={() => openModal('client-add')} 
            disabled={isDemo && clientCount >= 10}
            className="hidden md:flex bg-theme-primary text-white hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="w-4 h-4 ml-2" />
            {t('clients.addNew')}
          </Button>
        </div>
      </div>

      {/* DEMO limit banner */}
      {isDemo && clientCount >= 10 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
          <p className="text-red-700 dark:text-red-300 text-sm font-medium mb-2">
            {language === 'he' ? 'הגעת למגבלת הלקוחות' : 'Достигнут лимит клиентов'}
          </p>
          <a
            href="https://wa.me/972544858586"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 dark:text-red-400 underline text-sm"
          >
            {language === 'he' ? 'שדרג עכשיו' : 'Обновить тариф'}
          </a>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
        <Input
          placeholder={t('clients.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
        />
        {/* Spinner — показывается во время поиска, не прячет интерфейс */}
        {isFetching && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Desktop — современный список */}
      <div className="hidden md:block">
        {/* Заголовок колонок */}
        <div className="grid grid-cols-[2fr_1fr_1fr_80px_100px_80px] gap-4 px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
          <span>{t('clients.name')}</span>
          <span>{t('clients.phone')}</span>
          <span>{t('clients.lastVisit')}</span>
          <span>{t('clients.visits')}</span>
          <span>{t('clients.totalSpent')}</span>
          <span></span>
        </div>

        {/* Скелетон */}
        {isFetching && clients.length === 0 ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_80px_100px_80px] gap-4 px-4 py-3 items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse" />
                  <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse w-28" />
                </div>
                <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse w-24" />
                <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse w-16" />
                <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse w-8 mx-auto" />
                <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse w-14" />
                <div className="h-7 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : paginatedClients && paginatedClients.length > 0 ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {paginatedClients.map((client) => {
              const fullName = `${client.first_name} ${client.last_name}`.trim()
              const totalPaid = Number(client.total_paid || 0)
              return (
                <div
                  key={client.id}
                  onClick={() => handleClientClick(client)}
                  className="grid grid-cols-[2fr_1fr_1fr_80px_100px_80px] gap-4 px-4 py-3 items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
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
                  <span className="text-sm text-gray-600 dark:text-gray-300 tabular-nums">
                    {client.phone || '—'}
                  </span>

                  {/* Последний визит */}
                  <ActivityBadge lastVisit={client.last_visit} locale={language === 'he' ? 'he' : 'ru'} />

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

                  {/* Сумма */}
                  <span className={`text-sm font-semibold ${totalPaid > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300'}`}>
                    {totalPaid > 0 ? `₪${totalPaid.toLocaleString()}` : '—'}
                  </span>

                  {/* Действия */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <DraftSaleIndicator clientId={client.id} client={client} locale={language === 'he' ? 'he' : 'ru'} />
                    {client.phone && (
                      <a href={`tel:${client.phone}`}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-emerald-600 transition-colors"
                        title="Позвонить">
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={() => handleClientClick(client)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Открыть">
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

      {/* Mobile - ClientCard */}
      <div className="md:hidden space-y-2">
        {paginatedClients && paginatedClients.length > 0 ? (
          paginatedClients.map((client) => (
            <ClientCard
              key={client.id}
              client={{
                id: client.id,
                first_name: client.first_name,
                last_name: client.last_name,
                phone: client.phone || undefined,
                email: client.email || undefined,
                visits_count: client.total_visits,
                last_visit: client.last_visit || undefined,
                total_paid: client.total_paid,
                notes: client.notes || undefined,
                created_at: client.created_at || undefined,
              }}
              locale={language === 'he' ? 'he' : 'ru'}
              isDemo={isDemo}
              enabledModules={{ appointments: features.hasVisits, recurring: features.recurringEnabled }}
            />
          ))
        ) : (
          <EmptyState
            icon={<Users size={28} />}
            title={language === 'he' ? 'אין לקוחות עדיין' : 'Клиентов пока нет'}
            description={language === 'he' ? 'הוסף את הלקוח הראשון שלך' : 'Добавьте первого клиента'}
            action={{
              label: language === 'he' ? 'הוסף לקוח' : 'Добавить',
              onClick: () => openModal('client-add'),
            }}
          />
        )}

        {/* Search results */}
        {searchQuery && searchQuery.length >= 2 && (
          <div className="mt-4 px-4 text-sm text-gray-600 dark:text-gray-400">
            {language === 'he' 
              ? `נמצאו ${filteredClients.length} לקוחות` 
              : `Найдено ${filteredClients.length} клиентов`}
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
      <button
        onClick={() => openModal('client-add')}
        disabled={isDemo && clientCount >= 10}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-theme-primary text-white rounded-full shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all z-50 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={t('clients.addNew')}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Eye, Edit, MessageSquare, CreditCard, Upload, Users } from 'lucide-react'
import { useClients } from '@/hooks/useClients'
import { useQueryClient } from '@tanstack/react-query'
import { AddClientDialog } from '@/components/clients/AddClientDialog'
import { ClientSummary } from '@/types/database'
import { useModalStore } from '@/store/useModalStore'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useFeatures } from '@/hooks/useFeatures'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDemoMode } from '@/hooks/useDemoMode'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ExportButton } from '@/components/ExportButton'
import { ClientCard } from '@/components/clients/ClientCard'
import { EmptyState } from '@/components/ui/EmptyState'

export default function ClientsPage() {
  const router = useRouter()
  const features = useFeatures()
  const { t, language } = useLanguage()
  const { isDemo, clientLimit } = useDemoMode()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  
  const { openModal } = useModalStore()

  const perPage = 20

  const pageSize = 25
  const { data: clientsData, isLoading } = useClients('', page, pageSize)
  const clients = clientsData?.data || []
  
  // Client-side search filter
  const filteredClients = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return clients
    const q = searchQuery.toLowerCase()
    return clients.filter(c => 
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  }, [clients, searchQuery])

  // Client-side pagination for filtered results
  const totalFilteredPages = Math.ceil(filteredClients.length / perPage)
  const paginatedClients = useMemo(() => {
    return filteredClients.slice((currentPage - 1) * perPage, currentPage * perPage)
  }, [filteredClients, currentPage, perPage])
  
  const totalCount = clientsData?.count || 0
  const clientCount = searchQuery ? filteredClients.length : totalCount
  const totalPages = Math.ceil(totalCount / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  // Reset page when search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

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

  // Show loading screen while fetching data
  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('clients.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('common.total')}: {clients?.length || 0} {t('clients.title')}
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
            onClick={() => setAddDialogOpen(true)} 
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
      </div>

      {/* Desktop - Table */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden min-h-[400px]">
        {paginatedClients && paginatedClients.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <TableHead className="text-right text-gray-700 dark:text-gray-300">{t('clients.name')}</TableHead>
                <TableHead className="text-right text-gray-700 dark:text-gray-300">{t('clients.phone')}</TableHead>
                <TableHead className="text-right text-gray-700 dark:text-gray-300">{t('clients.lastVisit')}</TableHead>
                <TableHead className="text-right text-gray-700 dark:text-gray-300">{t('clients.visits')}</TableHead>
                <TableHead className="text-right text-gray-700 dark:text-gray-300">{t('clients.totalSpent')}</TableHead>
                <TableHead className="text-left text-gray-700 dark:text-gray-300">{t('clients.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
                  onClick={() => handleClientClick(client)}
                >
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                    {client.first_name} {client.last_name}
                  </TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-300">{client.phone}</TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-300">
                    {client.last_visit
                      ? format(new Date(client.last_visit), 'dd/MM/yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{client.total_visits}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-green-600 dark:text-green-400">
                    ₪{Number(client.total_paid || 0).toFixed(2)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleClientClick(client)}
                        className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <CreditCard className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">{t('clients.noClients')}</p>
            <Button onClick={() => setAddDialogOpen(true)} className="bg-theme-primary text-white hover:opacity-90">
              <Plus className="w-4 h-4 ml-2" />
              {t('clients.addFirst')}
            </Button>
          </div>
        )}
      </div>

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
              enabledModules={{ appointments: features.hasVisits }}
            />
          ))
        ) : (
          <EmptyState
            icon={<Users size={28} />}
            title={language === 'he' ? 'אין לקוחות עדיין' : 'Клиентов пока нет'}
            description={language === 'he' ? 'הוסף את הלקוח הראשון שלך' : 'Добавьте первого клиента'}
            action={{
              label: language === 'he' ? 'הוסף לקוח' : 'Добавить',
              onClick: () => setAddDialogOpen(true),
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

        {/* Client-side pagination for filtered results */}
        {searchQuery && totalFilteredPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6 pb-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-xl text-sm border disabled:opacity-30"
            >
              {language === 'he' ? '→' : '←'}
            </button>

            {Array.from({ length: Math.min(totalFilteredPages, 7) }).map((_, i) => {
              let pageNum: number
              if (totalFilteredPages <= 7) {
                pageNum = i + 1
              } else if (currentPage <= 4) {
                pageNum = i + 1
              } else if (currentPage >= totalFilteredPages - 3) {
                pageNum = totalFilteredPages - 6 + i
              } else {
                pageNum = currentPage - 3 + i
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-xl text-sm font-medium transition ${
                    currentPage === pageNum ? 'bg-blue-600 text-white' : 'border hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalFilteredPages, p + 1))}
              disabled={currentPage === totalFilteredPages}
              className="px-3 py-2 rounded-xl text-sm border disabled:opacity-30"
            >
              {language === 'he' ? '←' : '→'}
            </button>
          </div>
        )}

        {/* Pagination */}
        {!searchQuery && clients.length > 0 && totalPages > 1 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
            {/* Stats */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('common.showing')} {from}-{to} {t('common.outOf')} {totalCount}
            </div>

            {/* Desktop Pagination */}
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {t('common.previous')}
              </Button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
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
                {t('common.next')}
              </Button>
            </div>

            {/* Mobile Pagination */}
            <div className="flex sm:hidden items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                «
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                »
              </Button>
            </div>
          </div>
        )}

        {/* Desktop pagination for filtered results */}
        {searchQuery && totalFilteredPages > 1 && (
          <div className="hidden md:flex items-center justify-center gap-2 mt-6 pb-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-xl text-sm border disabled:opacity-30"
            >
              {language === 'he' ? '→' : '←'}
            </button>

            {Array.from({ length: Math.min(totalFilteredPages, 7) }).map((_, i) => {
              let pageNum: number
              if (totalFilteredPages <= 7) {
                pageNum = i + 1
              } else if (currentPage <= 4) {
                pageNum = i + 1
              } else if (currentPage >= totalFilteredPages - 3) {
                pageNum = totalFilteredPages - 6 + i
              } else {
                pageNum = currentPage - 3 + i
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-xl text-sm font-medium transition ${
                    currentPage === pageNum ? 'bg-blue-600 text-white' : 'border hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalFilteredPages, p + 1))}
              disabled={currentPage === totalFilteredPages}
              className="px-3 py-2 rounded-xl text-sm border disabled:opacity-30"
            >
              {language === 'he' ? '←' : '→'}
            </button>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AddClientDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      {/* Mobile FAB (Floating Action Button) */}
      <button
        onClick={() => setAddDialogOpen(true)}
        disabled={isDemo && clientCount >= 10}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-theme-primary text-white rounded-full shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all z-50 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={t('clients.addNew')}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Eye, Edit, MessageSquare, CreditCard, Upload } from 'lucide-react'
import { useClients } from '@/hooks/useClients'
import { AddClientDialog } from '@/components/clients/AddClientDialog'
import { ClientSheet } from '@/components/clients/ClientSheet'
import { ClientSummary } from '@/types/database'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useFeatures } from '@/hooks/useFeatures'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDemoMode } from '@/hooks/useDemoMode'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ExportButton } from '@/components/ExportButton'
import { ResponsiveDataView } from '@/components/ui/ResponsiveDataView'

export default function ClientsPage() {
  const router = useRouter()
  const features = useFeatures()
  const { t, language } = useLanguage()
  const { isDemo, clientLimit } = useDemoMode()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null)
  const [clientSheetOpen, setClientSheetOpen] = useState(false)

  const pageSize = 25
  const { data: clientsData, isLoading } = useClients(searchQuery, page, pageSize)
  const clients = clientsData?.data || []
  const totalCount = clientsData?.count || 0
  const clientCount = totalCount
  const totalPages = Math.ceil(totalCount / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

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
    setSelectedClient(client)
    setClientSheetOpen(true)
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

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden min-h-[400px]">
        {clients && clients.length > 0 ? (
          <ResponsiveDataView
            columns={[
              {
                key: 'name',
                label: t('clients.name'),
                compact: true,
                render: (val, row) => `${row.first_name} ${row.last_name}`,
              },
              {
                key: 'phone',
                label: t('clients.phone'),
                compact: true,
              },
              {
                key: 'email',
                label: t('clients.email'),
                render: (val) => val || '—',
              },
              {
                key: 'total_visits',
                label: t('clients.visits'),
                compact: true,
                render: (val) => (
                  <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {val}
                  </Badge>
                ),
              },
              {
                key: 'last_visit',
                label: t('clients.lastVisit'),
                render: (val) =>
                  val ? format(new Date(val), 'dd/MM/yyyy') : '—',
              },
              {
                key: 'total_paid',
                label: t('clients.totalSpent'),
                render: (val) => (
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    ₪{Number(val || 0).toFixed(2)}
                  </span>
                ),
              },
            ]}
            data={clients.map(client => ({
              ...client,
              name: `${client.first_name} ${client.last_name}`,
            }))}
            titleKey="name"
            subtitleKey="phone"
            actions={(client) => [
              {
                label: t('common.view'),
                onClick: () => handleClientClick(client),
              },
            ]}
            locale={language}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">{t('clients.noClients')}</p>
            <Button onClick={() => setAddDialogOpen(true)} className="bg-theme-primary text-white hover:opacity-90">
              <Plus className="w-4 h-4 ml-2" />
              {t('clients.addFirst')}
            </Button>
          </div>
        )}

        {/* Pagination */}
        {clients.length > 0 && totalPages > 1 && (
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
      </div>

      {/* Dialogs */}
      <AddClientDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <ClientSheet
        client={selectedClient}
        open={clientSheetOpen}
        onOpenChange={setClientSheetOpen}
      />

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

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
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ExportButton } from '@/components/ExportButton'

export default function ClientsPage() {
  const router = useRouter()
  const features = useFeatures()
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null)
  const [clientSheetOpen, setClientSheetOpen] = useState(false)

  const pageSize = 25
  const { data: clientsData, isLoading } = useClients(searchQuery, page, pageSize)
  const clients = clientsData?.data || []
  const totalCount = clientsData?.count || 0
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
          <Button onClick={() => setAddDialogOpen(true)} className="hidden md:flex bg-theme-primary text-white hover:opacity-90">
            <Plus className="w-4 h-4 ml-2" />
            {t('clients.addNew')}
          </Button>
        </div>
      </div>

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
              {clients.map((client) => (
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
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-theme-primary text-white rounded-full shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all z-50"
        aria-label={t('clients.addNew')}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
}

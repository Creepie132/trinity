'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Eye, Edit, MessageSquare, CreditCard } from 'lucide-react'
import { useClients } from '@/hooks/useClients'
import { AddClientDialog } from '@/components/clients/AddClientDialog'
import { ClientSheet } from '@/components/clients/ClientSheet'
import { ClientSummary } from '@/types/database'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useFeatures } from '@/hooks/useFeatures'
import { useLanguage } from '@/contexts/LanguageContext'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export default function ClientsPage() {
  const router = useRouter()
  const features = useFeatures()
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null)
  const [clientSheetOpen, setClientSheetOpen] = useState(false)

  const { data: clients, isLoading } = useClients(searchQuery)

  // Check organization status
  useEffect(() => {
    if (!features.isLoading && !features.isActive) {
      router.push('/blocked')
    }
  }, [features.isActive, features.isLoading, router])

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
        <Button onClick={() => setAddDialogOpen(true)} className="bg-theme-primary text-white hover:opacity-90">
          <Plus className="w-4 h-4 ml-2" />
          {t('clients.addNew')}
        </Button>
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
      </div>

      {/* Dialogs */}
      <AddClientDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <ClientSheet
        client={selectedClient}
        open={clientSheetOpen}
        onOpenChange={setClientSheetOpen}
      />
    </div>
  )
}

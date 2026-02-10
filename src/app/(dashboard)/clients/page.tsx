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

export default function ClientsPage() {
  const router = useRouter()
  const features = useFeatures()
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">לקוחות</h1>
          <p className="text-gray-600 mt-1">
            סה״כ: {clients?.length || 0} לקוחות
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          הוסף לקוח
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="חפש לפי שם או טלפון..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">טוען...</div>
        ) : clients && clients.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם</TableHead>
                <TableHead className="text-right">טלפון</TableHead>
                <TableHead className="text-right">ביקור אחרון</TableHead>
                <TableHead className="text-right">סך ביקורים</TableHead>
                <TableHead className="text-right">סך תשלומים</TableHead>
                <TableHead className="text-left">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleClientClick(client)}
                >
                  <TableCell className="font-medium">
                    {client.first_name} {client.last_name}
                  </TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell>
                    {client.last_visit
                      ? format(new Date(client.last_visit), 'dd/MM/yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{client.total_visits}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-green-600">
                    ₪{client.total_paid}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleClientClick(client)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
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
            <p className="text-gray-500 mb-4">אין לקוחות</p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 ml-2" />
              הוסף לקוח ראשון
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

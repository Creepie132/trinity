'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface ExportButtonProps {
  type: 'clients' | 'visits' | 'payments' | 'products'
  format?: 'csv' | 'xlsx'
  dateFrom?: string
  dateTo?: string
}

export function ExportButton({ type, format = 'csv', dateFrom, dateTo }: ExportButtonProps) {
  const { orgId } = useAuth()
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    if (!orgId) {
      toast.error('Organization ID not found')
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        type,
        org_id: orgId,
        format,
      })

      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)

      const response = await fetch(`/api/export?${params.toString()}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      // Download file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Exported successfully / ייצוא הושלם בהצלחה')
    } catch (error: any) {
      console.error('Export error:', error)
      toast.error(error.message || 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={loading}
      variant="outline"
      className="gap-2"
    >
      <Download className="w-4 h-4" />
      {loading ? 'Exporting...' : '📥 Export'}
    </Button>
  )
}

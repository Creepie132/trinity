'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

interface ExportButtonProps {
  type: 'clients' | 'visits' | 'payments' | 'products'
  format?: 'csv' | 'xlsx'
  dateFrom?: string
  dateTo?: string
}

export function ExportButton({ type, format = 'csv', dateFrom, dateTo }: ExportButtonProps) {
  const { orgId, role } = useAuth()
  const { language } = useLanguage()
  const isOwner = role === 'owner'
  const [loading, setLoading] = useState(false)

  // Только owner видит кнопку
  if (!isOwner) return null

  async function handleExport() {
    if (!orgId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ type, org_id: orgId, format })
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)

      const response = await fetch(`/api/export?${params.toString()}`)
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(language === 'he' ? 'ייצוא הושלם' : 'Экспорт завершён')
    } catch (error: any) {
      console.error('Export error:', error)
      toast.error(language === 'he' ? 'שגיאה בייצוא' : 'Ошибка экспорта')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
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
      {loading
        ? <Loader2 className="w-4 h-4 animate-spin relative z-10" />
        : <Download className="w-4 h-4 relative z-10" />}
      <span className="relative z-10">
        {language === 'he' ? 'ייצוא' : 'Экспорт'}
      </span>
    </button>
  )
}

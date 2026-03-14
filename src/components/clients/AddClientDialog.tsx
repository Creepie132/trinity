'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAddClient, useClients } from '@/hooks/useClients'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDemoMode } from '@/hooks/useDemoMode'
import { RefreshCw, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

interface AddClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (client: any) => void
}

export function AddClientDialog({ open, onOpenChange, onSuccess }: AddClientDialogProps) {
  const { orgId, isLoading: authLoading, user } = useAuth()
  const { t, language } = useLanguage()
  const { isDemo } = useDemoMode()
  const { data: clientsData, refetch: refetchClients } = useClients()
  const clientCount = clientsData?.count || 0
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
    date_of_birth: '',
    notes: '',
  })

  const addClient = useAddClient()

  useEffect(() => {
    if (open && process.env.NODE_ENV === 'development') {
      console.log('[AddClientDialog] Dialog opened, orgId:', orgId)
    }
  }, [open, orgId])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!formData.first_name || !formData.last_name || !formData.phone) return
    if (isDemo && clientCount >= 10) return

    try {
      const newClient = await addClient.mutateAsync({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        email: formData.email || null,
        address: formData.address || null,
        date_of_birth: formData.date_of_birth || null,
        notes: formData.notes || null,
      })

      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      await refetchClients()

      setFormData({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        address: '',
        date_of_birth: '',
        notes: '',
      })

      onOpenChange(false)

      // Если передан onSuccess — вызываем с созданным клиентом
      if (onSuccess && newClient) {
        onSuccess(newClient)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[AddClientDialog] Error:', error)
      }
    }
  }

  const isSubmitDisabled = addClient.isPending || authLoading || !orgId || (isDemo && clientCount >= 10)

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={t('clients.addNew')}
      width="520px"
      footer={
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-5 min-h-[44px] rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 whitespace-nowrap"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => handleSubmit()}
            disabled={isSubmitDisabled}
            className="px-5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {addClient.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {authLoading ? t('common.loading') : addClient.isPending ? t('common.saving') : t('common.save')}
          </button>
        </div>
      }
    >
      {/* DEMO limit warning */}
      {isDemo && (
        <div className="space-y-2 mb-4">
          <p className="text-sm text-muted-foreground">
            {language === 'he'
              ? `${clientCount}/10 לקוחות (הגבלת הדגמה)`
              : `${clientCount}/10 клиентов (лимит демо)`}
          </p>
          {clientCount >= 10 && (
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
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first_name">{t('clients.firstName')} *</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="last_name">{t('clients.lastName')} *</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="phone">{t('clients.phone')} *</Label>
          <Input
            id="phone"
            type="tel"
            pattern="[0-9+\-() ]*"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+972-50-1234567"
            required
          />
        </div>

        <div>
          <Label htmlFor="email">{t('clients.email')}</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="address">{t('clients.address')}</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="date_of_birth">{t('clients.birthDate')}</Label>
          <Input
            id="date_of_birth"
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="notes">{t('clients.notes')}</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
        </div>

        {/* Warning if orgId is missing */}
        {!authLoading && !orgId && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                  {t('clients.noOrgFound')}
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  User ID: {user?.id || t('common.notAvailable')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2 rounded-lg border border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900 flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              {t('common.refresh')}
            </button>
          </div>
        )}
      </form>
    </Modal>
  )
}

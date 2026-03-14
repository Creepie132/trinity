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
import { RefreshCw, Loader2, User } from 'lucide-react'
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
    city: '',
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
        city: formData.city || null,
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
        city: '',
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
      title={language === 'he' ? 'לקוח חדש' : 'Новый клиент'}
      width="500px"
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
        {/* Аватар с живыми инициалами */}
        <div className="flex justify-center mb-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg">
            {formData.first_name || formData.last_name ? (
              <span className="text-white font-bold text-xl">
                {(formData.first_name?.[0] || '').toUpperCase()}{(formData.last_name?.[0] || '').toUpperCase()}
              </span>
            ) : (
              <User className="w-7 h-7 text-white/70" />
            )}
          </div>
        </div>

        {/* Имя и фамилия */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="first_name" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t('clients.firstName')} *
            </Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="mt-1"
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="last_name" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t('clients.lastName')} *
            </Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="mt-1"
              required
            />
          </div>
        </div>

        {/* Телефон — главное поле */}
        <div>
          <Label htmlFor="phone" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {t('clients.phone')} *
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+972-50-1234567"
            className="mt-1 text-base"
            required
          />
        </div>

        {/* Email и Дата рождения */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="email" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t('clients.email')}
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="date_of_birth" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t('clients.birthDate')}
            </Label>
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        {/* Адрес и Город */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="address" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {language === 'he' ? 'כתובת' : 'Адрес'}
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="mt-1"
              placeholder={language === 'he' ? 'רחוב, בית' : 'Улица, дом'}
            />
          </div>
          <div>
            <Label htmlFor="city" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {language === 'he' ? 'עיר' : 'Город'}
            </Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="mt-1"
              placeholder={language === 'he' ? 'תל אביב...' : 'Тель-Авив...'}
            />
          </div>
        </div>

        {/* Заметки */}
        <div>
          <Label htmlFor="notes" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {t('clients.notes')}
          </Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="mt-1 resize-none"
            placeholder={language === 'he' ? 'הערות על הלקוח...' : 'Заметки о клиенте...'}
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

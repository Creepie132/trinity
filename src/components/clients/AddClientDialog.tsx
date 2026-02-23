'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAddClient, useClients } from '@/hooks/useClients'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDemoMode } from '@/hooks/useDemoMode'
import { RefreshCw } from 'lucide-react'

interface AddClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddClientDialog({ open, onOpenChange }: AddClientDialogProps) {
  const { orgId, isLoading: authLoading, user, refetch } = useAuth()
  const { t, language } = useLanguage()
  const { isDemo, clientLimit } = useDemoMode()
  const { data: clientsData } = useClients()
  const clientCount = clientsData?.count || 0
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

  // Debug: Log orgId when dialog opens
  useEffect(() => {
    if (open) {
      console.log('[AddClientDialog] Dialog opened')
      console.log('[AddClientDialog] User:', user?.id)
      console.log('[AddClientDialog] OrgId:', orgId)
      console.log('[AddClientDialog] Auth loading:', authLoading)
    }
  }, [open, user, orgId, authLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.first_name || !formData.last_name || !formData.phone) {
      return
    }

    // Check DEMO limit
    if (isDemo && clientCount >= 10) {
      return // Button should be disabled, but double check
    }

    await addClient.mutateAsync({
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone,
      email: formData.email || null,
      address: formData.address || null,
      date_of_birth: formData.date_of_birth || null,
      notes: formData.notes || null,
    })

    // Reset form
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
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('clients.addNew')}</DialogTitle>
        </DialogHeader>

        {/* DEMO limit warning */}
        {isDemo && (
          <div className="space-y-2">
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="w-full border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900"
              >
                <RefreshCw className="w-4 h-4 ml-2" />
                {t('common.refresh')}
              </Button>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={addClient.isPending || authLoading || !orgId || (isDemo && clientCount >= 10)}
            >
              {authLoading ? t('common.loading') : addClient.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

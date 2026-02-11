'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAllOrganizations } from '@/hooks/useAdmin'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface CreateOrgSubscriptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Plan = 'basic' | 'pro' | 'enterprise'

const PLANS = {
  basic: { name: 'Базовый', price: 149, nameHe: 'בסיסי' },
  pro: { name: 'Профессиональный', price: 299, nameHe: 'מקצועי' },
  enterprise: { name: 'Корпоративный', price: 499, nameHe: 'ארגוני' },
}

export function CreateOrgSubscriptionDialog({ open, onOpenChange }: CreateOrgSubscriptionDialogProps) {
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<Plan>('basic')
  const [loading, setLoading] = useState(false)

  const { language } = useLanguage()
  const { data: organizations } = useAllOrganizations()

  const selectedOrg = organizations?.find((o) => o.id === selectedOrgId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedOrgId) {
      toast.error(language === 'he' ? 'בחר ארגון' : 'Выберите организацию')
      return
    }

    if (!selectedOrg) {
      toast.error('Organization not found')
      return
    }

    setLoading(true)

    try {
      const planData = PLANS[selectedPlan]
      
      const response = await fetch('/api/admin/org-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: selectedOrgId,
          orgName: selectedOrg.name,
          orgEmail: selectedOrg.email || `${selectedOrgId}@temp.com`,
          plan: selectedPlan,
          amount: planData.price,
        }),
      })

      const data = await response.json()

      if (data.url) {
        // Open Stripe Checkout in new window
        window.open(data.url, '_blank')
        toast.success(language === 'he' ? 'מעבר לתשלום...' : 'Переход к оплате...')
        handleClose()
      } else {
        toast.error(language === 'he' ? 'שגיאה ביצירת מנוי' : 'Ошибка создания подписки')
      }
    } catch (error) {
      console.error('Org subscription error:', error)
      toast.error(language === 'he' ? 'שגיאה ביצירת מנוי' : 'Ошибка создания подписки')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedOrgId('')
    setSelectedPlan('basic')
    onOpenChange(false)
  }

  const getPlanLabel = (plan: Plan) => {
    return language === 'he' 
      ? `${PLANS[plan].nameHe} - ₪${PLANS[plan].price}/חודש`
      : `${PLANS[plan].name} - ₪${PLANS[plan].price}/мес`
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === 'he' ? 'הוסף מנוי לארגון' : 'Оформить подписку организации'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="organization">
              {language === 'he' ? 'בחר ארגון' : 'Выберите организацию'} *
            </Label>
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'he' ? 'בחר ארגון' : 'Выберите организацию'} />
              </SelectTrigger>
              <SelectContent>
                {organizations?.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name} ({org.email || 'No email'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="plan">
              {language === 'he' ? 'בחר תוכנית' : 'Выберите план'} *
            </Label>
            <Select value={selectedPlan} onValueChange={(value) => setSelectedPlan(value as Plan)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">{getPlanLabel('basic')}</SelectItem>
                <SelectItem value="pro">{getPlanLabel('pro')}</SelectItem>
                <SelectItem value="enterprise">{getPlanLabel('enterprise')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              {language === 'he' ? 'ביטול' : 'Отмена'}
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  {language === 'he' ? 'יוצר...' : 'Создание...'}
                </>
              ) : (
                language === 'he' ? 'הוסף מנוי' : 'Оформить'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

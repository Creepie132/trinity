'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLanguage } from '@/contexts/LanguageContext'
import { CreditCard, Banknote, Smartphone } from 'lucide-react'

interface PaymentMethodModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectMethod: (method: 'card' | 'cash' | 'bit') => void
}

export function PaymentMethodModal({ open, onOpenChange, onSelectMethod }: PaymentMethodModalProps) {
  const { language } = useLanguage()

  const methods = [
    {
      id: 'card' as const,
      icon: <CreditCard className="w-8 h-8" />,
      labelHe: 'כרטיס אשראי',
      labelRu: 'Кредитная карта',
      emoji: '💳',
    },
    {
      id: 'cash' as const,
      icon: <Banknote className="w-8 h-8" />,
      labelHe: 'מזומן',
      labelRu: 'Наличные',
      emoji: '💵',
    },
    {
      id: 'bit' as const,
      icon: <Smartphone className="w-8 h-8" />,
      labelHe: 'BIT',
      labelRu: 'BIT',
      emoji: '📱',
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" dir={language === 'he' ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {language === 'he' ? 'בחר אמצעי תשלום' : 'Выберите способ оплаты'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {methods.map((method) => (
            <button
              key={method.id}
              onClick={() => {
                onSelectMethod(method.id)
                onOpenChange(false)
              }}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition-all ${language === 'he' ? 'text-right flex-row-reverse' : 'text-left'}`}
            >
              <span className="text-3xl">{method.emoji}</span>
              <div className="flex-1">
                <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                  {language === 'he' ? method.labelHe : method.labelRu}
                </p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useModalStore } from '@/store/useModalStore'

interface GdprDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
  locale?: 'he' | 'ru'
}

export function GdprDeleteDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  locale = 'ru',
}: GdprDeleteDialogProps) {
  const queryClient = useQueryClient()
  const { closeModal } = useModalStore()
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)

  const t = {
    he: {
      title: 'מחיקה מלאה של לקוח (GDPR)',
      areYouSure: 'האם אתה בטוח? פעולה זו בלתי הפיכה!',
      willDelete: 'יימחקו כל הנתונים של הלקוח:',
      allVisits: 'כל הביקורים והשירותים',
      allPayments: 'כל התשלומים',
      smsHistory: 'היסטוריית הודעות SMS',
      personalInfo: 'מידע אישי של הלקוח',
      client: 'לקוח',
      confirmInstructions: 'לאישור, הקלד:',
      confirmWord: 'מחק',
      placeholder: 'הקלד מחק',
      cancel: 'ביטול',
      deleteForever: 'מחק לצמיתות',
      deleting: 'מוחק...',
      enterConfirm: 'הקלד "מחק" לאישור',
      deleteSuccess: 'נמחקו: {visits} ביקורים, {payments} תשלומים, {sms} הודעות SMS',
      deleteError: 'שגיאת מחיקה',
    },
    ru: {
      title: 'Полное удаление клиента (GDPR)',
      areYouSure: 'Вы уверены? Это действие НЕОБРАТИМО!',
      willDelete: 'Будут удалены ВСЕ данные клиента:',
      allVisits: 'Все визиты и услуги',
      allPayments: 'Все платежи',
      smsHistory: 'История SMS-сообщений',
      personalInfo: 'Личная информация клиента',
      client: 'Клиент',
      confirmInstructions: 'Для подтверждения введите:',
      confirmWord: 'УДАЛИТЬ',
      placeholder: 'Введите УДАЛИТЬ',
      cancel: 'Отмена',
      deleteForever: 'Удалить навсегда',
      deleting: 'Удаление...',
      enterConfirm: 'Введите "УДАЛИТЬ" для подтверждения',
      deleteSuccess: 'Удалено: {visits} визитов, {payments} платежей, {sms} SMS',
      deleteError: 'Ошибка удаления',
    },
  }

  const text = t[locale]
  const isConfirmed = confirmText === text.confirmWord

  async function handleDelete() {
    if (!isConfirmed) {
      toast.error(text.enterConfirm)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/clients/${clientId}/gdpr-delete`, { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to delete client')

      const successMsg = text.deleteSuccess
        .replace('{visits}', data.deleted.visits)
        .replace('{payments}', data.deleted.payments)
        .replace('{sms}', data.deleted.sms_messages)

      toast.success(successMsg)
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      closeModal('client-details')
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || text.deleteError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setConfirmText('')
        onOpenChange(false)
      }}
      title={text.title}
      width="480px"
      footer={
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              setConfirmText('')
              onOpenChange(false)
            }}
            disabled={loading}
            className="px-5 min-h-[44px] rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 whitespace-nowrap disabled:opacity-50"
          >
            {text.cancel}
          </button>
          <button
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
            className="px-5 min-h-[44px] rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {loading ? text.deleting : text.deleteForever}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Warning Icon */}
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-semibold">{text.areYouSure}</span>
        </div>

        <p className="text-sm text-gray-600">{text.willDelete}</p>

        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600" dir={locale === 'he' ? 'rtl' : 'ltr'}>
          <li>{text.allVisits}</li>
          <li>{text.allPayments}</li>
          <li>{text.smsHistory}</li>
          <li>{text.personalInfo}</li>
        </ul>

        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm text-red-800 dark:text-red-200">
            <strong>{text.client}:</strong> {clientName}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-sm font-medium">
            {text.confirmInstructions} <span className="font-bold">{text.confirmWord}</span>
          </Label>
          <Input
            id="confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={text.placeholder}
            className="font-mono"
            disabled={loading}
            autoComplete="off"
            dir={locale === 'he' ? 'rtl' : 'ltr'}
          />
        </div>
      </div>
    </Modal>
  )
}

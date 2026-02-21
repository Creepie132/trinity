'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface GdprDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
}

export function GdprDeleteDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
}: GdprDeleteDialogProps) {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)

  const isConfirmed = confirmText === 'УДАЛИТЬ'

  async function handleDelete() {
    if (!isConfirmed) {
      toast.error('Введите "УДАЛИТЬ" для подтверждения')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/clients/${clientId}/gdpr-delete`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete client')
      }

      toast.success(
        `Удалено: ${data.deleted.visits} визитов, ${data.deleted.payments} платежей, ${data.deleted.sms_messages} SMS`
      )

      onOpenChange(false)
      router.push('/clients')
      router.refresh()
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error.message || 'Ошибка удаления')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            Полное удаление клиента (GDPR)
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-4">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              Вы уверены? Это действие НЕОБРАТИМО!
            </p>
            <p>
              Будут удалены <span className="font-bold">ВСЕ</span> данные клиента:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Все визиты и услуги</li>
              <li>Все платежи</li>
              <li>История SMS-сообщений</li>
              <li>Личная информация клиента</li>
            </ul>
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>Клиент:</strong> {clientName}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-sm font-medium">
              Для подтверждения введите: <span className="font-bold">УДАЛИТЬ</span>
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Введите УДАЛИТЬ"
              className="font-mono"
              disabled={loading}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setConfirmText('')
              onOpenChange(false)
            }}
            disabled={loading}
          >
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {loading ? 'Удаление...' : 'Удалить навсегда'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Trash2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

interface AdminDeletePaymentButtonProps {
  paymentId: string
}

export function AdminDeletePaymentButton({ paymentId }: AdminDeletePaymentButtonProps) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const handleDelete = async () => {
    if (!password) {
      toast.error('Введите пароль')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Ошибка удаления')
        return
      }
      toast.success('Платёж удалён')
      setOpen(false)
      setPassword('')
      // Обновляем список платежей
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    } catch {
      toast.error('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
        title="Удалить платёж (только для администратора)"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPassword('') }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Удалить платёж
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Это действие нельзя отменить. Введите пароль администратора для подтверждения.
            </p>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Пароль администратора"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Отмена
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading || !password}
              >
                {loading ? 'Удаляю...' : 'Удалить навсегда'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

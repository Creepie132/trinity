'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAddClient } from '@/hooks/useClients'
import { useAuth } from '@/hooks/useAuth'
import { RefreshCw } from 'lucide-react'

interface AddClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddClientDialog({ open, onOpenChange }: AddClientDialogProps) {
  const { orgId, isLoading: authLoading, user, refetch } = useAuth()
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
          <DialogTitle>הוסף לקוח חדש</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">שם פרטי *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="last_name">שם משפחה *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone">טלפון *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+972-50-1234567"
              required
            />
          </div>

          <div>
            <Label htmlFor="email">אימייל</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="address">כתובת</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="date_of_birth">תאריך לידה</Label>
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="notes">הערות</Label>
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
                    לא נמצא ארגון למשתמש
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    User ID: {user?.id || 'לא זמין'}
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
                רענן נתונים
              </Button>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ביטול
            </Button>
            <Button 
              type="submit" 
              disabled={addClient.isPending || authLoading || !orgId}
            >
              {authLoading ? 'טוען...' : addClient.isPending ? 'שומר...' : 'שמור'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

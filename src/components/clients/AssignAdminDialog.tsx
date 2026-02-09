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
import { Label } from '@/components/ui/label'
import { Shield, Users } from 'lucide-react'
import { toast } from 'sonner'

interface AssignAdminDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientEmail: string
  onSuccess?: () => void
}

export function AssignAdminDialog({
  open,
  onOpenChange,
  clientEmail,
  onSuccess,
}: AssignAdminDialogProps) {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator'>('admin')
  const [isLoading, setIsLoading] = useState(false)

  const handleAssign = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: clientEmail,
          role: selectedRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'שגיאה במינוי מנהל')
        return
      }

      toast.success(data.message || 'המשתמש מונה בהצלחה')
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Assign admin error:', error)
      toast.error('שגיאה במינוי מנהל')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>בחר תפקיד</DialogTitle>
          <DialogDescription>
            בחר את רמת ההרשאות עבור {clientEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Admin Role */}
          <button
            onClick={() => setSelectedRole('admin')}
            className={`w-full p-4 rounded-lg border-2 transition-all text-right ${
              selectedRole === 'admin'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                selectedRole === 'admin' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
              }`}>
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 dark:text-white mb-1">
                  אדמין
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  גישה מלאה לכל המערכת - ניהול ארגונים, ביילינג, פרסומות, והרשאות
                </div>
              </div>
              {selectedRole === 'admin' && (
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </div>
          </button>

          {/* Moderator Role */}
          <button
            onClick={() => setSelectedRole('moderator')}
            className={`w-full p-4 rounded-lg border-2 transition-all text-right ${
              selectedRole === 'moderator'
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950'
                : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                selectedRole === 'moderator' 
                  ? 'bg-amber-500 text-white' 
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
              }`}>
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 dark:text-white mb-1">
                  מנהל
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  גישה לצפייה בארגונים וביילינג. ללא אפשרות למחוק ארגונים או לנהל מנהלים אחרים
                </div>
              </div>
              {selectedRole === 'moderator' && (
                <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </div>
          </button>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            ביטול
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={isLoading}
            className={
              selectedRole === 'admin'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-amber-500 hover:bg-amber-600'
            }
          >
            {isLoading ? 'ממנה...' : 'מנה כעת'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

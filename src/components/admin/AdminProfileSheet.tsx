'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { User, Mail, Phone, Building2, Shield, CheckCircle2, XCircle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

interface AdminProfile {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'moderator'
  phone: string
  organization: {
    id: string
    name: string
    role: string
  } | null
}

interface AdminProfileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdminProfileSheet({ open, onOpenChange }: AdminProfileSheetProps) {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  })

  useEffect(() => {
    if (open) {
      fetchProfile()
    }
  }, [open])

  const fetchProfile = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/profile')
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }
      const data = await response.json()
      setProfile(data)
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
      })
    } catch (error: any) {
      toast.error('שגיאה בטעינת הפרופיל')
      console.error('Fetch profile error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const data = await response.json()
      toast.success(data.message || 'הפרופיל עודכן בהצלחה')
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['admin-profile'] })
      
      onOpenChange(false)
    } catch (error: any) {
      toast.error('שגיאה בעדכון הפרופיל')
      console.error('Update profile error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md overflow-y-auto bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800"
      >
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            הפרופיל שלי
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-slate-600 dark:text-slate-400">טוען פרופיל...</p>
            </div>
          </div>
        ) : profile ? (
          <div className="space-y-6 py-6">
            {/* Avatar & Role Badge */}
            <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl border-2 border-blue-100 dark:border-slate-600">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-4xl shadow-2xl ring-4 ring-white dark:ring-slate-800">
                {(formData.full_name || profile.email)[0]?.toUpperCase() || 'A'}
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {formData.full_name || profile.email.split('@')[0]}
                </h3>
                
                <Badge 
                  variant={profile.role === 'admin' ? 'default' : 'secondary'}
                  className={profile.role === 'admin' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1.5 text-sm' 
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200 px-4 py-1.5 text-sm'
                  }
                >
                  {profile.role === 'admin' ? (
                    <>
                      <Shield className="w-3.5 h-3.5 ml-1.5" />
                      מנהל מערכת
                    </>
                  ) : (
                    <>
                      <User className="w-3.5 h-3.5 ml-1.5" />
                      מפקח
                    </>
                  )}
                </Badge>
              </div>
            </div>

            {/* Readonly Info */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                פרטים קבועים
              </h4>

              <div className="space-y-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                {/* Email (readonly) */}
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">אימייל</p>
                    <p className="text-sm text-slate-900 dark:text-white font-medium break-all">{profile.email}</p>
                  </div>
                </div>

                {/* Organization (readonly) */}
                {profile.organization && (
                  <>
                    <Separator className="bg-slate-300 dark:bg-slate-600" />
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">ארגון</p>
                        <p className="text-sm text-slate-900 dark:text-white font-medium">{profile.organization.name}</p>
                        <Badge variant="outline" className="mt-1.5 text-xs">
                          {profile.organization.role === 'owner' ? 'בעלים' : 
                           profile.organization.role === 'admin' ? 'מנהל' : 'צוות'}
                        </Badge>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Editable Fields */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-amber-600" />
                ניתן לעריכה
              </h4>

              {/* Full Name */}
              <div>
                <Label htmlFor="full_name" className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  שם מלא
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="הזן שם מלא"
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  טלפון
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+972-50-1234567"
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                disabled={isSaving}
              >
                ביטול
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
                    שומר...
                  </>
                ) : (
                  'שמור שינויים'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-slate-600 dark:text-slate-400">
            שגיאה בטעינת הפרופיל
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

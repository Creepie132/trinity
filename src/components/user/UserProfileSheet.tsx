'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { User, Mail, Phone, Building2, Shield, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { supabase } from '@/lib/supabase'

interface UserProfileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserProfileSheet({ open, onOpenChange }: UserProfileSheetProps) {
  const { user, orgId, isAdmin, isLoading: authLoading, refetch } = useAuth()
  const { data: organization, isLoading: orgLoading } = useOrganization()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loadingAvatar, setLoadingAvatar] = useState(true)

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'משתמש'
  const displayEmail = user?.email || ''

  // Load avatar URL from org_users
  useEffect(() => {
    if (user && open) {
      setLoadingAvatar(true)
      supabase
        .from('org_users')
        .select('avatar_url')
        .eq('user_id', user.id)
        .single()
        .then(({ data, error }) => {
          if (data && !error) {
            setAvatarUrl(data.avatar_url)
          }
          setLoadingAvatar(false)
        })
    }
  }, [user, open])

  useEffect(() => {
    if (open) {
      console.log('[UserProfileSheet] Opened with state:', {
        hasUser: !!user,
        userId: user?.id,
        hasOrgId: !!orgId,
        orgId: orgId,
        authLoading,
        orgLoading
      })
    }
  }, [open, user, orgId, authLoading, orgLoading])

  const handleAvatarUpdate = (newUrl: string) => {
    setAvatarUrl(newUrl)
    // Optionally refetch auth data to update sidebar
    refetch()
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

        {authLoading || orgLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-slate-600 dark:text-slate-400">
                {authLoading ? 'טוען פרופיל...' : 'טוען ארגון...'}
              </p>
            </div>
          </div>
        ) : user ? (
          <div className="space-y-6 py-6">
            {/* Avatar Upload & User Info */}
            <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl border-2 border-blue-100 dark:border-slate-600">
              {loadingAvatar ? (
                <div className="w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
              ) : (
                <AvatarUpload 
                  currentAvatarUrl={avatarUrl}
                  userName={displayName}
                  onUploadSuccess={handleAvatarUpdate}
                />
              )}
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {displayName}
                </h3>
                
                {isAdmin && (
                  <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1.5 text-sm">
                    <Shield className="w-3.5 h-3.5 ml-1.5" />
                    מנהל מערכת
                  </Badge>
                )}
              </div>
            </div>

            {/* Debug Info - Only visible to admins */}
            {isAdmin && (
              <div className="space-y-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  מידע טכני (Debug)
                </h4>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-yellow-700 dark:text-yellow-300">User ID:</span>
                    <span className="text-yellow-900 dark:text-yellow-100 font-semibold break-all">
                      {user?.id || '❌ לא זמין'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-700 dark:text-yellow-300">Org ID:</span>
                    <span className="text-yellow-900 dark:text-yellow-100 font-semibold break-all">
                      {orgId || '❌ לא זמין'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-700 dark:text-yellow-300">Auth Status:</span>
                    <span className="text-yellow-900 dark:text-yellow-100 font-semibold">
                      {authLoading ? '⏳ טוען...' : user ? '✅ מחובר' : '❌ לא מחובר'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-700 dark:text-yellow-300">Is Admin:</span>
                    <span className="text-yellow-900 dark:text-yellow-100 font-semibold">
                      {isAdmin ? '✅ כן' : '❌ לא'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="w-full mt-2 border-yellow-300 dark:border-yellow-700"
                >
                  רענן נתונים
                </Button>
              </div>
            )}

            {/* Account Info */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                פרטי חשבון
              </h4>

              <div className="space-y-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                {/* Email */}
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">אימייל</p>
                    <p className="text-sm text-slate-900 dark:text-white font-medium break-all">
                      {displayEmail || 'לא זמין'}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                {user?.phone && (
                  <>
                    <Separator className="bg-slate-300 dark:bg-slate-600" />
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">טלפון</p>
                        <p className="text-sm text-slate-900 dark:text-white font-medium" dir="ltr">
                          {user.phone}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Organization */}
                {organization && (
                  <>
                    <Separator className="bg-slate-300 dark:bg-slate-600" />
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">ארגון</p>
                        <p className="text-sm text-slate-900 dark:text-white font-medium">
                          {organization.name}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {organization.plan === 'basic' ? 'תוכנית בסיסית' : 
                             organization.plan === 'pro' ? 'תוכנית Pro' : 
                             'תוכנית Enterprise'}
                          </Badge>
                          <Badge 
                            variant={organization.is_active ? 'default' : 'destructive'} 
                            className="text-xs"
                          >
                            {organization.is_active ? 'פעיל' : 'חסום'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Close Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              >
                סגור
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500" />
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                לא מחובר למערכת
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                אנא התחבר מחדש
              </p>
            </div>
            <Button onClick={() => window.location.href = '/login'}>
              התחבר
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

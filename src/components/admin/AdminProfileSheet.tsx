'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { User, Mail, Phone, Building2, Shield, Loader2, Save } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { supabase } from '@/lib/supabase'

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
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loadingAvatar, setLoadingAvatar] = useState(true)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  })

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
      fetchProfile()
    }
  }, [open])

  const handleAvatarUpdate = (newUrl: string) => {
    setAvatarUrl(newUrl)
    queryClient.invalidateQueries({ queryKey: ['admin-profile'] })
  }

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
      queryClient.invalidateQueries({ queryKey: ['admin-profile'] })
      onOpenChange(false)
    } catch (error: any) {
      toast.error('שגיאה בעדכון הפרופיל')
      console.error('Update profile error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title="הפרופיל שלי"
      width="440px"
      footer={
        profile && (
          <div className="flex gap-2">
            <button
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-[1.5] py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  שמור שינויים
                </>
              )}
            </button>
          </div>
        )
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
            <p className="text-gray-500">טוען פרופיל...</p>
          </div>
        </div>
      ) : profile ? (
        <div className="space-y-6" dir="rtl">
          {/* Avatar Upload & Role Badge */}
          <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl">
            {loadingAvatar ? (
              <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
            ) : (
              <AvatarUpload 
                currentAvatarUrl={avatarUrl}
                userName={formData.full_name || profile.email.split('@')[0]}
                onUploadSuccess={handleAvatarUpdate}
              />
            )}
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {formData.full_name || profile.email.split('@')[0]}
              </h3>
              
              <Badge 
                className={profile.role === 'admin' 
                  ? 'bg-indigo-600 text-white px-3 py-1' 
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200 px-3 py-1'
                }
              >
                {profile.role === 'admin' ? (
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    מנהל מערכת
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    מפקח
                  </span>
                )}
              </Badge>
            </div>
          </div>

          {/* Readonly Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="flex items-center gap-2 text-gray-500">
                <Mail className="w-4 h-4" />
                <span className="text-xs">אימייל</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                {profile.email}
              </span>
            </div>

            {profile.organization && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="flex items-center gap-2 text-gray-500">
                  <Building2 className="w-4 h-4" />
                  <span className="text-xs">ארגון</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {profile.organization.name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {profile.organization.role === 'owner' ? 'בעלים' : 
                     profile.organization.role === 'admin' ? 'מנהל' : 'צוות'}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Editable Fields */}
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                שם מלא
              </label>
              <input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="הזן שם מלא"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                טלפון
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+972-50-1234567"
                className={inputClass}
                dir="ltr"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-500">
          שגיאה בטעינת הפרופיל
        </div>
      )}
    </Modal>
  )
}

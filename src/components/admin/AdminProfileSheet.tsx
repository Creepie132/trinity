'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { User, Mail, Phone, Building2, Shield, Loader2, Save } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
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
  const { language } = useLanguage()
  const isRTL = language === 'he'

  const l = {
    he: { title: 'הפרופיל שלי', fullName: 'שם מלא', phone: 'טלפון', cancel: 'ביטול', save: 'שמור שינויים', saving: 'שומר...', loading: 'טוען פרופיל...', error: 'שגיאה בטעינת הפרופיל', admin: 'מנהל מערכת', moderator: 'מפקח', email: 'אימייל', org: 'ארגון', namePlaceholder: 'הזן שם מלא' },
    ru: { title: 'Мой профиль', fullName: 'Полное имя', phone: 'Телефон', cancel: 'Отмена', save: 'Сохранить', saving: 'Сохранение...', loading: 'Загрузка профиля...', error: 'Ошибка загрузки профиля', admin: 'Администратор', moderator: 'Модератор', email: 'Email', org: 'Организация', namePlaceholder: 'Введите имя' },
  }
  const t = l[language as 'he' | 'ru'] || l.ru
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
      if (!response.ok) throw new Error('Failed to fetch profile')
      const data = await response.json()
      setProfile(data)
      setFormData({ full_name: data.full_name || '', phone: data.phone || '' })
    } catch (error: any) {
      toast.error(t.error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) throw new Error('Failed to update profile')
      const data = await response.json()
      toast.success(data.message || (language === 'he' ? 'הפרופיל עודכן בהצלחה' : 'Профиль сохранён'))
      queryClient.invalidateQueries({ queryKey: ['admin-profile'] })
      onOpenChange(false)
    } catch (error: any) {
      toast.error(language === 'he' ? 'שגיאה בעדכון הפרופיל' : 'Ошибка сохранения профиля')
    } finally {
      setIsSaving(false)
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={t.title}
      width="440px"
      dir={isRTL ? 'rtl' : 'ltr'}
      footer={
        profile && (
          <div className="flex gap-2">
            <button onClick={() => onOpenChange(false)} disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50">
              {t.cancel}
            </button>
            <button onClick={handleSave} disabled={isSaving}
              className="flex-[1.5] py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
              {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />{t.saving}</> : <><Save className="w-4 h-4" />{t.save}</>}
            </button>
          </div>
        )
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-48 gap-3 flex-col">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm text-gray-400">{t.loading}</p>
        </div>
      ) : profile ? (
        <div className="space-y-5" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Аватар */}
          <div className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl">
            {loadingAvatar ? (
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ) : (
              <AvatarUpload currentAvatarUrl={avatarUrl}
                userName={formData.full_name || profile.email.split('@')[0]}
                onUploadSuccess={handleAvatarUpdate} />
            )}
            <div className="text-center">
              <p className="font-bold text-gray-900 dark:text-white">
                {formData.full_name || profile.email.split('@')[0]}
              </p>
              <Badge className={profile.role === 'admin' ? 'bg-indigo-600 text-white mt-1' : 'bg-amber-100 text-amber-700 mt-1'}>
                <Shield className="w-3 h-3 mr-1" />
                {profile.role === 'admin' ? t.admin : t.moderator}
              </Badge>
            </div>
          </div>

          {/* Info строки */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
              <span className="text-xs text-gray-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{t.email}</span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate ml-4">{profile.email}</span>
            </div>
            {profile.organization && (
              <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <span className="text-xs text-gray-400 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{t.org}</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{profile.organization.name}</span>
              </div>
            )}
          </div>

          {/* Редактируемые поля */}
          <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div>
              <label className="text-xs text-gray-500 mb-1 flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{t.fullName}</label>
              <input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder={t.namePlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{t.phone}</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+972-50-1234567"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                dir="ltr" />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">{t.error}</div>
      )}
    </Modal>
  )
}

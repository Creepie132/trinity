'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { User, Mail, Phone, Building2, Shield, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useLanguage } from '@/contexts/LanguageContext'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { supabase } from '@/lib/supabase'

interface UserProfileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserProfileSheet({ open, onOpenChange }: UserProfileSheetProps) {
  const { user, orgId, isAdmin, isLoading: authLoading } = useAuth()
  const { data: organization, isLoading: orgLoading } = useOrganization()
  const { language } = useLanguage()
  const isRTL = language === 'he'
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loadingAvatar, setLoadingAvatar] = useState(true)

  const l = {
    he: { title: 'הפרופיל שלי', close: 'סגור', account: 'פרטי חשבון', email: 'אימייל', phone: 'טלפון', org: 'ארגון', loading: 'טוען...', notLoggedIn: 'לא מחובר', login: 'התחבר', basic: 'בסיסי', pro: 'Pro', enterprise: 'Enterprise', active: 'פעיל', blocked: 'חסום', admin: 'מנהל מערכת', debug: 'מידע טכני', userId: 'User ID', orgId: 'Org ID' },
    ru: { title: 'Мой профиль', close: 'Закрыть', account: 'Данные аккаунта', email: 'Email', phone: 'Телефон', org: 'Организация', loading: 'Загрузка...', notLoggedIn: 'Не авторизован', login: 'Войти', basic: 'Базовый', pro: 'Pro', enterprise: 'Enterprise', active: 'Активен', blocked: 'Заблокирован', admin: 'Администратор', debug: 'Техническая информация', userId: 'User ID', orgId: 'Org ID' },
  }
  const t = l[language as 'he' | 'ru'] || l.ru

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'משתמש'
  const displayEmail = user?.email || ''

  useEffect(() => {
    if (user && open) {
      setLoadingAvatar(true)
      supabase
        .from('org_users')
        .select('avatar_url')
        .eq('user_id', user.id)
        .single()
        .then(({ data, error }) => {
          if (data && !error) setAvatarUrl(data.avatar_url)
          setLoadingAvatar(false)
        })
    }
  }, [user, open])

  const handleAvatarUpdate = (newUrl: string) => setAvatarUrl(newUrl)

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} title={t.title} width="440px"
      dir={isRTL ? 'rtl' : 'ltr'}
      footer={
        <button onClick={() => onOpenChange(false)}
          className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
          {t.close}
        </button>
      }
    >
      {authLoading || orgLoading ? (
        <div className="flex items-center justify-center h-40 gap-3 flex-col">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">{t.loading}</p>
        </div>
      ) : user ? (
        <div className="space-y-5" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Аватар */}
          <div className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl">
            {loadingAvatar ? (
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ) : (
              <AvatarUpload currentAvatarUrl={avatarUrl} userName={displayName} onUploadSuccess={handleAvatarUpdate} />
            )}
            <div className="text-center">
              <p className="font-bold text-lg text-gray-900 dark:text-white">{displayName}</p>
              {isAdmin && (
                <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white mt-1 text-xs">
                  <Shield className="w-3 h-3 mr-1" />{t.admin}
                </Badge>
              )}
            </div>
          </div>

          {/* Данные аккаунта */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{t.account}</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <span className="text-xs text-gray-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{t.email}</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate ml-4 max-w-[200px]">{displayEmail}</span>
              </div>
              {user?.phone && (
                <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                  <span className="text-xs text-gray-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{t.phone}</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200" dir="ltr">{user.phone}</span>
                </div>
              )}
              {organization && (
                <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                  <span className="text-xs text-gray-400 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{t.org}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{organization.name}</span>
                    <Badge variant={organization.is_active ? 'default' : 'destructive'} className="text-xs">
                      {organization.is_active ? t.active : t.blocked}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Debug только для admin */}
          {isAdmin && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />{t.debug}
              </p>
              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-amber-600">{t.userId}:</span>
                  <span className="text-amber-900 dark:text-amber-100 truncate">{user?.id}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-amber-600">{t.orgId}:</span>
                  <span className="text-amber-900 dark:text-amber-100 truncate">{orgId || '—'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-40 gap-3">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-sm text-gray-500">{t.notLoggedIn}</p>
          <button onClick={() => window.location.href = '/login'}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            {t.login}
          </button>
        </div>
      )}
    </Modal>
  )
}

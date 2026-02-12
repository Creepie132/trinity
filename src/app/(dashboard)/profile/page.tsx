'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, Building2, Calendar, Globe, Moon, Sun, LogOut } from 'lucide-react'
import { format } from 'date-fns'

export default function ProfilePage() {
  const { user, orgId, signOut } = useAuth()
  const { data: organization } = useOrganization(orgId || undefined)
  const { language, setLanguage, t } = useLanguage()
  const { darkMode, setDarkMode } = useTheme()
  const router = useRouter()
  const [userRole, setUserRole] = useState<string>('')
  const [joinedAt, setJoinedAt] = useState<string>('')

  // Load user role and joined date
  useEffect(() => {
    if (!orgId || !user) return

    supabase
      .from('org_users')
      .select('role, joined_at')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setUserRole(data.role)
          setJoinedAt(data.joined_at)
        }
      })
  }, [orgId, user])

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, { he: string; ru: string }> = {
      owner: { he: 'בעלים', ru: 'Владелец' },
      manager: { he: 'מנהל', ru: 'Менеджер' },
      user: { he: 'משתמש', ru: 'Пользователь' },
    }
    return labels[role]?.[language] || role
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{language === 'he' ? 'טוען...' : 'Загрузка...'}</p>
        </div>
      </div>
    )
  }

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {language === 'he' ? 'פרופיל' : 'Профиль'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {language === 'he' ? 'נהל את הפרטים והעדפות שלך' : 'Управление данными и настройками'}
        </p>
      </div>

      {/* User Info Card */}
      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <User className="w-5 h-5" />
            {language === 'he' ? 'פרטים אישיים' : 'Личные данные'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar and Name */}
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-2xl">
                {displayName?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{displayName}</h2>
              <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
            </div>
          </div>

          {/* Role */}
          {userRole && (
            <div>
              <Label className="text-gray-700 dark:text-gray-300">{language === 'he' ? 'תפקיד' : 'Роль'}</Label>
              <div className="mt-1">
                <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  {getRoleLabel(userRole)}
                </Badge>
              </div>
            </div>
          )}

          {/* Organization */}
          {organization && (
            <div>
              <Label className="text-gray-700 dark:text-gray-300">{language === 'he' ? 'ארגון' : 'Организация'}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-gray-100">{organization.name}</span>
              </div>
            </div>
          )}

          {/* Joined Date */}
          {joinedAt && (
            <div>
              <Label className="text-gray-700 dark:text-gray-300">{language === 'he' ? 'תאריך הצטרפות' : 'Дата регистрации'}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-gray-100">
                  {format(new Date(joinedAt), 'dd/MM/yyyy')}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Globe className="w-5 h-5" />
            {language === 'he' ? 'הגדרות' : 'Настройки'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-gray-900 dark:text-gray-100">{language === 'he' ? 'שפה' : 'Язык'}</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'he' ? 'עברית / Русский' : 'Иврит / Русский'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === 'he' ? 'ru' : 'he')}
              className="border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            >
              {language === 'he' ? 'עברית' : 'Русский'}
            </Button>
          </div>

          {/* Dark Mode */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
                {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {language === 'he' ? 'מצב כהה' : 'Тёмная тема'}
              </Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'he' ? 'החלף בין מצב בהיר לכהה' : 'Переключение между светлой и тёмной темой'}
              </p>
            </div>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
        <CardContent className="pt-6">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 ml-2" />
            {language === 'he' ? 'התנתק' : 'Выйти'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

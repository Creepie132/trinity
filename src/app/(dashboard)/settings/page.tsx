'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePermissions } from '@/hooks/usePermissions'
import { useFeatures } from '@/hooks/useFeatures'
import { Globe, ArrowLeft, Package, FileText, Calendar, Building2, Users, Shield, MessageSquare, Bell } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const { t, language } = useLanguage()
  const permissions = usePermissions()
  const features = useFeatures()

  // Статичные описания — не грузим лишних данных только ради subtitle
  const settingsCategories = [
    {
      id: 'language',
      href: '/settings/language',
      icon: Globe,
      title: t('settings.language'),
      description: t('settings.language.desc'),
    },
    {
      id: 'booking',
      href: '/settings/booking',
      icon: Calendar,
      title: t('settings.booking'),
      description: t('settings.booking.desc'),
    },
    {
      id: 'message-templates',
      href: '/settings/message-templates',
      icon: MessageSquare,
      title: language === 'he' ? 'תבניות הודעות' : 'Шаблоны сообщений',
      description: language === 'he' ? 'הגדר הודעות ברירת מחדל ל-SMS ו-WhatsApp' : 'Шаблоны по умолчанию для SMS и WhatsApp',
    },
    {
      id: 'services',
      href: '/settings/services',
      icon: Package,
      title: t('services.title'),
      description: t('services.emptyState.desc'),
    },
    {
      id: 'care-instructions',
      href: '/settings/care-instructions',
      icon: FileText,
      title: t('careInstructions.title'),
      description: t('careInstructions.noInstructions'),
    },
    {
      id: 'branches',
      href: '/settings/branches',
      icon: Building2,
      title: language === 'he' ? 'ניהול סניפים' : 'Управление филиалами',
      description: language === 'he' ? 'ניהל סניפים ומיקומים' : 'Управляйте филиалами и локациями',
    },
    {
      id: 'users',
      href: '/settings/users',
      icon: Users,
      title: language === 'he' ? 'ניהול צוות' : 'Управление командой',
      description: language === 'he' ? 'הזמן עובדים ונהל הרשאות' : 'Приглашайте сотрудников и управляйте правами',
    },
    {
      id: 'permissions',
      href: '/settings/permissions',
      icon: Shield,
      title: language === 'he' ? 'הרשאות' : 'Разрешения',
      description: language === 'he' ? 'קבע מה כל עובד יכול לעשות' : 'Управляйте доступом сотрудников',
    },
    {
      id: 'notifications',
      href: '/settings/notifications',
      icon: Bell,
      title: language === 'he' ? 'התראות' : 'Уведомления',
      description: language === 'he' ? 'Push, Telegram — הגדר מה תקבל ומתי' : 'Push, Telegram — настройте что и когда получать',
    },
  ]

  // Фильтрация оптимистичная: пока features/permissions грузятся — показываем все карточки.
  // Убираем только после того как данные пришли и явно запрещают доступ.
  const filteredCategories = settingsCategories.filter((category) => {
    // Скрываем только если features уже загружены И модуль отключён
    if (!features.isLoading) {
      if (category.id === 'booking' && features.hasBooking === false) return false
      if (category.id === 'branches' && !features.hasBranches) return false
    }
    // Скрываем только если role уже известна И доступ запрещён
    if (permissions.canManageServices === false && category.id === 'services') return false
    if (permissions.canManageCareInstructions === false && category.id === 'care-instructions') return false
    if (permissions.canManageBookingSettings === false && category.id === 'booking') return false
    if (permissions.canManageUsers === false && category.id === 'users') return false
    if (permissions.canManageUsers === false && category.id === 'permissions') return false

    return true
  })

  return (
    <div id="demo-step-settings" className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('settings.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Settings Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCategories.map((category) => (
          <Link key={category.id} href={category.href}>
            <Card className="hover:shadow-lg transition-all cursor-pointer group h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-theme-primary bg-opacity-10 group-hover:bg-opacity-20 transition-colors">
                    <category.icon className="w-6 h-6 text-theme-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {category.title}
                    </div>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-theme-primary transition-colors" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {category.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

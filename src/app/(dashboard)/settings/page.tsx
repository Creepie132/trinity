'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePermissions } from '@/hooks/usePermissions'
import { useFeatures } from '@/hooks/useFeatures'
import { Globe, ArrowLeft, Package, FileText, Calendar } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const { t } = useLanguage()
  const permissions = usePermissions()
  const features = useFeatures()

  const settingsCategories = [
    // { id: 'dashboard', href: '/settings/dashboard', icon: LayoutDashboard, title: t('dashboard.settings'), description: t('dashboard.settingsSubtitle') },
    // { id: 'display', href: '/settings/display', icon: Monitor, title: t('settings.display'), description: t('settings.display.desc') },
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
    // { id: 'notifications', href: '/settings/notifications', icon: Bell, title: 'Telegram Notifications / התראות Telegram', description: 'Receive instant notifications about bookings and payments' },
    // { id: 'loyalty', href: '/settings/loyalty', icon: Star, title: 'Loyalty Program / תוכנית נאמנות', description: 'Manage customer loyalty points and rewards' },
    // { id: 'templates', href: '/settings/templates', icon: MessageSquare, title: 'Message Templates / תבניות הודעות', description: 'Manage SMS message templates / נהל תבניות הודעות SMS' },
    // { id: 'birthday-templates', href: '/settings/birthday-templates', icon: Cake, title: t('birthdays.templatesTitle'), description: t('birthdays.templatesSubtitle') },
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
      id: 'aftercare',
      href: '/settings/aftercare',
      icon: FileText,
      title: t('aftercareInstructions.title'),
      description: t('aftercareInstructions.description'),
    },
    // { id: 'users', href: '/settings/users', icon: Users, title: t('settings.users'), description: t('settings.users.desc') },
    // { id: 'service-colors', href: '/settings/service-colors', icon: Palette, title: t('settings.serviceColors'), description: t('settings.serviceColors.desc') },
  ]

  // Filter settings based on permissions AND module access
  const filteredCategories = settingsCategories.filter((category) => {
    // Check module access first (if module is disabled, hide the setting)
    if (category.id === 'booking' && features.hasBooking === false) return false
    
    // Owner-only settings (check permissions)
    if (category.id === 'services' && !permissions.canManageServices) return false
    if (category.id === 'care-instructions' && !permissions.canManageCareInstructions) return false
    if (category.id === 'aftercare' && !permissions.canManageAftercareInstructions) return false
    if (category.id === 'booking' && !permissions.canManageBookingSettings) return false
    
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
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

      {/* Advanced Settings Placeholder - REMOVED */}
    </div>
  )
}

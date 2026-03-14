'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Users, CreditCard, MessageSquare, BarChart3, Shield, Gift, Home, LogOut, Calendar, Settings, BookOpen, Package, UserPlus, CalendarPlus, ShoppingCart, ShoppingBag, GitBranch } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useFeatures } from '@/hooks/useFeatures'
import { useLanguage } from '@/contexts/LanguageContext'
import { Separator } from '@/components/ui/separator'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { BranchSwitcher } from '@/components/BranchSwitcher'
import { useModalStore } from '@/store/useModalStore'

const baseNavigation = [
  { name_he: 'דשבורד', name_ru: 'Дашборд', href: '/dashboard', icon: Home, requireFeature: null },
  { name_he: 'לקוחות', name_ru: 'Клиенты', href: '/clients', icon: Users, requireFeature: 'clients' },
  { name_he: 'ביקורים', name_ru: 'Визиты', href: '/visits', icon: Calendar, requireFeature: 'visits' },
  { name_he: 'מכירות', name_ru: 'Продажи', href: '/sales', icon: ShoppingBag, requireFeature: 'sales' },
  { name_he: 'תשלומים', name_ru: 'Платежи', href: '/payments', icon: CreditCard, requireFeature: 'payments' },
  { name_he: 'מלאי', name_ru: 'Склад', href: '/inventory', icon: Package, requireFeature: 'inventory' },
  { name_he: 'יומן', name_ru: 'Дневник', href: '/diary', icon: BookOpen, requireFeature: 'diary' },
  { name_he: 'אנליטיקה', name_ru: 'Аналитика', href: '/analytics', icon: BarChart3, requireFeature: 'analytics' },
  { name_he: 'סניפים', name_ru: 'Филиалы', href: '/settings?tab=branches', icon: GitBranch, requireFeature: 'branches' },
  { name_he: 'הגדרות', name_ru: 'Настройки', href: '/settings', icon: Settings, requireFeature: null },
]

const translations = {
  he: { adminPanel: 'פאנל ניהול', logout: 'יציאה מהמערכת' },
  ru: { adminPanel: 'Панель управления', logout: 'Выход' },
}

interface SidebarProps { onSearchOpen?: () => void }

export function Sidebar({ onSearchOpen }: SidebarProps = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const { data: isAdmin } = useIsAdmin()
  const features = useFeatures()
  const { language } = useLanguage()
  const { openModal } = useModalStore()
  const t = translations[language]
  const locale = language === 'he' ? 'he' : 'ru'

  const onLogout = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  const navigation = baseNavigation.filter((item) => {
    if (!item.requireFeature) return true
    const featureMap: Record<string, boolean> = {
      'clients': features.hasClients,
      'visits': features.hasVisits,
      'payments': features.hasPayments && features.paymentsEnabled,
      'inventory': features.hasInventory,
      'diary': features.hasDiary,
      'sms': features.hasSms,
      'analytics': features.hasAnalytics,
      'statistics': features.hasStatistics,
      'reports': features.hasReports,
      'subscriptions': features.hasSubscriptions,
      'booking': features.hasBooking,
      'loyalty': features.hasLoyalty,
      'sales': features.hasSales,
      'branches': features.hasBranches,
    }
    return featureMap[item.requireFeature] ?? true
  })

  return (
    <div className="w-64 h-full flex flex-col bg-gradient-to-b from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 shadow-lg">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
              <img src="/logo.png" alt="Amber Solutions" className="w-10 h-10 object-cover rounded-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Trinity</h1>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Amber Solutions Systems</p>
            </div>
          </div>
          <NotificationBell locale={locale} />
        </div>
        {!features.isLoading && (
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => openModal('client-add')}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-95">
              <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                {language === 'he' ? 'לקוח' : 'Клиент'}
              </span>
            </button>
            <button onClick={() => openModal('visit-create')}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all active:scale-95">
              <CalendarPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                {language === 'he' ? 'ביקור' : 'Визит'}
              </span>
            </button>
            <button onClick={() => openModal('client-sale', { locale: language === 'he' ? 'he' : 'ru' })}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all active:scale-95">
              <ShoppingCart className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                {language === 'he' ? 'מכירה' : 'Продажа'}
              </span>
            </button>
          </div>
        )}
      </div>

      {features.hasBranches && <BranchSwitcher />}

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {features.isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5 rounded-xl animate-pulse">
            <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-700">
              <div className="w-5 h-5 bg-gray-200 dark:bg-slate-600 rounded" />
            </div>
            <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded flex-1" style={{ width: `${60 + i * 8}%` }} />
          </div>
        ))}
        {!features.isLoading && navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                  : 'text-gray-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md active:scale-[0.98]'
              )}>
              <div className={cn('p-1.5 rounded-lg transition-colors',
                isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-slate-700 group-hover:bg-blue-50 dark:group-hover:bg-slate-600')}>
                <Icon className={cn('w-5 h-5 flex-shrink-0',
                  isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400')} />
              </div>
              <span className="flex-1">{language === 'he' ? item.name_he : item.name_ru}</span>
              {isActive && <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />}
            </Link>
          )
        })}
        {isAdmin && (
          <>
            <Separator className="my-4 bg-gray-200 dark:bg-slate-700" />
            <Link href="/admin"
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md active:scale-[0.98]">
              <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-800">
                <Shield className="w-5 h-5 flex-shrink-0 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="flex-1 text-purple-700 dark:text-purple-300 font-semibold">{t.adminPanel}</span>
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            </Link>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-slate-700">
        <p className="text-xs text-gray-300 dark:text-gray-600 text-center mb-3">Trinity CRM by Amber Solutions</p>
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-[0.98] transition-all duration-200">
          <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
            <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          {t.logout}
        </button>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Users, CreditCard, MessageSquare, BarChart3, Shield, Gift, Home, LogOut, Moon, Sun, ChevronLeft, Settings, User as UserIcon, Calendar, Package } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useAdminProfile } from '@/hooks/useAdminProfile'
import { useFeatures } from '@/hooks/useFeatures'
import { useLowStockProducts } from '@/hooks/useProducts'
import { useLanguage } from '@/contexts/LanguageContext'
import { Separator } from '@/components/ui/separator'
import { UserProfileSheet } from '@/components/user/UserProfileSheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

// Helper function to convert null to undefined for Avatar component
const toAvatarSrc = (url: string | null): string | undefined => {
  if (url === null) return undefined
  return url
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { data: isAdmin } = useIsAdmin()
  const { adminProfile } = useAdminProfile()
  const features = useFeatures()
  const { data: lowStockProducts } = useLowStockProducts()
  const { t, language } = useLanguage()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [profileOpen, setProfileOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const baseNavigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: Home, requireFeature: null },
    { name: t('nav.clients'), href: '/clients', icon: Users, requireFeature: 'clients' },
    { name: language === 'he' ? 'ביקורים' : 'Визиты', href: '/visits', icon: Calendar, requireFeature: 'visits' },
    { name: t('nav.inventory'), href: '/inventory', icon: Package, requireFeature: 'inventory' },
    { name: t('nav.payments'), href: '/payments', icon: CreditCard, requireFeature: 'payments' },
    { name: t('nav.sms'), href: '/sms', icon: MessageSquare, requireFeature: 'sms' },
    { name: t('nav.stats'), href: '/stats', icon: BarChart3, requireFeature: 'analytics' },
    { name: language === 'he' ? 'דוחות' : 'Отчёты', href: '/analytics', icon: BarChart3, requireFeature: 'analytics' },
    { name: t('nav.partners'), href: '/partners', icon: Gift, requireFeature: null },
    { name: t('nav.settings'), href: '/settings', icon: Settings, requireFeature: null },
  ]

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    }
  }, [])

  // Load avatar URL
  useEffect(() => {
    if (user) {
      supabase
        .from('org_users')
        .select('avatar_url')
        .eq('user_id', user.id)
        .single()
        .then(({ data, error }) => {
          if (data && !error) {
            setAvatarUrl(data.avatar_url)
          }
        })
    }
  }, [user])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  // Если пользователь админ/модератор - берем имя из admin_users, иначе из user_metadata
  const displayName = (isAdmin && adminProfile?.full_name)
    ? adminProfile.full_name
    : (user?.user_metadata?.full_name as string) ||
      (user?.user_metadata?.name as string) ||
      null
  
  const displayEmail = user?.email || ''
  
  // Convert avatar URL from null to undefined for Avatar component compatibility
  const avatarSrc: string | undefined = avatarUrl === null ? undefined : avatarUrl

  const onLogout = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  // Filter navigation based on features
  const navigation = baseNavigation.filter((item) => {
    if (!item.requireFeature) return true
    
    if (item.requireFeature === 'clients') return features.hasClients !== false
    if (item.requireFeature === 'payments') return features.hasPayments === true
    if (item.requireFeature === 'sms') return features.hasSms === true
    if (item.requireFeature === 'analytics') return features.hasAnalytics === true
    if (item.requireFeature === 'visits') return features.hasVisits !== false
    if (item.requireFeature === 'inventory') return features.hasInventory === true
    
    return true
  })

  return (
    <div className="w-64 h-full flex flex-col bg-gradient-to-b from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 shadow-lg">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <img
              src="/logo.png"
              alt="Trinity"
              className="w-12 h-12 object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Trinity
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Amber Solutions Systems</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigation.map((item, index) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                  : 'text-gray-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md active:scale-[0.98]'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-lg transition-colors',
                isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-slate-700 group-hover:bg-blue-50 dark:group-hover:bg-slate-600'
              )}>
                <Icon className={cn(
                  'w-5 h-5 flex-shrink-0',
                  isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'
                )} />
              </div>
              <span className="flex-1">{item.name}</span>
              {item.href === '/inventory' && lowStockProducts && lowStockProducts.length > 0 && (
                <span className="flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full min-w-[1.5rem]">
                  {lowStockProducts.length}
                </span>
              )}
              {isActive && (
                <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
              )}
            </Link>
          )
        })}

        {/* Admin Link */}
        {isAdmin && (
          <>
            <Separator className="my-4 bg-gray-200 dark:bg-slate-700" />
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md active:scale-[0.98]"
            >
              <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-800">
                <Shield className="w-5 h-5 flex-shrink-0 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="flex-1 text-purple-700 dark:text-purple-300 font-semibold">{t('nav.admin')}</span>
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            </Link>
          </>
        )}

        {/* Theme Toggle */}
        <Separator className="my-4 bg-gray-200 dark:bg-slate-700" />
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group text-gray-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md active:scale-[0.98]"
        >
          <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 group-hover:bg-yellow-50 dark:group-hover:bg-yellow-900/30">
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-gray-600 dark:text-slate-400" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-500" />
            )}
          </div>
          <span className="flex-1 text-right">{theme === 'light' ? t('nav.darkMode') : t('nav.lightMode')}</span>
        </button>
      </nav>

      {/* User Profile + Logout */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 space-y-3">
        {/* Clickable Profile */}
        <button
          onClick={() => setProfileOpen(true)}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md transition-all duration-200 group active:scale-[0.98]"
        >
          <Avatar className="w-11 h-11 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all">
            <AvatarImage src={avatarSrc} alt={displayName ?? undefined} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg">
              {(displayName?.[0] || displayEmail?.[0])?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-right">
            {displayName ? (
              <>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{displayName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t('nav.myProfile')}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{displayEmail}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('nav.myProfile')}</p>
              </>
            )}
          </div>
          <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
        </button>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-[0.98] transition-all duration-200 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700"
        >
          <LogOut className="w-4 h-4" />
          {t('nav.logout')}
        </button>
      </div>

      {/* Profile Sheet */}
      <UserProfileSheet 
        open={profileOpen} 
        onOpenChange={setProfileOpen} 
      />
    </div>
  )
}

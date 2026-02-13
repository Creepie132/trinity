'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Users, CreditCard, MessageSquare, BarChart3, Shield, Gift, Home, LogOut, Moon, Sun, Calendar, Package } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useFeatures } from '@/hooks/useFeatures'
import { useLowStockProducts } from '@/hooks/useProducts'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { data: isAdmin } = useIsAdmin()
  const features = useFeatures()
  const { data: lowStockProducts } = useLowStockProducts()
  const { t } = useLanguage()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  const baseNavigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: Home, requireFeature: null },
    { name: t('nav.clients'), href: '/clients', icon: Users, requireFeature: null },
    { name: t('nav.visits'), href: '/visits', icon: Calendar, requireFeature: 'visits' },
    { name: t('nav.inventory'), href: '/inventory', icon: Package, requireFeature: 'inventory' },
    { name: t('nav.payments'), href: '/payments', icon: CreditCard, requireFeature: 'payments' },
    { name: t('nav.sms'), href: '/sms', icon: MessageSquare, requireFeature: 'sms' },
    { name: t('nav.stats'), href: '/stats', icon: BarChart3, requireFeature: 'analytics' },
    { name: t('nav.partners'), href: '/partners', icon: Gift, requireFeature: null },
  ]

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const displayName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    (user?.email ?? '—')

  const onLogout = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  // Filter navigation based on features
  const navigation = baseNavigation.filter((item) => {
    if (!item.requireFeature) return true
    
    if (item.requireFeature === 'payments') return features.hasPayments || features.hasSubscriptions
    if (item.requireFeature === 'sms') return features.hasSms
    if (item.requireFeature === 'analytics') return features.hasAnalytics
    if (item.requireFeature === 'visits') return features.hasVisits
    if (item.requireFeature === 'inventory') return features.hasInventory
    
    return true
  })

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-80 p-0 bg-gradient-to-b from-white to-gray-50 dark:from-slate-800 dark:to-slate-900">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <img
                  src="/logo.png"
                  alt="Trinity"
                  className="w-7 h-7 object-contain"
                />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  Trinity
                </SheetTitle>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Amber Solutions Systems</p>
              </div>
            </div>
          </SheetHeader>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item, index) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                      : 'text-gray-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md active:scale-[0.98]'
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
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
                <Separator className="my-4" />
                <Link
                  href="/admin"
                  onClick={onClose}
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
            <Separator className="my-4" />
            <button
              onClick={() => {
                toggleTheme()
                onClose()
              }}
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
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
            <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg text-lg">
                {displayName[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  מחובר
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-[0.98] transition-all duration-200 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700"
            >
              <LogOut className="w-4 h-4" />
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

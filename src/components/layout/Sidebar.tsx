'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Users, CreditCard, MessageSquare, BarChart3, Shield, Gift, Home, LogOut, Moon, Sun, Calendar, Settings, BookOpen } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useAdminProfile } from '@/hooks/useAdminProfile'
import { useFeatures } from '@/hooks/useFeatures'
import { Separator } from '@/components/ui/separator'
import { useState, useEffect } from 'react'

const baseNavigation = [
  { name: 'דשבורד', href: '/dashboard', icon: Home, requireFeature: null },
  { name: 'לקוחות', href: '/clients', icon: Users, requireFeature: null },
  { name: 'תורים', href: '/appointments', icon: Calendar, requireFeature: null },
  { name: 'יומן', href: '/diary', icon: BookOpen, requireFeature: null },
  { name: 'תשלומים', href: '/payments', icon: CreditCard, requireFeature: 'payments' },
  { name: 'הודעות SMS', href: '/sms', icon: MessageSquare, requireFeature: 'sms' },
  { name: 'סטטיסטיקה', href: '/stats', icon: BarChart3, requireFeature: 'analytics' },
  { name: 'הצעות שותפים', href: '/partners', icon: Gift, requireFeature: null },
  { name: 'הגדרות', href: '/settings', icon: Settings, requireFeature: null },
]

interface SidebarProps {
  onSearchOpen?: () => void
}

export function Sidebar({ onSearchOpen }: SidebarProps = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { data: isAdmin } = useIsAdmin()
  const { adminProfile } = useAdminProfile()
  const features = useFeatures()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    }
  }, [])

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

  const onLogout = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  // Filter navigation based on features
  const navigation = baseNavigation.filter((item) => {
    if (!item.requireFeature) return true
    
    if (item.requireFeature === 'payments') return features.hasPayments
    if (item.requireFeature === 'sms') return features.hasSms
    if (item.requireFeature === 'analytics') return features.hasAnalytics
    
    return true
  })

  return (
    <div className="w-64 h-full flex flex-col bg-gradient-to-b from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 shadow-lg">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <img
              src="/logo.png"
              alt="Trinity"
              className="w-7 h-7 object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
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
              <span className="flex-1 text-purple-700 dark:text-purple-300 font-semibold">פאנל ניהול</span>
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
          <span className="flex-1 text-right">{theme === 'light' ? 'מצב כהה' : 'מצב בהיר'}</span>
        </button>
      </nav>

      {/* User Profile + Logout */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
        <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg text-lg">
            {(displayName?.[0] || displayEmail?.[0])?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            {displayName ? (
              <>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{displayEmail}</p>
              </>
            ) : (
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayEmail}</p>
            )}
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-[0.98] transition-all duration-200 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700"
        >
          <LogOut className="w-4 h-4" />
          יציאה מהמערכת
        </button>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Building2, CreditCard, Megaphone, Settings, Home, Moon, Sun } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAdminProfile } from '@/hooks/useAdminProfile'
import { Separator } from '@/components/ui/separator'

const navigation = [
  {
    name: 'לוח בקרה',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'ארגונים',
    href: '/admin/organizations',
    icon: Building2,
  },
  {
    name: 'חיובים',
    href: '/admin/billing',
    icon: CreditCard,
  },
  {
    name: 'פרסום',
    href: '/admin/ads',
    icon: Megaphone,
  },
  {
    name: 'הגדרות',
    href: '/admin/settings',
    icon: Settings,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { adminProfile, isLoading } = useAdminProfile()
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    } else {
      // Default to dark for admin
      setTheme('dark')
      localStorage.setItem('theme', 'dark')
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const displayName = adminProfile?.full_name || user?.email?.split('@')[0] || 'Admin'
  const displayEmail = adminProfile?.email || user?.email || ''

  return (
    <div className="w-64 h-full flex flex-col bg-gradient-to-b from-slate-800 to-slate-900 text-white shadow-lg">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <img
              src="/logo.png"
              alt="Trinity Admin"
              className="w-7 h-7 object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              Trinity Admin
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Amber Solutions Systems</p>
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
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white active:scale-[0.98]'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-lg transition-colors',
                isActive ? 'bg-white/20' : 'bg-slate-700 group-hover:bg-slate-600'
              )}>
                <Icon className={cn(
                  'w-5 h-5 flex-shrink-0',
                  isActive ? 'text-white' : 'text-blue-400'
                )} />
              </div>
              <span className="flex-1">{item.name}</span>
              {isActive && (
                <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
              )}
            </Link>
          )
        })}

        {/* Кнопка возврата в систему */}
        <Separator className="my-4 bg-slate-700" />
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500/30 hover:border-green-500/50 hover:bg-gradient-to-r hover:from-green-600/30 hover:to-emerald-600/30 active:scale-[0.98]"
        >
          <div className="p-1.5 rounded-lg bg-green-600/30">
            <Home className="w-5 h-5 flex-shrink-0 text-green-400" />
          </div>
          <span className="flex-1 text-green-300 font-semibold">חזרה למערכת</span>
        </Link>

        {/* Theme Toggle */}
        <Separator className="my-4 bg-slate-700" />
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group text-slate-300 hover:bg-slate-700 hover:text-white active:scale-[0.98]"
        >
          <div className="p-1.5 rounded-lg bg-slate-700 group-hover:bg-yellow-900/30">
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-slate-400" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-500" />
            )}
          </div>
          <span className="flex-1 text-right">{theme === 'light' ? 'מצב כהה' : 'מצב בהיר'}</span>
        </button>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/50 border border-slate-600">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold shadow-lg text-lg">
            {displayName[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <p className="text-sm text-slate-400">טוען...</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{displayEmail}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

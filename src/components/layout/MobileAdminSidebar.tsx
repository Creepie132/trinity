'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, CreditCard, Megaphone, Boxes, Settings, ArrowLeft, Home, Moon, Sun, Shield, Mail, Package } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

interface MobileAdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileAdminSidebar({ isOpen, onClose }: MobileAdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  const navigation = [
    {
      name: t('admin.dashboard'),
      href: '/admin',
      icon: LayoutDashboard,
    },
    {
      name: t('admin.subscriptions') || 'Подписки и доступ',
      href: '/admin/subscriptions',
      icon: Shield,
    },
    {
      name: t('admin.ads'),
      href: '/admin/ads',
      icon: Megaphone,
    },
    {
      name: t('admin.modules'),
      href: '/admin/modules',
      icon: Boxes,
    },
    {
      name: t('admin.settings'),
      href: '/admin/settings',
      icon: Settings,
    },
  ]

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      setTheme('dark')
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
    (user?.email ?? 'Admin')

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-80 p-0 bg-gradient-to-b from-slate-800 to-slate-900 text-white border-l border-slate-700">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b border-slate-700 bg-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <img
                  src="/logo.png"
                  alt="Trinity Admin"
                  className="w-7 h-7 object-contain"
                />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-white">
                  Trinity Admin
                </SheetTitle>
                <p className="text-xs text-slate-400 mt-0.5">Amber Solutions Systems</p>
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
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white active:scale-[0.98]'
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
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

            {/* Кנопка возврата в систему */}
            <Separator className="my-4 bg-slate-700" />
            <Link
              href="/dashboard"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500/30 hover:border-green-500/50 hover:bg-gradient-to-r hover:from-green-600/30 hover:to-emerald-600/30 active:scale-[0.98]"
            >
              <div className="p-1.5 rounded-lg bg-green-600/30">
                <Home className="w-5 h-5 flex-shrink-0 text-green-400" />
              </div>
              <span className="flex-1 text-green-300 font-semibold">{t('nav.backToMain')}</span>
              <ArrowLeft className="w-4 h-4 text-green-400" />
            </Link>

            {/* Theme Toggle */}
            <Separator className="my-4 bg-slate-700" />
            <button
              onClick={() => {
                toggleTheme()
                onClose()
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group text-slate-300 hover:bg-slate-700 hover:text-white active:scale-[0.98]"
            >
              <div className="p-1.5 rounded-lg bg-slate-700 group-hover:bg-yellow-900/30">
                {theme === 'light' ? (
                  <Moon className="w-5 h-5 text-slate-400" />
                ) : (
                  <Sun className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              <span className="flex-1 text-right">{theme === 'light' ? t('nav.darkMode') : t('nav.lightMode')}</span>
            </button>
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-slate-700 bg-slate-800/50">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/50 border border-slate-600">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold shadow-lg text-lg">
                {displayName[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                <p className="text-xs text-purple-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                  מנהל מערכת
                </p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Megaphone, Settings, ArrowLeft, Home, LogOut, Building2, Package, CreditCard, Puzzle } from 'lucide-react'
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
  const { signOut } = useAuth()
  const { t, language } = useLanguage()

  const onLogout = async () => {
    await signOut()
    onClose()
    router.push('/login')
    router.refresh()
  }

  const navigation = [
    {
      name: t('admin.dashboard'),
      href: '/admin',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: language === 'he' ? 'ארגונים' : 'Организации',
      href: '/admin/organizations',
      icon: Building2,
    },
    {
      name: language === 'he' ? 'תוכניות' : 'Тарифные планы',
      href: '/admin/plans',
      icon: Package,
    },
    {
      name: language === 'he' ? 'מודולים' : 'Модули',
      href: '/admin/modules',
      icon: Puzzle,
    },
    {
      name: language === 'he' ? 'פיננסים' : 'Финансы',
      href: '/admin/billing',
      icon: CreditCard,
    },
    {
      name: t('admin.ads'),
      href: '/admin/ads',
      icon: Megaphone,
    },
    {
      name: t('admin.settings'),
      href: '/admin/settings',
      icon: Settings,
    },
  ]

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
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
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
                  style={{ animationDelay: `${index * 50}ms` }}
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
              href="/dashboard"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500/30 hover:border-green-500/50 active:scale-[0.98]"
            >
              <div className="p-1.5 rounded-lg bg-green-600/30">
                <Home className="w-5 h-5 flex-shrink-0 text-green-400" />
              </div>
              <span className="flex-1 text-green-300 font-semibold">{t('nav.backToMain')}</span>
              <ArrowLeft className="w-4 h-4 text-green-400" />
            </Link>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-slate-700">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-900/20 active:scale-[0.98] transition-all duration-200"
            >
              <div className="p-1.5 rounded-lg bg-red-900/30">
                <LogOut className="w-5 h-5 text-red-400" />
              </div>
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

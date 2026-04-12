'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Users, CreditCard, BarChart3, Briefcase, Shield, Home, LogOut, Settings, Calendar, Package, BookOpen, ShoppingBag, PiggyBank, MessageCircle, Globe } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useFeatures } from '@/hooks/useFeatures'
import { useLowStockProducts } from '@/hooks/useProducts'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMeetingMode } from '@/hooks/useMeetingMode'
import { useDemoMode } from '@/hooks/useDemoMode'
import { BranchSwitcher } from '@/components/BranchSwitcher'
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { useHasWorkers } from '@/hooks/useHasWorkers'
import { useMobileMenuPrefetch, useTouchPrefetch } from '@/hooks/useMobilePrefetch'
import { useOrganization } from '@/hooks/useOrganization'

// ─── NavLink — Link с touch prefetch для мгновенной навигации на мобиле ──────
function NavLink({ href, onClick, className, children }: {
  href: string; onClick: () => void; className: string; children: React.ReactNode
}) {
  const { onTouchStart, onTouchEnd } = useTouchPrefetch(href)
  return (
    <Link href={href} prefetch={true} onClick={onClick}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      className={className}>
      {children}
    </Link>
  )
}

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut, role } = useAuth()
  const { data: isAdmin } = useIsAdmin()
  const features = useFeatures()
  const { data: lowStockProducts } = useLowStockProducts()
  const { t, language } = useLanguage()
  const meetingMode = useMeetingMode()
  const { isDemo } = useDemoMode()
  const { data: hasWorkers } = useHasWorkers()
  const sidebarSide = 'right'
  const isOwner = role === 'owner'
  const showOffice = isOwner && hasWorkers !== false
  const { data: organization } = useOrganization()
  const hasStorefront = organization?.has_storefront === true

  // ⚡ При открытии меню — prefetch RSC payload + RQ данных для всех разделов
  useMobileMenuPrefetch(isOpen)

  const baseNavigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: Home, requireFeature: null },
    { name: t('nav.clients'), href: '/clients', icon: Users, requireFeature: 'clients' },
    { name: meetingMode.t.visits, href: '/visits', icon: Calendar, requireFeature: 'visits' },
    { name: t('nav.sales'), href: '/sales', icon: ShoppingBag, requireFeature: 'sales' },
    { name: t('nav.diary'), href: '/diary', icon: BookOpen, requireFeature: 'diary' },
    { name: t('nav.whatsapp'), href: '/broadcast', icon: MessageCircle, requireFeature: 'whatsapp' },
    { name: t('nav.inventory'), href: '/inventory', icon: Package, requireFeature: 'inventory' },
    { name: t('nav.payments'), href: '/payments', icon: CreditCard, requireFeature: 'payments' },
    { name: t('nav.finances'), href: '/finances', icon: PiggyBank, requireFeature: 'finances' },
    { name: t('nav.analytics'), href: '/analytics', icon: BarChart3, requireFeature: 'analytics' },
  { name: t('nav.settings'), href: '/settings', icon: Settings, requireFeature: null },
  ]

  const onLogout = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
    onClose()
  }

  const DEMO_ALLOWED_PATHS = ['/dashboard', '/clients', '/partners', '/settings']

  const navigation = baseNavigation.filter((item) => {
    if (isDemo && !DEMO_ALLOWED_PATHS.includes(item.href)) return false
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
      'whatsapp': features.hasWhatsapp,
      'loyalty': features.hasLoyalty,
      'sales': features.hasSales,
      'finances': features.hasPayments,
    }
    return featureMap[item.requireFeature] ?? true
  })

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side={sidebarSide} className="w-full max-w-[320px] sm:w-80 p-0 bg-gradient-to-b from-white to-gray-50 dark:from-slate-800 dark:to-slate-900">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Trinity" className="w-16 h-16 object-contain rounded-xl" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Trinity</h1>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Amber Solutions Systems</p>
              </div>
            </div>
          </SheetHeader>

          {features.hasBranches && <div className="px-2 pt-3"><BranchSwitcher /></div>}

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
                <NavLink key={item.href} href={item.href} onClick={onClose}
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
                  <span className="flex-1">{item.name}</span>
                  {item.href === '/inventory' && lowStockProducts && lowStockProducts.length > 0 && (
                    <span className="flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full min-w-[1.5rem]">
                      {lowStockProducts.length}
                    </span>
                  )}
                  {isActive && <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />}
                </NavLink>
              )
            })}
            {isAdmin && (
              <>
                <Separator className="my-4 bg-gray-200 dark:bg-slate-700" />
                <NavLink href="/admin" onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md active:scale-[0.98]">
                  <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-800">
                    <Shield className="w-5 h-5 flex-shrink-0 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="flex-1 text-purple-700 dark:text-purple-300 font-semibold">{t('nav.admin')}</span>
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                </NavLink>
              </>
            )}
            {hasStorefront && (
              <>
                <Separator className="my-2 bg-gray-200 dark:bg-slate-700" />
                <NavLink href="/website/blog" onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                    pathname.startsWith('/website')
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/30 scale-[1.02]'
                      : 'text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:shadow-md active:scale-[0.98] border border-teal-100 dark:border-teal-800/40'
                  )}>
                  <div className={cn('p-1.5 rounded-lg transition-colors',
                    pathname.startsWith('/website') ? 'bg-white/20' : 'bg-teal-100 dark:bg-teal-900/30')}>
                    <Globe className={cn('w-5 h-5 flex-shrink-0',
                      pathname.startsWith('/website') ? 'text-white' : 'text-teal-600 dark:text-teal-400')} />
                  </div>
                  <span className="flex-1 font-semibold">
                    {language === 'he' ? '🌐 אתר' : '🌐 Сайт'}
                  </span>
                  {pathname.startsWith('/website') && <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />}
                </NavLink>
              </>
            )}
            {showOffice && (
              <>
                <Separator className="my-2 bg-gray-200 dark:bg-slate-700" />
                <NavLink href="/office" onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                    pathname.startsWith('/office')
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-[1.02]'
                      : 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:shadow-md active:scale-[0.98] border border-indigo-100 dark:border-indigo-800/40'
                  )}>
                  <div className={cn('p-1.5 rounded-lg transition-colors',
                    pathname.startsWith('/office') ? 'bg-white/20' : 'bg-indigo-100 dark:bg-indigo-900/30')}>
                    <Briefcase className={cn('w-5 h-5 flex-shrink-0',
                      pathname.startsWith('/office') ? 'text-white' : 'text-indigo-600 dark:text-indigo-400')} />
                  </div>
                  <span className="flex-1 font-semibold">🏢 Кабинет</span>
                  {pathname.startsWith('/office') && <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />}
                </NavLink>
              </>
            )}
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-slate-700">
            <button onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-[0.98] transition-all duration-200">
              <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
                <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}


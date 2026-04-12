'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Users, CreditCard, BarChart3, Briefcase, Shield, Home, LogOut, Calendar, Settings, BookOpen, Package, UserPlus, CalendarPlus, ShoppingCart, ShoppingBag, PiggyBank, MessageCircle, Globe } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useFeatures } from '@/hooks/useFeatures'
import { useLanguage } from '@/contexts/LanguageContext'
import { Separator } from '@/components/ui/separator'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { BranchSwitcher } from '@/components/BranchSwitcher'
import { useModalStore } from '@/store/useModalStore'
import { useHasWorkers } from '@/hooks/useHasWorkers'
import { useDemoMode } from '@/hooks/useDemoMode'
import { DemoLimitModal } from '@/components/demo/DemoLimitModal'
import { useState } from 'react'
import { useClients } from '@/hooks/useClients'
import { useQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useBranch } from '@/contexts/BranchContext'
import { useOrganization } from '@/hooks/useOrganization'

const baseNavigation = [
  { name_he: 'דשבורד', name_ru: 'Дашборд', href: '/dashboard', icon: Home, requireFeature: null },
  { name_he: 'לקוחות', name_ru: 'Клиенты', href: '/clients', icon: Users, requireFeature: 'clients' },
  { name_he: 'יומן פגישות', name_ru: 'Визиты', href: '/visits', icon: Calendar, requireFeature: 'visits' },
  { name_he: 'מכירות', name_ru: 'Продажи', href: '/sales', icon: ShoppingBag, requireFeature: 'sales' },
  { name_he: 'תשלומים', name_ru: 'Платежи', href: '/payments', icon: CreditCard, requireFeature: 'payments' },
  { name_he: 'כספים', name_ru: 'Финансы', href: '/finances', icon: PiggyBank, requireFeature: 'finances' },
  { name_he: 'מלאי', name_ru: 'Склад', href: '/inventory', icon: Package, requireFeature: 'inventory' },
  { name_he: 'משימות', name_ru: 'Дневник', href: '/diary', icon: BookOpen, requireFeature: 'diary' },
  { name_he: 'שליחה המונית', name_ru: 'Рассылка WA', href: '/broadcast', icon: MessageCircle, requireFeature: 'whatsapp' },
  { name_he: 'אנליטיקה', name_ru: 'Аналитика', href: '/analytics', icon: BarChart3, requireFeature: 'analytics' },
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
  const { signOut, role, orgId: authOrgId } = useAuth()
  const { data: isAdmin } = useIsAdmin()
  const { data: hasWorkers } = useHasWorkers()
  const features = useFeatures()
  const { language } = useLanguage()
  const { openModal } = useModalStore()
  const { isDemo } = useDemoMode()
  const { data: clientsData } = useClients('', 1, 1)
  const clientCount = clientsData?.count ?? 0
  const [demoSaleOpen, setDemoSaleOpen] = useState(false)
  const [demoClientOpen, setDemoClientOpen] = useState(false)
  const [demoVisitOpen, setDemoVisitOpen] = useState(false)
  const { data: organization } = useOrganization()
  const hasStorefront = organization?.has_storefront === true

  // Count visits for demo limit check (total + active simultaneous)
  const { activeOrgId } = useBranch()
  const visitOrgId = activeOrgId || authOrgId
  const { data: visitCountData } = useQuery({
    queryKey: ['visits-count-sidebar', visitOrgId],
    queryFn: async (): Promise<{ count: number; active: number }> => {
      if (!visitOrgId) return { count: 0, active: 0 }
      const res = await fetch('/api/visits/count')
      if (!res.ok) return { count: 0, active: 0 }
      return res.json()
    },
    enabled: !!visitOrgId && isDemo,
    staleTime: 30_000,
  })
  const visitCount       = visitCountData?.count  ?? 0
  const activeVisitCount = visitCountData?.active ?? 0
  const t = translations[language]
  const locale = language === 'he' ? 'he' : 'ru'

  // Кабинет руководителя — только owner с активными workers
  // hasWorkers undefined = loading → показываем кабинет (не прячем во время загрузки)
  const showOffice = role === 'owner' && hasWorkers !== false

  const onLogout = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  const navigation = baseNavigation.filter((item) => {
    if (!item.requireFeature) return true
    const featureMap: Record<string, boolean> = {
      clients: features.hasClients,
      visits: features.hasVisits,
      payments: features.hasPayments && features.paymentsEnabled,
      finances: features.hasPayments,
      inventory: features.hasInventory,
      diary: features.hasDiary,
      sms: features.hasSms,
      analytics: features.hasAnalytics,
      statistics: features.hasStatistics,
      reports: features.hasReports,
      subscriptions: features.hasSubscriptions,
      booking: features.hasBooking,
      whatsapp: features.hasWhatsapp,
      loyalty: features.hasLoyalty,
      sales: features.hasSales,
    }
    return featureMap[item.requireFeature] ?? true
  })

  return (
    <div className="w-64 h-full flex flex-col bg-gradient-to-b from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 shadow-lg">
      <div className="p-6 pb-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/trinity-logo.png" alt="Trinity" className="w-12 h-12 object-contain rounded-xl" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Trinity</h1>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Amber Solutions Systems</p>
            </div>
          </div>
          <NotificationBell locale={locale} />
        </div>
        {!features.isLoading && (
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => {
                if (isDemo && clientCount >= 10) { setDemoClientOpen(true); return }
                openModal('client-add')
              }}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-95">
              <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">{language === 'he' ? 'לקוח' : 'Клиент'}</span>
            </button>
            <button onClick={() => {
                if (isDemo && (visitCount >= 15 || activeVisitCount >= 3)) { setDemoVisitOpen(true); return }
                openModal('visit-unified', { mode: 'create' })
              }}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all active:scale-95">
              <CalendarPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">{language === 'he' ? 'ביקור' : 'Визит'}</span>
            </button>
            <button onClick={() => {
                if (isDemo) { setDemoSaleOpen(true); return }
                openModal('sale-unified', {})
              }}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all active:scale-95">
              <ShoppingCart className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">{language === 'he' ? 'מכירה' : 'Продажа'}</span>
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
            <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded flex-1" />
          </div>
        ))}
        {!features.isLoading && navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} prefetch={true}
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

        {/* Сайт — только если has_storefront === true */}
        {hasStorefront && (
          <>
            <Separator className="my-2 bg-gray-200 dark:bg-slate-700" />
            <Link href="/website/blog" prefetch={true}
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
            </Link>
          </>
        )}

        {/* Кабинет руководителя — только owner + есть workers */}
        {showOffice && (
          <>
            <Separator className="my-2 bg-gray-200 dark:bg-slate-700" />
            <Link href="/office" prefetch={true}
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
              <span className="flex-1 font-semibold">
                {language === 'he' ? '🏢 קבינט מנהל' : '🏢 Кабинет'}
              </span>
              {pathname.startsWith('/office') && <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />}
            </Link>
          </>
        )}

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

      {/* Demo client limit modal */}
      <DemoLimitModal open={demoClientOpen} onClose={() => setDemoClientOpen(false)} section="clients" />

      {/* Demo visit limit modal */}
      <DemoLimitModal open={demoVisitOpen} onClose={() => setDemoVisitOpen(false)} section="visits" />
      {/* Demo sale limit modal */}
      <DemoLimitModal open={demoSaleOpen} onClose={() => setDemoSaleOpen(false)} section="visits" />
    </div>
  )
}



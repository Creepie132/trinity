'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { AuthProvider } from '@/contexts/AuthContext'
import { BranchProvider } from '@/contexts/BranchContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { GlobalSearch } from '@/components/GlobalSearch'
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner'
import { PinnedModalsTray } from '@/components/ui/PinnedModalsTray'
import { RightPanel } from '@/components/layout/RightPanel'
import { DemoBannerGlobal } from '@/components/demo/DemoBannerGlobal'
import { DemoLanguagePicker, useDemoLanguagePicker } from '@/components/demo/DemoLanguagePicker'
import { WaNotificationProvider } from '@/components/wa/WaNotificationProvider'
import { ClientProviders } from '@/components/providers/ClientProviders'
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext'
import { NotificationBell } from '@/components/worker/NotificationBell'
import { NewLeadModal } from '@/components/worker/NewLeadModal'
import { WorkerOnboarding } from '@/components/worker/WorkerOnboarding'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

// ─── Worker nav items ─────────────────────────────────────────────────────────

const WORKER_NAV = [
  {
    href: '/worker/dashboard', exact: true,
    label_he: 'לוח בקרה', label_ru: 'Дашборд',
    workerOnly: true,  // скрыт для owner — у него есть Кабинет
    icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>),
  },
  {
    href: '/worker/pipeline', exact: false,
    label_he: 'פייפליין שלי', label_ru: 'Мой пайплайн',
    icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg>),
  },
  {
    href: '/clients', exact: false,
    label_he: 'לקוחות', label_ru: 'Клиенты',
    icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>),
  },
  {
    href: '/diary', exact: false,
    label_he: 'משימות', label_ru: 'Задачи',
    icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>),
  },
  {
    href: '/worker/meetings', exact: false,
    label_he: 'פגישות', label_ru: 'Встречи',
    icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>),
  },
  {
    href: '/inbox', exact: false,
    label_he: 'תקשורת WA', label_ru: 'WhatsApp',
    hiddenForSalesAgent: true,
    hiddenForManager: true,
    icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>),
  },
  {
    href: '/worker/reports', exact: false,
    label_he: 'דוח הכנסות', label_ru: 'Мои доходы',
    icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>),
  },
  {
    href: '/worker/knowledge', exact: false,
    label_he: 'מאגר ידע', label_ru: 'База знаний',
    icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>),
  },
  {
    href: '/worker/settings', exact: false,
    label_he: 'הגדרות', label_ru: 'Настройки',
    icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>),
  },
]

// ─── Worker Shell ─────────────────────────────────────────────────────────────

function WorkerShell({ children }: { children: React.ReactNode }) {
  const { language, setLanguage } = useLanguage()
  const { role, isSalesAgent, isLoading: authLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const isHe = language === 'he'
  const isOwner = role === 'owner'
  const isManager = role === 'manager'
  const [newLeadOpen, setNewLeadOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Онбординг управляется внутри WorkerOnboarding через собственный fetch
  // Здесь только флаг: показывать оверлей или нет
  const [showOnboarding, setShowOnboarding] = useState(!isOwner && !isSalesAgent)

  const handleOnboardingComplete = (selectedLang: 'ru' | 'he') => {
    setLanguage(selectedLang)
    setShowOnboarding(false)
  }

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // worker видит только свои пункты, owner не нужен Кабинет в workerShell
  // (owner попадает сюда только если намеренно перешёл в /worker/dashboard)
  // Пока auth не загрузился — скрываем пункты требующие проверки роли,
  // чтобы не мигали запрещённые разделы (WhatsApp для sales agent)
  const navItems = authLoading
    ? WORKER_NAV.filter(item => !('hiddenForSalesAgent' in item && item.hiddenForSalesAgent))
    : WORKER_NAV.filter(item =>
        isOwner ? !('workerOnly' in item && item.workerOnly) : true
      ).filter(item =>
        isSalesAgent ? !('hiddenForSalesAgent' in item && item.hiddenForSalesAgent) : true
      ).filter(item =>
        isManager ? !('hiddenForManager' in item && (item as any).hiddenForManager) : true
      )

  const dir = language === 'he' ? 'rtl' : 'ltr'

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50/30 to-indigo-50/20" dir={dir}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-full bg-white/70 backdrop-blur-2xl border-l border-white/50 shadow-xl z-20">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1a237e] to-[#3949ab] shadow-lg flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                <polygon points="12,2 22,20 2,20" fill="#C8922A" opacity="0.95"/>
                <polygon points="12,7 18,18 6,18" fill="white" opacity="0.2"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Trinity CRM</p>
              <p className="text-[10px] text-gray-400">Amber Solutions</p>
            </div>
            <div className="ms-auto">
              <NotificationBell lang={language} variant="dark" />
            </div>
          </div>
        </div>

        {/* New lead button */}
        <div className="px-4 py-3">
          <button onClick={() => setNewLeadOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-200/60 hover:shadow-lg transition-all active:scale-[0.98]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
            </svg>
            {isHe ? 'ליד חדש' : 'Новый лид'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-200/50'
                    : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                }`}>
                <span className={isActive ? 'text-white' : 'text-gray-400'}>{item.icon}</span>
                <span className="flex-1">{isHe ? item.label_he : item.label_ru}</span>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse"/>}
              </Link>
            )
          })}
        </nav>

        {/* Footer: rocket + logout */}
        <div className="px-4 py-4 border-t border-gray-100/80 space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
            <span className="text-2xl">🚀</span>
            <div>
              <p className="text-xs font-bold text-amber-800">Amber Solutions</p>
              <p className="text-[10px] text-amber-600">{isHe ? 'המכירות שלך, הצמיחה שלנו' : 'Твои продажи — наш рост'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            {isHe ? 'יציאה' : 'Выйти'}
          </button>
        </div>
      </aside>

      {/* ── Mobile wrapper: header + main stacked vertically ────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden lg:hidden">
      {/* ── Mobile Burger Header ──────────────────────────────────────────────── */}
      <header dir={dir} className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 bg-white/90 backdrop-blur-xl border-b border-white/50 shadow-sm shrink-0">
        {/* Burger button: LTR=left, RTL=right (via flex + dir) */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2.5 rounded-xl bg-white/70 border border-white/60 shadow-sm text-gray-600 hover:text-indigo-600 active:scale-95 transition-all"
          aria-label={isHe ? 'פתח תפריט' : 'Открыть меню'}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>

        {/* Logo center */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#1a237e] to-[#3949ab] flex items-center justify-center shadow-md">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
              <polygon points="12,2 22,20 2,20" fill="#C8922A" opacity="0.95"/>
            </svg>
          </div>
          <span className="text-sm font-bold text-gray-900">Trinity CRM</span>
        </div>

        {/* Notification bell */}
        <NotificationBell lang={language} />
      </header>

      {/* ── Mobile Drawer Overlay ─────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile Drawer Panel ───────────────────────────────────────────────── */}
      <div
        dir={dir}
        className={`lg:hidden fixed top-0 bottom-0 z-[70] w-72 flex flex-col
          bg-white/95 backdrop-blur-2xl shadow-2xl
          transition-transform duration-300 ease-in-out
          ${isHe ? 'end-0' : 'start-0'}
          ${drawerOpen
            ? 'translate-x-0'
            : isHe ? 'translate-x-full' : '-translate-x-full'
          }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#1a237e] to-[#3949ab] shadow-md flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <polygon points="12,2 22,20 2,20" fill="#C8922A" opacity="0.95"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Trinity CRM</p>
              <p className="text-[10px] text-gray-400">Amber Solutions</p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* New lead button */}
        <div className="px-4 py-3 border-b border-gray-100">
          <button
            onClick={() => { setNewLeadOpen(true); setDrawerOpen(false) }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-200/60 hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
            </svg>
            {isHe ? 'ליד חדש' : 'Новый лид'}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-200/50'
                    : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-gray-400'}>{item.icon}</span>
                <span className="flex-1">{isHe ? item.label_he : item.label_ru}</span>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse"/>}
              </Link>
            )
          })}
        </nav>

        {/* Logout + footer */}
        <div className="px-4 pb-6 pt-2 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
            <span className="text-2xl">🚀</span>
            <div>
              <p className="text-xs font-bold text-amber-800">Amber Solutions</p>
              <p className="text-[10px] text-amber-600">{isHe ? 'המכירות שלך, הצמיחה שלנו' : 'Твои продажи — наш рост'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            {isHe ? 'יציאה' : 'Выйти'}
          </button>
        </div>
      </div>

      {/* Main content — no bottom padding needed (no bottom nav) */}
      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      </div>{/* end mobile wrapper */}

      {/* Desktop main — shown only on lg+ */}
      <main className="hidden lg:flex flex-col flex-1 overflow-y-auto h-full">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      <NewLeadModal
        open={newLeadOpen} lang={language}
        onClose={() => setNewLeadOpen(false)}
        onCreated={() => setNewLeadOpen(false)}
      />

      {/* Онбординг — показываем сразу, внутри сам решает loading/lang/tour/profile/done */}
      {showOnboarding && (
        <WorkerOnboarding onComplete={handleOnboardingComplete} />
      )}
    </div>
  )
}

// ─── Inner shell — читает язык и расставляет панели ──────────────────────────
function DashboardInner({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage()
  const isRTL = language === 'he'
  const [searchOpen, setSearchOpen] = useState(false)
  const { show: showLangPicker, handleSelect: handleLangSelect } = useDemoLanguagePicker()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <WaNotificationProvider>
      {showLangPicker && <DemoLanguagePicker onSelect={handleLangSelect}/>}
      <div className="min-h-[100dvh] bg-[#f8fafc] dark:bg-gray-950 flex flex-col">
        <DemoBannerGlobal/>
        <MobileHeader onSearchOpen={() => setSearchOpen(true)} />
        {/* dir на flex-контейнере управляет порядком колонок без JS */}
        <div className="flex-1 lg:flex lg:h-screen lg:overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Навигационный сайдбар — в RTL (dir=rtl) flex автоматически ставит его справа */}
          <aside className="hidden lg:block lg:w-72 lg:flex-shrink-0 sticky top-0 h-screen overflow-y-auto z-[0]">
            <Sidebar onSearchOpen={() => setSearchOpen(true)} />
          </aside>
          {/* Основной контент */}
          <main id="main-scroll" className="flex-1 lg:overflow-y-auto lg:h-screen bg-[#f8fafc] dark:bg-gray-950">
            {/* direction:ltr на контенте — текст не зеркалится, скроллбар управляется CSS */}
            <div className="p-4 lg:p-6" style={{ direction: 'ltr' }}>
              <ErrorBoundary>{children}</ErrorBoundary>
            </div>
          </main>
          {/* RightPanel — в RTL (dir=rtl) flex ставит его слева автоматически */}
          <RightPanel />
        </div>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <ImpersonationBanner />
      <PinnedModalsTray />
      <ClientProviders />
    </WaNotificationProvider>
  )
}

// ─── DashboardShell — публичный экспорт ──────────────────────────────────────
export function DashboardShell({
  children,
  workerMode = false,
}: {
  children: React.ReactNode
  workerMode?: boolean
}) {
  if (workerMode) {
    return (
      <AuthProvider>
        <BranchProvider>
          <LanguageProvider>
            <WorkerShell>
              {children}
            </WorkerShell>
            <ClientProviders />
          </LanguageProvider>
        </BranchProvider>
      </AuthProvider>
    )
  }

  return (
    <AuthProvider>
      <BranchProvider>
        <LanguageProvider>
          <DashboardInner>
            {children}
          </DashboardInner>
        </LanguageProvider>
      </BranchProvider>
    </AuthProvider>
  )
}

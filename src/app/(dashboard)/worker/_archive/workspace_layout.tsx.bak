'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { NotificationBell } from '@/components/worker/NotificationBell'
import { NewLeadModal } from '@/components/worker/NewLeadModal'

// ─── Nav items ─────────────────────────────────────────────────────────────────
const NAV = [
  {
    href: '/worker',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    label_he: 'לוח בקרה',
    label_ru: 'Дашборд',
    exact: true,
  },
  {
    href: '/worker/pipeline',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
    label_he: 'פייפליין שלי',
    label_ru: 'Мой пайплайн',
    exact: false,
  },
  {
    href: '/clients',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    label_he: 'לקוחות',
    label_ru: 'Клиенты',
    exact: false,
  },
  {
    href: '/diary',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    label_he: 'משימות וקביעות',
    label_ru: 'Задачи и встречи',
    exact: false,
  },
  {
    href: '/inbox',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    label_he: 'תקשורת',
    label_ru: 'Коммуникация',
    exact: false,
  },
  {
    href: '/analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    label_he: 'דוחות',
    label_ru: 'Отчёты',
    exact: false,
  },
  {
    href: '#kb',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    label_he: 'מאגר ידע',
    label_ru: 'База знаний',
    exact: false,
  },
]

// ─── Mobile bottom nav ────────────────────────────────────────────────────────

function MobileNav({ pathname, lang }: { pathname: string; lang: string }) {
  const isHe = lang === 'he'
  const main = NAV.slice(0, 4)
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-t border-white/40 shadow-2xl">
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {main.map(item => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                isActive
                  ? 'text-indigo-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}>
              <div className={`transition-transform ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[9px] font-semibold truncate">
                {isHe ? item.label_he : item.label_ru}
              </span>
              {isActive && <div className="w-1 h-1 rounded-full bg-indigo-600" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function WorkerWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage()
  const pathname = usePathname()
  const isHe = language === 'he'
  const [newLeadOpen, setNewLeadOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50/30 to-indigo-50/20" dir="rtl">

      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-full bg-white/70 backdrop-blur-2xl border-l border-white/50 shadow-xl z-20">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1a237e] to-[#3949ab] shadow-lg shadow-indigo-200 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                <polygon points="12,2 22,20 2,20" fill="#C8922A" opacity="0.95" />
                <polygon points="12,7 18,18 6,18" fill="white" opacity="0.2" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">Trinity CRM</p>
              <p className="text-[10px] text-gray-400">Amber Solutions</p>
            </div>
            <div className="ms-auto">
              <NotificationBell lang={language} />
            </div>
          </div>
        </div>

        {/* Quick add button */}
        <div className="px-4 py-3">
          <button
            onClick={() => setNewLeadOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-200/60 hover:shadow-lg hover:shadow-indigo-200/80 transition-all active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            {isHe ? 'ליד חדש' : 'Новый лид'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href) && item.href !== '#kb'
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-200/50'
                    : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                }`}
              >
                <span className={`transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                  {item.icon}
                </span>
                <span className="flex-1">{isHe ? item.label_he : item.label_ru}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom brand */}
        <div className="px-5 py-4 border-t border-gray-100/80">
          {/* Amber rocket illustration */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
            <span className="text-2xl">🚀</span>
            <div>
              <p className="text-xs font-bold text-amber-800">Amber Solutions</p>
              <p className="text-[10px] text-amber-600">
                {isHe ? 'המכירות שלך, הצמיחה שלנו' : 'Твои продажи — наш рост'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto h-full pb-20 lg:pb-0">
        {children}
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <MobileNav pathname={pathname} lang={language} />

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <NewLeadModal
        open={newLeadOpen}
        lang={language}
        onClose={() => setNewLeadOpen(false)}
        onCreated={() => setNewLeadOpen(false)}
      />
    </div>
  )
}

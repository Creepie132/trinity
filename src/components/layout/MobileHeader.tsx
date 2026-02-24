'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Menu, ArrowRight, Search } from 'lucide-react'
import { MobileSidebar } from './MobileSidebar'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { useLanguage } from '@/contexts/LanguageContext'

interface MobileHeaderProps {
  onSearchOpen?: () => void
}

export function MobileHeader({ onSearchOpen }: MobileHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { language } = useLanguage()

  // На главной странице не показываем кнопку "назад"
  const showBackButton = pathname !== '/'

  const handleBack = () => {
    router.back()
  }

  return (
    <>
      {/* Мобильный header — только на <1024px */}
      <header className="lg:hidden sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg border-b border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Левая сторона: Бургер и кнопка "назад" */}
          <div className="flex items-center gap-1">
            {/* Бургер-кнопка */}
            <button
              onClick={() => setIsOpen(true)}
              className="p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-700 active:bg-blue-100 dark:active:bg-slate-600 transition-all duration-200 active:scale-95"
              aria-label="פתח תפריט"
            >
              <Menu className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </button>

            {/* Кнопка "назад" */}
            {showBackButton && (
              <button
                onClick={handleBack}
                className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 active:bg-gray-200 dark:active:bg-slate-600 transition-all duration-200 active:scale-95 group"
                aria-label="חזור"
              >
                <ArrowRight className="w-5 h-5 text-gray-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </button>
            )}
          </div>

          {/* Центр: Логотип */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <img
                src="/logo.png"
                alt="Trinity"
                className="w-5 h-5 object-contain"
              />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
              Trinity
            </h1>
          </div>

          {/* Правая сторона: уведомления + поиск */}
          <div className="flex items-center gap-1">
            <NotificationBell locale={language === 'he' ? 'he' : 'ru'} />
            <button
              onClick={onSearchOpen}
              className="p-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-700 active:bg-purple-100 dark:active:bg-slate-600 transition-all duration-200 active:scale-95"
              aria-label="חיפוש"
            >
              <Search className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Выдвижное меню */}
      <MobileSidebar isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

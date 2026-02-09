'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Menu, ArrowRight } from 'lucide-react'
import { MobileAdminSidebar } from './MobileAdminSidebar'

export function MobileAdminHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // На главной странице админки не показываем кнопку "назад"
  const showBackButton = pathname !== '/admin'

  const handleBack = () => {
    router.back()
  }

  return (
    <>
      {/* Мобильный admin header — только на маленьких экранах */}
      <header className="md:hidden sticky top-0 z-40 w-full bg-slate-800/95 backdrop-blur-lg border-b border-slate-700 shadow-lg">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Левая сторона: Бургер и кнопка "назад" */}
          <div className="flex items-center gap-1">
            {/* Бургер-кнопка */}
            <button
              onClick={() => setIsOpen(true)}
              className="p-2.5 rounded-xl hover:bg-slate-700 active:bg-slate-600 transition-all duration-200 active:scale-95"
              aria-label="פתח תפריט"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>

            {/* Кнопка "назад" */}
            {showBackButton && (
              <button
                onClick={handleBack}
                className="p-2.5 rounded-xl hover:bg-slate-700 active:bg-slate-600 transition-all duration-200 active:scale-95 group"
                aria-label="חזור"
              >
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
              </button>
            )}
          </div>

          {/* Центр: Логотип */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <img
                src="/logo.png"
                alt="Trinity Admin"
                className="w-5 h-5 object-contain"
              />
            </div>
            <h1 className="text-lg font-bold text-white">
              Trinity Admin
            </h1>
          </div>

          {/* Правая сторона: пустое место для баланса */}
          <div className="w-[52px]"></div>
        </div>
      </header>

      {/* Выдвижное меню */}
      <MobileAdminSidebar isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

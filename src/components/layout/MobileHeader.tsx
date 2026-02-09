'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Menu, ArrowRight } from 'lucide-react'
import { MobileSidebar } from './MobileSidebar'

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // На главной странице не показываем кнопку "назад"
  const showBackButton = pathname !== '/'

  const handleBack = () => {
    router.back()
  }

  return (
    <>
      {/* Мобильный header — только на маленьких экранах */}
      <header className="md:hidden sticky top-0 z-40 w-full bg-white/90 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Левая сторона: Бургер и кнопка "назад" */}
          <div className="flex items-center gap-1">
            {/* Бургер-кнопка */}
            <button
              onClick={() => setIsOpen(true)}
              className="p-2.5 rounded-xl hover:bg-blue-50 active:bg-blue-100 transition-all duration-200 active:scale-95"
              aria-label="פתח תפריט"
            >
              <Menu className="w-6 h-6 text-blue-600" />
            </button>

            {/* Кнопка "назад" */}
            {showBackButton && (
              <button
                onClick={handleBack}
                className="p-2.5 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 active:scale-95 group"
                aria-label="חזור"
              >
                <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
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
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Trinity
            </h1>
          </div>

          {/* Правая сторона: пустое место для баланса */}
          <div className="w-[52px]"></div>
        </div>
      </header>

      {/* Выдвижное меню */}
      <MobileSidebar isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

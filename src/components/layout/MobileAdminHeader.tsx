'use client'

import { useState } from 'react'
import { Menu, ArrowLeft } from 'lucide-react'
import { MobileAdminSidebar } from './MobileAdminSidebar'
import { useBackNavigation } from '@/hooks/useBackNavigation'

export function MobileAdminHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const { handleBack, canGoBack } = useBackNavigation()

  return (
    <>
      {/* Мобильный admin header — только на <1024px */}
      <header className="lg:hidden sticky top-0 z-40 w-full bg-slate-800/95 backdrop-blur-lg border-b border-slate-700 shadow-lg">
        {/*
          ВАЖНО: dir="ltr" принудительно форсит LTR-раскладку для header,
          игнорируя язык страницы. Позиции иконок зафиксированы глобально:
            [Стрелка «Назад» слева] [Логотип по центру] [Бургер справа]
          Правило одинаковое и для русского, и для иврита.
          НЕ удалять dir="ltr" и НЕ менять порядок блоков.
        */}
        <div dir="ltr" className="flex items-center justify-between w-full px-4 h-16">

          {/* ── Left (всегда): кнопка «Назад» (условная) ── */}
          <div className="w-10 flex items-center justify-start">
            {canGoBack ? (
              <button
                onClick={handleBack}
                className="p-2.5 rounded-xl hover:bg-slate-700 active:bg-slate-600 transition-all duration-200 active:scale-95 group"
                aria-label="חזור"
              >
                <ArrowLeft className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
              </button>
            ) : (
              <span className="w-10" aria-hidden="true" />
            )}
          </div>

          {/* ── Center: Логотип ── */}
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

          {/* ── Right (всегда): Бургер ── */}
          <div className="flex items-center">
            <button
              onClick={() => setIsOpen(true)}
              className="p-2.5 rounded-xl hover:bg-slate-700 active:bg-slate-600 transition-all duration-200 active:scale-95"
              aria-label="פתח תפריט"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
          </div>

        </div>
      </header>

      {/* Выдвижное меню */}
      <MobileAdminSidebar isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

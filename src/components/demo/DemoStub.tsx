'use client'

/**
 * DemoStub — анимированная заглушка для разделов, недоступных в демо-режиме.
 * Секции: payments, sales, settings-subpages, sidebar-sale-button
 */

import { MessageCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDemoMode } from '@/hooks/useDemoMode'
import { ReactNode, useState, useEffect } from 'react'

const WA_LINK = 'https://wa.me/972544858586'

export interface DemoStubConfig {
  emoji: string
  titleRu: string
  titleHe: string
  descRu: string
  descHe: string
  featuresRu: string[]
  featuresHe: string[]
  accentColor: string  // e.g. 'from-violet-500 to-purple-600'
}

interface DemoStubProps {
  config: DemoStubConfig
  /** Если children переданы — в продакшн-режиме рендерим children, иначе заглушку */
  children?: ReactNode
  /** Форс-показ заглушки даже вне demo (для preview) */
  forceShow?: boolean
}

export function DemoStub({ config, children, forceShow }: DemoStubProps) {
  const { isDemo } = useDemoMode()
  const { language } = useLanguage()
  const [shimmer, setShimmer] = useState(false)
  const isHe = language === 'he'

  useEffect(() => {
    const id = setInterval(() => { setShimmer(true); setTimeout(() => setShimmer(false), 700) }, 3000)
    return () => clearInterval(id)
  }, [])

  if (!isDemo && !forceShow) return <>{children}</>

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="relative inline-block mb-6">
          <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${config.accentColor} opacity-20 animate-pulse blur-xl`}/>
          <div className={`relative w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br ${config.accentColor} flex items-center justify-center shadow-xl`}>
            <span className="text-4xl">{config.emoji}</span>
          </div>
        </div>

        {/* Text */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isHe ? config.titleHe : config.titleRu}
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          {isHe ? config.descHe : config.descRu}
        </p>

        {/* Features grid */}
        <div className="grid grid-cols-2 gap-2 mb-6 text-left">
          {(isHe ? config.featuresHe : config.featuresRu).map((f, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-700">
              <span className="text-green-500 font-bold">✓</span>
              <span>{f}</span>
            </div>
          ))}
        </div>

        {/* WhatsApp button */}
        <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
          className="relative inline-flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white text-base overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 24px rgba(22,163,74,0.35)' }}>
          <span className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${shimmer ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}/>
          <span className="absolute inset-0 rounded-2xl border-2 border-green-300/50 animate-pulse pointer-events-none"/>
          <MessageCircle size={20}/>
          <span>{isHe ? 'כתוב לנו ב-WhatsApp' : 'Написать в WhatsApp'}</span>
        </a>

        <p className="text-xs text-gray-400 mt-3">
          {isHe ? 'Trinity CRM by Amber Solutions' : 'Trinity CRM by Amber Solutions'}
        </p>
      </div>
    </div>
  )
}

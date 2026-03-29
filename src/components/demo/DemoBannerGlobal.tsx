'use client'

/**
 * DemoBannerGlobal — uses useOrganization() (React Query, cached) so it
 * renders instantly on the first paint — no extra network request, no flash.
 */

import { useEffect, useState } from 'react'
import { Sparkles, X, MessageCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useOrganization } from '@/hooks/useOrganization'
import { DemoOrderModal } from '@/components/demo/DemoOrderModal'

// ─── Expired overlay ──────────────────────────────────────────────────────────
function ExpiredOverlay({ locale }: { locale: string }) {
  const l = locale === 'he'
  const [shimmer, setShimmer] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setShimmer(true)
      setTimeout(() => setShimmer(false), 600)
    }, 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-red-400 via-orange-400 to-red-400 animate-pulse"/>
        <div className="p-8 text-center">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full bg-red-100 animate-ping opacity-30"/>
            <div className="relative w-20 h-20 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">⏰</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {l ? 'התקופה הסתיימה' : 'Пробный период истёк'}
          </h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            {l
              ? 'תקופת הניסיון שלך הסתיימה. צור קשר עם צוות Trinity CRM כדי להמשיך.'
              : 'Свяжитесь с командой Trinity CRM для продолжения работы.'}
          </p>
          <a href="https://wa.me/972544858586" target="_blank" rel="noopener noreferrer"
            className="group relative block w-full overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 group-hover:from-green-500 group-hover:to-emerald-600 transition-all duration-300"/>
            <div className={`absolute inset-0 transition-opacity duration-300 ${shimmer ? 'opacity-100' : 'opacity-0'}`}
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)' }}/>
            <div className="relative flex items-center justify-center gap-3 py-4 px-6">
              <MessageCircle size={20} className="text-white flex-shrink-0"/>
              <span className="text-white font-bold text-lg">
                {l ? 'לדבר איתנו ב-WhatsApp' : 'Написать в WhatsApp'}
              </span>
            </div>
          </a>
          <p className="text-xs text-gray-400 mt-4">Trinity CRM by Amber Solutions</p>
        </div>
      </div>
    </div>
  )
}

// ─── Top sticky banner ────────────────────────────────────────────────────────
function DemoTopBanner({ locale }: { locale: string }) {
  const [dismissed, setDismissed] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const [btnShimmer, setBtnShimmer] = useState(false)
  const l = locale === 'he'

  useEffect(() => {
    const t = setInterval(() => { setPulse(true); setTimeout(() => setPulse(false), 800) }, 7000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => { setBtnShimmer(true); setTimeout(() => setBtnShimmer(false), 700) }, 3000)
    return () => clearInterval(t)
  }, [])

  if (dismissed) return null

  return (
    <>
      <DemoOrderModal open={orderOpen} onClose={() => setOrderOpen(false)}/>
      <div
        className={`relative overflow-hidden transition-all duration-500 ${pulse ? 'scale-y-[1.02]' : 'scale-y-100'}`}
        style={{ background: 'linear-gradient(90deg, #7f1d1d 0%, #991b1b 40%, #b91c1c 60%, #991b1b 80%, #7f1d1d 100%)' }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)', animation: 'demo-sweep 4s ease-in-out infinite' }}
        />
        <div className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, #fca5a5, #f87171, #ef4444, #f87171, #fca5a5)', animation: 'demo-border 2s ease-in-out infinite' }}
        />
        <div className="flex items-center gap-3 px-4 py-2 max-w-7xl mx-auto">
          <div className="relative flex-shrink-0">
            <div className={`absolute inset-0 rounded-lg bg-red-300/40 ${pulse ? 'animate-ping' : ''}`}/>
            <div className="relative w-7 h-7 bg-red-500 rounded-lg flex items-center justify-center border border-red-400">
              <Sparkles size={14} className="text-white"/>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-1 flex-wrap min-w-0">
            <span className="text-white font-bold text-sm whitespace-nowrap">
              {l ? '⚡ מצב הדגמה' : '⚡ Демо режим'}
            </span>
            <span className="text-xs bg-red-400/30 text-red-100 border border-red-400/50 px-2 py-0.5 rounded-full font-medium animate-pulse flex-shrink-0">
              DEMO
            </span>
            <span className="text-xs text-red-200 hidden md:inline whitespace-nowrap">
              {l ? '10 לקוחות · 15 ביקורים · 5 מוצרים · 5 משימות' : '10 клиентов · 15 визитов · 5 товаров · 5 задач'}
            </span>
          </div>

          <button onClick={() => setOrderOpen(true)}
            className="relative flex-shrink-0 flex items-center gap-2 px-4 py-1.5 rounded-xl font-bold text-xs text-white overflow-hidden transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', boxShadow: '0 2px 12px rgba(22,163,74,0.5)' }}>
            <span className="absolute inset-0 rounded-xl animate-[ping_2s_ease-in-out_infinite] bg-green-400/40 pointer-events-none"/>
            <span className={`absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300 ${btnShimmer ? 'opacity-100' : 'opacity-0'}`}
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)' }}/>
            <span className="absolute inset-0 rounded-xl border-2 border-green-300/60 animate-pulse pointer-events-none"/>
            <span className="relative flex items-center gap-1.5">
              <span className="text-base leading-none">🚀</span>
              <span className="hidden sm:inline">{l ? 'לקנות' : 'Купить'}</span>
            </span>
          </button>

          <button onClick={() => setDismissed(true)}
            className="flex-shrink-0 w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/50 hover:text-white transition-all">
            <X size={12}/>
          </button>
        </div>
        <style jsx global>{`
          @keyframes demo-sweep { 0%,100%{opacity:0.1} 50%{opacity:0.3} }
          @keyframes demo-border { 0%,100%{opacity:1} 50%{opacity:0.3} }
        `}</style>
      </div>
    </>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function DemoBannerGlobal() {
  const { language } = useLanguage()
  const { data: org, isLoading } = useOrganization()

  if (isLoading || !org) return null

  const isDemo = !!(org.features as any)?.is_demo
  if (!isDemo) return null

  // Демо бессрочный — показываем баннер всегда, без таймера истечения.
  // ExpiredOverlay срабатывает только если subscription_expires_at явно задан и истёк
  const expiresAt = (org as any).subscription_expires_at ?? null
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false

  if (isExpired) return <ExpiredOverlay locale={language}/>
  return <DemoTopBanner locale={language}/>
}

'use client'

import { useEffect, useState } from 'react'
import { Sparkles, X, MessageCircle } from 'lucide-react'
// MessageCircle used in ExpiredOverlay
import { useLanguage } from '@/contexts/LanguageContext'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { DemoOrderModal } from '@/components/demo/DemoOrderModal'

interface DemoState {
  isDemo: boolean
  isExpired: boolean
  expiresAt: string | null
}

// ─── Expired Demo Overlay ─────────────────────────────────────────────────────
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
            {l ? 'הגישה לדמו פגה' : 'Доступ к демо истёк'}
          </h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            {l ? 'תקופת הניסיון שלך הסתיימה. כדי להמשיך להשתמש ב-Trinity CRM — צור קשר עם נציג.'
               : 'Ваш пробный период завершён. Чтобы продолжить использование Trinity CRM — свяжитесь с представителем.'}
          </p>
          <a href="https://wa.me/972544858586" target="_blank" rel="noopener noreferrer"
            className="group relative block w-full overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 group-hover:from-green-500 group-hover:to-emerald-600 transition-all duration-300"/>
            <div className={`absolute inset-0 transition-opacity duration-300 ${shimmer ? 'opacity-100' : 'opacity-0'}`}
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)' }}/>
            <div className="absolute inset-0 rounded-2xl border-2 border-green-300 animate-ping opacity-20"/>
            <div className="relative flex items-center justify-center gap-3 py-4 px-6">
              <MessageCircle size={20} className="text-white flex-shrink-0"/>
              <span className="text-white font-bold text-lg">{l ? 'דברו איתנו ב-WhatsApp' : 'Написать в WhatsApp'}</span>
            </div>
          </a>
          <p className="text-xs text-gray-400 mt-4">Trinity CRM by Amber Solutions</p>
        </div>
      </div>
    </div>
  )
}

// ─── Top sticky banner ────────────────────────────────────────────────────────
function DemoTopBanner({ locale, expiresAt }: { locale: string; expiresAt: string | null }) {
  const [dismissed, setDismissed] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const [btnShimmer, setBtnShimmer] = useState(false)
  const l = locale === 'he'

  // Countdown
  const [timeLeft, setTimeLeft] = useState('')
  useEffect(() => {
    if (!expiresAt) return
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft(l ? 'פג תוקף' : 'Истёк'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setTimeLeft(l ? `${h}ש' ${m}ד' נותרו` : `Осталось ${h}ч ${m}м`)
    }
    update()
    const t = setInterval(update, 60000)
    return () => clearInterval(t)
  }, [expiresAt, l])

  useEffect(() => {
    const t = setInterval(() => { setPulse(true); setTimeout(() => setPulse(false), 800) }, 7000)
    return () => clearInterval(t)
  }, [])

  // Button shimmer loop — every 3s
  useEffect(() => {
    const t = setInterval(() => {
      setBtnShimmer(true)
      setTimeout(() => setBtnShimmer(false), 700)
    }, 3000)
    return () => clearInterval(t)
  }, [])

  if (dismissed) return null

  return (
    <>
      <DemoOrderModal open={orderOpen} onClose={() => setOrderOpen(false)}/>

      <div className={`relative overflow-hidden transition-all duration-500 ${pulse ? 'scale-y-[1.02]' : 'scale-y-100'}`}
        style={{ background: 'linear-gradient(90deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)' }}>
        {/* Animated gradient sweep */}
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.15) 50%, transparent 100%)',
            animation: 'demo-sweep 4s ease-in-out infinite' }}/>
        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, #f59e0b, #fb923c, #f59e0b)',
            animation: 'demo-border 2s ease-in-out infinite' }}/>

        <div className="flex items-center gap-3 px-4 py-2 max-w-7xl mx-auto">
          {/* Icon */}
          <div className="relative flex-shrink-0">
            <div className={`absolute inset-0 rounded-lg bg-amber-400/40 ${pulse ? 'animate-ping' : ''}`}/>
            <div className="relative w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
              <Sparkles size={14} className="text-white"/>
            </div>
          </div>

          {/* Text */}
          <div className="flex items-center gap-3 flex-1 flex-wrap min-w-0">
            <span className="text-white font-bold text-sm whitespace-nowrap">
              {l ? '🚀 מצב דמו' : '🚀 Демо режим'}
            </span>
            <span className="text-xs bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-medium animate-pulse flex-shrink-0">
              DEMO
            </span>
            {timeLeft && (
              <span className="text-xs text-white/50 flex-shrink-0">• {timeLeft}</span>
            )}
            <span className="text-xs text-white/40 hidden sm:inline">
              {l ? 'הנתונים לדוגמה בלבד' : 'Данные демонстрационные'}
            </span>
          </div>

          {/* ── Animated CTA button ── */}
          <button onClick={() => setOrderOpen(true)}
            className="relative flex-shrink-0 flex items-center gap-2 px-4 py-1.5 rounded-xl font-bold text-xs text-white overflow-hidden transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', boxShadow: '0 0 0 0 rgba(34,197,94,0.6)' }}>
            {/* Outer pulse ring */}
            <span className="absolute inset-0 rounded-xl animate-[ping_2s_ease-in-out_infinite] bg-green-400/40 pointer-events-none"/>
            {/* Shimmer sweep */}
            <span className={`absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300 ${btnShimmer ? 'opacity-100' : 'opacity-0'}`}
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)' }}/>
            {/* Glowing border */}
            <span className="absolute inset-0 rounded-xl border-2 border-green-300/60 animate-pulse pointer-events-none"/>
            <span className="relative flex items-center gap-1.5">
              <span className="text-base leading-none">🛒</span>
              <span className="hidden sm:inline">{l ? 'לרכישה' : 'Купить'}</span>
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

// ─── Main export — auto-detects demo state ────────────────────────────────────
export function DemoBannerGlobal() {
  const { language } = useLanguage()
  const [state, setState] = useState<DemoState>({ isDemo: false, isExpired: false, expiresAt: null })
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const sb = createSupabaseBrowserClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setChecked(true); return }
        // Try app_metadata first, fallback to org_users table
        let orgId = user.app_metadata?.org_id as string | undefined
        if (!orgId) {
          const { data: orgUser } = await sb.from('org_users')
            .select('org_id').eq('user_id', user.id).single()
          orgId = orgUser?.org_id
        }
        if (!orgId) { setChecked(true); return }
        const { data: org } = await sb.from('organizations')
          .select('features, subscription_expires_at')
          .eq('id', orgId).single()
        if (!org) { setChecked(true); return }
        const isDemo = !!(org.features as any)?.is_demo
        const isExpired = isDemo && org.subscription_expires_at
          ? new Date(org.subscription_expires_at) < new Date()
          : false
        setState({ isDemo, isExpired, expiresAt: org.subscription_expires_at })
      } catch {}
      setChecked(true)
    }
    check()
  }, [])

  if (!checked || !state.isDemo) return null
  if (state.isExpired) return <ExpiredOverlay locale={language}/>
  return <DemoTopBanner locale={language} expiresAt={state.expiresAt}/>
}

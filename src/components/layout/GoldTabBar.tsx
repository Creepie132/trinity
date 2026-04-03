'use client'

import { useRef, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Users, Calendar, CreditCard, BarChart3 } from 'lucide-react'
import { useFeatures } from '@/hooks/useFeatures'
import { cn } from '@/lib/utils'

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { href: '/dashboard', icon: Home,       requireFeature: null },
  { href: '/clients',   icon: Users,      requireFeature: 'clients' },
  { href: '/visits',    icon: Calendar,   requireFeature: 'visits' },
  { href: '/payments',  icon: CreditCard, requireFeature: 'payments' },
  { href: '/analytics', icon: BarChart3,  requireFeature: 'analytics' },
] as const

// ─── Separator ────────────────────────────────────────────────────────────────
function Sep({ visible }: { visible: boolean }) {
  return (
    <div
      className="flex-shrink-0 rounded-full transition-opacity duration-200"
      style={{
        width: 1,
        height: 28,
        background: 'rgba(255,255,255,0.09)',
        opacity: visible ? 1 : 0,
      }}
    />
  )
}

// ─── GoldTabBar ───────────────────────────────────────────────────────────────
export function GoldTabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const features = useFeatures()

  const visibleTabs = TABS.filter(tab => {
    if (!tab.requireFeature) return true
    const featureMap: Record<string, boolean> = {
      clients:   features.hasClients,
      visits:    features.hasVisits,
      payments:  features.hasPayments && features.paymentsEnabled,
      analytics: features.hasAnalytics,
    }
    return featureMap[tab.requireFeature] ?? true
  })

  const activeIndex = visibleTabs.findIndex(
    tab => pathname === tab.href || pathname.startsWith(tab.href + '/')
  )

  // ── Spring refs ────────────────────────────────────────────────────────────
  const barRef = useRef<HTMLDivElement>(null)
  const indRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const spring = useRef({
    leadPos: 0, leadVel: 0,
    trailPos: 0, trailVel: 0,
    targetLead: 0, targetTrail: 0,
    initialized: false,
  })

  const getTabRect = useCallback((index: number) => {
    if (!barRef.current) return { left: 0, width: 80 }
    const tabs = barRef.current.querySelectorAll<HTMLElement>('[data-tabrole="tab"]')
    const tab = tabs[index]
    if (!tab) return { left: 0, width: 80 }
    const br = barRef.current.getBoundingClientRect()
    const tr = tab.getBoundingClientRect()
    return { left: tr.left - br.left, width: tr.width }
  }, [])

  const applyIndicator = useCallback((left: number, right: number) => {
    if (!indRef.current) return
    indRef.current.style.left  = `${left}px`
    indRef.current.style.width = `${right - left}px`
  }, [])

  const tick = useCallback(() => {
    const s = spring.current
    const step = (pos: number, vel: number, target: number, k: number, d: number) => {
      const f = -k * (pos - target) - d * vel
      const nv = vel + f / 60
      return [pos + nv / 60, nv] as const
    }
    ;[s.leadPos,  s.leadVel]  = step(s.leadPos,  s.leadVel,  s.targetLead,  300, 26)
    ;[s.trailPos, s.trailVel] = step(s.trailPos, s.trailVel, s.targetTrail, 160, 20)

    applyIndicator(Math.min(s.leadPos, s.trailPos), Math.max(s.leadPos, s.trailPos))

    const done =
      Math.abs(s.leadVel)  < 0.08 && Math.abs(s.leadPos  - s.targetLead)  < 0.3 &&
      Math.abs(s.trailVel) < 0.08 && Math.abs(s.trailPos - s.targetTrail) < 0.3

    if (done) {
      s.leadPos = s.targetLead; s.leadVel = 0
      s.trailPos = s.targetTrail; s.trailVel = 0
      applyIndicator(s.targetTrail, s.targetLead)
      rafRef.current = null
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [applyIndicator])

  // Init indicator after mount
  useEffect(() => {
    if (features.isLoading || activeIndex < 0) return
    const timer = setTimeout(() => {
      const { left, width } = getTabRect(activeIndex)
      const s = spring.current
      s.leadPos = s.targetLead = left + width
      s.trailPos = s.targetTrail = left
      s.initialized = true
      applyIndicator(left, left + width)
    }, 80)
    return () => clearTimeout(timer)
  }, [features.isLoading, visibleTabs.length]) // eslint-disable-line

  // Animate on route change
  const prevIdxRef = useRef(activeIndex)
  useEffect(() => {
    const s = spring.current
    if (!s.initialized || activeIndex < 0) return
    const prev = prevIdxRef.current
    prevIdxRef.current = activeIndex
    if (prev === activeIndex) return

    const { left, width } = getTabRect(activeIndex)
    const movingRight = activeIndex > prev

    if (movingRight) {
      s.targetLead = left + width; s.leadVel = 200
      setTimeout(() => { s.targetTrail = left; s.trailVel = 60 }, 55)
    } else {
      s.targetTrail = left; s.trailVel = -200
      setTimeout(() => { s.targetLead = left + width; s.leadVel = -60 }, 55)
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }, [activeIndex, getTabRect, tick])

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  if (features.isLoading) return null

  return (
    <>
      {/* Spacer so content isn't hidden behind tabbar */}
      <div className="lg:hidden h-[90px] flex-shrink-0" />

      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center px-3"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
          paddingTop: 8,
          background: 'linear-gradient(to top, rgba(12,12,15,0.97) 55%, transparent)',
        }}
      >
        {/* Bar */}
        <div
          ref={barRef}
          className="relative flex items-center"
          style={{
            background: '#18181a',
            borderRadius: 32,
            padding: 10,
            height: 74,
            width: '100%',
            maxWidth: 400,
            boxShadow:
              '0 0 0 1px rgba(255,255,255,0.05),' +
              '0 20px 60px rgba(0,0,0,0.85),' +
              'inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Gold squircle indicator */}
          <div
            ref={indRef}
            className="absolute top-[10px] z-[1] pointer-events-none"
            style={{ height: 54, borderRadius: 18 }}
          >
            {/* Glow */}
            <div style={{
              position: 'absolute', inset: -3, borderRadius: 21,
              boxShadow: '0 0 14px 3px rgba(190,130,15,0.40),0 0 5px 1px rgba(255,210,70,0.28)',
            }} />
            {/* Dark fill */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 18, overflow: 'hidden',
              background: 'radial-gradient(ellipse 70% 45% at 50% 0%,rgba(60,35,5,0.9) 0%,rgba(20,14,4,0.95) 50%,#0e0c09 100%)',
            }}>
              <div className="absolute inset-0 gold-shimmer" />
            </div>
            {/* Gold border */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 18, padding: '2.5px',
              background: 'linear-gradient(155deg,#fffbe0 0%,#f0d060 8%,#d4940c 18%,#9a5e00 30%,#5a3200 40%,#3a1e00 50%,#5a3200 60%,#9a5e00 70%,#d4940c 80%,#f0d060 90%,#fffbe0 100%)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }} />
          </div>

          {/* Tabs */}
          {visibleTabs.map((tab, i) => {
            const Icon = tab.icon
            const isActive = i === activeIndex
            const showSep = i < visibleTabs.length - 1
            const sepVisible = !(i === activeIndex || i === activeIndex - 1)
            return (
              <div key={tab.href} className="contents">
                <button
                  data-tabrole="tab"
                  onClick={() => router.push(tab.href)}
                  className="relative flex-1 flex items-center justify-center h-full z-[2] select-none focus:outline-none"
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    style={{
                      width: 26, height: 26,
                      strokeWidth: 1.6,
                      color: '#ffffff',
                      opacity: isActive ? 1 : 0.3,
                      transition: 'opacity 0.3s ease',
                    }}
                  />
                </button>
                {showSep && <Sep visible={sepVisible} />}
              </div>
            )
          })}
        </div>

        <style>{`
          .gold-shimmer {
            background: linear-gradient(110deg,transparent 25%,rgba(255,215,80,0.07) 40%,rgba(255,235,130,0.13) 50%,rgba(255,215,80,0.07) 60%,transparent 75%);
            animation: goldShimmer 4s ease-in-out infinite;
          }
          @keyframes goldShimmer {
            0%   { transform: translateX(-120%); }
            45%  { transform: translateX(220%); }
            100% { transform: translateX(220%); }
          }
        `}</style>
      </nav>
    </>
  )
}

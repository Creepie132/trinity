'use client'

import { ArrowRight, Sparkles } from 'lucide-react'

export type LoginButtonStyle = 'orbit' | 'pulse'

interface AnimatedLoginButtonProps {
  href: string
  children: React.ReactNode
  mobile?: boolean
  style?: LoginButtonStyle
}

export function AnimatedLoginButton({ 
  href, 
  children, 
  mobile = false,
  style = 'orbit'
}: AnimatedLoginButtonProps) {
  
  if (style === 'pulse') {
    return (
      <a
        href={href}
        className={`
          relative group overflow-hidden
          ${mobile ? 'w-full' : 'inline-flex'}
          items-center justify-center gap-2
          px-8 py-4 rounded-2xl
          font-medium text-white
          transition-all duration-300
          hover:scale-[1.02]
          bg-gradient-to-br from-gray-900 to-gray-800
          btn-pulse-glow
        `}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <div 
            className="absolute inset-0 btn-pulse-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              width: '100%',
              height: '100%',
            }}
          />
        </div>
        
        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {children}
          <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12" />
        </span>
      </a>
    )
  }
  
  // Orbit style (default)
  return (
    <a
      href={href}
      className={`
        relative group overflow-hidden
        ${mobile ? 'w-full' : 'inline-flex'}
        items-center justify-center gap-2
        px-8 py-4 rounded-xl
        font-medium text-white
        transition-all duration-300
        hover:scale-[1.02]
        btn-orbit-shadow
      `}
    >
      {/* Animated gradient border */}
      <div className="absolute inset-0 rounded-xl btn-orbit-border p-[2px]">
        <div className="w-full h-full rounded-xl bg-gradient-to-br from-gray-900 to-gray-800" />
      </div>
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 blur-xl bg-amber-500/20 transition-opacity duration-300 btn-orbit-glow" />
      
      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">
        {children}
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </span>
    </a>
  )
}

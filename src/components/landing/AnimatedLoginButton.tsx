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
          relative
          ${mobile ? 'w-full' : 'inline-flex'}
          items-center justify-center gap-2
          px-10 py-4 rounded-2xl
          text-base font-medium text-white
          bg-gray-900
          transition-transform duration-300
          hover:scale-[1.02]
          btn-pulse-glow
        `}
      >
        {/* Shimmer overlay */}
        <div className="btn-pulse-shimmer" />
        
        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {children}
          <Sparkles className="w-4 h-4" />
        </span>
      </a>
    )
  }
  
  // Orbit style (comet trail)
  return (
    <div className={`btn-orbit-container ${mobile ? 'w-full' : 'inline-block'}`}>
      {/* Comet border animation */}
      <div className="btn-orbit-border" />
      
      <a
        href={href}
        className={`
          relative
          ${mobile ? 'w-full' : 'inline-flex'}
          items-center justify-center gap-2
          px-10 py-4 rounded-2xl
          text-base font-medium text-white
          bg-gray-900
          transition-transform duration-300
          hover:scale-[1.02]
        `}
      >
        {children}
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  )
}

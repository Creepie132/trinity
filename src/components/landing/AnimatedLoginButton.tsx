'use client'

import { ArrowRight } from 'lucide-react'

interface AnimatedLoginButtonProps {
  href: string
  children: React.ReactNode
  mobile?: boolean
}

export function AnimatedLoginButton({ href, children, mobile = false }: AnimatedLoginButtonProps) {
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
        animated-login-button
      `}
    >
      {/* Animated gradient border */}
      <div className="absolute inset-0 rounded-xl bg-gradient-conic animate-spin-slow" />
      
      {/* Inner background */}
      <div className="absolute inset-[1px] rounded-xl bg-gradient-to-br from-gray-900 to-gray-800" />
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 blur-xl bg-amber-500/20 transition-opacity duration-300 animate-pulse-glow" />
      
      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">
        {children}
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </span>
    </a>
  )
}

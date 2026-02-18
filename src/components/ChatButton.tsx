'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

interface ChatButtonProps {
  onClick: () => void
  isActive: boolean
}

export default function ChatButton({ onClick, isActive }: ChatButtonProps) {
  const [hovered, setHovered] = useState(false)
  const [animData, setAnimData] = useState<any>(null)

  // Load JSON dynamically to avoid blocking SSR
  useEffect(() => {
    fetch('/animations/ai-button.json')
      .then(r => r.json())
      .then(setAnimData)
      .catch(err => console.error('Failed to load Lottie animation:', err))
  }, [])

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 72,
        height: 72,
        cursor: 'pointer',
        zIndex: 999,
        borderRadius: '50%',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        padding: 0,
        transition: 'transform 300ms ease',
        transform: hovered ? 'scale(1.12)' : isActive ? 'scale(0.85)' : 'scale(1)',
      }}
    >
      {animData && (
        <Lottie
          animationData={animData}
          loop={true}
          autoplay={true}
          style={{ width: '100%', height: '100%' }}
        />
      )}
      
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 24,
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        >
          ✕
        </div>
      )}
    </div>
  )
}

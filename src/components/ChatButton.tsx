'use client'

import { MessageCircle } from 'lucide-react'
import { useState } from 'react'

interface ChatButtonProps {
  onClick: () => void
  isActive: boolean
}

export default function ChatButton({ onClick, isActive }: ChatButtonProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="chat-fab"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: '#FFBF00',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: hovered
          ? '0 6px 20px 0 rgba(0,0,0,0.35)'
          : '0 4px 14px 0 rgba(0,0,0,0.25)',
        transform: hovered ? 'scale(1.05)' : isActive ? 'scale(0.95)' : 'scale(1)',
        transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 9999,
        outline: 'none',
      }}
      aria-label="Open AI Assistant"
    >
      <MessageCircle
        size={28}
        strokeWidth={2.5}
        color="#1A1A1A"
        style={{
          transition: 'transform 200ms ease',
          transform: hovered ? 'rotate(-10deg)' : 'rotate(0deg)',
        }}
      />
    </button>
  )
}

'use client'

import { useState, useEffect } from 'react'

interface TrinityNotificationIconProps {
  hasNotification: boolean
  unreadCount: number
  onClick: () => void
  size?: number
}

export function TrinityNotificationIcon({
  hasNotification,
  unreadCount,
  onClick,
  size = 24,
}: TrinityNotificationIconProps) {
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    if (hasNotification) {
      setAnimate(true)
      const timer = setTimeout(() => setAnimate(false), 600)
      return () => clearTimeout(timer)
    }
  }, [hasNotification, unreadCount])

  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-xl hover:bg-muted/50 transition active:scale-95"
      style={{ width: size + 16, height: size + 16 }}
    >
      <style jsx>{`
        @keyframes envelopeFlip {
          0% {
            transform: perspective(300px) rotateX(0deg);
          }
          50% {
            transform: perspective(300px) rotateX(180deg);
          }
          100% {
            transform: perspective(300px) rotateX(0deg);
          }
        }

        @keyframes badgePop {
          0% {
            transform: scale(0);
          }
          60% {
            transform: scale(1.3);
          }
          80% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
          }
        }

        .envelope-flip {
          animation: envelopeFlip 0.5s ease-in-out;
        }

        .badge-pop {
          animation: badgePop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      {/* Конверт SVG */}
      <div className={animate ? 'envelope-flip' : ''}>
        {hasNotification ? (
          /* Закрытый конверт — есть уведомления */
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="2" y="6" width="20" height="14" rx="2" fill="#4FC3F7" />
            <path d="M2 8l10 6 10-6" stroke="#29B6F6" strokeWidth="1.5" fill="#29B6F6" />
            <path d="M2 8l10 6 10-6V6H2v2z" fill="#29B6F6" />
          </svg>
        ) : (
          /* Открытый конверт — нет уведомлений */
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="2" y="10" width="20" height="10" rx="2" fill="#4FC3F7" opacity="0.5" />
            <path d="M2 10l10-6 10 6" fill="#81D4FA" opacity="0.5" />
            <rect x="5" y="7" width="14" height="9" rx="1" fill="white" fillOpacity="0.6" />
            <path d="M2 14l10 4 10-4v6H2v-6z" fill="#4FC3F7" opacity="0.4" />
          </svg>
        )}
      </div>

      {/* Красный бейдж */}
      {hasNotification && unreadCount > 0 && (
        <span
          className={`absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 border-2 border-background ${
            animate ? 'badge-pop' : ''
          }`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}

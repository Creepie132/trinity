'use client'

import { useState } from 'react'
import ChatOrb from './ChatOrb'

type Language = 'he' | 'ru' | 'en'

const translations: Record<string, Record<Language, string>> = {
  greeting: {
    he: 'שלום! 👋 אני העוזר הדיגיטלי של Amber Solutions.',
    ru: 'Привет! 👋 Я цифровой помощник Amber Solutions.',
    en: "Hi! 👋 I'm the Amber Solutions digital assistant."
  },
  online: { he: 'Online', ru: 'Online', en: 'Online' }
}

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [language, setLanguage] = useState<Language>('he')

  const t = (key: string) => translations[key]?.[language] || key

  return (
    <>
      <style jsx global>{`
        @keyframes chat-open {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* 3D Orb Button */}
      {!isOpen && (
        <ChatOrb
          isHovered={isHovered}
          isChatOpen={false}
          onClick={() => setIsOpen(true)}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
        />
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '110px',
            right: '24px',
            width: '380px',
            maxHeight: 'calc(100vh - 140px)',
            zIndex: 1000,
            animation: 'chat-open 0.3s ease-out'
          }}
        >
          <div
            style={{
              background: '#080c14',
              borderRadius: '20px',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              boxShadow: '0 0 40px rgba(0, 212, 255, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                  <ChatOrb
                    isHovered={false}
                    isChatOpen={true}
                    onClick={() => setIsOpen(false)}
                    onHoverStart={() => {}}
                    onHoverEnd={() => {}}
                  />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                    Amber AI
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                    <span style={{ fontSize: '10px', color: '#10B981' }}>{t('online')}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {(['he', 'ru', 'en'] as Language[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    style={{
                      fontSize: '18px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      opacity: language === lang ? 1 : 0.4,
                      transition: 'opacity 0.2s'
                    }}
                  >
                    {lang === 'he' ? '🇮🇱' : lang === 'ru' ? '🇷🇺' : '🇬🇧'}
                  </button>
                ))}

                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    fontSize: '20px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    padding: '4px'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '16px', minHeight: '200px' }}>
              <div
                style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(79, 70, 229, 0.1))',
                  borderRadius: '16px',
                  border: '1px solid rgba(0, 212, 255, 0.2)'
                }}
              >
                <p style={{ color: '#e5e7eb', fontSize: '14px', margin: 0 }}>{t('greeting')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

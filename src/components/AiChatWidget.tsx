'use client'

import { useState, useEffect, useRef } from 'react'

type Language = 'he' | 'ru' | 'en'
type View = 'menu' | 'faq' | 'calculator' | 'trial' | 'clients' | 'services' | 'human' | 'faq-detail' | 'trial-form'

const translations: Record<string, Record<Language, string>> = {
  greeting: {
    he: 'שלום! 👋 אני העוזר הדיגיטלי של Amber Solutions. איך אוכל לעזור?',
    ru: 'Привет! 👋 Я цифровой помощник Amber Solutions. Чем могу помочь?',
    en: "Hi! 👋 I'm the Amber Solutions digital assistant. How can I help?"
  },
  menuFaq: { he: '❓ שאלות נפוצות', ru: '❓ Частые вопросы', en: '❓ FAQ' },
  menuCalculator: { he: '🧮 בנה את המערכת שלך', ru: '🧮 Собери свою систему', en: '🧮 Build Your System' },
  menuTrial: { he: '🎁 נסיון חינם 14 יום', ru: '🎁 Бесплатный тест 14 дней', en: '🎁 Free 14-Day Trial' },
  menuClients: { he: '⭐ מי כבר משתמש במערכת?', ru: '⭐ Кто уже пользуется?', en: '⭐ Who Uses Our System?' },
  menuServices: { he: '🚀 שירותים נוספים', ru: '🚀 Другие услуги', en: '🚀 More Services' },
  menuHuman: { he: '👤 לדבר עם נציג אנושי', ru: '👤 Связаться с человеком', en: '👤 Talk to a Human' },
  back: { he: '→ חזרה', ru: '← Назад', en: '← Back' },
  online: { he: 'Online', ru: 'Online', en: 'Online' }
}

function GlowingOrb({ isHovered, isChatOpen }: { isHovered: boolean; isChatOpen: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | undefined>(undefined)
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 72
    const cx = size / 2
    const cy = size / 2
    const r = size * 0.42

    const draw = () => {
      const now = Date.now()
      const elapsed = (now - startTimeRef.current) / 1000
      
      ctx.clearRect(0, 0, size, size)

      // Clip to circle
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.clip()

      // Background gradient
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      bgGrad.addColorStop(0, '#0a1628')
      bgGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, size, size)

      // Animation speed
      const speed = isChatOpen ? 0.5 : isHovered ? 1.5 : 1
      const rotationSpeed = (elapsed * speed) / 12 // 12 sec cycle
      const pulseSpeed = (elapsed * speed) / 4 // 4 sec pulse

      // Pulse brightness
      const pulseBrightness = 0.8 + Math.sin(pulseSpeed * Math.PI * 2) * 0.2

      // Draw wide flowing streams
      const drawStream = (
        angle: number,
        width: number,
        color1: string,
        color2: string,
        blur: number,
        alpha: number
      ) => {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(angle + rotationSpeed * Math.PI * 2)

        const streamGrad = ctx.createLinearGradient(-r, 0, r, 0)
        streamGrad.addColorStop(0, color1)
        streamGrad.addColorStop(1, color2)

        ctx.shadowBlur = isHovered ? blur * 1.6 : blur
        ctx.shadowColor = color1
        ctx.fillStyle = streamGrad
        ctx.globalAlpha = alpha * pulseBrightness

        // Create crescent/aurora shape
        const deform = Math.sin(elapsed * speed * 0.5) * 0.1

        ctx.beginPath()
        // Upper curve
        ctx.moveTo(-r * 0.8, -width / 2)
        ctx.bezierCurveTo(
          -r * 0.3, -width / 2 - width * deform,
          r * 0.3, -width / 2 + width * deform,
          r * 0.8, -width / 2
        )
        // Right edge (thinner)
        ctx.lineTo(r * 0.75, 0)
        // Lower curve
        ctx.bezierCurveTo(
          r * 0.3, width / 2 - width * deform,
          -r * 0.3, width / 2 + width * deform,
          -r * 0.8, width / 2
        )
        // Left edge (thinner)
        ctx.lineTo(-r * 0.75, 0)
        ctx.closePath()
        ctx.fill()

        ctx.restore()
      }

      // Stream 1: Cyan → Blue (main)
      drawStream(0, 22, '#00D4FF', '#0066FF', 25, 0.7)

      // Stream 2: Indigo → Purple
      drawStream(Math.PI * 0.4, 18, '#4F46E5', '#7C3AED', 20, 0.6)

      // Stream 3: White accent (thin)
      drawStream(Math.PI * 0.7, 10, '#FFFFFF', '#FFFFFF', 15, 0.3)

      ctx.restore()

      // Draw X if chat is open
      if (isChatOpen) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('✕', cx, cy)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isHovered, isChatOpen])

  return <canvas ref={canvasRef} width={72} height={72} style={{ display: 'block', width: 72, height: 72 }} />
}

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [language, setLanguage] = useState<Language>('he')
  const [view, setView] = useState<View>('menu')

  const t = (key: string) => translations[key]?.[language] || key
  const dir = language === 'he' ? 'rtl' : 'ltr'

  const renderContent = () => {
    if (view === 'menu') {
      return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            padding: '16px',
            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(79, 70, 229, 0.1))',
            borderRadius: '16px',
            border: '1px solid rgba(0, 212, 255, 0.2)'
          }}>
            <p style={{ color: '#e5e7eb', fontSize: '14px', margin: 0 }}>{t('greeting')}</p>
          </div>
          
          {['menuFaq', 'menuCalculator', 'menuTrial', 'menuClients', 'menuServices'].map(key => (
            <button
              key={key}
              style={{
                padding: '12px 16px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(0, 212, 255, 0.2)',
                borderRadius: '12px',
                color: '#e5e7eb',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: dir === 'rtl' ? 'right' : 'left',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.2)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {t(key)}
            </button>
          ))}
          
          <button
            style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #00D4FF, #4F46E5)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 212, 255, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {t('menuHuman')}
          </button>
        </div>
      )
    }

    return null
  }

  return (
    <>
      <style jsx global>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 212, 255, 0.3); }
          50% { box-shadow: 0 0 40px rgba(0, 212, 255, 0.6); }
        }
        
        @keyframes border-pulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.5; }
        }
        
        @keyframes chat-open {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .chat-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .chat-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .chat-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 212, 255, 0.3);
          border-radius: 10px;
        }
      `}</style>

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 999,
            cursor: 'pointer',
            border: 'none',
            background: 'transparent',
            padding: 0,
            transform: isHovered ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform 0.3s ease',
            animation: 'pulse-glow 3s infinite'
          }}
        >
          <GlowingOrb isHovered={isHovered} isChatOpen={false} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '24px',
            width: '380px',
            maxHeight: 'calc(100vh - 130px)',
            zIndex: 1000,
            animation: 'chat-open 0.3s ease-out'
          }}
        >
          <div
            style={{
              position: 'relative',
              background: '#080c14',
              borderRadius: '20px',
              boxShadow: '0 0 30px rgba(0, 212, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 130px)',
              overflow: 'hidden'
            }}
          >
            {/* Gradient border */}
            <div
              style={{
                position: 'absolute',
                inset: '-1px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #00D4FF, #4F46E5, #7C3AED)',
                zIndex: -1,
                animation: 'border-pulse 4s infinite'
              }}
            />

            {/* Header */}
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid rgba(0, 212, 255, 0.15)',
                backdropFilter: 'blur(12px)',
                background: 'rgba(8, 12, 20, 0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div onClick={() => setIsOpen(false)} style={{ cursor: 'pointer' }}>
                  <GlowingOrb isHovered={false} isChatOpen={true} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'white', margin: 0 }}>Amber AI</p>
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
            <div
              className="chat-scrollbar"
              style={{
                flex: 1,
                overflowY: 'auto',
                minHeight: '200px',
                maxHeight: 'calc(100vh - 230px)'
              }}
              dir={dir}
            >
              {renderContent()}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

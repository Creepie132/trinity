'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X } from 'lucide-react'

type Language = 'he' | 'ru' | 'en'

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
  inputPlaceholder: { he: 'כתוב הודעה...', ru: 'Напишите сообщение...', en: 'Type a message...' },
  back: { he: '→ חזרה', ru: '← Назад', en: '← Back' },
  online: { he: 'Online', ru: 'Online', en: 'Online' }
}

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [language, setLanguage] = useState<Language>('he')
  const [isMobile, setIsMobile] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-detect language from HTML lang attribute
  useEffect(() => {
    const htmlLang = document.documentElement.lang || 'he'
    if (htmlLang.startsWith('he')) {
      setLanguage('he')
    } else if (htmlLang.startsWith('ru')) {
      setLanguage('ru')
    } else if (htmlLang.startsWith('en')) {
      setLanguage('en')
    }
  }, [])

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 600)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-focus input on desktop when opened
  useEffect(() => {
    if (isOpen && !isMobile && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, isMobile])

  const t = (key: string) => translations[key]?.[language] || key
  const dir = language === 'he' ? 'rtl' : 'ltr'

  return (
    <>
      <style jsx global>{`
        @keyframes chat-open {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes chat-open-mobile {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .chat-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .chat-scrollbar::-webkit-scrollbar-track {
          background: #f8f6ff;
        }
        
        .chat-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(123, 47, 247, 0.3);
          border-radius: 10px;
        }

        /* Prevent mobile keyboard from covering chat */
        @media (max-width: 600px) {
          body.chat-open {
            position: fixed;
            width: 100%;
            overflow: hidden;
          }
        }
      `}</style>

      {/* AI Assistant FAB Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen && isMobile) {
            document.body.classList.add('chat-open')
          } else {
            document.body.classList.remove('chat-open')
          }
        }}
        onMouseEnter={(e) => {
          if (!isMobile) {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = '0 6px 20px 0 rgba(0,0,0,0.35)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = isOpen ? 'scale(0.95)' : 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(0,0,0,0.25)'
        }}
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
          display: isOpen && isMobile ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px 0 rgba(0,0,0,0.25)',
          transform: isOpen ? 'scale(0.95)' : 'scale(1)',
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
        />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: isMobile ? '0' : '100px',
            right: isMobile ? '0' : '24px',
            width: isMobile ? '100%' : '400px',
            height: isMobile ? '100%' : '600px',
            maxHeight: isMobile ? '100vh' : 'calc(100vh - 120px)',
            zIndex: 10000,
            animation: isMobile ? 'chat-open-mobile 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'chat-open 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: isMobile ? 'none' : '1px solid rgba(123, 47, 247, 0.15)',
              borderRadius: isMobile ? '0' : '16px',
              boxShadow: isMobile ? 'none' : '0 8px 40px rgba(123, 47, 247, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #7B2FF7, #C850C0)',
                padding: isMobile ? '20px 16px' : '16px',
                borderRadius: isMobile ? '0' : '16px 16px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>✨</span>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                    Amber AI
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                    <span style={{ fontSize: '10px', color: 'white', opacity: 0.9 }}>{t('online')}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Language Switcher with Flags */}
                {(['he', 'ru', 'en'] as Language[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    style={{
                      width: '32px',
                      height: '32px',
                      fontSize: '16px',
                      background: language === lang ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                      border: 'none',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      opacity: language === lang ? 1 : 0.6
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'
                      e.currentTarget.style.opacity = '1'
                    }}
                    onMouseLeave={(e) => {
                      if (language !== lang) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.opacity = '0.6'
                      }
                    }}
                  >
                    {lang === 'he' ? '🇮🇱' : lang === 'ru' ? '🇷🇺' : '🇬🇧'}
                  </button>
                ))}

                {/* Close Button */}
                <button
                  onClick={() => {
                    setIsOpen(false)
                    document.body.classList.remove('chat-open')
                  }}
                  style={{
                    width: '32px',
                    height: '32px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div
              className="chat-scrollbar"
              style={{
                padding: '16px',
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden'
              }}
              dir={dir}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Greeting */}
                <div
                  style={{
                    padding: '16px',
                    background: 'linear-gradient(135deg, rgba(123, 47, 247, 0.08), rgba(200, 80, 192, 0.08))',
                    borderRadius: '16px',
                    border: '1px solid rgba(123, 47, 247, 0.1)'
                  }}
                >
                  <p style={{ color: '#1a1a1a', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
                    {t('greeting')}
                  </p>
                </div>

                {/* Menu buttons */}
                {['menuFaq', 'menuCalculator', 'menuTrial', 'menuClients', 'menuServices'].map(key => (
                  <button
                    key={key}
                    style={{
                      padding: '14px 16px',
                      background: '#f8f6ff',
                      border: '1px solid rgba(123, 47, 247, 0.1)',
                      borderRadius: '16px',
                      color: '#1a1a1a',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: dir === 'rtl' ? 'right' : 'left',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#7B2FF7'
                      e.currentTarget.style.boxShadow = '0 2px 12px rgba(123, 47, 247, 0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(123, 47, 247, 0.1)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {t(key)}
                  </button>
                ))}

                {/* Human contact button */}
                <button
                  style={{
                    padding: '14px 16px',
                    background: 'linear-gradient(135deg, #7B2FF7, #C850C0)',
                    border: 'none',
                    borderRadius: '16px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(123, 47, 247, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {t('menuHuman')}
                </button>
              </div>
            </div>

            {/* Input Footer */}
            <div
              style={{
                padding: '16px',
                borderTop: '1px solid rgba(123, 47, 247, 0.1)',
                background: '#fafafa',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={t('inputPlaceholder')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '1px solid rgba(123, 47, 247, 0.2)',
                    borderRadius: '12px',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    direction: dir,
                    textAlign: dir === 'rtl' ? 'right' : 'left'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#7B2FF7'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(123, 47, 247, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(123, 47, 247, 0.2)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
                <button
                  style={{
                    width: '44px',
                    height: '44px',
                    background: 'linear-gradient(135deg, #7B2FF7, #C850C0)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  ➤
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

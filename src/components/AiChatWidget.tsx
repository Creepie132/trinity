'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, ArrowRight, ArrowLeft } from 'lucide-react'

type Language = 'he' | 'ru' | 'en'
type Screen = 'menu' | 'faq' | 'answer'

const translations: Record<string, Record<Language, string>> = {
  greeting: {
    he: 'שלום! 👋 אני העוזר הדיגיטלי של Amber Solutions. איך אוכל לעזור?',
    ru: 'Привет! 👋 Я цифровой помощник Amber Solutions. Чем могу помочь?',
    en: "Hi! 👋 I'm the Amber Solutions digital assistant. How can I help?"
  },
  menuFaq: { he: '❓ שאלות נפוצות', ru: '❓ Частые вопросы', en: '❓ FAQ' },
  menuCalculator: { he: '🧮 בנה את המערכת שלך', ru: '🧮 Собери свою систему', en: '🧮 Build Your System' },
  menuTrial: { he: '🎁 נסיון חינם 14 יום', ru: '🎁 Бесплатный тест 14 дней', en: '🎁 Free 14-Day Trial' },
  menuServices: { he: '🚀 שירותים נוספים', ru: '🚀 Другие услуги', en: '🚀 More Services' },
  menuHuman: { he: '👤 לדבר עם נציג אנושי', ru: '👤 Связаться с человеком', en: '👤 Talk to a Human' },
  backToMenu: { he: 'חזרה לתפריט ←', ru: '← Назад в меню', en: '← Back to Menu' },
  inputPlaceholder: { he: 'כתוב הודעה...', ru: 'Напишите сообщение...', en: 'Type a message...' },
  online: { he: 'Online', ru: 'Online', en: 'Online' }
}

const faqData: Record<string, { question: Record<Language, string>, answer: Record<Language, string> }> = {
  q1: {
    question: {
      he: '?מה זה מערכת CRM',
      ru: 'Что такое CRM-система?',
      en: 'What is a CRM system?'
    },
    answer: {
      he: 'זה ה\'מוח הדיגיטלי\' של העסק שלך. במקום אחד נמצאים תורי לקוחות, היסטוריית ביקורים, תשלומים, מלאי ושליחת SMS אוטומטית. בלי עוד פנקסים וטבלאות אקסל.',
      ru: 'Это «цифровой мозг» твоего бизнеса. В одном месте собраны записи клиентов, история визитов, оплаты, остатки на складе и автоматическая отправка SMS. Больше никаких блокнотов и Excel-таблиц.',
      en: 'It\'s the \'digital brain\' of your business. Client records, visit history, payments, inventory, and automated SMS — all in one place. No more notebooks and spreadsheets.'
    }
  },
  q2: {
    question: {
      he: '?למה זה נחוץ לעסק',
      ru: 'Зачем это нужно бизнесу?',
      en: 'Why does my business need this?'
    },
    answer: {
      he: 'כדי לא להפסיד כסף. Trinity תזכיר ללקוח על התור, תברך ליום הולדת ותראה לך איזה עובד מביא יותר רווח. אתה רואה מספרים אמיתיים, לא מנחש.',
      ru: 'Чтобы не терять деньги. Trinity напомнит клиенту о записи, поздравит с днём рождения и покажет, какой мастер приносит больше прибыли. Ты видишь реальные цифры, а не гадаешь на кофейной гуще.',
      en: 'To stop losing money. Trinity reminds clients about appointments, sends birthday greetings, and shows which employee generates the most profit. Real numbers, not guesswork.'
    }
  },
  q3: {
    question: {
      he: '?באיזה שלב צריך להטמיע את Trinity',
      ru: 'На каком этапе пора внедрять Trinity?',
      en: 'When is the right time to implement Trinity?'
    },
    answer: {
      he: 'ברגע שכמות הלקוחות עברה 15-20. אם אתה מרגיש שמתחיל לשכוח להתקשר חזרה או מתבלבל בתורים — הגיע הזמן. עדיף לבנות מערכת מהתחלה מאשר לסדר בלגן אחר כך.',
      ru: 'Как только количество клиентов перевалило за 15-20 человек. Если ты чувствуешь, что начинаешь забывать перезвонить или путаешься в записях — время пришло.',
      en: 'As soon as your client base exceeds 15-20 people. If you\'re starting to forget callbacks or mix up appointments — it\'s time.'
    }
  },
  q4: {
    question: {
      he: '?איך מעבירים את כל הלקוחות שלי',
      ru: 'Как мне перенести всех своих клиентов?',
      en: 'How do I migrate my existing clients?'
    },
    answer: {
      he: 'אנחנו נעשה את זה בשבילך. פשוט תייצא את הקובץ מאקסל או ממערכת אחרת בפורמט CSV, ואנחנו \'נעביר\' את כל הלקוחות ל-Trinity עם כל ההיסטוריה שלהם. בלי הפסדים ובלי עצבים.',
      ru: 'Мы сделаем это за тебя. Просто выгрузи базу из Excel или другой системы в формате CSV, и мы «перевезём» всех клиентов в Trinity со всей их историей.',
      en: 'We\'ll do it for you. Just export your database from Excel or another system as CSV, and we\'ll migrate all clients with their full history.'
    }
  },
  q5: {
    question: {
      he: '?מה יקרה עם הנתונים אם ארצה להתנתק',
      ru: 'Что будет с базой, если я захочу отключиться?',
      en: 'What happens to my data if I leave?'
    },
    answer: {
      he: 'הנתונים שייכים רק לך. בכל רגע אתה יכול ללחוץ כפתור אחד ולייצא את כל הבסיס לאקסל. אנחנו לא מחזיקים את הלקוחות שלך \'כבני ערובה\' — אנחנו עובדים על אמון.',
      ru: 'Данные принадлежат только тебе. В любой момент ты можешь нажать одну кнопку и выгрузить всю базу в Excel. Мы не держим твоих клиентов «в заложниках».',
      en: 'Your data belongs only to you. You can export your entire database to Excel with one click at any time. We don\'t hold your clients hostage.'
    }
  },
  q6: {
    question: {
      he: '?כמה מוגנים הנתונים שלי',
      ru: 'Насколько защищены мои данные?',
      en: 'How secure is my data?'
    },
    answer: {
      he: 'ברמה של מערכות בנקאיות. אנחנו משתמשים בטכנולוגיית בידוד נתונים (RLS), מנהלים \'קופסה שחורה\' של כל הפעולות (Audit Log) ומאחסנים הכל בשרתים עולמיים של Vercel/Supabase. הבסיס שלך — המבצר שלך.',
      ru: 'На уровне банковских систем. Мы используем технологию изоляции данных (RLS), ведём «чёрный ящик» всех действий (Audit Log) и храним всё на мировых серверах Vercel/Supabase.',
      en: 'Bank-level security. We use data isolation technology (RLS), maintain a full audit log of all actions, and store everything on world-class Vercel/Supabase servers.'
    }
  }
}

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [language, setLanguage] = useState<Language>('he')
  const [isMobile, setIsMobile] = useState(false)
  const [screen, setScreen] = useState<Screen>('menu')
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)
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

  // Reset to menu when reopening
  useEffect(() => {
    if (isOpen) {
      setScreen('menu')
      setSelectedQuestion(null)
    }
  }, [isOpen])

  const t = (key: string) => translations[key]?.[language] || key
  const dir = language === 'he' ? 'rtl' : 'ltr'

  const handleFaqClick = () => {
    setScreen('faq')
  }

  const handleQuestionClick = (questionKey: string) => {
    setSelectedQuestion(questionKey)
    setScreen('answer')
  }

  const handleBackToMenu = () => {
    setScreen('menu')
    setSelectedQuestion(null)
  }

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
              {/* Main Menu */}
              {screen === 'menu' && (
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
                  {['menuFaq', 'menuCalculator', 'menuTrial', 'menuServices'].map(key => (
                    <button
                      key={key}
                      onClick={() => key === 'menuFaq' && handleFaqClick()}
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
              )}

              {/* FAQ Questions */}
              {screen === 'faq' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.keys(faqData).map(qKey => (
                    <button
                      key={qKey}
                      onClick={() => handleQuestionClick(qKey)}
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
                      {faqData[qKey].question[language]}
                    </button>
                  ))}

                  {/* Back to Menu button */}
                  <button
                    onClick={handleBackToMenu}
                    style={{
                      padding: '14px 16px',
                      background: 'linear-gradient(135deg, #7B2FF7, #C850C0)',
                      border: 'none',
                      borderRadius: '16px',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
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
                    {dir === 'rtl' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                    {t('backToMenu')}
                  </button>
                </div>
              )}

              {/* Answer Screen */}
              {screen === 'answer' && selectedQuestion && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Question */}
                  <div
                    style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, rgba(123, 47, 247, 0.08), rgba(200, 80, 192, 0.08))',
                      borderRadius: '16px',
                      border: '1px solid rgba(123, 47, 247, 0.1)'
                    }}
                  >
                    <p style={{ color: '#7B2FF7', fontSize: '13px', fontWeight: 600, margin: 0, marginBottom: '8px' }}>
                      {faqData[selectedQuestion].question[language]}
                    </p>
                    <p style={{ color: '#1a1a1a', fontSize: '14px', margin: 0, lineHeight: '1.6' }}>
                      {faqData[selectedQuestion].answer[language]}
                    </p>
                  </div>

                  {/* Back to Menu button */}
                  <button
                    onClick={handleBackToMenu}
                    style={{
                      padding: '14px 16px',
                      background: 'linear-gradient(135deg, #7B2FF7, #C850C0)',
                      border: 'none',
                      borderRadius: '16px',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
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
                    {dir === 'rtl' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                    {t('backToMenu')}
                  </button>
                </div>
              )}
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

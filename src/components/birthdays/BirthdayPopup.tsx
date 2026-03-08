'use client'

import { useState, useEffect } from 'react'
import { X, MessageCircle, Gift, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { BirthdayClient } from '@/hooks/useBirthdays'
import { useAuth } from '@/hooks/useAuth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface BirthdayPopupProps {
  clients: BirthdayClient[]
  onClose: () => void
}

export default function BirthdayPopup({ clients, onClose }: BirthdayPopupProps) {
  const { t, language } = useLanguage()
  const { orgId } = useAuth()
  const [showConfetti, setShowConfetti] = useState(true)
  const [particles, setParticles] = useState<Array<{left: string, delay: string, duration: string}>>([])

  useEffect(() => {
    setParticles(Array.from({ length: 40 }, () => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 0.5}s`,
      duration: `${2.5 + Math.random()}s`,
    })))
  }, [])
  const [dontShowToday, setDontShowToday] = useState(false)
  const [templates, setTemplates] = useState({
    greeting_he: 'שלום {name}! 🎂🎉 צוות {org} מאחל/ת לך יום הולדת שמח! מחכים לראות אותך בקרוב 💛',
    greeting_ru: 'Привет {name}! 🎂🎉 Команда {org} поздравляет тебя с днём рождения! Ждём тебя в гости 💛',
    gift_he: 'שלום {name}! 🎂 לכבוד יום ההולדת שלך, קבל/י {discount}% הנחה על הביקור הבא! ההטבה בתוקף עד {expiry_date} 🎁',
    gift_ru: 'Привет {name}! 🎂 В честь дня рождения дарим тебе скидку {discount}% на следующий визит! Действует до {expiry_date} 🎁',
    discount: 15,
    expiry_days: 7
  })
  const [orgName, setOrgName] = useState('Trinity')

  useEffect(() => {
    // Load templates and org name
    const loadSettings = async () => {
      if (!orgId) return
      
      try {
        const supabase = (await import('@/lib/supabase-browser')).createSupabaseBrowserClient()
        const { data } = await supabase
          .from('organizations')
          .select('name, settings')
          .eq('id', orgId)
          .single()

        if (data) {
          setOrgName(data.name)
          if (data.settings?.birthday_templates) {
            setTemplates({ ...templates, ...data.settings.birthday_templates })
          }
        }
      } catch (error) {
        console.error('Error loading birthday templates:', error)
      }
    }
    
    loadSettings()
  }, [orgId])

  useEffect(() => {
    // Hide confetti after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    if (dontShowToday) {
      const today = new Date().toISOString().split('T')[0]
      localStorage.setItem('birthday_popup_date', today)
    }
    onClose()
  }

  const formatMessage = (template: string, client: BirthdayClient, isGift: boolean = false) => {
    let message = template
      .replace('{name}', client.first_name)
      .replace('{org}', orgName)

    if (isGift) {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + templates.expiry_days)
      const formattedExpiry = expiryDate.toLocaleDateString(language === 'he' ? 'he-IL' : 'ru-RU')
      
      message = message
        .replace('{discount}', templates.discount.toString())
        .replace('{expiry_date}', formattedExpiry)
    }

    return message
  }

  const handleSendGreeting = (client: BirthdayClient, method: 'sms' | 'whatsapp') => {
    const template = language === 'ru' ? templates.greeting_ru : templates.greeting_he
    const message = formatMessage(template, client, false)
    
    if (method === 'whatsapp') {
      const phone = client.phone.replace(/\D/g, '')
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
    } else {
      // Open SMS dialog (you can integrate with your SMS system here)
      alert(`SMS: ${message}\nTo: ${client.phone}`)
    }
    
    handleClose()
  }

  const handleSendGift = (client: BirthdayClient, method: 'sms' | 'whatsapp') => {
    const template = language === 'ru' ? templates.gift_ru : templates.gift_he
    const message = formatMessage(template, client, true)
    
    if (method === 'whatsapp') {
      const phone = client.phone.replace(/\D/g, '')
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
    } else {
      // Open SMS dialog
      alert(`SMS: ${message}\nTo: ${client.phone}`)
    }
    
    handleClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {/* Confetti Animation */}
      {showConfetti && particles.length > 0 && (
        <div className="confetti-container">
          {particles.map((particle, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: particle.left,
                animationDelay: particle.delay,
                animationDuration: particle.duration,
                backgroundColor: ['#fbbf24', '#ec4899', '#60a5fa', '#34d399', '#a78bfa'][i % 5],
              }}
            />
          ))}
        </div>
      )}

      {/* Popup Card */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fadeInUp">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center p-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="text-6xl mb-4">🎂</div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('birthdays.todayTitle')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('birthdays.todayCount', { count: clients.length })}
          </p>
        </div>

        {/* Clients List */}
        <div className="p-6 space-y-4">
          {clients.map((client) => (
            <div
              key={client.id}
              className="bg-gradient-to-r from-amber-50 to-pink-50 dark:from-amber-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {client.first_name} {client.last_name}
                  </h3>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {client.phone}
                    </span>
                    {client.age && (
                      <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-medium">
                        {client.age} {t('birthdays.yearsOld')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {/* Send Greeting */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {t('birthdays.sendGreeting')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleSendGreeting(client, 'sms')}>
                      📱 SMS
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSendGreeting(client, 'whatsapp')}>
                      💬 WhatsApp
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Send Gift */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white flex-1 sm:flex-none">
                      <Gift className="w-4 h-4 mr-2" />
                      {t('birthdays.sendGift')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleSendGift(client, 'sms')}>
                      📱 SMS
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSendGift(client, 'whatsapp')}>
                      💬 WhatsApp
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowToday}
              onChange={(e) => setDontShowToday(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('birthdays.dontShowToday')}
            </span>
          </label>

          <Button
            onClick={handleClose}
            variant="outline"
            className="w-full"
          >
            {t('common.close')}
          </Button>
        </div>
      </div>

      <style jsx>{`
        .confetti-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
          z-index: 60;
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          top: -20px;
          animation: confetti-fall 3s ease-out forwards;
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, User, Calendar, DollarSign } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRouter } from 'next/navigation'

export default function FABMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const { language, dir } = useLanguage()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  const translations = {
    he: {
      newClient: 'לקוח חדש',
      newVisit: 'ביקור חדש',
      newSale: 'מכירה חדשה',
    },
    ru: {
      newClient: 'Новый клиент',
      newVisit: 'Новый визит',
      newSale: 'Новая продажа',
    },
  }

  const t = translations[language]

  const menuItems = [
    { icon: User, label: t.newClient, onClick: () => router.push('/clients?action=new') },
    { icon: Calendar, label: t.newVisit, onClick: () => router.push('/visits?action=new') },
    { icon: DollarSign, label: t.newSale, onClick: () => router.push('/payments?action=new') },
  ]

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const positionClass = dir === 'rtl' ? 'left-6' : 'right-6'

  return (
    <div ref={menuRef} className={`fixed bottom-6 ${positionClass} z-50`}>
      {/* Speed Dial Menu Items */}
      <div className="flex flex-col items-center gap-3 mb-3">
        {isOpen && menuItems.map((item, index) => {
          const Icon = item.icon
          return (
            <div
              key={index}
              className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {dir === 'rtl' ? (
                <>
                  <button
                    onClick={() => {
                      item.onClick()
                      setIsOpen(false)
                    }}
                    className="w-10 h-10 rounded-full bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
                  >
                    <Icon size={20} />
                  </button>
                  <span className="text-sm bg-card px-3 py-1.5 rounded shadow whitespace-nowrap">
                    {item.label}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm bg-card px-3 py-1.5 rounded shadow whitespace-nowrap">
                    {item.label}
                  </span>
                  <button
                    onClick={() => {
                      item.onClick()
                      setIsOpen(false)
                    }}
                    className="w-10 h-10 rounded-full bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
                  >
                    <Icon size={20} />
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
      >
        <Plus
          size={24}
          className={`transition-transform duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'}`}
        />
      </button>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, User, Calendar, DollarSign } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { AddClientDialog } from '@/components/clients/AddClientDialog'
import { CreateVisitDialog } from '@/components/visits/CreateVisitDialog'
import { CreateCashPaymentDialog } from '@/components/payments/CreateCashPaymentDialog'

export default function FABMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [showNewClient, setShowNewClient] = useState(false)
  const [showNewVisit, setShowNewVisit] = useState(false)
  const [showNewSale, setShowNewSale] = useState(false)
  const { language, dir } = useLanguage()
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
    { 
      icon: User, 
      label: t.newClient, 
      onClick: () => {
        setShowNewClient(true)
        setIsOpen(false)
      },
      color: 'bg-blue-500 text-white',
    },
    { 
      icon: Calendar, 
      label: t.newVisit, 
      onClick: () => {
        setShowNewVisit(true)
        setIsOpen(false)
      },
      color: 'bg-green-500 text-white',
    },
    { 
      icon: DollarSign, 
      label: t.newSale, 
      onClick: () => {
        setShowNewSale(true)
        setIsOpen(false)
      },
      color: 'bg-amber-500 text-white',
    },
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
  const alignmentClass = dir === 'rtl' ? 'items-start' : 'items-end'
  const isRtl = dir === 'rtl'

  return (
    <>
      <div ref={menuRef} className={`fixed bottom-6 ${positionClass} z-50`}>
        {/* Speed Dial Menu Items */}
        <div className={`flex flex-col ${alignmentClass} gap-3 mb-3`}>
          {isOpen && menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={index}
                onClick={item.onClick}
                className={`flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 cursor-pointer hover:scale-105 transition-transform ${isRtl ? '' : 'flex-row-reverse'}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`w-11 h-11 rounded-full ${item.color} shadow-md flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} />
                </div>
                <span className="text-sm font-medium bg-card text-card-foreground px-3 py-1.5 rounded-lg shadow-md border border-border whitespace-nowrap">
                  {item.label}
                </span>
              </button>
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

      {/* Modals */}
      <AddClientDialog 
        open={showNewClient} 
        onOpenChange={setShowNewClient}
      />
      
      <CreateVisitDialog 
        open={showNewVisit} 
        onOpenChange={setShowNewVisit}
      />
      
      <CreateCashPaymentDialog 
        open={showNewSale} 
        onOpenChange={setShowNewSale}
      />
    </>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface DashboardHeaderProps {
  userName: string
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const { language } = useLanguage()
  const [currentDate, setCurrentDate] = useState('')

  const greeting = language === 'he' ? 'שלום' : 'Привет'

  const formatDate = (date: Date) => {
    if (language === 'he') {
      return new Intl.DateTimeFormat('he-IL', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }).format(date)
    } else {
      return new Intl.DateTimeFormat('ru-RU', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }).format(date)
    }
  }

  useEffect(() => {
    setCurrentDate(formatDate(new Date()))
  }, [language])

  return (
    <div className="text-start">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        {greeting}, {userName}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mt-1">
        {currentDate}
      </p>
    </div>
  )
}

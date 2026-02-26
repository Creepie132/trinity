'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Clock, Construction } from 'lucide-react'

interface ComingSoonProps {
  title?: string
}

export function ComingSoon({ title }: ComingSoonProps) {
  const { language } = useLanguage()

  const content = {
    he: {
      message: 'בקרוב יופיע כאן תוכן',
      subtitle: 'אנו עובדים על זה',
    },
    ru: {
      message: 'Скоро здесь появится контент',
      subtitle: 'Мы работаем над этим',
    },
  }

  const t = content[language]

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Construction className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-pulse">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {title && (
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
        )}

        <div className="space-y-2">
          <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
            {t.message}
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t.subtitle}
          </p>
        </div>

        <div className="pt-4">
          <div className="flex justify-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

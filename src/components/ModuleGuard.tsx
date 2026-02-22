'use client'

import { useOrganization } from '@/hooks/useOrganization'
import { useLanguage } from '@/contexts/LanguageContext'
import { MODULES } from '@/lib/modules-config'
import { Lock } from 'lucide-react'

interface ModuleGuardProps {
  moduleKey: string
  children: React.ReactNode
}

export function ModuleGuard({ moduleKey, children }: ModuleGuardProps) {
  const { data: organization } = useOrganization()
  const { language } = useLanguage()

  const module = MODULES.find(m => m.key === moduleKey)
  
  // If module has alwaysVisible flag - always allow access (unless explicitly disabled)
  if (module?.alwaysVisible) {
    const enabledModules = organization?.features?.modules || {}
    if (enabledModules[moduleKey] === false) {
      // Module explicitly disabled
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
          <Lock size={48} className="text-gray-400 dark:text-gray-600 mb-4" />
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
            {language === 'he' ? 'המודול לא פעיל' : 'Модуль отключён'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'he' 
              ? 'פנה למנהל המערכת להפעלת המודול' 
              : 'Обратитесь к администратору для активации'}
          </p>
        </div>
      )
    }
    // Module is active
    return <>{children}</>
  }

  // For other modules - check if enabled
  const enabledModules = organization?.features?.modules || {}
  const isEnabled = enabledModules[moduleKey] !== false

  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
        <Lock size={48} className="text-gray-400 dark:text-gray-600 mb-4" />
        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
          {language === 'he' ? 'המודול לא פעיל' : 'Модуль отключён'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'he' 
            ? 'פנה למנהל המערכת להפעלת המודול' 
            : 'Обратитесь к администратору для активации'}
        </p>
      </div>
    )
  }

  return <>{children}</>
}

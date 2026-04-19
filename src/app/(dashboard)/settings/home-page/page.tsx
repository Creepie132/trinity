'use client'

import Link from 'next/link'
import { ArrowLeft, Check, Home as HomeIcon, Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useLandingPage } from '@/hooks/useLandingPage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function HomePageSettingsPage() {
  const { language } = useLanguage()
  const isRTL = language === 'he'
  const {
    landingId,
    availableOptions,
    isLoading,
    isSaving,
    saveError,
    setLanding,
  } = useLandingPage()

  const title = isRTL ? 'דף הבית' : 'Главная страница'
  const subtitle = isRTL
    ? 'בחר את הדף שיפתח בכניסה למערכת ובלחיצה על הלוגו'
    : 'Выберите, какая страница открывается при входе в систему и по клику на логотип'
  const backLabel = isRTL ? 'חזרה להגדרות' : 'Назад к настройкам'
  const cardTitle = isRTL ? 'בחר דף ראשי' : 'Выберите главную страницу'
  const savingLabel = isRTL ? 'שומר…' : 'Сохранение…'
  const syncNote = isRTL
    ? '💡 הבחירה מסתנכרנת אוטומטית בין הגרסה באתר לאפליקציה (PWA).'
    : '💡 Выбор автоматически синхронизируется между веб-версией и мобильным приложением (PWA).'

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <Link
          href="/settings"
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className={cn('w-4 h-4', isRTL && 'rotate-180')} />
          {backLabel}
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
      </div>

      {/* Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HomeIcon className="w-5 h-5" />
            {cardTitle}
            {isSaving && (
              <span className="inline-flex items-center gap-1.5 text-xs font-normal text-gray-500 ms-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {savingLabel}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableOptions.map((opt) => {
                const Icon = opt.icon
                const isActive = landingId === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (!isActive && !isSaving) setLanding(opt.id)
                    }}
                    disabled={isSaving}
                    className={cn(
                      'relative p-4 rounded-xl border-2 transition-all text-start',
                      'disabled:opacity-70 disabled:cursor-wait',
                      isActive
                        ? 'border-gray-900 dark:border-gray-100 shadow-lg bg-gray-50 dark:bg-gray-800'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                          opt.colorTint
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {isRTL ? opt.label_he : opt.label_ru}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {isRTL ? opt.desc_he : opt.desc_ru}
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <div
                        className={cn(
                          'absolute top-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full p-1',
                          isRTL ? 'left-2' : 'right-2'
                        )}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {saveError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-4">
              {isRTL ? 'שגיאת שמירה: ' : 'Ошибка сохранения: '}
              {saveError.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sync info */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">{syncNote}</p>
        </CardContent>
      </Card>
    </div>
  )
}

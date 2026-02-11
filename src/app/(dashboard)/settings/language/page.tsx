'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useLanguage, Language } from '@/contexts/LanguageContext'
import { ArrowLeft, Check, Globe } from 'lucide-react'
import Link from 'next/link'

export default function LanguageSettingsPage() {
  const { language, setLanguage, t, dir } = useLanguage()

  const languages: { id: Language; name: string; flag: string; direction: 'rtl' | 'ltr' }[] = [
    { id: 'he', name: t('language.hebrew'), flag: '🇮🇱', direction: 'rtl' },
    { id: 'ru', name: t('language.russian'), flag: '🇷🇺', direction: 'ltr' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/settings" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1 mb-2">
          <ArrowLeft className="w-4 h-4 rotate-180" />
          {t('language.back')}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('language.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('language.subtitle')}
        </p>
      </div>

      {/* Language Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            {t('language.select')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base">{t('language.select.desc')}</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {languages.map((lang) => (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang.id)}
                className={`
                  relative p-6 rounded-lg border-2 transition-all
                  ${language === lang.id 
                    ? 'border-gray-900 dark:border-gray-100 shadow-lg bg-gray-50 dark:bg-gray-800' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                  }
                `}
              >
                {/* Flag & Name */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-5xl">{lang.flag}</div>
                  <div className="flex-1 text-left">
                    <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {lang.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {lang.direction === 'rtl' ? t('language.rtl') : t('language.ltr')}
                    </div>
                  </div>
                </div>

                {/* Direction Preview */}
                <div className="bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
                  <div className={`text-sm text-gray-600 dark:text-gray-400 ${lang.direction === 'rtl' ? 'text-right' : 'text-left'}`}>
                    {lang.direction === 'rtl' ? (
                      <span>טקסט לדוגמה בעברית →</span>
                    ) : (
                      <span>← Пример текста на русском</span>
                    )}
                  </div>
                </div>

                {/* Selected Check */}
                {language === lang.id && (
                  <div className="absolute top-3 left-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full p-1.5">
                    <Check className="w-5 h-5" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Direction Info */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            💡 <strong>{dir === 'rtl' ? 'טיפ' : 'Совет'}:</strong>{' '}
            {dir === 'rtl' 
              ? 'שינוי השפה ישנה גם את כיוון התצוגה (RTL/LTR) וייושם מיידית בכל המערכת.'
              : 'Изменение языка также меняет направление отображения (RTL/LTR) и применяется немедленно во всей системе.'
            }
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useTheme, themes, Theme, Layout } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Check, LayoutGrid, Layers, AlignJustify, ArrowLeft, Moon, Sun, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function DisplaySettingsPage() {
  const { theme, setTheme, layout, setLayout, darkMode, setDarkMode } = useTheme()
  const { t, language } = useLanguage()
  const { orgId } = useAuth()
  const { data: organization, refetch } = useOrganization()
  const queryClient = useQueryClient()
  const supabase = createSupabaseBrowserClient()
  
  const [meetingMode, setMeetingMode] = useState(false)

  useEffect(() => {
    if (organization?.features?.meeting_mode) {
      setMeetingMode(organization.features.meeting_mode)
    }
  }, [organization])

  const handleMeetingModeChange = async (checked: boolean) => {
    if (!orgId) return

    setMeetingMode(checked)

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          features: {
            ...organization?.features,
            meeting_mode: checked
          }
        })
        .eq('id', orgId)

      if (error) throw error

      toast.success(checked 
        ? (language === 'he' ? 'מצב פגישות הופעל' : 'Режим встреч включён')
        : (language === 'he' ? 'מצב ביקורים הופעל' : 'Режим визитов включён')
      )

      // Refetch organization data
      await refetch()
      queryClient.invalidateQueries({ queryKey: ['organization'] })
    } catch (error) {
      console.error('Failed to update meeting mode:', error)
      toast.error(language === 'he' ? 'שגיאה בעדכון' : 'Ошибка при обновлении')
      setMeetingMode(!checked) // Revert
    }
  }

  const themeOptions: { id: Theme; name: string; colors: string }[] = [
    { id: 'default', name: t('theme.default'), colors: 'bg-gradient-to-r from-blue-500 to-blue-600' },
    { id: 'purple', name: t('theme.purple'), colors: 'bg-gradient-to-r from-purple-500 to-purple-600' },
    { id: 'green', name: t('theme.green'), colors: 'bg-gradient-to-r from-green-500 to-green-600' },
    { id: 'orange', name: t('theme.orange'), colors: 'bg-gradient-to-r from-orange-500 to-orange-600' },
    { id: 'pink', name: t('theme.pink'), colors: 'bg-gradient-to-r from-pink-500 to-pink-600' },
    { id: 'dark', name: t('theme.dark'), colors: 'bg-gradient-to-r from-indigo-500 to-indigo-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/settings" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1 mb-2">
          <ArrowLeft className="w-4 h-4 rotate-180" />
          {t('display.back')}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('display.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('display.subtitle')}
        </p>
      </div>

      {/* Meeting Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            {language === 'he' ? 'מצב פגישות' : 'Режим встреч'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900 dark:text-gray-100 font-medium mb-1">
                {language === 'he' ? 'החלף "ביקורים" ל"פגישות"' : 'Заменить "Визиты" на "Встречи"'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'he' 
                  ? 'כל המערכת תציג "פגישות" במקום "ביקורים". מתאים למשרדים, ייעוץ, ופגישות עסקיות.'
                  : 'Вся система будет показывать "Встречи" вместо "Визитов". Подходит для офисов, консультаций и деловых встреч.'}
              </p>
            </div>
            <Switch 
              checked={meetingMode}
              onCheckedChange={handleMeetingModeChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dark Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            {t('display.darkMode')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('display.darkMode.desc')}
              </p>
            </div>
            <Switch 
              checked={darkMode}
              onCheckedChange={setDarkMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Color Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎨 {t('display.colorTheme')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base">{t('display.colorTheme.desc')}</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {themeOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setTheme(option.id)}
                className={`
                  relative p-4 rounded-lg border-2 transition-all
                  ${theme === option.id 
                    ? 'border-gray-900 dark:border-gray-100 shadow-lg' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                  }
                `}
              >
                {/* Color Preview */}
                <div className={`h-24 rounded-md mb-3 ${option.colors}`} />
                
                {/* Theme Name */}
                <div className="text-center font-semibold text-gray-900 dark:text-gray-100">
                  {option.name}
                </div>

                {/* Selected Check */}
                {theme === option.id && (
                  <div className="absolute top-2 left-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full p-1">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Layout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📐 {t('display.layout')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base">{t('display.layout.desc')}</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Classic Layout */}
            <button
              onClick={() => setLayout('classic')}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-right
                ${layout === 'classic' 
                  ? 'border-gray-900 dark:border-gray-100 shadow-lg bg-gray-50 dark:bg-gray-800' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                }
              `}
            >
              <div className="flex items-center gap-3 mb-3">
                <AlignJustify className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{t('layout.classic')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('layout.classic.desc')}</div>
                </div>
              </div>
              
              {/* Preview */}
              <div className="space-y-2 bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
              </div>

              {layout === 'classic' && (
                <div className="absolute top-2 left-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full p-1">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </button>

            {/* Modern Layout */}
            <button
              onClick={() => setLayout('modern')}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-right
                ${layout === 'modern' 
                  ? 'border-gray-900 dark:border-gray-100 shadow-lg bg-gray-50 dark:bg-gray-800' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                }
              `}
            >
              <div className="flex items-center gap-3 mb-3">
                <LayoutGrid className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{t('layout.modern')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('layout.modern.desc')}</div>
                </div>
              </div>
              
              {/* Preview */}
              <div className="grid grid-cols-2 gap-2">
                <div className="h-12 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-800 rounded-lg shadow-md" />
                <div className="h-12 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900 dark:to-purple-800 rounded-lg shadow-md" />
                <div className="col-span-2 h-8 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900 dark:to-green-800 rounded-lg shadow-md" />
              </div>

              {layout === 'modern' && (
                <div className="absolute top-2 left-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full p-1">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </button>

            {/* Compact Layout */}
            <button
              onClick={() => setLayout('compact')}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-right
                ${layout === 'compact' 
                  ? 'border-gray-900 dark:border-gray-100 shadow-lg bg-gray-50 dark:bg-gray-800' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                }
              `}
            >
              <div className="flex items-center gap-3 mb-3">
                <Layers className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{t('layout.compact')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('layout.compact.desc')}</div>
                </div>
              </div>
              
              {/* Preview */}
              <div className="space-y-1 bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                <div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded w-full" />
                <div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded w-4/5" />
                <div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded w-full" />
                <div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
                <div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded w-full" />
              </div>

              {layout === 'compact' && (
                <div className="absolute top-2 left-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full p-1">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Customization */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 {t('display.customize')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {t('display.customize.desc')}
          </p>
          <Link href="/settings/customize">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('display.customize.btn')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

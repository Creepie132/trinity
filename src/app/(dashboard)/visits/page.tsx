'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { Calendar, Plus, Clock, DollarSign } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function VisitsPage() {
  const { language } = useLanguage()
  const { orgId, isLoading } = useAuth()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{language === 'he' ? 'טוען...' : 'Загрузка...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {language === 'he' ? 'ביקורים' : 'Визиты'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {language === 'he' ? 'ניהול ביקורים ותורים' : 'Управление визитами и записями'}
          </p>
        </div>
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 ml-2" />
          {language === 'he' ? 'ביקור חדש' : 'Новый визит'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'he' ? 'היום' : 'Сегодня'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">0</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'he' ? 'השבוע' : 'Неделя'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">0</p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'he' ? 'מתוכננים' : 'Запланировано'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">0</p>
              </div>
              <Calendar className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'he' ? 'הושלמו החודש' : 'Завершено за месяц'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">0</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visits Table */}
      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100">
            {language === 'he' ? 'רשימת ביקורים' : 'Список визитов'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
              {language === 'he' ? 'אין ביקורים עדיין' : 'Нет визитов'}
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mb-6">
              {language === 'he' 
                ? 'התחל להוסיף ביקורים כדי לעקוב אחרי לוח הזמנים שלך' 
                : 'Начните добавлять визиты для отслеживания расписания'}
            </p>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 ml-2" />
              {language === 'he' ? 'ביקור ראשון' : 'Первый визит'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                {language === 'he' ? 'מערכת ביקורים' : 'Система визитов'}
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {language === 'he' 
                  ? 'נהל תורים, עקוב אחרי שירותים ושלב עם מערכת התשלומים. לאחר השלמת ביקור תוכל לרשום תשלום מיד.' 
                  : 'Управляйте записями, отслеживайте услуги и интегрируйте с системой платежей. После завершения визита можно сразу оформить оплату.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

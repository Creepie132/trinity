'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Clock, Mail, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

export default function AccessPendingPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [requestSubmitted, setRequestSubmitted] = useState(false)
  const supabase = createSupabaseBrowserClient()

  const translations = {
    he: {
      title: 'ממתינים לאישור גישה',
      subtitle: 'בקשת הגישה שלך בבדיקה',
      description: 'שלחנו הודעה למנהלי המערכת. תקבל אישור בקרוב.',
      emailSent: 'נשלח מייל למנהלים',
      checkingStatus: 'בודק סטטוס...',
      refreshStatus: 'רענן סטטוס',
      logout: 'התנתק',
      steps: {
        requested: 'בקשה נשלחה',
        review: 'בבדיקה',
        approved: 'תאושר בקרוב',
      },
      info: 'בינתיים, אתה יכול:',
      infoItems: [
        'לבדוק את האימייל שלך לעדכונים',
        'להתכונן להתחיל לעבוד עם המערכת',
        'לצור קשר עם התמיכה אם יש שאלות',
      ],
    },
    ru: {
      title: 'Ожидание одобрения доступа',
      subtitle: 'Ваш запрос на рассмотрении',
      description: 'Мы отправили уведомление администраторам. Вы получите доступ в ближайшее время.',
      emailSent: 'Email отправлен администраторам',
      checkingStatus: 'Проверка статуса...',
      refreshStatus: 'Обновить статус',
      logout: 'Выйти',
      steps: {
        requested: 'Запрос отправлен',
        review: 'На рассмотрении',
        approved: 'Скоро будет одобрен',
      },
      info: 'Пока вы можете:',
      infoItems: [
        'Проверить email для обновлений',
        'Подготовиться к работе с системой',
        'Связаться с поддержкой при вопросах',
      ],
    },
  }

  const t = translations[language]

  useEffect(() => {
    const submitRequest = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }

        // Submit access request
        const response = await fetch('/api/access/request', {
          method: 'POST',
        })

        if (response.ok) {
          setRequestSubmitted(true)
        }
      } catch (error) {
        console.error('Error submitting access request:', error)
      } finally {
        setLoading(false)
      }
    }

    submitRequest()
  }, [router, supabase])

  const handleRefreshStatus = async () => {
    setLoading(true)
    console.log('[access-pending] Checking access status...')
    
    try {
      const response = await fetch('/api/access/check')
      const data = await response.json()

      console.log('[access-pending] Access check result:', data)

      if (data.hasAccess) {
        console.log('[access-pending] Access approved! Redirecting to dashboard...')
        toast.success(
          language === 'he' ? '✅ הגישה אושרה!' : '✅ Доступ одобрен!',
          { duration: 2000 }
        )
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 500)
      } else {
        toast.info(
          language === 'he' ? 'הבקשה עדיין בבדיקה' : 'Заявка ещё на рассмотрении',
          { duration: 3000 }
        )
      }
    } catch (error) {
      console.error('Error checking access status:', error)
      toast.error(
        language === 'he' ? 'שגיאה בבדיקת סטטוס' : 'Ошибка проверки статуса'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading && !requestSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t.checkingStatus}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
            <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
            {t.title}
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            {t.subtitle}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status steps */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col items-center flex-1">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.steps.requested}
              </span>
            </div>

            <div className="flex-1 h-1 bg-amber-200 dark:bg-amber-800 mx-2 relative">
              <div className="absolute inset-0 bg-amber-500 animate-pulse" style={{ width: '50%' }} />
            </div>

            <div className="flex flex-col items-center flex-1">
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center mb-2 animate-pulse">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.steps.review}
              </span>
            </div>

            <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 mx-2" />

            <div className="flex flex-col items-center flex-1">
              <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t.steps.approved}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-blue-900 dark:text-blue-200 text-center">
              📧 {t.description}
            </p>
          </div>

          {/* Info section */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t.info}</h3>
            <ul className="space-y-2">
              {t.infoItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleRefreshStatus}
              disabled={loading}
              className="flex-1"
              variant="default"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.checkingStatus}
                </>
              ) : (
                t.refreshStatus
              )}
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex-1"
            >
              {t.logout}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Mail, CheckCircle, XCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const token = params?.token as string
  const { language } = useLanguage()
  const supabase = createSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<any>(null)

  const translations = {
    he: {
      title: 'הוזמנת ל-Trinity CRM',
      subtitle: 'הצטרף למערכת החכמה לניהול עסקי',
      invalidToken: 'הזמנה לא תקפה',
      expiredToken: 'ההזמנה פגה תוקף',
      alreadyUsed: 'ההזמנה כבר נוצלה',
      message: 'הודעה',
      createAccount: 'צור חשבון',
      fullName: 'שם מלא',
      email: 'אימייל',
      password: 'סיסמה',
      signUp: 'הירשם',
      creating: 'יוצר חשבון...',
      trialInfo: '14 ימי ניסיון חינם',
      features: 'מה תקבל:',
      featureList: [
        'ניהול תורים ולקוחות',
        'תשלומים מקוונים',
        'הודעות אוטומטיות',
        'דוחות ואנליטיקה',
      ],
    },
    ru: {
      title: 'Приглашение в Trinity CRM',
      subtitle: 'Присоединяйтесь к умной системе управления бизнесом',
      invalidToken: 'Недействительное приглашение',
      expiredToken: 'Приглашение истекло',
      alreadyUsed: 'Приглашение уже использовано',
      message: 'Сообщение',
      createAccount: 'Создать аккаунт',
      fullName: 'Полное имя',
      email: 'Email',
      password: 'Пароль',
      signUp: 'Зарегистрироваться',
      creating: 'Создание аккаунта...',
      trialInfo: '14 дней бесплатного пробного периода',
      features: 'Что вы получите:',
      featureList: [
        'Управление записями и клиентами',
        'Онлайн платежи',
        'Автоматические уведомления',
        'Отчёты и аналитика',
      ],
    },
  }

  const t = translations[language]

  useEffect(() => {
    loadInvitation()
  }, [token])

  const loadInvitation = async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .single()

      if (error || !data) {
        console.error('Invitation not found:', error)
        setInvitation(null)
      } else {
        setInvitation(data)
      }
    } catch (error) {
      console.error('Error loading invitation:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">{t.invalidToken}</CardTitle>
            <CardDescription>{t.expiredToken}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">⏰</span>
          </div>
          <h1 className="text-2xl font-bold mb-3">Invitation Expired</h1>
          <p className="text-muted-foreground">
            This invitation has expired. Contact the administrator for a new one.
          </p>
          <p className="text-muted-foreground mt-2" dir="rtl">
            ההזמנה פגה. פנה למנהל לקבלת הזמנה חדשה.
          </p>
          <Button onClick={() => router.push('/login')} className="w-full mt-6">
            Go to Login | חזור לדף כניסה
          </Button>
        </div>
      </div>
    )
  }

  if (invitation.status !== 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl">{t.alreadyUsed}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login | חזור לדף כניסה
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Valid invitation - show landing
  const loginUrl = `/login?invitation=${token}&email=${encodeURIComponent(invitation.email)}`

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/30 p-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Trinity CRM</h1>
          <p className="text-amber-600 dark:text-amber-500 font-medium">by Amber Solutions</p>
        </div>

        <Card className="shadow-lg mb-6">
          <CardContent className="p-8">
            <h2 className="text-2xl font-semibold mb-2">Welcome! | !ברוכים הבאים</h2>
            <p className="text-muted-foreground mb-6">
              You're invited to try Trinity CRM
              <br />
              14 days free trial
            </p>

            {invitation.message && (
              <div className="bg-muted/50 rounded-lg p-4 mb-6 text-sm text-muted-foreground italic">
                "{invitation.message}"
              </div>
            )}

            <Button
              onClick={() => router.push(loginUrl)}
              className="w-full bg-primary text-primary-foreground px-8 py-4 text-lg font-semibold"
              size="lg"
            >
              Get Started | התחל עכשיו
            </Button>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>📅</span> Appointments
          </div>
          <div className="flex items-center gap-2">
            <span>👥</span> Clients
          </div>
          <div className="flex items-center gap-2">
            <span>💳</span> Payments
          </div>
        </div>
      </div>
    </div>
  )
}

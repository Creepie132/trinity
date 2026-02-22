'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, CheckCircle, XCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const token = params?.token as string
  const { language } = useLanguage()
  const supabase = createSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
        setEmail(data.email)
      }
    } catch (error) {
      console.error('Error loading invitation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password || !fullName) {
      toast.error('Please fill all fields')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setSubmitting(true)

    try {
      // Sign up user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (signUpError) throw signUpError

      if (!authData.user) throw new Error('User creation failed')

      // Mark invitation as accepted
      await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('token', token)

      toast.success('Account created successfully!')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Sign up error:', error)
      toast.error(error.message || 'Failed to create account')
    } finally {
      setSubmitting(false)
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
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">{t.title}</CardTitle>
          <CardDescription className="text-lg">{t.subtitle}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {invitation.message && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">{t.message}:</p>
              <p className="text-blue-800 dark:text-blue-300 italic">"{invitation.message}"</p>
            </div>
          )}

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
            <p className="text-green-900 dark:text-green-200 font-semibold">
              🎉 {t.trialInfo}
            </p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <Label htmlFor="fullName">{t.fullName}</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="email">{t.email}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled
              />
            </div>

            <div>
              <Label htmlFor="password">{t.password}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.creating}
                </>
              ) : (
                t.signUp
              )}
            </Button>
          </form>

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t.features}</h3>
            <ul className="space-y-2">
              {t.featureList.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

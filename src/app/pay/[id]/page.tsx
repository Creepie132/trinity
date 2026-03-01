'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { AlertCircle, Loader2, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const paymentId = params.id as string

  const [loading, setLoading] = useState(true)
  const [payment, setPayment] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Detect language from browser
  const browserLang = typeof window !== 'undefined' 
    ? (navigator.language.startsWith('he') ? 'he' : 'ru')
    : 'he'
  
  const [language, setLanguage] = useState<'he' | 'ru'>(browserLang)

  // Translations
  const t = {
    he: {
      loading: 'טוען...',
      invalidLink: 'הקישור אינו בתוקף',
      cancelledMessage: 'קישור התשלום הזה בוטל ואינו פעיל יותר.',
      backToSite: 'חזור לאתר',
      errorOccurred: 'אירעה שגיאה',
      paymentNotFound: 'התשלום לא נמצא. ייתכן שהקישור שגוי.',
      redirecting: 'מעביר לעמוד התשלום...',
      processingPayment: 'מעבד תשלום',
      pleaseWait: 'אנא המתן בזמן שאנחנו מכינים את עמוד התשלום שלך.',
    },
    ru: {
      loading: 'Загрузка...',
      invalidLink: 'Ссылка недействительна',
      cancelledMessage: 'Эта ссылка на оплату была отменена и больше не активна.',
      backToSite: 'Вернуться на сайт',
      errorOccurred: 'Произошла ошибка',
      paymentNotFound: 'Платёж не найден. Возможно, ссылка неверна.',
      redirecting: 'Перенаправление на страницу оплаты...',
      processingPayment: 'Обработка платежа',
      pleaseWait: 'Пожалуйста, подождите, пока мы готовим вашу страницу оплаты.',
    },
  }

  const tr = t[language]
  const dir = language === 'he' ? 'rtl' : 'ltr'

  useEffect(() => {
    async function fetchPayment() {
      try {
        setLoading(true)

        // Create Supabase client
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Fetch payment by ID (public access - no auth required)
        const { data, error: fetchError } = await supabase
          .from('payments')
          .select('id, status, payment_link, amount, currency')
          .eq('id', paymentId)
          .single()

        if (fetchError || !data) {
          console.error('Payment fetch error:', fetchError)
          setError(tr.paymentNotFound)
          setLoading(false)
          return
        }

        setPayment(data)

        // If cancelled, show error page
        if (data.status === 'cancelled') {
          setLoading(false)
          return
        }

        // If pending and has payment_link, redirect to Tranzilla
        if (data.status === 'pending' && data.payment_link) {
          // Short delay so user sees the loading state
          setTimeout(() => {
            window.location.href = data.payment_link
          }, 1000)
        } else {
          // Other statuses - just show the page or redirect
          setLoading(false)
        }
      } catch (err: any) {
        console.error('Unexpected error:', err)
        setError(tr.paymentNotFound)
        setLoading(false)
      }
    }

    if (paymentId) {
      fetchPayment()
    }
  }, [paymentId])

  // Language toggle
  const toggleLanguage = () => {
    setLanguage(lang => lang === 'he' ? 'ru' : 'he')
  }

  return (
    <div 
      dir={dir} 
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md">
        {/* Language switcher */}
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="text-sm"
          >
            {language === 'he' ? 'RU' : 'עב'}
          </Button>
        </div>

        {/* Loading state */}
        {loading && (
          <Card className="text-center">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <CardTitle className="text-2xl">{tr.processingPayment}</CardTitle>
              <CardDescription className="text-base mt-2">
                {payment?.status === 'pending' ? tr.redirecting : tr.pleaseWait}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Cancelled payment */}
        {!loading && payment?.status === 'cancelled' && (
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center text-red-600 dark:text-red-400">
                {tr.invalidLink}
              </CardTitle>
              <CardDescription className="text-center text-base mt-2">
                {tr.cancelledMessage}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="mt-4"
              >
                {tr.backToSite}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Error state */}
        {!loading && error && !payment && (
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center text-orange-600 dark:text-orange-400">
                {tr.errorOccurred}
              </CardTitle>
              <CardDescription className="text-center text-base mt-2">
                {error}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="mt-4"
              >
                {tr.backToSite}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

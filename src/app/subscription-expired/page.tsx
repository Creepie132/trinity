'use client'

import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, MessageCircle, Mail, Phone } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function SubscriptionExpiredPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const supabase = createSupabaseBrowserClient()

  const translations = {
    he: {
      title: 'תקופת הניסיון הסתיימה',
      subtitle: 'הגישה למערכת הופסקה',
      description: 'תקופת הניסיון שלך הסתיימה. כדי להמשיך להשתמש במערכת, צור קשר איתנו להפעלת מנוי.',
      contactTitle: 'צור קשר',
      contactDescription: 'נשמח לסייע לך במעבר למנוי מלא',
      whatsapp: 'WhatsApp',
      email: 'אימייל',
      phone: 'טלפון',
      team: 'צוות Amber Solutions',
      logout: 'התנתק',
      info: 'למה המנוי?',
      infoItems: [
        'גישה בלתי מוגבלת למערכת',
        'תמיכה מלאה 24/7',
        'עדכונים שוטפים',
        'גיבוי אוטומטי של הנתונים',
      ],
    },
    ru: {
      title: 'Пробный период закончился',
      subtitle: 'Доступ к системе приостановлен',
      description: 'Ваш пробный период закончился. Для продолжения использования системы свяжитесь с нами для оформления подписки.',
      contactTitle: 'Связаться с нами',
      contactDescription: 'Будем рады помочь вам перейти на полную подписку',
      whatsapp: 'WhatsApp',
      email: 'Email',
      phone: 'Телефон',
      team: 'Команда Amber Solutions',
      logout: 'Выйти',
      info: 'Зачем подписка?',
      infoItems: [
        'Неограниченный доступ к системе',
        'Полная поддержка 24/7',
        'Регулярные обновления',
        'Автоматическое резервное копирование',
      ],
    },
  }

  const t = translations[language]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
            {t.title}
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            {t.subtitle}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Description */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-900 dark:text-red-200 text-center">
              {t.description}
            </p>
          </div>

          {/* Contact Section */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-center text-xl">
              {t.contactTitle}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
              {t.contactDescription}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <a
                href="https://wa.me/972544858586"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                {t.whatsapp}
              </a>
              <a
                href="mailto:ambersolutions.systems@gmail.com"
                className="flex items-center justify-center gap-2 p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <Mail className="w-5 h-5" />
                {t.email}
              </a>
              <a
                href="tel:+972544858586"
                className="flex items-center justify-center gap-2 p-4 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
              >
                <Phone className="w-5 h-5" />
                {t.phone}
              </a>
            </div>
          </div>

          {/* Info section */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t.info}</h3>
            <ul className="space-y-2">
              {t.infoItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Team */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t.team}
            </p>
          </div>

          {/* Logout Button */}
          <div className="flex justify-center pt-4">
            <Button onClick={handleLogout} variant="outline" className="w-full max-w-xs">
              {t.logout}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

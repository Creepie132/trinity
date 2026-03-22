'use client'

/**
 * /demo/try — публичная страница входа в демо через Google.
 *
 * Поток:
 *   1. Пользователь нажимает «Войти через Google»
 *   2. Google OAuth → redirectTo: /demo/callback
 *   3. /demo/callback создаёт (или находит) demo-org, заполняет данными
 *   4. Redirect → /dashboard?demo_tour=1
 */

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Sparkles, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function DemoTryPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createSupabaseBrowserClient()

  const handleGoogleSignIn = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/demo/callback/google`,
        queryParams: {
          // Подсказка браузеру — показать picker аккаунтов
          prompt: 'select_account',
        },
      },
    })
    // Если что-то пошло не так — сбрасываем спиннер
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Back link */}
      <Link href="/landing"
        className="absolute top-6 left-6 flex items-center gap-2 text-white/50 hover:text-white/80 text-sm transition-colors">
        <ArrowLeft size={15} />
        На сайт
      </Link>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-amber-500/30 rounded-2xl animate-ping" />
            <div className="relative w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/40 mx-auto">
              <Sparkles size={28} className="text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Trinity CRM</h1>
          <p className="text-white/50 text-sm mt-1">Демо-доступ</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
            Попробуй бесплатно
          </h2>
          <p className="text-gray-500 text-sm text-center mb-8 leading-relaxed">
            Выбери свой Google-аккаунт — мы создадим для тебя демо-версию с реальными данными салона
          </p>

          {/* Google button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-5
              bg-white border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg
              rounded-2xl font-semibold text-gray-800 text-base
              transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
              disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
              group"
          >
            {loading ? (
              <svg className="w-5 h-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>{loading ? 'Загрузка...' : 'Войти через Google'}</span>
          </button>

          {/* Features */}
          <div className="mt-7 space-y-2.5">
            {[
              '✓ Реальные данные — клиенты, визиты, аналитика',
              '✓ Интерактивный тур по системе',
              '✓ Не нужна кредитная карта',
            ].map((text, i) => (
              <p key={i} className="text-sm text-gray-500 flex items-start gap-2">
                <span className="text-amber-500 font-bold flex-shrink-0">{text.slice(0, 1)}</span>
                {text.slice(2)}
              </p>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-white/30 text-xs mt-5">
          Нажимая кнопку, вы соглашаетесь с условиями использования Trinity CRM
        </p>
      </div>
    </div>
  )
}

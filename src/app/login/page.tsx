'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

// ─── Спиннер (переиспользуемый) ───────────────────────────────────────────────
function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

// ─── Иконка Google ────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient()
  const router   = useRouter()
  const { language, setLanguage, t, dir } = useLanguage()

  const [loading,      setLoading]      = useState(false)
  const [emailMode,    setEmailMode]    = useState(false)
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error,        setError]        = useState('')

  // ── Обработка invite/magic-link хешей ─────────────────────────────────────
  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return

    const params      = new URLSearchParams(hash.slice(1))
    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type         = params.get('type')

    if (accessToken && refreshToken && (type === 'invite' || type === 'magiclink' || type === 'recovery')) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) return
          window.location.href = '/callback?next=/worker'
        })
      return
    }

    // Очистка устаревших supabase-кук при открытии страницы логина
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim()
      if (name.startsWith('sb-') || name.includes('supabase')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      }
    })

    const qParams = new URLSearchParams(window.location.search)
    const invitationToken = qParams.get('invitation')
    if (invitationToken) localStorage.setItem('invitation_token', invitationToken)
  }, [])

  // ── Google OAuth ───────────────────────────────────────────────────────────
  const signIn = async () => {
    setLoading(true)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/callback`,
        queryParams: { prompt: 'select_account' },
      },
    })
  }

  // ── Email + Password ───────────────────────────────────────────────────────
  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      if (authError.message?.includes('Invalid login credentials') || authError.status === 400) {
        setError(t(email.includes('@') && password
          ? 'login.error.invalidCredentials'
          : 'login.error.fillFields'))
      } else if (authError.message?.includes('Email not confirmed')) {
        setError(t('login.error.emailNotConfirmed'))
      } else {
        setError(t('login.error.generic'))
      }
      setLoading(false)
      return
    }

    // Читаем preferred landing page
    let targetPath = '/dashboard'
    try {
      const res = await fetch('/api/mobile/preferences', { credentials: 'include', cache: 'no-store' })
      if (res.ok) {
        const prefs = await res.json()
        const { pathFromLandingId } = await import('@/lib/landing-pages')
        targetPath = pathFromLandingId(prefs?.default_landing_page)
      }
    } catch { /* fallback уже установлен */ }
    router.push(targetPath)
  }

  // ── Переключатель языка — компактный, без флагов ───────────────────────────
  // Размещается в правом (LTR) или левом (RTL) углу карточки.
  // Выбранный язык — жирный, второй — приглушённый.
  const LangToggle = () => (
    <div className="flex items-center gap-1 text-xs font-medium">
      <button
        onClick={() => setLanguage('ru')}
        className={`px-2 py-1 rounded-lg transition-colors ${
          language === 'ru'
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        RU
      </button>
      <span className="text-gray-300">|</span>
      <button
        onClick={() => setLanguage('he')}
        className={`px-2 py-1 rounded-lg transition-colors ${
          language === 'he'
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        עב
      </button>
    </div>
  )

  // Стрелка "назад" зеркалится по RTL/LTR
  const BackArrow = dir === 'rtl' ? ArrowLeft : ArrowRight

  return (
    <div
      dir={dir}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 p-6 relative overflow-hidden"
    >
      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Верхняя строка: "Назад" + переключатель языка */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/landing"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors group"
          >
            <BackArrow className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>{t('login.backToHome')}</span>
          </Link>
          <LangToggle />
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/20">
          {/* Логотип */}
          <div className="flex flex-col items-center gap-4 mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Trinity
              </h1>
              <p className="text-sm text-gray-500 mt-1">Amber Solutions Systems</p>
            </div>
          </div>

          {/* Заголовок */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('login.welcome')}</h2>
            <p className="text-gray-600 text-sm">{t('login.subtitle')}</p>
          </div>

          {/* Google */}
          <button
            onClick={signIn}
            disabled={loading}
            className="relative w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden group"
          >
            {loading && !emailMode ? (
              <>
                <Spinner />
                <span>{t('login.connecting')}</span>
              </>
            ) : (
              <>
                <GoogleIcon />
                <span>{t('login.withGoogle')}</span>
                <span className="absolute inset-0 rounded-xl border-2 border-white/0 group-hover:border-white/30 transition-all duration-500" />
              </>
            )}
          </button>

          {/* Разделитель */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">{t('login.orDivider')}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Email / пароль */}
          {!emailMode ? (
            <button
              onClick={() => setEmailMode(true)}
              className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-600 font-medium text-sm hover:border-blue-300 hover:text-blue-600 transition-all"
            >
              {t('login.withEmail')}
            </button>
          ) : (
            <form onSubmit={signInWithEmail} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
                required
                dir="ltr"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              />
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  required
                  dir="ltr"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && emailMode && <Spinner className="w-4 h-4" />}
                {loading && emailMode ? t('login.signingIn') : t('login.signIn')}
              </button>

              <button
                type="button"
                onClick={() => { setEmailMode(false); setError('') }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 py-1"
              >
                {t('login.backToGoogle')}
              </button>
            </form>
          )}

          {/* Футер */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">{t('login.footerDesc')}</p>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400">
              <span>{t('login.secureConnection')}</span>
              <span>•</span>
              <span>{t('login.hebrewSupport')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

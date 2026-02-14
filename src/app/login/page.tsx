'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)

  // FIX: Clear stale supabase cookies on login page load
  useEffect(() => {
    const clearStaleCookies = () => {
      // Get all cookies
      const cookies = document.cookie.split(';')
      
      // Clear all supabase-related cookies
      cookies.forEach((cookie) => {
        const cookieName = cookie.split('=')[0].trim()
        if (cookieName.startsWith('sb-') || cookieName.includes('supabase')) {
          // Delete cookie by setting expiry to past
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
          console.log('[login] Cleared stale cookie:', cookieName)
        }
      })
    }

    clearStaleCookies()
  }, [])

  const signIn = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 p-6 relative overflow-hidden">
      {/* Декоративные элементы фона */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back to Landing Button */}
        <Link
          href="/landing"
          className="inline-flex items-center gap-2 mb-6 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors group"
        >
          <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>חזור לדף הבית</span>
        </Link>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/20">
        {/* Логотип и заголовок */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Trinity</h1>
            <p className="text-sm text-gray-500 mt-1">Amber Solutions Systems</p>
          </div>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">ברוכים הבאים</h2>
          <p className="text-gray-600 text-sm">התחבר כדי להמשיך למערכת</p>
        </div>

        <button
          onClick={signIn}
          disabled={loading}
          className="relative w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden group"
        >
          {loading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>מתחבר...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>כניסה עם Google</span>
              <span className="absolute inset-0 rounded-xl border-2 border-white/0 group-hover:border-white/30 transition-all duration-500" />
            </>
          )}
        </button>

        {/* Футер */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            מערכת ניהול לקוחות מתקדמת לעסקים
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400">
            <span>🔒 חיבור מאובטח</span>
            <span>•</span>
            <span>🇮🇱 תמיכה בעברית</span>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
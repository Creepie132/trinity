'use client'

/**
 * /demo/callback/google — обработчик после Google OAuth.
 *
 * Поток:
 *   1. Показываем экран выбора языка (СРАЗУ, до авторизации)
 *   2. Пользователь выбирает язык → сохраняем в localStorage
 *   3. Запускаем авторизацию + активацию demo-org
 *   4. Redirect → /dashboard
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Sparkles, Loader2 } from 'lucide-react'

type Status = 'lang_pick' | 'authenticating' | 'creating' | 'seeding' | 'done' | 'error'

const STATUS_LABELS: Record<Exclude<Status, 'lang_pick' | 'error'>, string> = {
  authenticating: 'Проверяем Google-аккаунт...',
  creating:       'Создаём ваше демо-пространство...',
  seeding:        'Наполняем данными — клиенты, визиты, аналитика...',
  done:           'Готово! Открываем Trinity CRM...',
}

// ─── Language picker ─────────────────────────────────────────────────────────
function LangPicker({ onSelect }: { onSelect: (lang: 'he' | 'ru') => void }) {
  return (
    <div className="w-full max-w-sm">
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
      <div className="bg-white rounded-3xl shadow-2xl p-8">
        <p className="text-gray-700 font-semibold text-center mb-6 text-lg">
          בחר שפה / Выберите язык
        </p>
        <div className="space-y-3">
          <button onClick={() => onSelect('he')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200">
            <div className="text-right flex-1" dir="rtl">
              <p className="font-bold text-gray-900 text-lg">עברית</p>
              <p className="text-sm text-gray-500">ממשק בעברית עם נתונים בעברית</p>
            </div>
            <span className="text-3xl leading-none flex-shrink-0">🇮🇱</span>
          </button>
          <button onClick={() => onSelect('ru')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200">
            <span className="text-3xl leading-none flex-shrink-0">🇷🇺</span>
            <div className="text-left flex-1" dir="ltr">
              <p className="font-bold text-gray-900 text-lg">Русский</p>
              <p className="text-sm text-gray-500">Интерфейс и данные на русском</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DemoGoogleCallbackPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [status, setStatus] = useState<Status>('lang_pick')
  const [errorMsg, setErrorMsg] = useState('')

  const handleLangSelect = (lang: 'he' | 'ru') => {
    try {
      localStorage.setItem('trinity-language', lang)
      localStorage.setItem('demo_lang_selected', lang)
    } catch {}
    setStatus('authenticating')
  }

  useEffect(() => {
    if (status !== 'authenticating') return
    let cancelled = false

    const run = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (cancelled) return
        if (sessionError || !session?.user) {
          await new Promise<void>((resolve, reject) => {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
              if (event === 'SIGNED_IN' && s?.user) { subscription.unsubscribe(); resolve() }
            })
            setTimeout(() => { subscription.unsubscribe(); reject(new Error('Auth timeout')) }, 10000)
          })
        }
        if (cancelled) return
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) throw new Error('Не удалось получить пользователя')
        setStatus('creating')
        await new Promise(r => setTimeout(r, 400))
        if (cancelled) return
        setStatus('seeding')
        const res = await fetch('/api/demo/google-activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, email: user.email, name: user.user_metadata?.full_name || user.email }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Ошибка активации')
        if (cancelled) return
        setStatus('done')
        if (data.is_new) { try { localStorage.setItem('trinity_demo_start_tour', '1') } catch {} }
        await new Promise(r => setTimeout(r, 700))
        if (!cancelled) router.push('/dashboard')
      } catch (err: any) {
        if (!cancelled) { setStatus('error'); setErrorMsg(err.message || 'Неизвестная ошибка') }
      }
    }
    run()
    return () => { cancelled = true }
  }, [status])

  const progressMap: Partial<Record<Status, number>> = {
    authenticating: 20, creating: 50, seeding: 75, done: 100,
  }

  const STEPS = [
    { key: 'authenticating', label: 'Google-авторизация' },
    { key: 'creating',       label: 'Создание организации' },
    { key: 'seeding',        label: 'Данные: клиенты, визиты, аналитика' },
    { key: 'done',           label: 'Запуск системы' },
  ]
  const stepKeys = STEPS.map(s => s.key)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4">

      {status === 'lang_pick' && <LangPicker onSelect={handleLangSelect} />}

      {status !== 'lang_pick' && status !== 'error' && (
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 bg-amber-500/30 rounded-2xl animate-ping" />
            <div className="relative w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-xl">
              {status === 'done' ? <span className="text-2xl">🎉</span> : <Sparkles size={28} className="text-white" />}
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {status === 'done' ? 'Демо готово!' : 'Настраиваем Trinity CRM'}
          </h2>
          <p className="text-gray-500 text-sm mb-7">{STATUS_LABELS[status as keyof typeof STATUS_LABELS]}</p>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all duration-700"
              style={{ width: `${progressMap[status] ?? 0}%` }} />
          </div>
          <div className="mt-5 space-y-2 text-left">
            {STEPS.map(({ key, label }) => {
              const currentIdx = stepKeys.indexOf(status)
              const stepIdx    = stepKeys.indexOf(key)
              const isDone     = stepIdx < currentIdx || status === 'done'
              const isActive   = stepIdx === currentIdx && status !== 'done'
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all
                    ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {isDone ? '✓' : isActive ? <Loader2 size={12} className="animate-spin" /> : '·'}
                  </div>
                  <span className={`text-sm ${isDone ? 'text-green-700 font-medium' : isActive ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Что-то пошло не так</h2>
          <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
          <div className="flex gap-3">
            <a href="/demo/try" className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl hover:border-gray-300 transition-all text-sm text-center">
              Попробовать снова
            </a>
            <a href="https://wa.me/972544858586" target="_blank" rel="noopener noreferrer"
              className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-2xl transition-all text-sm text-center">
              WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

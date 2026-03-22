'use client'

/**
 * /demo/callback/google — обработчик после Google OAuth.
 *
 * Supabase после успешного OAuth редиректит сюда с кодом в URL.
 * Нам нужно:
 *   1. Дождаться установки сессии Supabase (она сама подхватит code из URL)
 *   2. Получить user.id и email
 *   3. Вызвать POST /api/demo/google-activate → создаст org + seed
 *   4. Redirect → /dashboard?demo_tour=1
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Sparkles, Loader2 } from 'lucide-react'

type Status = 'authenticating' | 'creating' | 'seeding' | 'done' | 'error'

const STATUS_LABELS: Record<Status, string> = {
  authenticating: 'Проверяем Google-аккаунт...',
  creating:       'Создаём ваше демо-пространство...',
  seeding:        'Наполняем данными — клиенты, визиты, аналитика...',
  done:           'Готово! Открываем Trinity CRM...',
  error:          'Что-то пошло не так',
}

export default function DemoGoogleCallbackPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [status, setStatus] = useState<Status>('authenticating')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        // 1. Ждём сессию — Supabase PKCE flow подхватывает code из URL автоматически
        // Используем onAuthStateChange + getSession чтобы поймать момент
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (cancelled) return

        if (sessionError || !session?.user) {
          // Ждём события SIGNED_IN если сессия ещё не установлена
          await new Promise<void>((resolve, reject) => {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
              if (event === 'SIGNED_IN' && s?.user) {
                subscription.unsubscribe()
                resolve()
              }
            })
            // Таймаут 10 секунд
            setTimeout(() => { subscription.unsubscribe(); reject(new Error('Auth timeout')) }, 10000)
          })
        }

        if (cancelled) return

        // 2. Получаем актуального пользователя
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) throw new Error('Не удалось получить пользователя')

        setStatus('creating')
        await new Promise(r => setTimeout(r, 400)) // UX пауза

        // 3. Вызываем API — он создаст/найдёт demo-org и заполнит данными
        if (cancelled) return
        setStatus('seeding')

        const res = await fetch('/api/demo/google-activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Ошибка активации')

        if (cancelled) return

        setStatus('done')

        // 4. Устанавливаем флаг тура только для новых пользователей
        if (data.is_new) {
          try { localStorage.setItem('trinity_demo_start_tour', '1') } catch {}
        }

        await new Promise(r => setTimeout(r, 700))
        if (!cancelled) router.push('/dashboard')

      } catch (err: any) {
        if (!cancelled) {
          setStatus('error')
          setErrorMsg(err.message || 'Неизвестная ошибка')
        }
      }
    }

    run()
    return () => { cancelled = true }
  }, [])

  const progress: Record<Status, number> = {
    authenticating: 20,
    creating:       50,
    seeding:        75,
    done:           100,
    error:          0,
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">

        {status !== 'error' ? (
          <>
            {/* Animated logo */}
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 bg-amber-500/30 rounded-2xl animate-ping" />
              <div className="relative w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-xl">
                {status === 'done'
                  ? <span className="text-2xl">🎉</span>
                  : <Sparkles size={28} className="text-white" />
                }
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {status === 'done' ? 'Демо готово!' : 'Настраиваем Trinity CRM'}
            </h2>
            <p className="text-gray-500 text-sm mb-7">{STATUS_LABELS[status]}</p>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all duration-700"
                style={{ width: `${progress[status]}%` }}
              />
            </div>

            {/* Steps */}
            <div className="mt-5 space-y-2 text-left">
              {[
                { key: 'authenticating', label: 'Google-авторизация' },
                { key: 'creating',       label: 'Создание организации' },
                { key: 'seeding',        label: 'Данные: клиенты, визиты, аналитика' },
                { key: 'done',           label: 'Запуск системы' },
              ].map(({ key, label }) => {
                const keys: Status[] = ['authenticating', 'creating', 'seeding', 'done']
                const currentIdx = keys.indexOf(status)
                const stepIdx    = keys.indexOf(key as Status)
                const isDone     = stepIdx < currentIdx || status === 'done'
                const isActive   = stepIdx === currentIdx && status !== 'done'
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all
                      ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {isDone ? '✓' : isActive ? <Loader2 size={12} className="animate-spin" /> : '·'}
                    </div>
                    <span className={`text-sm transition-all ${isDone ? 'text-green-700 font-medium' : isActive ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Что-то пошло не так</h2>
            <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
            <div className="flex gap-3">
              <a href="/demo/try"
                className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl hover:border-gray-300 transition-all text-sm text-center">
                Попробовать снова
              </a>
              <a href="https://wa.me/972544858586" target="_blank" rel="noopener noreferrer"
                className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-2xl transition-all text-sm text-center">
                WhatsApp
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

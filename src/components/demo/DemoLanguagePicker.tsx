'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Props {
  onSelect: (lang: 'he' | 'ru') => void
}

export function DemoLanguagePicker({ onSelect }: Props) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"/>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"/>

      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-fade-in-up">
        {/* Top gradient bar */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400"/>

        <div className="p-8 text-center">
          {/* Logo */}
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-2xl">✨</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Trinity CRM</h1>
          <p className="text-gray-500 text-sm mb-8">Amber Solutions Systems</p>

          <p className="text-gray-700 font-semibold mb-6">בחר שפה / Выберите язык</p>

          <div className="space-y-3">
            <button onClick={() => onSelect('he')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group hover:scale-[1.02] active:scale-[0.98]">
              <span className="text-3xl">🇮🇱</span>
              <div className="text-right flex-1">
                <p className="font-bold text-gray-900 text-lg">עברית</p>
                <p className="text-sm text-gray-500">ממשק בעברית עם נתונים בעברית</p>
              </div>
            </button>

            <button onClick={() => onSelect('ru')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group hover:scale-[1.02] active:scale-[0.98]">
              <span className="text-3xl">🇷🇺</span>
              <div className="text-left flex-1">
                <p className="font-bold text-gray-900 text-lg">Русский</p>
                <p className="text-sm text-gray-500">Интерфейс и данные на русском</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.4s cubic-bezier(0.34,1.2,0.64,1) both; }
      `}</style>
    </div>
  )
}

// ─── Hook — shows picker only for demo orgs that haven't chosen language ──────
export function useDemoLanguagePicker() {
  const [show, setShow] = useState(false)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const sb = createSupabaseBrowserClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const orgId = user.app_metadata?.org_id
        if (!orgId) return
        const { data: org } = await sb.from('organizations')
          .select('features').eq('id', orgId).single()
        if (!(org?.features as any)?.is_demo) return
        setIsDemo(true)
        // Show picker if no lang chosen yet for this demo
        const key = `demo_lang_${orgId}`
        if (!localStorage.getItem(key)) setShow(true)
      } catch {}
    }
    check()
  }, [])

  const handleSelect = async (lang: 'he' | 'ru') => {
    // Mark as chosen for this demo session
    localStorage.setItem('demo_lang_chosen', lang)
    // Set the app language (key LanguageContext reads)
    localStorage.setItem('trinity-language', lang)
    setShow(false)
    // Need a moment for LanguageContext to pick up new value, then reload
    window.location.reload()
  }

  return { show: show && isDemo, handleSelect }
}

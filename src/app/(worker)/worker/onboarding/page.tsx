'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'

// ─── i18n ──────────────────────────────────────────────────────────────────────
const I18N = {
  he: {
    step1Title: 'ברוכים הבאים לכבינט המכירות!',
    step1Sub: 'בואו נתחיל — ספר לנו קצת עליך',
    namePlaceholder: 'שם מלא',
    phoneLabel: 'טלפון (אופציונלי)',
    phonePlaceholder: '+972 5X-XXX-XXXX',
    step2Title: 'התפקיד שלך ב-Trinity',
    step2Sub: 'כל מה שצריך לדעת לפני שמתחילים',
    step3Title: 'הכל מוכן! 🚀',
    step3Sub: 'אתה מוכן להתחיל לעבוד',
    next: 'הבא →',
    back: '← חזרה',
    finish: 'כניסה לכבינט',
    finishing: 'טוען...',
    roles: [
      { icon: '🎯', title: 'ניהול לידים', body: 'עקוב אחרי כל ליד מהרגע שנכנס ועד לסגירה' },
      { icon: '📊', title: 'פייפליין ויזואלי', body: 'גרור עסקאות בין שלבים — בקלות ובמהירות' },
      { icon: '🔴', title: 'אזור אדום', body: 'ראה אילו עסקאות מחכות לטיפול ואל תפספס אף אחת' },
      { icon: '📈', title: 'מדדי ביצועים', body: 'עקוב אחרי היעדים והביצועים שלך בזמן אמת' },
    ],
    checkmarks: [
      '✅ חשבון פעיל',
      '✅ גישה לפייפליין',
      '✅ גישה ללוח הבקרה',
    ],
    readyText: 'כל ההרשאות הוגדרו. לחץ "כניסה לכבינט" כדי להתחיל.',
  },
  ru: {
    step1Title: 'Добро пожаловать в кабинет!',
    step1Sub: 'Расскажите немного о себе, чтобы начать',
    namePlaceholder: 'Полное имя',
    phoneLabel: 'Телефон (необязательно)',
    phonePlaceholder: '+972 5X-XXX-XXXX',
    step2Title: 'Ваша роль в Trinity',
    step2Sub: 'Всё, что нужно знать перед стартом',
    step3Title: 'Всё готово! 🚀',
    step3Sub: 'Вы готовы к работе',
    next: 'Далее →',
    back: '← Назад',
    finish: 'Войти в кабинет',
    finishing: 'Загрузка...',
    roles: [
      { icon: '🎯', title: 'Управление лидами', body: 'Отслеживайте каждый лид от входа до закрытия сделки' },
      { icon: '📊', title: 'Визуальный пайплайн', body: 'Перетаскивайте сделки между этапами — быстро и просто' },
      { icon: '🔴', title: 'Красная зона', body: 'Видите, какие сделки ждут действия — ничего не пропустите' },
      { icon: '📈', title: 'KPI в реальном времени', body: 'Следите за планом и своими показателями в реальном времени' },
    ],
    checkmarks: [
      '✅ Аккаунт активирован',
      '✅ Доступ к пайплайну',
      '✅ Доступ к дашборду',
    ],
    readyText: 'Все права настроены. Нажмите «Войти в кабинет» для начала работы.',
  },
}

// ─── Step indicators ────────────────────────────────────────────────────────────

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
      done    ? 'bg-emerald-500 scale-100' :
      active  ? 'bg-indigo-600 scale-110 ring-4 ring-indigo-100' :
                'bg-gray-200'
    }`} />
  )
}

// ─── Role card ──────────────────────────────────────────────────────────────────

function RoleCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
      <span className="text-2xl shrink-0">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────────

export default function WorkerOnboardingPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const s = I18N[language as keyof typeof I18N] ?? I18N.ru
  const isHe = language === 'he'

  const [step, setStep]           = useState(1)
  const [name, setName]           = useState('')
  const [phone, setPhone]         = useState('')
  const [finishing, setFinishing] = useState(false)

  const supabase = createSupabaseBrowserClient()

  const handleFinish = async () => {
    setFinishing(true)
    try {
      // Save name/phone to Supabase user metadata
      if (name.trim()) {
        await supabase.auth.updateUser({ data: { full_name: name.trim() } })
      }
      // Mark onboarding complete (server-side)
      const res = await fetch('/api/worker/complete-onboarding', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to complete onboarding')
      router.replace('/worker')
    } catch (e) {
      toast.error(isHe ? 'שגיאה, נסה שוב' : 'Ошибка, попробуйте снова')
      setFinishing(false)
    }
  }

  const totalSteps = 3

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50 flex items-center justify-center p-4"
      dir={isHe ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-lg">

        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1a237e] to-[#3949ab] shadow-lg mb-3">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
              <polygon points="12,2 22,20 2,20" fill="#C8922A" opacity="0.9" />
              <polygon points="12,6 19,18 5,18" fill="white" opacity="0.15" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-indigo-400 tracking-widest uppercase">Trinity CRM</p>
        </div>

        {/* ── Card ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Header gradient */}
          <div className="bg-gradient-to-r from-[#1a237e] to-[#3949ab] px-6 py-5">
            <h1 className="text-xl font-bold text-white">
              {step === 1 ? s.step1Title : step === 2 ? s.step2Title : s.step3Title}
            </h1>
            <p className="text-indigo-200 text-sm mt-1">
              {step === 1 ? s.step1Sub : step === 2 ? s.step2Sub : s.step3Sub}
            </p>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-2 py-4 border-b border-gray-100">
            {Array.from({ length: totalSteps }, (_, i) => (
              <StepDot key={i} active={step === i + 1} done={step > i + 1} />
            ))}
          </div>

          {/* ── Body ─────────────────────────────────────────────────── */}
          <div className="px-6 py-6 space-y-4 min-h-[260px]">

            {/* Step 1 — Name & phone */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={s.namePlaceholder}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{s.phoneLabel}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder={s.phonePlaceholder}
                    dir="ltr"
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Step 2 — Role cards */}
            {step === 2 && (
              <div className="grid grid-cols-1 gap-3">
                {s.roles.map((r, i) => (
                  <RoleCard key={i} icon={r.icon} title={r.title} body={r.body} />
                ))}
              </div>
            )}

            {/* Step 3 — Ready */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  {s.checkmarks.map((c, i) => (
                    <p key={i} className="text-sm font-medium text-gray-700">{c}</p>
                  ))}
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-700">
                  {s.readyText}
                </div>
              </div>
            )}
          </div>

          {/* ── Footer / Actions ─────────────────────────────────────── */}
          <div className="px-6 pb-6 flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(n => n - 1)}
                disabled={finishing}
                className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                {s.back}
              </button>
            )}

            {step < totalSteps ? (
              <button
                onClick={() => setStep(n => n + 1)}
                disabled={step === 1 && !name.trim()}
                className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-sm shadow-indigo-200"
              >
                {s.next}
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={finishing}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-sm shadow-emerald-200 flex items-center justify-center gap-2"
              >
                {finishing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {s.finishing}
                  </>
                ) : s.finish}
              </button>
            )}
          </div>

        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Trinity CRM · Amber Solutions © 2025
        </p>
      </div>
    </div>
  )
}

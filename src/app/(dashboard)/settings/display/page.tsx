'use client'

import { useState } from 'react'
import { Check, ArrowLeft, Palette, List, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme, THEMES, ThemeId, ThemeDefinition } from '@/contexts/ThemeContext'

// ─── Mini preview modal ────────────────────────────────────────────────────────

function ThemePreviewModal({
  theme,
  isActive,
  onApply,
  onClose,
  isSaving,
  lang,
}: {
  theme: ThemeDefinition
  isActive: boolean
  onApply: () => void
  onClose: () => void
  isSaving: boolean
  lang: string
}) {
  const isHe = lang === 'he'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-base">
              {isHe ? theme.nameHe : theme.nameRu}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isHe ? 'תצוגה מקדימה' : 'Предпросмотр темы'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Preview — концепт B layout */}
        <div className="p-4">
          <div
            className="rounded-xl overflow-hidden border border-gray-200"
            style={{ display: 'grid', gridTemplateColumns: '160px 1fr', minHeight: 280 }}
          >
            {/* Sidebar */}
            <div style={{ background: theme.sidebar, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: theme.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600, color: '#fff', flexShrink: 0,
                }}>КФ</div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0 }}>Катерина Ф.</p>
                  <span style={{
                    fontSize: 10, background: theme.accentBg,
                    color: theme.accentText, padding: '1px 6px', borderRadius: 10,
                  }}>● Активен</span>
                </div>
              </div>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 4 }}>
                {['0 визитов', '₪0'].map((s) => (
                  <div key={s} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: '5px 6px', textAlign: 'center' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#fff', margin: 0 }}>{s.split(' ')[0]}</p>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{s.split(' ')[1] ?? 'оплачено'}</p>
                  </div>
                ))}
              </div>
              {/* Nav items */}
              {['Обзор', 'Визиты', 'Продажи', 'WhatsApp', 'Заметки'].map((item, i) => (
                <div key={item} style={{
                  padding: '6px 8px', borderRadius: 6, fontSize: 11,
                  background: i === 0 ? theme.accentBg : 'transparent',
                  color: i === 0 ? theme.accentText : 'rgba(255,255,255,0.4)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: i === 0 ? theme.accentText : 'rgba(255,255,255,0.2)' }}/>
                  {item}
                </div>
              ))}
            </div>

            {/* Content */}
            <div style={{ background: theme.contentBg, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <p style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 6px' }}>Контакты</p>
                <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: '#333' }}>📞 +34 697 832 319</div>
              </div>
              <div>
                <p style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 6px' }}>Заметки</p>
                <div style={{
                  background: theme.noteBg, borderRadius: 6, padding: '9px 10px',
                  border: `0.5px solid ${theme.noteBorder}`,
                  fontSize: 11, color: theme.noteText, lineHeight: 1.6,
                }}>
                  · Живёт в Валенсии<br/>
                  · Не заинтересована
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            {isHe ? 'ביטול' : 'Отмена'}
          </button>
          <button
            onClick={onApply}
            disabled={isActive || isSaving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            style={{
              background: isActive ? '#e5e7eb' : theme.accent,
              color: isActive ? '#6b7280' : '#fff',
            }}
          >
            {isSaving
              ? (isHe ? 'שומר...' : 'Сохранение...')
              : isActive
                ? (isHe ? '✓ פעיל' : '✓ Активна')
                : (isHe ? 'החל תמה' : 'Применить тему')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Theme row item ────────────────────────────────────────────────────────────

function ThemeRow({
  theme,
  isActive,
  lang,
  onClick,
}: {
  theme: ThemeDefinition
  isActive: boolean
  lang: string
  onClick: () => void
}) {
  const isHe = lang === 'he'
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all hover:shadow-md text-left group"
      style={{
        borderColor: isActive ? theme.accent : 'transparent',
        borderWidth: isActive ? 2 : 1,
        borderStyle: 'solid',
        background: isActive ? `${theme.accent}08` : 'white',
      }}
    >
      {/* Color swatch */}
      <div className="flex gap-1.5 shrink-0">
        <div className="w-8 h-8 rounded-lg" style={{ background: theme.sidebar }}/>
        <div className="w-4 h-8 rounded-md" style={{ background: theme.contentBg, border: '1px solid #e5e7eb' }}/>
        <div className="w-4 h-8 rounded-md" style={{ background: theme.noteBg, border: `1px solid ${theme.noteBorder}` }}/>
      </div>

      {/* Names */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
          {isHe ? theme.nameHe : theme.nameRu}
        </p>
        <p className="text-xs text-gray-400 mt-0.5" style={{ color: theme.accent }}>
          {isHe ? theme.nameRu : theme.nameHe}
        </p>
      </div>

      {/* Active badge or arrow */}
      {isActive ? (
        <div className="flex items-center justify-center w-6 h-6 rounded-full shrink-0" style={{ background: theme.accent }}>
          <Check className="w-3.5 h-3.5 text-white"/>
        </div>
      ) : (
        <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
        </svg>
      )}
    </button>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DisplayPage() {
  const { language } = useLanguage()
  const { themeId, theme: activeTheme, setTheme, isSaving } = useTheme()
  const isHe = language === 'he'
  const [preview, setPreview] = useState<ThemeDefinition | null>(null)

  const [visitsView, setVisitsView] = useState<'list' | 'calendar'>(() => {
    if (typeof window === 'undefined') return 'list'
    return (localStorage.getItem('trinity_visits_view') as 'list' | 'calendar') || 'list'
  })

  const handleVisitsView = (v: 'list' | 'calendar') => {
    setVisitsView(v)
    localStorage.setItem('trinity_visits_view', v)
  }

  const handleApply = async () => {
    if (!preview) return
    await setTheme(preview.id as ThemeId)
    setPreview(null)
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Header */}
      <div>
        <Link
          href="/settings"
          className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="w-4 h-4" style={{ transform: isHe ? 'rotate(180deg)' : undefined }}/>
          {isHe ? 'הגדרות' : 'Настройки'}
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: `${activeTheme.accent}15` }}>
            <Palette className="w-5 h-5" style={{ color: activeTheme.accent }}/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isHe ? 'ערכת נושא' : 'Тема оформления'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {isHe ? 'בחר את מראה המערכת שלך' : 'Выберите внешний вид системы'}
            </p>
          </div>
        </div>
      </div>

      {/* Theme list */}
      <div className="flex flex-col gap-2">
        {THEMES.map((t) => (
          <ThemeRow
            key={t.id}
            theme={t}
            isActive={themeId === t.id}
            lang={language}
            onClick={() => setPreview(t)}
          />
        ))}
      </div>

      {/* Active theme hint */}
      <p className="text-xs text-gray-400 text-center">
        {isHe
          ? `ערכת הנושא הפעילה: ${activeTheme.nameHe}`
          : `Активная тема: ${activeTheme.nameRu}`}
      </p>

      {/* ── Visits default view ────────────────────────────────────────── */}
      <div className="pt-2">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl" style={{ background: `${activeTheme.accent}15` }}>
            <CalendarDays className="w-5 h-5" style={{ color: activeTheme.accent }}/>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {isHe ? 'תצוגת ברירת מחדל לביקורים' : 'Начальный экран визитов'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isHe ? 'בחר איזו תצוגה תיפתח בכניסה לביקורים' : 'Выберите вид, который открывается при входе в визиты'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {([
            { value: 'list',     labelRu: 'Список',    labelHe: 'רשימה',   Icon: List },
            { value: 'calendar', labelRu: 'Календарь', labelHe: 'לוח שנה', Icon: CalendarDays },
          ] as const).map(({ value, labelRu, labelHe, Icon }) => {
            const active = visitsView === value
            return (
              <button
                key={value}
                onClick={() => handleVisitsView(value)}
                className="flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all"
                style={{
                  borderColor: active ? activeTheme.accent : '#e5e7eb',
                  background: active ? `${activeTheme.accent}0d` : 'white',
                }}
              >
                <Icon className="w-6 h-6" style={{ color: active ? activeTheme.accent : '#9ca3af' }} />
                <span className="text-sm font-semibold" style={{ color: active ? activeTheme.accent : '#6b7280' }}>
                  {isHe ? labelHe : labelRu}
                </span>
                {active && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: activeTheme.accent }}>
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Preview modal */}
      {preview && (
        <ThemePreviewModal
          theme={preview}
          isActive={themeId === preview.id}
          onApply={handleApply}
          onClose={() => setPreview(null)}
          isSaving={isSaving}
          lang={language}
        />
      )}
    </div>
  )
}

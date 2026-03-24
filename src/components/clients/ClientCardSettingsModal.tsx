'use client'

import { useState, useEffect } from 'react'
import { X, Settings2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export interface ClientCardSettings {
  showPaintCode: boolean
  showGallery: boolean
  showDocuments: boolean
  primaryAction: 'sale' | 'visit'
}

const DEFAULT_SETTINGS: ClientCardSettings = {
  showPaintCode: true,
  showGallery: true,
  showDocuments: true,
  primaryAction: 'sale',
}

function getStorageKey(orgId: string) {
  return `client_card_settings_${orgId}`
}

export function useClientCardSettings(): [ClientCardSettings, (s: ClientCardSettings) => void] {
  const { orgId } = useAuth()
  const [settings, setSettings] = useState<ClientCardSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    if (!orgId) return
    try {
      const raw = localStorage.getItem(getStorageKey(orgId))
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) })
    } catch { /* ignore */ }
  }, [orgId])

  function save(s: ClientCardSettings) {
    setSettings(s)
    if (!orgId) return
    try {
      localStorage.setItem(getStorageKey(orgId), JSON.stringify(s))
    } catch { /* ignore */ }
  }

  return [settings, save]
}

interface ClientCardSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: ClientCardSettings
  onSave: (s: ClientCardSettings) => void
  locale: 'he' | 'ru'
}

const LABELS = {
  he: {
    title: 'הגדרות כרטיס לקוח',
    paintCode: 'קוד צבע',
    gallery: 'גלריה',
    documents: 'מסמכים',
    close: 'סגור',
    hint: 'בחר אילו שדות יוצגו בכרטיס הלקוח',
    primaryAction: 'כפתור פעולה ראשי',
    primaryActionHint: 'מה יוצג ראשון בסרגל הצד',
    sale: 'עסקה',
    visit: 'ביקור',
  },
  ru: {
    title: 'Настройки карточки клиента',
    paintCode: 'Код краски',
    gallery: 'Галерея',
    documents: 'Документы',
    close: 'Закрыть',
    hint: 'Выберите, какие блоки отображать в карточке клиента',
    primaryAction: 'Главная кнопка',
    primaryActionHint: 'Что показывать первым в сайдбаре',
    sale: 'Продажа',
    visit: 'Визит',
  },
}

export function ClientCardSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
  locale,
}: ClientCardSettingsModalProps) {
  const l = LABELS[locale]
  const isHe = locale === 'he'
  const [local, setLocal] = useState<ClientCardSettings>(settings)

  useEffect(() => { setLocal(settings) }, [settings, isOpen])

  function toggle(key: keyof Omit<ClientCardSettings, 'primaryAction'>) {
    const next = { ...local, [key]: !local[key] }
    setLocal(next)
    onSave(next)
  }

  function setPrimary(val: 'sale' | 'visit') {
    const next = { ...local, primaryAction: val }
    setLocal(next)
    onSave(next)
  }

  if (!isOpen) return null

  const toggleItems: { key: keyof Omit<ClientCardSettings, 'primaryAction'>; label: string; emoji: string }[] = [
    { key: 'showGallery',   label: l.gallery,   emoji: '🖼️' },
    { key: 'showDocuments', label: l.documents, emoji: '📄' },
    { key: 'showPaintCode', label: l.paintCode, emoji: '🎨' },
  ]

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 bg-background rounded-t-2xl shadow-2xl w-full max-w-md px-6 pt-5 pb-8"
        onClick={(e) => e.stopPropagation()}
        dir={isHe ? 'rtl' : 'ltr'}
      >
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Settings2 size={16} className="text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-base font-bold">{l.title}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-5">{l.hint}</p>

        {/* Primary action segment */}
        <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-lg">⭐</span>
            <div>
              <p className="text-sm font-medium">{l.primaryAction}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{l.primaryActionHint}</p>
            </div>
          </div>
          <div className="flex rounded-lg overflow-hidden border border-violet-200 dark:border-violet-700 bg-white dark:bg-gray-900 shrink-0">
            <button
              onClick={() => setPrimary('sale')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                local.primaryAction === 'sale'
                  ? 'bg-violet-600 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🛒 {l.sale}
            </button>
            <button
              onClick={() => setPrimary('visit')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors border-s border-violet-200 dark:border-violet-700 ${
                local.primaryAction === 'visit'
                  ? 'bg-violet-600 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              📅 {l.visit}
            </button>
          </div>
        </div>

        {/* Toggle items */}
        <div className="space-y-3">
          {toggleItems.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => toggle(key)}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border bg-card hover:bg-muted/50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{emoji}</span>
                <span className="text-sm font-medium">{label}</span>
              </div>
              <div
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                  local[key] ? 'bg-violet-600' : 'bg-muted-foreground/30'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    local[key]
                      ? isHe ? 'translate-x-0.5' : 'translate-x-[1.375rem]'
                      : isHe ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

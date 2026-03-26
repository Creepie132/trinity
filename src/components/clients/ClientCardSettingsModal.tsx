'use client'

import { useState, useEffect } from 'react'
import { X, Settings2, ArrowLeft, ArrowRight } from 'lucide-react'
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

const SETTINGS_EVENT = 'trinity:card-settings-changed'

export function useClientCardSettings(): [ClientCardSettings, (s: ClientCardSettings) => void] {
  const { orgId } = useAuth()

  // Фолбэк: если orgId из хука ещё не загрузился (auth pending / 502), берём из localStorage
  function getEffectiveOrgId(hookOrgId: string | null): string | null {
    if (hookOrgId) return hookOrgId
    if (typeof window === 'undefined') return null
    return localStorage.getItem('current_org_id')
  }

  // Читаем из localStorage синхронно при первом рендере чтобы избежать мигания
  const [settings, setSettings] = useState<ClientCardSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS
    // Пробуем по exact org key → иначе любой client_card_settings_* ключ
    try {
      const fallbackOrgId = localStorage.getItem('current_org_id')
      if (fallbackOrgId) {
        const raw = localStorage.getItem(getStorageKey(fallbackOrgId))
        if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
      }
      const keys = Object.keys(localStorage).filter(k => k.startsWith('client_card_settings_'))
      if (keys.length > 0) {
        const raw = localStorage.getItem(keys[0])
        if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
      }
    } catch { /* ignore */ }
    return DEFAULT_SETTINGS
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const effectiveOrgId = getEffectiveOrgId(orgId)
    if (!effectiveOrgId) return
    try {
      const raw = localStorage.getItem(getStorageKey(effectiveOrgId))
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) })
    } catch { /* ignore */ }
    setLoaded(true)
  }, [orgId])

  // Синхронизируем все инстансы хука в одной вкладке через CustomEvent
  useEffect(() => {
    const handler = (e: Event) => {
      const s = (e as CustomEvent<ClientCardSettings>).detail
      if (s) setSettings(s)
    }
    window.addEventListener(SETTINGS_EVENT, handler)
    return () => window.removeEventListener(SETTINGS_EVENT, handler)
  }, [])

  function save(s: ClientCardSettings) {
    setSettings(s)
    // Диспатчим событие — все инстансы хука обновляются мгновенно
    window.dispatchEvent(new CustomEvent<ClientCardSettings>(SETTINGS_EVENT, { detail: s }))
    const effectiveOrgId = getEffectiveOrgId(orgId)
    if (!effectiveOrgId) return
    try {
      localStorage.setItem(getStorageKey(effectiveOrgId), JSON.stringify(s))
    } catch { /* ignore */ }
  }

  // До загрузки точного ключа — скрываем визуальные блоки, primaryAction уже известен
  const safeSettings: ClientCardSettings = loaded
    ? settings
    : { ...settings, showPaintCode: false, showGallery: false, showDocuments: false }

  return [safeSettings, save]
}

interface ClientCardSettingsPanelProps {
  onClose: () => void
  settings: ClientCardSettings
  onSave: (s: ClientCardSettings) => void
  locale: 'he' | 'ru'
}

const LABELS = {
  he: {
    title: 'הגדרות כרטיס',
    paintCode: 'קוד צבע',
    gallery: 'גלריה',
    documents: 'מסמכים',
    back: 'חזרה',
    hint: 'התאם אישית מה יוצג בכרטיס הלקוח',
    primaryAction: 'כפתור פעולה ראשי',
    primaryActionHint: 'פעולה בהחלקת הכרטיס ימינה',
    sale: 'עסקה',
    visit: 'ביקור',
    display: 'הצגת בלוקים',
  },
  ru: {
    title: 'Настройки карточки',
    paintCode: 'Код краски',
    gallery: 'Галерея',
    documents: 'Документы',
    back: 'Назад',
    hint: 'Настройте отображение карточки клиента',
    primaryAction: 'Главная кнопка',
    primaryActionHint: 'Действие при свайпе карточки вправо',
    sale: 'Продажа',
    visit: 'Визит',
    display: 'Блоки отображения',
  },
}

/**
 * ClientCardSettingsPanel — inline panel, replaces content area inside the modal.
 * No overlay, no z-index fights. Rendered in place of the normal card content.
 */
export function ClientCardSettingsPanel({
  onClose,
  settings,
  onSave,
  locale,
}: ClientCardSettingsPanelProps) {
  const l = LABELS[locale]
  const isHe = locale === 'he'
  const BackIcon = isHe ? ArrowRight : ArrowLeft

  function toggle(key: keyof Omit<ClientCardSettings, 'primaryAction'>) {
    onSave({ ...settings, [key]: !settings[key] })
  }

  function setPrimary(val: 'sale' | 'visit') {
    onSave({ ...settings, primaryAction: val })
  }

  const toggleItems: { key: keyof Omit<ClientCardSettings, 'primaryAction'>; label: string; emoji: string }[] = [
    { key: 'showGallery',   label: l.gallery,   emoji: '🖼️' },
    { key: 'showDocuments', label: l.documents, emoji: '📄' },
    { key: 'showPaintCode', label: l.paintCode, emoji: '🎨' },
  ]

  return (
    <div dir={isHe ? 'rtl' : 'ltr'} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Panel header — same style as card content header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px', borderBottom: '0.5px solid #e8edf4',
      }}>
        <button
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#64748b', fontSize: 12, fontWeight: 600, padding: '2px 4px',
            borderRadius: 6,
          }}
        >
          <BackIcon size={14} />
          {l.back}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Settings2 size={12} color="#7c3aed" />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{l.title}</span>
        </div>
      </div>

      {/* Panel body */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>

        {/* Primary action */}
        <div style={{
          padding: '12px 14px', borderRadius: 12,
          background: '#faf5ff', border: '0.5px solid #ddd6fe',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>⭐</span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', margin: 0 }}>{l.primaryAction}</p>
                <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>{l.primaryActionHint}</p>
              </div>
            </div>
            <div style={{
              display: 'flex', borderRadius: 8, overflow: 'hidden',
              border: '0.5px solid #ddd6fe', background: '#fff', flexShrink: 0,
            }}>
              <button
                onClick={() => setPrimary('sale')}
                style={{
                  padding: '6px 12px', border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
                  background: settings.primaryAction === 'sale' ? '#7c3aed' : 'transparent',
                  color: settings.primaryAction === 'sale' ? '#fff' : '#64748b',
                }}
              >
                🛒 {l.sale}
              </button>
              <button
                onClick={() => setPrimary('visit')}
                style={{
                  padding: '6px 12px',
                  borderLeft: '0.5px solid #ddd6fe', border: 'none',
                  borderInlineStart: '0.5px solid #ddd6fe',
                  cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
                  background: settings.primaryAction === 'visit' ? '#7c3aed' : 'transparent',
                  color: settings.primaryAction === 'visit' ? '#fff' : '#64748b',
                }}
              >
                📅 {l.visit}
              </button>
            </div>
          </div>
        </div>

        {/* Section label */}
        <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '4px 0 0' }}>
          {l.display}
        </p>

        {/* Toggle rows */}
        {toggleItems.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 10,
              border: '0.5px solid #e8edf4', background: '#fff',
              cursor: 'pointer', width: '100%', transition: 'background 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{label}</span>
            </div>
            {/* Toggle pill */}
            <div style={{
              position: 'relative', width: 40, height: 22, borderRadius: 11, flexShrink: 0,
              background: settings[key] ? '#7c3aed' : '#e2e8f0',
              transition: 'background 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: 2,
                width: 18, height: 18, borderRadius: '50%',
                background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'transform 0.2s',
                transform: settings[key]
                  ? isHe ? 'translateX(2px)' : 'translateX(20px)'
                  : isHe ? 'translateX(20px)' : 'translateX(2px)',
              }} />
            </div>
          </button>
        ))}

      </div>
    </div>
  )
}

// Legacy export for backward compatibility — not used anymore but kept to avoid import errors
export function ClientCardSettingsModal({
  isOpen, onClose, settings, onSave, locale,
}: {
  isOpen: boolean; onClose: () => void
  settings: ClientCardSettings; onSave: (s: ClientCardSettings) => void
  locale: 'he' | 'ru'
}) {
  if (!isOpen) return null
  return <ClientCardSettingsPanel onClose={onClose} settings={settings} onSave={onSave} locale={locale} />
}

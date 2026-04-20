'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAddClient, useClients } from '@/hooks/useClients'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDemoMode } from '@/hooks/useDemoMode'
import { RefreshCw, Loader2, User, FileText, Paintbrush, UserPlus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useClientCardSettings } from '@/components/clients/ClientCardSettingsModal'

// ─── Easter Egg ───────────────────────────────────────────────────────────────
function EasterEggOverlay({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)

  const handlePlay = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = false
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}) })
    setStarted(true)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.93)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <video
          ref={videoRef}
          src="/videos/technoduck.mp4"
          loop
          playsInline
          muted
          style={{
            display: 'block', maxWidth: '90vw', maxHeight: '85vh',
            borderRadius: 16, boxShadow: '0 0 60px rgba(255,220,0,0.5)',
          }}
        />
        {/* Большая кнопка Play — пока не нажата (нужна для мобильных) */}
        {!started && (
          <button
            onClick={handlePlay}
            style={{
              position: 'absolute', inset: 0, margin: 'auto',
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(0,0,0,0.7)', border: '3px solid rgba(255,255,255,0.8)',
              color: '#fff', fontSize: 32, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ▶
          </button>
        )}
      </div>
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.35)', fontSize: 12, whiteSpace: 'nowrap',
      }}>
        🦆 тап за пределами видео — закрыть
      </div>
    </div>
  )
}

// ─── Main Dialog ───────────────────────────────────────────────────────────────
interface AddClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (client: any) => void
}

export function AddClientDialog({ open, onOpenChange, onSuccess }: AddClientDialogProps) {
  const { orgId, isLoading: authLoading, user } = useAuth()
  const { t, language } = useLanguage()
  const { isDemo } = useDemoMode()
  const { data: clientsData } = useClients()
  const clientCount = clientsData?.count || 0
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    date_of_birth: '',
    notes: '',
    description: '',
    paint_code: '',
    preferred_languages: ['he'] as string[],
  })
  const [showDescription, setShowDescription] = useState(false)
  const [hasPaintCode, setHasPaintCode] = useState(false)
  const [showEasterEgg, setShowEasterEgg] = useState(false)

  const addClient = useAddClient()
  const [cardSettings] = useClientCardSettings()

  useEffect(() => {
    if (open && process.env.NODE_ENV === 'development') {
      console.log('[AddClientDialog] Dialog opened, orgId:', orgId)
    }
  }, [open, orgId])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!formData.first_name || !formData.phone) return
    if (isDemo && clientCount >= 10) return

    let newClient: any = null
    try {
      newClient = await addClient.mutateAsync({
        first_name: formData.first_name,
        last_name: formData.last_name || null,
        phone: formData.phone,
        email: formData.email || null,
        address: formData.address || null,
        city: formData.city || null,
        date_of_birth: formData.date_of_birth || null,
        notes: formData.notes || null,
        description: formData.description || null,
        paint_code: hasPaintCode ? (formData.paint_code || null) : null,
        preferred_languages: formData.preferred_languages.length > 0
          ? formData.preferred_languages
          : ['he'],
      })
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[AddClientDialog] Error:', error)
      }
      return
    }

    // Запускаем фоновый рефетч без await — не блокирует закрытие
    queryClient.invalidateQueries({ queryKey: ['clients'] })

    // 🦆 Easter egg
    const fn = formData.first_name.trim().toLowerCase()
    const ln = formData.last_name.trim().toLowerCase()
    if (fn === 'techno' && ln === 'duck') {
      setShowEasterEgg(true)
    }

    setFormData({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      date_of_birth: '',
      notes: '',
      description: '',
      paint_code: '',
      preferred_languages: ['he'],
    })
    setShowDescription(false)
    setHasPaintCode(false)

    onOpenChange(false)

    if (onSuccess && newClient) {
      onSuccess(newClient)
    }
  }

  const isSubmitDisabled = addClient.isPending || authLoading || !orgId || (isDemo && clientCount >= 10)

  const dialog = (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      darkHeader showCloseButton={false}
      width="680px"
      dir={language === 'he' ? 'rtl' : 'ltr'}
    >
      <TrinityModalShell
        open={open}
        onClose={() => onOpenChange(false)}
        icon={<UserPlus />}
        title={language === 'he' ? 'לקוח חדש' : 'Новый клиент'}
        subtitle={language === 'he' ? 'מלא את פרטי הלקוח' : 'Заполните данные клиента'}
        dir={language === 'he' ? 'rtl' : 'ltr'}
        sidebarExtra={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => handleSubmit()}
              disabled={isSubmitDisabled}
              style={{
                padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: isSubmitDisabled ? 'rgba(255,255,255,0.15)' : 'var(--trinity-accent, #4a6fa5)',
                color: '#fff', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: isSubmitDisabled ? 0.5 : 1,
              }}
            >
              {addClient.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {authLoading ? t('common.loading') : addClient.isPending ? t('common.saving') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              style={{
                padding: '9px 14px', borderRadius: 10, border: '0.5px solid rgba(255,255,255,0.2)',
                background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: 13, cursor: 'pointer',
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        }
      >
      {/* DEMO limit warning */}
      {isDemo && (
        <div className="space-y-2 mb-4">
          <p className="text-sm text-muted-foreground">
            {language === 'he'
              ? `${clientCount}/10 לקוחות (הגבלת הדגמה)`
              : `${clientCount}/10 клиентов (лимит демо)`}
          </p>
          {clientCount >= 10 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
              <p className="text-red-700 dark:text-red-300 text-sm font-medium mb-2">
                {language === 'he' ? 'הגעת למגבלת הלקוחות' : 'Достигнут лимит клиентов'}
              </p>
              <a
                href="https://wa.me/972544858586"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 dark:text-red-400 underline text-sm"
              >
                {language === 'he' ? 'שדרג עכשיו' : 'Обновить тариф'}
              </a>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Аватар с живыми инициалами */}
        <div className="flex justify-center mb-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg">
            {formData.first_name || formData.last_name ? (
              <span className="text-white font-bold text-xl">
                {(formData.first_name?.[0] || '').toUpperCase()}{(formData.last_name?.[0] || '').toUpperCase()}
              </span>
            ) : (
              <User className="w-7 h-7 text-white/70" />
            )}
          </div>
        </div>

        {/* Имя и фамилия */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t('clients.firstName')} / {t('clients.lastName')}
            </span>
            <button
              type="button"
              onClick={() => setShowDescription(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                showDescription
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-600'
                  : 'border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              {language === 'he' ? 'תיאור' : 'Описание'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder={t('clients.firstName')}
                required
                autoFocus
              />
            </div>
            <div>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder={t('clients.lastName')}
              />
            </div>
          </div>
        </div>

        {/* Поле описания — показывается по кнопке */}
        {showDescription && (
          <div>
            <Label htmlFor="description" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {language === 'he' ? 'תיאור' : 'Описание'}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="mt-1 resize-none"
              placeholder={language === 'he' ? 'תיאור הלקוח...' : 'Описание клиента...'}
              autoFocus
            />
          </div>
        )}

        {/* Телефон — главное поле */}
        <div>
          <Label htmlFor="phone" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {t('clients.phone')} *
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+972-50-1234567"
            className="mt-1 text-base"
            required
          />
        </div>

        {/* Email и Дата рождения */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="email" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t('clients.email')}
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="date_of_birth" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t('clients.birthDate')}
            </Label>
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        {/* Адрес и Город */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="address" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {language === 'he' ? 'כתובת' : 'Адрес'}
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="mt-1"
              placeholder={language === 'he' ? 'רחוב, בית' : 'Улица, дом'}
            />
          </div>
          <div>
            <Label htmlFor="city" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {language === 'he' ? 'עיר' : 'Город'}
            </Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="mt-1"
              placeholder={language === 'he' ? 'תל אביב...' : 'Тель-Авив...'}
            />
          </div>
        </div>

        {/* Код краски — только если включено в настройках карточки */}
        {cardSettings.showPaintCode && (
        <div>
          <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={hasPaintCode}
              onChange={(e) => {
                setHasPaintCode(e.target.checked)
                if (!e.target.checked) setFormData(f => ({ ...f, paint_code: '' }))
              }}
              className="w-4 h-4 rounded border-gray-300 accent-indigo-600"
            />
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
              <Paintbrush className="w-3.5 h-3.5 text-indigo-500" />
              {language === 'he' ? 'מספר צבע' : 'Код краски'}
            </span>
          </label>
          {hasPaintCode && (
            <Input
              value={formData.paint_code}
              onChange={(e) => setFormData({ ...formData, paint_code: e.target.value })}
              placeholder={language === 'he' ? 'הזן מספר צבע...' : 'Введите код краски...'}
              className="mt-2"
              autoFocus
            />
          )}
        </div>
        )}

        {/* Язык общения (для WhatsApp-триггеров) */}
        <div>
          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {language === 'he' ? 'שפת תקשורת' : 'Язык общения'}
          </Label>
          <div className="flex gap-2 mt-1.5">
            {(['he', 'ru'] as const).map(lang => {
              const checked = formData.preferred_languages.includes(lang)
              const label = lang === 'he' ? 'עברית' : 'Русский'
              const flag = lang === 'he' ? '🇮🇱' : '🇷🇺'
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setFormData(f => {
                      const next = checked
                        ? f.preferred_languages.filter(l => l !== lang)
                        : [...f.preferred_languages, lang]
                      // не разрешаем пустой массив — минимум один язык
                      return { ...f, preferred_languages: next.length > 0 ? next : [lang] }
                    })
                  }}
                  className={`flex-1 px-3 py-2 rounded-xl border-2 transition-all flex items-center justify-center gap-2 text-sm font-medium ${
                    checked
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-600 dark:text-indigo-300'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:bg-slate-800 dark:border-slate-700'
                  }`}
                >
                  <span>{flag}</span>
                  <span>{label}</span>
                  {checked && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {language === 'he'
              ? 'נבחר לשליחת WhatsApp אוטומטית בשפה המועדפת'
              : 'Используется для WhatsApp-сообщений на нужном языке'}
          </p>
        </div>

        {/* Заметки */}
        <div>
          <Label htmlFor="notes" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {t('clients.notes')}
          </Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="mt-1 resize-none"
            placeholder={language === 'he' ? 'הערות על הלקוח...' : 'Заметки о клиенте...'}
          />
        </div>

        {/* Warning if orgId is missing */}
        {!authLoading && !orgId && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                  {t('clients.noOrgFound')}
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  User ID: {user?.id || t('common.notAvailable')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2 rounded-lg border border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900 flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              {t('common.refresh')}
            </button>
          </div>
        )}
      </form>
      </TrinityModalShell>
    </Modal>
  )

  return (
    <>
      {dialog}
      {showEasterEgg && typeof document !== 'undefined' && createPortal(
        <EasterEggOverlay onClose={() => setShowEasterEgg(false)} />,
        document.body
      )}
    </>
  )
}

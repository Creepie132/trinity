'use client'

import { useState, useEffect } from 'react'
import { WizardModal, WizardStep } from '@/components/ui/WizardModal'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { CreditCard, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react'

// ─── i18n ─────────────────────────────────────────────────────────────────────

const I18N = {
  he: {
    title:          'הגדרות טרנזילה',
    stepLabel:      'פרטי חשבון',
    terminal:       'שם טרמינל',
    terminalPh:     'terminal_name',
    password:       'סיסמת טרמינל',
    passwordPh:     '••••••••',
    tokenTerminal:  'שם טרמינל טוקן',
    tokenTermPh:    'token_terminal_name',
    tokenPassword:  'סיסמת טוקן',
    tokenPwPh:      '••••••••',
    connected:      'מחובר',
    notConnected:   'לא מחובר',
    save:           'שמור',
    cancel:         'ביטול',
    disconnect:     'נתק',
    disconnectQ:    'לנתק את Tranzila?',
    saved:          'נשמר בהצלחה ✓',
    error:          'שגיאה בשמירה',
    loadError:      'שגיאה בטעינה',
    disconnected:   'נותק',
  },
  ru: {
    title:          'Настройки Tranzila',
    stepLabel:      'Данные аккаунта',
    terminal:       'Имя терминала',
    terminalPh:     'terminal_name',
    password:       'Пароль терминала',
    passwordPh:     '••••••••',
    tokenTerminal:  'Имя токен-терминала',
    tokenTermPh:    'token_terminal_name',
    tokenPassword:  'Пароль токен-терминала',
    tokenPwPh:      '••••••••',
    connected:      'Подключено',
    notConnected:   'Не подключено',
    save:           'Сохранить',
    cancel:         'Отмена',
    disconnect:     'Отключить',
    disconnectQ:    'Отключить Tranzila?',
    saved:          'Сохранено ✓',
    error:          'Ошибка при сохранении',
    loadError:      'Ошибка загрузки',
    disconnected:   'Отключено',
  },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TranzilaSettingsModalProps {
  open: boolean
  onClose: () => void
  orgId: string
  orgName: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TranzilaSettingsModal({
  open, onClose, orgId, orgName,
}: TranzilaSettingsModalProps) {
  const { language } = useLanguage()
  const s = I18N[language]
  const dir = language === 'he' ? 'rtl' : 'ltr'

  const [terminal, setTerminal]           = useState('')
  const [password, setPassword]           = useState('')
  const [tokenTerminal, setTokenTerminal] = useState('')
  const [tokenPassword, setTokenPassword] = useState('')
  const [showPw, setShowPw]               = useState(false)
  const [showTokenPw, setShowTokenPw]     = useState(false)
  const [saving, setSaving]               = useState(false)
  const [loading, setLoading]             = useState(false)
  const [isConnected, setIsConnected]     = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  useEffect(() => {
    if (!open || !orgId) return
    setConfirmDisconnect(false)
    loadConfig()
  }, [open, orgId])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/tranzila`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTerminal(data.tranzila_terminal ?? '')
      setPassword(data.tranzila_password ?? '')
      setTokenTerminal(data.tranzila_token_terminal ?? '')
      setTokenPassword(data.tranzila_token_password ?? '')
      setIsConnected(data.is_connected ?? false)
    } catch {
      toast.error(s.loadError)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!terminal.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/tranzila`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tranzila_terminal:       terminal.trim(),
          tranzila_password:       password.trim() || null,
          tranzila_token_terminal: tokenTerminal.trim() || null,
          tranzila_token_password: tokenPassword.trim() || null,
        }),
      })
      if (!res.ok) throw new Error()
      setIsConnected(true)
      toast.success(s.saved)
      onClose()
    } catch {
      toast.error(s.error)
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/tranzila`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setTerminal(''); setPassword('')
      setTokenTerminal(''); setTokenPassword('')
      setIsConnected(false)
      setConfirmDisconnect(false)
      toast.success(s.disconnected)
      onClose()
    } catch {
      toast.error(s.error)
    } finally {
      setSaving(false)
    }
  }

  const steps: WizardStep[] = [
    { label: s.stepLabel, icon: CreditCard },
  ]

  const canProceed = terminal.trim().length > 0

  if (loading) return null

  return (
    <WizardModal
      open={open}
      onClose={onClose}
      title={s.title}
      logoLabel="Trinity CRM"
      logoBadge="Admin"
      steps={steps}
      currentStep={1}
      onNext={() => {}}
      onBack={() => {}}
      canProceed={canProceed}
      onSubmit={handleSave}
      isSubmitting={saving}
      submitLabel={s.save}
      cancelLabel={s.cancel}
      dir={dir}
      size="md"
    >
      <div className="space-y-5">

        {/* Connection status badge */}
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-gray-100 text-gray-500 border-gray-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            {isConnected ? s.connected : s.notConnected}
          </span>

          {isConnected && !confirmDisconnect && (
            <button
              onClick={() => setConfirmDisconnect(true)}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
            >
              {s.disconnect}
            </button>
          )}
        </div>

        {/* Disconnect confirmation */}
        {confirmDisconnect && (
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700 flex-1">{s.disconnectQ}</span>
            <button onClick={handleDisconnect} disabled={saving}
              className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : s.disconnect}
            </button>
            <button onClick={() => setConfirmDisconnect(false)} className="text-xs text-gray-500 hover:text-gray-700">✕</button>
          </div>
        )}

        {/* Terminal name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{s.terminal}</label>
          <input
            type="text"
            value={terminal}
            onChange={e => setTerminal(e.target.value)}
            placeholder={s.terminalPh}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Terminal password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{s.password}</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={s.passwordPh}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-10"
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Token terminal name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{s.tokenTerminal}</label>
          <input
            type="text"
            value={tokenTerminal}
            onChange={e => setTokenTerminal(e.target.value)}
            placeholder={s.tokenTermPh}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Token password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{s.tokenPassword}</label>
          <div className="relative">
            <input
              type={showTokenPw ? 'text' : 'password'}
              value={tokenPassword}
              onChange={e => setTokenPassword(e.target.value)}
              placeholder={s.tokenPwPh}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-10"
            />
            <button type="button" onClick={() => setShowTokenPw(v => !v)}
              className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 hover:text-gray-600">
              {showTokenPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

      </div>
    </WizardModal>
  )
}

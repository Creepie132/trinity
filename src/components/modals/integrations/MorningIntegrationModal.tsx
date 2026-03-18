'use client'

import { useState, useEffect } from 'react'
import { WizardModal, WizardStep } from '@/components/ui/WizardModal'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import {
  KeyRound, Webhook, Eye, EyeOff, Copy, CheckCircle,
  Loader2, Trash2, AlertTriangle,
} from 'lucide-react'

// ─── i18n ─────────────────────────────────────────────────────────────────────

const I18N = {
  he: {
    title:        'חשבשונית ירוקה (Morning)',
    step1Label:   'מפתחות API',
    step2Label:   'הגדרת Webhook',
    apiKey:       'מפתח API',
    apiKeyPh:     'cfdabc6b-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    webhookSecret:'סוד Webhook',
    webhookSecPh: 'T73cMOko+...',
    connected:    'מחובר',
    notConnected: 'לא מחובר',
    save:         'שמור',
    cancel:       'ביטול',
    back:         'חזור',
    next:         'הבא',
    disconnect:   'נתק',
    disconnectQ:  'לנתק את חשבשונית ירוקה?',
    webhookUrl:   'כתובת Webhook',
    copyUrl:      'העתק',
    copied:       'הועתק!',
    events:       'אירועים לסמן ב-Green Invoice:',
    webhookNote:  'הכנס את הכתובת הזאת בהגדרות Webhook ב-Green Invoice',
    saved:        'הוגדר בהצלחה ✓',
    error:        'שגיאה בשמירה',
    loadError:    'שגיאה בטעינה',
  },
  ru: {
    title:        'Green Invoice (Morning)',
    step1Label:   'API ключи',
    step2Label:   'Настройка Webhook',
    apiKey:       'API ключ',
    apiKeyPh:     'cfdabc6b-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    webhookSecret:'Webhook Secret',
    webhookSecPh: 'T73cMOko+...',
    connected:    'Подключено',
    notConnected: 'Не подключено',
    save:         'Сохранить',
    cancel:       'Отмена',
    back:         'Назад',
    next:         'Далее',
    disconnect:   'Отключить',
    disconnectQ:  'Отключить Green Invoice?',
    webhookUrl:   'URL для Webhook',
    copyUrl:      'Копировать',
    copied:       'Скопировано!',
    events:       'Отметить события в Green Invoice:',
    webhookNote:  'Вставьте этот URL в настройки Webhook в Green Invoice',
    saved:        'Сохранено ✓',
    error:        'Ошибка при сохранении',
    loadError:    'Ошибка загрузки',
  },
}

const WEBHOOK_EVENTS = [
  'document/created',
  'payment/received',
  'expense-draft/parsed',
  'client/created',
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface MorningIntegrationModalProps {
  open: boolean
  onClose: () => void
  orgId: string
  orgName: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MorningIntegrationModal({
  open, onClose, orgId, orgName,
}: MorningIntegrationModalProps) {
  const { language } = useLanguage()
  const s = I18N[language]
  const dir = language === 'he' ? 'rtl' : 'ltr'

  const [step, setStep] = useState(1)
  const [apiKey, setApiKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://ambersol.co.il'}/api/webhooks/green-invoice`

  // Load existing config when modal opens
  useEffect(() => {
    if (!open || !orgId) return
    setStep(1)
    setConfirmDisconnect(false)
    loadConfig()
  }, [open, orgId])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/integrations?provider=green_invoice`)
      if (!res.ok) throw new Error()
      const { integration } = await res.json()
      if (integration?.config) {
        setApiKey(integration.config.api_key ?? '')
        setWebhookSecret(integration.config.webhook_secret ?? '')
        setIsConnected(integration.is_active ?? false)
      } else {
        setApiKey(''); setWebhookSecret(''); setIsConnected(false)
      }
    } catch {
      toast.error(s.loadError)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!apiKey.trim() || !webhookSecret.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/integrations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'green_invoice',
          config: { api_key: apiKey.trim(), webhook_secret: webhookSecret.trim() },
          is_active: true,
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
      const res = await fetch(
        `/api/admin/organizations/${orgId}/integrations?provider=green_invoice`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error()
      setApiKey(''); setWebhookSecret(''); setIsConnected(false)
      setConfirmDisconnect(false)
      toast.success(language === 'he' ? 'נותק' : 'Отключено')
      onClose()
    } catch {
      toast.error(s.error)
    } finally {
      setSaving(false)
    }
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const steps: WizardStep[] = [
    { label: s.step1Label, icon: KeyRound },
    { label: s.step2Label, icon: Webhook },
  ]

  const canProceed = step === 1
    ? apiKey.trim().length > 10 && webhookSecret.trim().length > 6
    : true

  if (loading) return null

  return (
    <WizardModal
      open={open}
      onClose={onClose}
      title={s.title}
      logoLabel="Trinity CRM"
      logoBadge="Admin"
      steps={steps}
      currentStep={step}
      onNext={() => setStep(n => n + 1)}
      onBack={() => setStep(n => n - 1)}
      canProceed={canProceed}
      onSubmit={handleSave}
      isSubmitting={saving}
      submitLabel={s.save}
      cancelLabel={s.cancel}
      backLabel={s.back}
      nextLabel={s.next}
      dir={dir}
      size="md"
    >
      {/* ── Step 1: API Keys ── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Connection status badge */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border
            ${isConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
            {isConnected
              ? <><CheckCircle className="w-4 h-4" />{s.connected} — {orgName}</>
              : <><AlertTriangle className="w-4 h-4" />{s.notConnected} — {orgName}</>}
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.apiKey}</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={s.apiKeyPh}
                className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                dir="ltr"
              />
              <button type="button" onClick={() => setShowApiKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Webhook Secret */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.webhookSecret}</label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={webhookSecret}
                onChange={e => setWebhookSecret(e.target.value)}
                placeholder={s.webhookSecPh}
                className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                dir="ltr"
              />
              <button type="button" onClick={() => setShowSecret(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Disconnect button (only if connected) */}
          {isConnected && !confirmDisconnect && (
            <button onClick={() => setConfirmDisconnect(true)}
              className="flex items-center gap-2 text-xs text-red-500 hover:text-red-700 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />{s.disconnect}
            </button>
          )}
          {isConnected && confirmDisconnect && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-700 flex-1">{s.disconnectQ}</p>
              <button onClick={handleDisconnect} disabled={saving}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 flex items-center gap-1">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                {s.disconnect}
              </button>
              <button onClick={() => setConfirmDisconnect(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs hover:bg-gray-50">
                {s.cancel}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Webhook Setup ── */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Webhook URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.webhookUrl}</label>
            <p className="text-xs text-gray-500">{s.webhookNote}</p>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <code className="flex-1 text-xs text-indigo-700 dark:text-indigo-300 break-all" dir="ltr">
                {webhookUrl}
              </code>
              <button onClick={handleCopyUrl}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {copied ? <><CheckCircle className="w-3.5 h-3.5" />{s.copied}</> : <><Copy className="w-3.5 h-3.5" />{s.copyUrl}</>}
              </button>
            </div>
          </div>

          {/* Events to subscribe */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.events}</p>
            <div className="space-y-1.5">
              {WEBHOOK_EVENTS.map(ev => (
                <div key={ev} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                  <CheckCircle className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <code className="text-xs text-indigo-800 dark:text-indigo-200 font-mono" dir="ltr">{ev}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </WizardModal>
  )
}

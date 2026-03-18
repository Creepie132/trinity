'use client'

import { useState, useEffect } from 'react'
import { WizardModal, WizardStep } from '@/components/ui/WizardModal'
import { Loader2, Receipt, Zap, MessageSquare, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

// ─── i18n ────────────────────────────────────────────────────────────────────
const I18N = {
  he: {
    title: 'קבלות WhatsApp אוטומטיות',
    step1: 'ספק', step2: 'טריגרים', step3: 'הודעה',
    cancel: 'ביטול', back: 'חזור', next: 'הבא', save: 'שמור',
    enableLabel: 'הפעל שליחת קבלות אוטומטית',
    providerLabel: 'ספק קבלות',
    providerNone: 'כבוי — אל תשלח קבלות',
    providerTranzila: 'Tranzila — יצירת קבלה דרך Tranzila',
    providerMorning: 'Morning — יצירת קבלה דרך Morning (בקרוב)',
    triggerTitle: 'מתי לשלוח?',
    triggerPayCreated: 'כשתשלום נוצר',
    triggerPayCompleted: 'כשתשלום מסומן כהושלם',
    templateTitle: 'תבנית הודעה',
    templateHint: 'משתנים זמינים: {{client_name}}, {{amount}}, {{document_num}}',
    preview: 'תצוגה מקדימה:',
    saving: 'שומר...',
    saved: 'הוגדר בהצלחה!',
    err: 'שגיאה בשמירה',
  },
  ru: {
    title: 'Авто-квитанции WhatsApp',
    step1: 'Провайдер', step2: 'Триггеры', step3: 'Сообщение',
    cancel: 'Отмена', back: 'Назад', next: 'Далее', save: 'Сохранить',
    enableLabel: 'Включить автоматическую отправку квитанций',
    providerLabel: 'Провайдер квитанций',
    providerNone: 'Выключено — не отправлять квитанции',
    providerTranzila: 'Tranzila — создание квитанции через Tranzila',
    providerMorning: 'Morning — создание квитанции через Morning (скоро)',
    triggerTitle: 'Когда отправлять?',
    triggerPayCreated: 'При создании платежа',
    triggerPayCompleted: 'Когда платёж отмечен как завершённый',
    templateTitle: 'Шаблон сообщения',
    templateHint: 'Доступные переменные: {{client_name}}, {{amount}}, {{document_num}}',
    preview: 'Предпросмотр:',
    saving: 'Сохранение...',
    saved: 'Настройки сохранены!',
    err: 'Ошибка сохранения',
  },
}

type Provider = 'tranzila' | 'morning' | 'none'
type TriggerEvent = 'payment_created' | 'payment_completed'

interface Props {
  open: boolean
  onClose: () => void
  orgId: string
  orgName: string
  lang?: 'he' | 'ru'
}

interface Settings {
  is_enabled: boolean
  provider: Provider
  trigger_events: TriggerEvent[]
  message_template: string
}

const DEFAULT_TEMPLATE =
  'שלום {{client_name}}, קיבלנו את תשלומך בסך {{amount}} ₪. מצורפת קבלה לתשלום. תודה!'

export function ReceiptSettingsModal({ open, onClose, orgId, orgName, lang = 'he' }: Props) {
  const s = I18N[lang]
  const dir = lang === 'he' ? 'rtl' : 'ltr'

  const [step, setStep]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [settings, setSettings] = useState<Settings>({
    is_enabled:       false,
    provider:         'none',
    trigger_events:   ['payment_created'],
    message_template: DEFAULT_TEMPLATE,
  })

  // Load existing settings when modal opens
  useEffect(() => {
    if (!open) { setStep(1); return }
    setLoading(true)
    fetch(`/api/admin/organizations/${orgId}/receipt-settings`)
      .then(r => r.json())
      .then(({ settings: data }) => {
        if (data) {
          setSettings({
            is_enabled:       Boolean(data.is_enabled),
            provider:         (data.provider as Provider) ?? 'none',
            trigger_events:   (data.trigger_events as TriggerEvent[]) ?? ['payment_created'],
            message_template: data.message_template ?? DEFAULT_TEMPLATE,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, orgId])

  async function handleSubmit() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/receipt-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'error')
      toast.success(s.saved)
      onClose()
    } catch (err: any) {
      toast.error(`${s.err}: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  function toggleTrigger(t: TriggerEvent) {
    setSettings(prev => ({
      ...prev,
      trigger_events: prev.trigger_events.includes(t)
        ? prev.trigger_events.filter(x => x !== t)
        : [...prev.trigger_events, t],
    }))
  }

  function renderPreview(template: string) {
    return template
      .replace('{{client_name}}', lang === 'he' ? 'ישראל ישראלי' : 'Иван Иванов')
      .replace('{{amount}}', '250.00')
      .replace('{{document_num}}', '12345')
  }

  const wizardSteps: WizardStep[] = [
    { label: s.step1, icon: Receipt },
    { label: s.step2, icon: Zap },
    { label: s.step3, icon: MessageSquare },
  ]

  const canProceed =
    step === 1 ? true :
    step === 2 ? settings.trigger_events.length > 0 :
    settings.message_template.trim().length > 0

  return (
    <WizardModal
      open={open}
      onClose={onClose}
      title={`${s.title} — ${orgName}`}
      logoBadge="Admin"
      steps={wizardSteps}
      currentStep={step}
      onNext={() => setStep(n => n + 1)}
      onBack={() => setStep(n => n - 1)}
      canProceed={canProceed}
      onSubmit={handleSubmit}
      isSubmitting={saving}
      submitLabel={s.save}
      cancelLabel={s.cancel}
      backLabel={s.back}
      nextLabel={s.next}
      dir={dir}
      size="lg"
    >
      {/* ── Step 1: Provider ── */}
      {step === 1 && (
        <div className="space-y-5">
          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          )}

          {/* Enable toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-sm font-medium text-gray-800">{s.enableLabel}</span>
            <button
              onClick={() => setSettings(prev => ({ ...prev, is_enabled: !prev.is_enabled }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.is_enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.is_enabled ? (dir === 'rtl' ? 'right-1' : 'left-7') : (dir === 'rtl' ? 'right-7' : 'left-1')}`} />
            </button>
          </div>

          {/* Provider selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{s.providerLabel}</label>
            {([ 
              { value: 'none',     label: s.providerNone,     disabled: false },
              { value: 'tranzila', label: s.providerTranzila, disabled: false },
              { value: 'morning',  label: s.providerMorning,  disabled: true  },
            ] as const).map(opt => (
              <button
                key={opt.value}
                disabled={opt.disabled}
                onClick={() => !opt.disabled && setSettings(prev => ({ ...prev, provider: opt.value }))}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm text-start transition-colors ${
                  settings.provider === opt.value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                    : opt.disabled
                    ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                  settings.provider === opt.value ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                }`} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Triggers ── */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-700">{s.triggerTitle}</p>
          {([
            { value: 'payment_created',   label: s.triggerPayCreated   },
            { value: 'payment_completed', label: s.triggerPayCompleted },
          ] as const).map(t => {
            const active = settings.trigger_events.includes(t.value)
            return (
              <button
                key={t.value}
                onClick={() => toggleTrigger(t.value)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border text-sm transition-colors ${
                  active ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <CheckCircle className={`w-5 h-5 flex-shrink-0 ${active ? 'text-indigo-500' : 'text-gray-300'}`} />
                {t.label}
              </button>
            )
          })}
          {settings.trigger_events.length === 0 && (
            <p className="text-xs text-red-500 text-center">
              {lang === 'he' ? 'יש לבחור לפחות טריגר אחד' : 'Выберите хотя бы один триггер'}
            </p>
          )}
        </div>
      )}

      {/* ── Step 3: Message Template ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">{s.templateTitle}</label>
            <p className="text-xs text-gray-500 mb-2">{s.templateHint}</p>
            <textarea
              value={settings.message_template}
              onChange={e => setSettings(prev => ({ ...prev, message_template: e.target.value }))}
              rows={5}
              dir={dir}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder={DEFAULT_TEMPLATE}
            />
          </div>

          {/* Preview */}
          {settings.message_template.trim() && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-500 mb-2">{s.preview}</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap" dir={dir}>
                {renderPreview(settings.message_template)}
              </p>
            </div>
          )}
        </div>
      )}
    </WizardModal>
  )
}

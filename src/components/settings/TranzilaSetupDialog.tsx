'use client'

/**
 * TranzilaSetupDialog
 *
 * Модалка для ввода учётных данных Tranzila — открывается при попытке
 * включить метод оплаты "Кредитная карта" без настроенного терминала.
 *
 * Использует WizardModal (2 шага):
 *   Шаг 1 — основные поля: terminal + password (обязательные)
 *   Шаг 2 — опциональные: token terminal + token password (для привязки карт)
 *
 * После успешного сохранения вызывает onSuccess() — страница
 * инвалидирует кэш и показывает карту как активную.
 */

import { useState } from 'react'
import { WizardModal, WizardStep } from '@/components/ui/WizardModal'
import { CreditCard, KeyRound, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { saveTranzilaCredentials } from '@/actions/payment-settings'

// ─── i18n ─────────────────────────────────────────────────────────────────────

const I18N = {
  he: {
    title:           'חיבור Tranzila',
    step1Label:      'פרטי טרמינל',
    step2Label:      'טרמינל טוקן (אופציונלי)',
    terminal:        'שם טרמינל',
    terminalPh:      'your_terminal_name',
    terminalHint:    'שם הטרמינל שסיפקה Tranzila עם פתיחת חשבון',
    password:        'סיסמת טרמינל',
    passwordPh:      '••••••••',
    passwordHint:    'הסיסמה לטרמינל — מוגדרת בלוח הבקרה של Tranzila',
    tokenTerminal:   'שם טרמינל לטוקניזציה',
    tokenTermPh:     'token_terminal',
    tokenTermHint:   'נדרש לשמירת פרטי כרטיס לחיובים עתידיים. ניתן להשאיר ריק.',
    tokenPassword:   'סיסמת טרמינל טוקן',
    tokenPwPh:       '••••••••',
    save:            'שמור וחבר',
    cancel:          'ביטול',
    back:            'חזרה',
    next:            'המשך',
    saved:           'Tranzila חוברה בהצלחה ✓',
    error:           'שגיאה בשמירה',
    infoTitle:       'מה זה Tranzila?',
    infoText:        'Tranzila הוא שירות עיבוד תשלומים ישראלי. לאחר החיבור תוכלו לקבל תשלומים בכרטיס אשראי ישירות דרך Trinity CRM.',
    whereToFind:     'איפה למצוא את הפרטים?',
    whereText:       'הפרטים נמצאים בלוח הבקרה שלכם ב-my.tranzila.com תחת הגדרות → טרמינל',
  },
  ru: {
    title:           'Подключение Tranzila',
    step1Label:      'Данные терминала',
    step2Label:      'Токен-терминал (необязательно)',
    terminal:        'Имя терминала',
    terminalPh:      'your_terminal_name',
    terminalHint:    'Имя терминала, выданное Tranzila при открытии аккаунта',
    password:        'Пароль терминала',
    passwordPh:      '••••••••',
    passwordHint:    'Пароль от терминала — устанавливается в панели управления Tranzila',
    tokenTerminal:   'Имя токен-терминала',
    tokenTermPh:     'token_terminal',
    tokenTermHint:   'Нужен для сохранения карты клиента для будущих списаний. Можно оставить пустым.',
    tokenPassword:   'Пароль токен-терминала',
    tokenPwPh:       '••••••••',
    save:            'Сохранить и подключить',
    cancel:          'Отмена',
    back:            'Назад',
    next:            'Далее',
    saved:           'Tranzila подключена ✓',
    error:           'Ошибка при сохранении',
    infoTitle:       'Что такое Tranzila?',
    infoText:        'Tranzila — израильский платёжный процессинг. После подключения вы сможете принимать оплату кредитной картой прямо в Trinity CRM.',
    whereToFind:     'Где найти данные?',
    whereText:       'Данные терминала находятся в вашем личном кабинете на my.tranzila.com в разделе Настройки → Терминал',
  },
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  locale: 'he' | 'ru'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TranzilaSetupDialog({ open, onClose, onSuccess, locale }: Props) {
  const s = I18N[locale]
  const dir = locale === 'he' ? 'rtl' : 'ltr'

  const [step, setStep]                   = useState(1)
  const [terminal, setTerminal]           = useState('')
  const [password, setPassword]           = useState('')
  const [tokenTerminal, setTokenTerminal] = useState('')
  const [tokenPassword, setTokenPassword] = useState('')
  const [showPw, setShowPw]               = useState(false)
  const [showTokenPw, setShowTokenPw]     = useState(false)
  const [saving, setSaving]               = useState(false)

  const steps: WizardStep[] = [
    { label: s.step1Label, icon: CreditCard },
    { label: s.step2Label, icon: ShieldCheck },
  ]

  function handleClose() {
    setStep(1)
    setTerminal('')
    setPassword('')
    setTokenTerminal('')
    setTokenPassword('')
    setShowPw(false)
    setShowTokenPw(false)
    onClose()
  }

  async function handleSubmit() {
    setSaving(true)
    try {
      const result = await saveTranzilaCredentials({
        tranzila_terminal:       terminal.trim(),
        tranzila_password:       password.trim(),
        tranzila_token_terminal: tokenTerminal.trim() || undefined,
        tranzila_token_password: tokenPassword.trim() || undefined,
      })
      if (!result.success) {
        toast.error('error' in result ? result.error : s.error)
        return
      }
      toast.success(s.saved)
      handleClose()
      onSuccess()
    } catch {
      toast.error(s.error)
    } finally {
      setSaving(false)
    }
  }

  const canStep1 = terminal.trim().length > 0 && password.trim().length > 0

  return (
    <WizardModal
      open={open}
      onClose={handleClose}
      title={s.title}
      logoLabel="Trinity CRM"
      headerIcon={<CreditCard />}
      steps={steps}
      currentStep={step}
      onNext={() => setStep(2)}
      onBack={() => setStep(1)}
      canProceed={step === 1 ? canStep1 : true}
      onSubmit={handleSubmit}
      isSubmitting={saving}
      submitLabel={s.save}
      cancelLabel={s.cancel}
      backLabel={s.back}
      nextLabel={s.next}
      dir={dir}
      size="md"
    >
      {step === 1 && <Step1 s={s} terminal={terminal} setTerminal={setTerminal}
        password={password} setPassword={setPassword}
        showPw={showPw} setShowPw={setShowPw} />}
      {step === 2 && <Step2 s={s} tokenTerminal={tokenTerminal} setTokenTerminal={setTokenTerminal}
        tokenPassword={tokenPassword} setTokenPassword={setTokenPassword}
        showTokenPw={showTokenPw} setShowTokenPw={setShowTokenPw} />}
    </WizardModal>
  )
}

// ─── Step sub-components ──────────────────────────────────────────────────────

interface Step1Props {
  s: typeof I18N['ru']
  terminal: string; setTerminal: (v: string) => void
  password: string; setPassword: (v: string) => void
  showPw: boolean;  setShowPw: (v: boolean) => void
}

function Step1({ s, terminal, setTerminal, password, setPassword, showPw, setShowPw }: Step1Props) {
  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
        <AlertCircle className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-indigo-700 mb-0.5">{s.infoTitle}</p>
          <p className="text-xs text-indigo-600 leading-relaxed">{s.infoText}</p>
        </div>
      </div>

      {/* Terminal name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{s.terminal}</label>
        <input
          type="text"
          value={terminal}
          onChange={e => setTerminal(e.target.value)}
          placeholder={s.terminalPh}
          autoComplete="off"
          dir="ltr"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 mt-1">{s.terminalHint}</p>
      </div>

      {/* Terminal password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{s.password}</label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={s.passwordPh}
            autoComplete="new-password"
            dir="ltr"
            className="w-full px-3 py-2.5 pe-10 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute top-1/2 -translate-y-1/2 end-3 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">{s.passwordHint}</p>
      </div>

      {/* Where to find */}
      <div className="flex gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
        <KeyRound className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-700 mb-0.5">{s.whereToFind}</p>
          <p className="text-xs text-amber-600 leading-relaxed">{s.whereText}</p>
        </div>
      </div>
    </div>
  )
}

interface Step2Props {
  s: typeof I18N['ru']
  tokenTerminal: string; setTokenTerminal: (v: string) => void
  tokenPassword: string; setTokenPassword: (v: string) => void
  showTokenPw: boolean;  setShowTokenPw: (v: boolean) => void
}

function Step2({ s, tokenTerminal, setTokenTerminal, tokenPassword, setTokenPassword, showTokenPw, setShowTokenPw }: Step2Props) {
  return (
    <div className="space-y-5">
      {/* Optional banner */}
      <div className="flex gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
        <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-700 leading-relaxed">{s.tokenTermHint}</p>
      </div>

      {/* Token terminal */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{s.tokenTerminal}</label>
        <input
          type="text"
          value={tokenTerminal}
          onChange={e => setTokenTerminal(e.target.value)}
          placeholder={s.tokenTermPh}
          autoComplete="off"
          dir="ltr"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        />
      </div>

      {/* Token password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{s.tokenPassword}</label>
        <div className="relative">
          <input
            type={showTokenPw ? 'text' : 'password'}
            value={tokenPassword}
            onChange={e => setTokenPassword(e.target.value)}
            placeholder={s.tokenPwPh}
            autoComplete="new-password"
            dir="ltr"
            className="w-full px-3 py-2.5 pe-10 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShowTokenPw(!showTokenPw)}
            className="absolute top-1/2 -translate-y-1/2 end-3 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showTokenPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

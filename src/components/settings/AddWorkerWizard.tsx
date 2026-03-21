'use client'

import { useState } from 'react'
import { WizardModal, type WizardStep } from '@/components/ui/WizardModal'
import { Switch } from '@/components/ui/switch'
import { Mail, User, Shield, CheckCircle2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

const I18N = {
  he: {
    title: 'הוספת עובד חדש',
    logoBadge: 'Admin',
    step1: 'פרטים',
    step2: 'הרשאות',
    step3: 'אישור',
    cancel: 'ביטול',
    back: 'חזרה',
    next: 'המשך',
    submit: 'הוסף עובד',
    emailLabel: 'כתובת אימייל',
    emailPlaceholder: 'worker@example.com',
    emailHint: 'העובד יקבל הזמנה לכתובת זו',
    nameLabel: 'שם מלא (אופציונלי)',
    namePlaceholder: 'ישראל ישראלי',
    roleLabel: 'תפקיד במערכת',
    roleUser: 'עובד',
    roleModerator: 'מנהל',
    roleUserDesc: 'גישה לעסקאות ולקוחות בלבד',
    roleModeratorDesc: 'גישה מורחבת לניהול',
    permTitle: 'הרשאות גישה',
    permSubtitle: 'ניתן לשנות בכל עת מהגדרות ההרשאות',
    permLabels: {
      can_manage_deals: 'ניהול עסקאות',
      can_view_all_clients: 'צפייה בכל הלקוחות',
      can_delete_deals: 'מחיקת עסקאות',
      can_view_reports: 'צפייה בדוחות',
      phone_mask_enabled: 'הסתרת מספרי טלפון',
    } as Record<PermKey, string>,
    permDescs: {
      can_manage_deals: 'יצירה, עריכה ועדכון עסקאות',
      can_view_all_clients: 'גישה לכל הלקוחות ולא רק למוקצים',
      can_delete_deals: 'מחיקת עסקאות מהמערכת לצמיתות',
      can_view_reports: 'גישה לדוחות ביצועים ואנליטיקה',
      phone_mask_enabled: 'מספרי טלפון יוצגו חלקית (XXX-XXXX)',
    } as Record<PermKey, string>,
    summaryTitle: 'סיכום',
    summaryEmail: 'אימייל',
    summaryName: 'שם',
    summaryRole: 'תפקיד',
    summaryPerms: 'הרשאות',
    summaryNote: 'העובד יקבל אימייל עם קישור להגדרת סיסמה וכניסה למערכת.',
    permNone: 'ללא הרשאות מיוחדות',
    errExists: 'האימייל כבר רשום במערכת. השתמש בלחצן "הזמן לפי אימייל" במקום.',
    errInOrg: 'המשתמש כבר חבר בארגון',
    errGeneral: 'שגיאה בהוספת העובד. נסה שנית.',
    successMsg: 'העובד נוסף בהצלחה! נשלח אימייל הזמנה.',
  },
  ru: {
    title: 'Добавить продажника',
    logoBadge: 'Admin',
    step1: 'Данные',
    step2: 'Права',
    step3: 'Итого',
    cancel: 'Отмена',
    back: 'Назад',
    next: 'Далее',
    submit: 'Добавить',
    emailLabel: 'Email',
    emailPlaceholder: 'worker@example.com',
    emailHint: 'Сотрудник получит приглашение на этот адрес',
    nameLabel: 'Полное имя (необязательно)',
    namePlaceholder: 'Иван Иванов',
    roleLabel: 'Роль в системе',
    roleUser: 'Сотрудник',
    roleModerator: 'Менеджер',
    roleUserDesc: 'Доступ к сделкам и клиентам',
    roleModeratorDesc: 'Расширенный доступ для управления',
    permTitle: 'Права доступа',
    permSubtitle: 'Можно изменить в любой момент в настройках прав',
    permLabels: {
      can_manage_deals: 'Управление сделками',
      can_view_all_clients: 'Все клиенты',
      can_delete_deals: 'Удаление сделок',
      can_view_reports: 'Отчёты и аналитика',
      phone_mask_enabled: 'Скрыть телефоны',
    } as Record<PermKey, string>,
    permDescs: {
      can_manage_deals: 'Создание, редактирование и закрытие сделок',
      can_view_all_clients: 'Доступ ко всем клиентам, не только назначенным',
      can_delete_deals: 'Удаление сделок из системы навсегда',
      can_view_reports: 'Аналитика и отчёты по продажам',
      phone_mask_enabled: 'Телефоны показываются частично (XXX-XXXX)',
    } as Record<PermKey, string>,
    summaryTitle: 'Сводка',
    summaryEmail: 'Email',
    summaryName: 'Имя',
    summaryRole: 'Роль',
    summaryPerms: 'Права',
    summaryNote: 'Сотрудник получит письмо с приглашением для создания пароля и входа в систему.',
    permNone: 'Без дополнительных прав',
    errExists: 'Email уже зарегистрирован. Используйте кнопку "Пригласить по email" вместо этого.',
    errInOrg: 'Пользователь уже в организации',
    errGeneral: 'Ошибка при добавлении сотрудника. Попробуйте снова.',
    successMsg: 'Сотрудник добавлен! Приглашение отправлено на email.',
  },
} as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Lang = 'he' | 'ru'

type PermKey =
  | 'can_manage_deals'
  | 'can_view_all_clients'
  | 'can_delete_deals'
  | 'can_view_reports'
  | 'phone_mask_enabled'

const PERM_KEYS: PermKey[] = [
  'can_manage_deals',
  'can_view_all_clients',
  'can_delete_deals',
  'can_view_reports',
  'phone_mask_enabled',
]

interface AddWorkerWizardProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  lang: Lang
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AddWorkerWizard({
  open,
  onClose,
  onSuccess,
  lang,
}: AddWorkerWizardProps) {
  const s = I18N[lang]
  const dir = lang === 'he' ? 'rtl' : 'ltr'

  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'user' | 'moderator'>('user')
  const [permissions, setPermissions] = useState<Record<PermKey, boolean>>({
    can_manage_deals: true,
    can_view_all_clients: false,
    can_delete_deals: false,
    can_view_reports: false,
    phone_mask_enabled: false,
  })

  // ---------------------------------------------------------------------------
  // WizardModal steps definition
  // ---------------------------------------------------------------------------

  const steps: WizardStep[] = [
    { label: s.step1, icon: User },
    { label: s.step2, icon: Shield },
    { label: s.step3, icon: CheckCircle2 },
  ]

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canProceed = step === 1 ? emailValid : true

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function resetAndClose() {
    if (isSubmitting) return
    setStep(1)
    setEmail('')
    setFullName('')
    setRole('user')
    setPermissions({
      can_manage_deals: true,
      can_view_all_clients: false,
      can_delete_deals: false,
      can_view_reports: false,
      phone_mask_enabled: false,
    })
    onClose()
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim() || undefined,
          role,
          permissions,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'email_exists') {
          toast.error(s.errExists)
        } else if (data.error === 'already_in_org') {
          toast.error(s.errInOrg)
        } else {
          toast.error(data.message || s.errGeneral)
        }
        return
      }

      toast.success(s.successMsg)
      onSuccess()
      resetAndClose()
    } catch {
      toast.error(s.errGeneral)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const enabledPermKeys = PERM_KEYS.filter((k) => permissions[k])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <WizardModal
      open={open}
      onClose={resetAndClose}
      title={s.title}
      logoLabel="Trinity CRM"
      logoBadge={s.logoBadge}
      steps={steps}
      currentStep={step}
      onNext={() => setStep((n) => n + 1)}
      onBack={() => setStep((n) => n - 1)}
      canProceed={canProceed}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel={s.submit}
      cancelLabel={s.cancel}
      backLabel={s.back}
      nextLabel={s.next}
      dir={dir}
      size="md"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Step 1: Basic info                                                   */}
      {/* ------------------------------------------------------------------ */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Email */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">
              {s.emailLabel} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                autoFocus
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && emailValid && setStep(2)}
                placeholder={s.emailPlaceholder}
                dir="ltr"
                className="w-full border border-gray-300 dark:border-slate-600 rounded-xl ps-9 pe-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{s.emailHint}</p>
          </div>

          {/* Full name */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">
              {s.nameLabel}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={s.namePlaceholder}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>

          {/* Role */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
              {s.roleLabel}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['user', 'moderator'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    'text-start p-3 rounded-xl border-2 transition-all',
                    role === r
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500',
                  )}
                >
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      role === r
                        ? 'text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-700 dark:text-gray-300',
                    )}
                  >
                    {r === 'user' ? s.roleUser : s.roleModerator}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {r === 'user' ? s.roleUserDesc : s.roleModeratorDesc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 2: Permissions                                                  */}
      {/* ------------------------------------------------------------------ */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{s.permSubtitle}</p>
          {PERM_KEYS.map((key) => (
            <div
              key={key}
              className={cn(
                'flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors cursor-pointer',
                permissions[key]
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/50'
                  : 'bg-gray-50 dark:bg-slate-700/40 border border-transparent',
              )}
              onClick={() =>
                setPermissions((p) => ({ ...p, [key]: !p[key] }))
              }
            >
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    permissions[key]
                      ? 'text-indigo-800 dark:text-indigo-200'
                      : 'text-gray-800 dark:text-gray-200',
                  )}
                >
                  {s.permLabels[key]}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                  {s.permDescs[key]}
                </p>
              </div>
              {/* Switch wraps in a non-clickable span to prevent double-toggle */}
              <span
                onClick={(e) => e.stopPropagation()}
              >
                <Switch
                  checked={permissions[key]}
                  onCheckedChange={(checked) =>
                    setPermissions((p) => ({ ...p, [key]: checked }))
                  }
                  className={cn(
                    permissions[key]
                      ? 'data-[state=checked]:bg-indigo-600'
                      : '',
                  )}
                />
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 3: Summary + confirmation                                       */}
      {/* ------------------------------------------------------------------ */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-slate-700/40 rounded-2xl p-4 space-y-3">
            <SummaryRow label={s.summaryEmail} value={email} mono />
            {fullName && <SummaryRow label={s.summaryName} value={fullName} />}
            <SummaryRow
              label={s.summaryRole}
              value={role === 'user' ? s.roleUser : s.roleModerator}
            />
            <div className="flex gap-3 pt-1 border-t border-gray-200 dark:border-slate-600">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-20 flex-shrink-0 pt-0.5">
                {s.summaryPerms}
              </span>
              <div className="flex flex-wrap gap-1.5 flex-1">
                {enabledPermKeys.length === 0 ? (
                  <span className="text-sm text-gray-400 dark:text-gray-500">
                    {s.permNone}
                  </span>
                ) : (
                  enabledPermKeys.map((k) => (
                    <span
                      key={k}
                      className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-medium"
                    >
                      {s.permLabels[k]}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl px-3.5 py-3">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              {s.summaryNote}
            </p>
          </div>
        </div>
      )}
    </WizardModal>
  )
}

// ---------------------------------------------------------------------------
// Helper: summary row
// ---------------------------------------------------------------------------

function SummaryRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex gap-3">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-20 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span
        className={cn(
          'text-sm text-gray-800 dark:text-white break-all',
          mono && 'font-mono text-xs pt-0.5',
        )}
      >
        {value}
      </span>
    </div>
  )
}

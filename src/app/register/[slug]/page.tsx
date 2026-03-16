'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Check, User, Phone, Mail, Calendar, AlertCircle } from 'lucide-react'

type Language = 'he' | 'ru' | 'en'

const T = {
  he: {
    title: 'הרשמה',
    subtitle: 'הצטרפו אלינו — מלאו את הפרטים ונוסיף אתכם למערכת',
    firstName: 'שם פרטי',
    lastName: 'שם משפחה',
    phone: 'טלפון',
    phonePlaceholder: '05X-XXX-XXXX',
    email: 'אימייל',
    dob: 'תאריך לידה',
    consent: 'קראתי ומסכים/ה ל',
    privacyPolicy: 'תנאי השימוש ומדיניות הפרטיות',
    consentSuffix: ', כולל קבלת עדכונים ופרסומים',
    submit: 'השלמת הרשמה',
    success: '!נרשמת בהצלחה',
    successMsg: 'פרטיך נשמרו במערכת. נשמח לראותך בקרוב!',
    alreadyRegistered: 'מספר הטלפון הזה כבר רשום במערכת',
    error: 'אירעה שגיאה. אנא נסה שוב.',
    disabled: 'ההרשמה העצמית אינה פעילה כרגע',
    notFound: 'הקישור אינו תקין',
    loading: 'טוען...',
    required: 'שדה חובה',
    invalidPhone: 'מספר טלפון לא תקין (לדוגמה: 050-123-4567)',
    invalidEmail: 'כתובת אימייל לא תקינה',
    mustConsent: 'יש לאשר את תנאי השימוש',
    dir: 'rtl',
  },
  ru: {
    title: 'Регистрация',
    subtitle: 'Заполните форму — мы добавим вас в нашу базу',
    firstName: 'Имя',
    lastName: 'Фамилия',
    phone: 'Телефон',
    phonePlaceholder: '05X-XXX-XXXX',
    email: 'Email',
    dob: 'Дата рождения',
    consent: 'Я прочитал(а) и согласен(на) с ',
    privacyPolicy: 'условиями использования и политикой конфиденциальности',
    consentSuffix: ', включая получение рекламных сообщений',
    submit: 'Завершить регистрацию',
    success: 'Регистрация прошла успешно!',
    successMsg: 'Ваши данные сохранены. Ждём вас!',
    alreadyRegistered: 'Этот номер телефона уже зарегистрирован',
    error: 'Произошла ошибка. Попробуйте ещё раз.',
    disabled: 'Самостоятельная регистрация временно недоступна',
    notFound: 'Ссылка недействительна',
    loading: 'Загрузка...',
    required: 'Обязательное поле',
    invalidPhone: 'Неверный номер телефона (например: 050-123-4567)',
    invalidEmail: 'Неверный адрес email',
    mustConsent: 'Необходимо принять условия использования',
    dir: 'ltr',
  },
  en: {
    title: 'Sign Up',
    subtitle: 'Fill in your details and we\'ll add you to our system',
    firstName: 'First Name',
    lastName: 'Last Name',
    phone: 'Phone',
    phonePlaceholder: '05X-XXX-XXXX',
    email: 'Email',
    dob: 'Date of Birth',
    consent: 'I have read and agree to the ',
    privacyPolicy: 'terms of service and privacy policy',
    consentSuffix: ', including receiving promotional messages',
    submit: 'Complete Registration',
    success: 'Registration Successful!',
    successMsg: 'Your details have been saved. See you soon!',
    alreadyRegistered: 'This phone number is already registered',
    error: 'Something went wrong. Please try again.',
    disabled: 'Self-registration is not currently available',
    notFound: 'This link is not valid',
    loading: 'Loading...',
    required: 'Required field',
    invalidPhone: 'Invalid phone number (e.g. 050-123-4567)',
    invalidEmail: 'Invalid email address',
    mustConsent: 'You must accept the terms',
    dir: 'ltr',
  },
} as const

interface OrgInfo {
  name: string
  logo_url: string | null
  privacy_policy_url: string | null
}

interface FormData {
  first_name: string
  last_name: string
  phone: string
  email: string
  date_of_birth: string
  consent: boolean
}

interface FieldErrors {
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
  date_of_birth?: string
  consent?: string
}

function detectLanguage(): Language {
  if (typeof navigator === 'undefined') return 'he'
  const lang = navigator.language.toLowerCase()
  if (lang.startsWith('he')) return 'he'
  if (lang.startsWith('ru')) return 'ru'
  return 'en'
}

function isValidIsraeliPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-().+]/g, '')
  return /^(05\d{8}|972\d{9}|9725\d{8})$/.test(cleaned)
}

export default function RegisterPage() {
  const params = useParams()
  const slug = params.slug as string

  const [lang, setLang] = useState<Language>('he')
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null)
  const [pageState, setPageState] = useState<'loading' | 'ready' | 'disabled' | 'notFound' | 'success'>('loading')
  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const [form, setForm] = useState<FormData>({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    consent: false,
  })

  const t = T[lang]

  useEffect(() => {
    setLang(detectLanguage())
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/register/${slug}/info`)
        if (res.status === 404) { setPageState('notFound'); return }
        if (res.status === 403) { setPageState('disabled'); return }
        if (!res.ok) { setPageState('notFound'); return }
        const data = await res.json()
        setOrgInfo(data)
        setPageState('ready')
      } catch {
        setPageState('notFound')
      }
    }
    load()
  }, [slug])

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFieldErrors(prev => ({ ...prev, [field]: undefined }))
    setGlobalError('')
  }

  const validate = (): boolean => {
    const errors: FieldErrors = {}
    if (!form.first_name.trim()) errors.first_name = t.required
    if (!form.last_name.trim()) errors.last_name = t.required
    if (!form.phone.trim()) {
      errors.phone = t.required
    } else if (!isValidIsraeliPhone(form.phone)) {
      errors.phone = t.invalidPhone
    }
    if (!form.email.trim()) {
      errors.email = t.required
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = t.invalidEmail
    }
    if (!form.date_of_birth) errors.date_of_birth = t.required
    if (!form.consent) errors.consent = t.mustConsent
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    setGlobalError('')
    try {
      const res = await fetch(`/api/register/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.status === 409) {
        setFieldErrors(prev => ({ ...prev, phone: t.alreadyRegistered }))
        return
      }
      if (!res.ok) {
        setGlobalError(data.error || t.error)
        return
      }
      setPageState('success')
    } catch {
      setGlobalError(t.error)
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Screens ──────────────────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-white">
        <div className="text-xl text-gray-500 animate-pulse">{T[lang].loading}</div>
      </div>
    )
  }

  if (pageState === 'notFound' || pageState === 'disabled') {
    const msg = pageState === 'disabled' ? t.disabled : t.notFound
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-amber-50 to-white">
        <div className="text-5xl mb-4">🚫</div>
        <p className="text-xl text-gray-700 text-center max-w-sm">{msg}</p>
      </div>
    )
  }

  if (pageState === 'success') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-amber-50 to-white"
        dir={t.dir}
      >
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <Check className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{t.success}</h1>
        <p className="text-lg text-gray-600 text-center max-w-sm">{t.successMsg}</p>
        {orgInfo?.name && (
          <p className="mt-4 text-amber-600 font-semibold text-lg">{orgInfo.name}</p>
        )}
      </div>
    )
  }

  // ─── Main Form ────────────────────────────────────────────────────────────
  const dir = t.dir
  const textAlign = dir === 'rtl' ? 'text-right' : 'text-left'

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-white py-8 px-4" dir={dir}>
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className={`mb-8 ${textAlign}`}>
          {orgInfo?.logo_url && (
            <img src={orgInfo.logo_url} alt="" className="h-14 mb-4 object-contain" />
          )}
          <h1 className="text-3xl font-bold text-gray-900">{orgInfo?.name}</h1>
          <p className="text-lg text-gray-600 mt-1">{t.title}</p>
          <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>

          {/* Language switcher */}
          <div className="flex gap-2 mt-3">
            {(['he', 'ru', 'en'] as Language[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                  lang === l ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-5">

          {/* First name + Last name */}
          <div className="grid grid-cols-2 gap-4">
            <Field
              icon={<User className="w-4 h-4" />}
              label={t.firstName}
              error={fieldErrors.first_name}
              dir={dir}
            >
              <input
                type="text"
                value={form.first_name}
                onChange={e => updateField('first_name', e.target.value)}
                className={inputCls(!!fieldErrors.first_name)}
                dir={dir}
              />
            </Field>
            <Field label={t.lastName} error={fieldErrors.last_name} dir={dir}>
              <input
                type="text"
                value={form.last_name}
                onChange={e => updateField('last_name', e.target.value)}
                className={inputCls(!!fieldErrors.last_name)}
                dir={dir}
              />
            </Field>
          </div>

          {/* Phone */}
          <Field
            icon={<Phone className="w-4 h-4" />}
            label={t.phone}
            error={fieldErrors.phone}
            dir={dir}
          >
            <input
              type="tel"
              value={form.phone}
              onChange={e => updateField('phone', e.target.value)}
              placeholder={t.phonePlaceholder}
              className={inputCls(!!fieldErrors.phone)}
              dir="ltr"
            />
          </Field>

          {/* Email */}
          <Field
            icon={<Mail className="w-4 h-4" />}
            label={t.email}
            error={fieldErrors.email}
            dir={dir}
          >
            <input
              type="email"
              value={form.email}
              onChange={e => updateField('email', e.target.value)}
              className={inputCls(!!fieldErrors.email)}
              dir="ltr"
            />
          </Field>

          {/* Date of birth */}
          <Field
            icon={<Calendar className="w-4 h-4" />}
            label={t.dob}
            error={fieldErrors.date_of_birth}
            dir={dir}
          >
            <input
              type="date"
              value={form.date_of_birth}
              onChange={e => updateField('date_of_birth', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className={inputCls(!!fieldErrors.date_of_birth)}
              dir="ltr"
            />
          </Field>

          {/* Consent checkbox */}
          <div className={`flex items-start gap-3 pt-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <input
              type="checkbox"
              id="consent"
              checked={form.consent}
              onChange={e => updateField('consent', e.target.checked)}
              className="mt-1 h-5 w-5 accent-amber-500 cursor-pointer flex-shrink-0"
            />
            <label htmlFor="consent" className={`text-sm text-gray-700 cursor-pointer ${textAlign}`}>
              {t.consent}
              {orgInfo?.privacy_policy_url ? (
                <a
                  href={orgInfo.privacy_policy_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 underline hover:text-amber-700 mx-1"
                >
                  {t.privacyPolicy}
                </a>
              ) : (
                <span className="text-amber-600 mx-1">{t.privacyPolicy}</span>
              )}
              {t.consentSuffix}
            </label>
          </div>
          {fieldErrors.consent && (
            <p className={`text-red-500 text-sm flex items-center gap-1 ${textAlign}`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {fieldErrors.consent}
            </p>
          )}

          {/* Global error */}
          {globalError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {globalError}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            {t.submit}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Helper components ────────────────────────────────────────────────────

function inputCls(hasError: boolean) {
  return `w-full px-3 py-2.5 border-2 rounded-lg text-base transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 ${
    hasError
      ? 'border-red-400 bg-red-50'
      : 'border-gray-200 bg-white hover:border-amber-300 focus:border-amber-500'
  }`
}

function Field({
  label,
  icon,
  error,
  dir,
  children,
}: {
  label: string
  icon?: React.ReactNode
  error?: string
  dir: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className={`flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5 ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
        {icon && <span className="text-amber-500">{icon}</span>}
        {label}
      </label>
      {children}
      {error && (
        <p className={`mt-1 text-red-500 text-xs flex items-center gap-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

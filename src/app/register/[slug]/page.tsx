'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Check, User, Phone, Mail, Calendar, AlertCircle, ArrowRight, Edit3 } from 'lucide-react'

type Language = 'he' | 'ru' | 'en'
type Step = 'phone' | 'found' | 'register' | 'success'

const T = {
  he: {
    title: 'פורטל לקוחות',
    enterPhone: 'הכנס את מספר הטלפון שלך',
    enterPhoneDesc: 'נבדוק אם אתה כבר רשום במערכת',
    phonePlaceholder: '05X-XXX-XXXX',
    checkPhone: 'המשך',
    checking: 'בודק...',
    foundTitle: 'שלום',
    foundDesc: 'מצאנו את הפרטים שלך. תוכל לעדכן אותם:',
    firstName: 'שם פרטי',
    lastName: 'שם משפחה',
    phone: 'טלפון',
    email: 'אימייל',
    dob: 'תאריך לידה',
    saveChanges: 'שמור שינויים',
    saving: 'שומר...',
    notYou: 'זה לא אני — הירשם כמשתמש חדש',
    registerTitle: 'הרשמה',
    subtitle: 'הצטרפו אלינו — מלאו את הפרטים ונוסיף אתכם למערכת',
    consent: 'קראתי ומסכים/ה ל',
    privacyPolicy: 'תנאי השימוש ומדיניות הפרטיות',
    consentSuffix: ', כולל קבלת עדכונים ופרסומים',
    submit: 'השלמת הרשמה',
    successTitle: 'הצלחה!',
    successRegMsg: 'פרטיך נשמרו במערכת. נשמח לראותך בקרוב!',
    successUpdateMsg: 'הפרטים שלך עודכנו בהצלחה!',
    alreadyRegistered: 'מספר הטלפון הזה כבר רשום במערכת',
    error: 'אירעה שגיאה. אנא נסה שוב.',
    disabled: 'ההרשמה העצמית אינה פעילה כרגע',
    notFound: 'הקישור אינו תקין',
    loading: 'טוען...',
    required: 'שדה חובה',
    invalidPhone: 'מספר טלפון לא תקין (לדוגמה: 050-123-4567)',
    invalidEmail: 'כתובת אימייל לא תקינה',
    mustConsent: 'יש לאשר את תנאי השימוש',
    dir: 'rtl' as const,
  },
  ru: {
    title: 'Портал клиентов',
    enterPhone: 'Введите ваш номер телефона',
    enterPhoneDesc: 'Проверим, есть ли вы уже в нашей базе',
    phonePlaceholder: '05X-XXX-XXXX',
    checkPhone: 'Продолжить',
    checking: 'Проверяем...',
    foundTitle: 'Привет',
    foundDesc: 'Мы нашли ваши данные. Вы можете их обновить:',
    firstName: 'Имя',
    lastName: 'Фамилия',
    phone: 'Телефон',
    email: 'Email',
    dob: 'Дата рождения',
    saveChanges: 'Сохранить изменения',
    saving: 'Сохраняем...',
    notYou: 'Это не я — зарегистрироваться как новый',
    registerTitle: 'Регистрация',
    subtitle: 'Заполните форму — мы добавим вас в нашу базу',
    consent: 'Я прочитал(а) и согласен(на) с ',
    privacyPolicy: 'условиями использования и политикой конфиденциальности',
    consentSuffix: ', включая получение рекламных сообщений',
    submit: 'Завершить регистрацию',
    successTitle: 'Готово!',
    successRegMsg: 'Ваши данные сохранены. Ждём вас!',
    successUpdateMsg: 'Ваши данные успешно обновлены!',
    alreadyRegistered: 'Этот номер телефона уже зарегистрирован',
    error: 'Произошла ошибка. Попробуйте ещё раз.',
    disabled: 'Самостоятельная регистрация временно недоступна',
    notFound: 'Ссылка недействительна',
    loading: 'Загрузка...',
    required: 'Обязательное поле',
    invalidPhone: 'Неверный номер телефона (например: 050-123-4567)',
    invalidEmail: 'Неверный адрес email',
    mustConsent: 'Необходимо принять условия использования',
    dir: 'ltr' as const,
  },
  en: {
    title: 'Client Portal',
    enterPhone: 'Enter your phone number',
    enterPhoneDesc: 'We\'ll check if you\'re already in our system',
    phonePlaceholder: '05X-XXX-XXXX',
    checkPhone: 'Continue',
    checking: 'Checking...',
    foundTitle: 'Hello',
    foundDesc: 'We found your details. You can update them:',
    firstName: 'First Name',
    lastName: 'Last Name',
    phone: 'Phone',
    email: 'Email',
    dob: 'Date of Birth',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    notYou: 'Not me — register as new',
    registerTitle: 'Sign Up',
    subtitle: 'Fill in your details and we\'ll add you to our system',
    consent: 'I have read and agree to the ',
    privacyPolicy: 'terms of service and privacy policy',
    consentSuffix: ', including receiving promotional messages',
    submit: 'Complete Registration',
    successTitle: 'Success!',
    successRegMsg: 'Your details have been saved. See you soon!',
    successUpdateMsg: 'Your details have been updated successfully!',
    alreadyRegistered: 'This phone number is already registered',
    error: 'Something went wrong. Please try again.',
    disabled: 'Self-registration is not currently available',
    notFound: 'This link is not valid',
    loading: 'Loading...',
    required: 'Required field',
    invalidPhone: 'Invalid phone number (e.g. 050-123-4567)',
    invalidEmail: 'Invalid email address',
    mustConsent: 'You must accept the terms',
    dir: 'ltr' as const,
  },
} as const

interface OrgInfo {
  name: string
  logo_url: string | null
  privacy_policy_url: string | null
}

interface ClientData {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string
  date_of_birth: string
}

interface RegisterForm {
  first_name: string
  last_name: string
  phone: string
  email: string
  date_of_birth: string
  consent: boolean
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

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, '')
}

function inputCls(hasError: boolean) {
  return `w-full px-3 py-2.5 border-2 rounded-lg text-base transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 ${
    hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-amber-300 focus:border-amber-500'
  }`
}

function Field({ label, icon, error, dir, children }: {
  label: string; icon?: React.ReactNode; error?: string; dir: string; children: React.ReactNode
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
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
        </p>
      )}
    </div>
  )
}

export default function RegisterPage() {
  const params = useParams()
  const slug = params.slug as string

  const [lang, setLang] = useState<Language>('he')
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null)
  const [pageState, setPageState] = useState<'loading' | 'ready' | 'disabled' | 'notFound'>('loading')
  const [step, setStep] = useState<Step>('phone')
  const [successType, setSuccessType] = useState<'register' | 'update'>('register')

  // Phone step
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [checking, setChecking] = useState(false)

  // Found client
  const [foundClient, setFoundClient] = useState<ClientData | null>(null)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', date_of_birth: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Register form
  const [regForm, setRegForm] = useState<RegisterForm>({
    first_name: '', last_name: '', phone: '', email: '', date_of_birth: '', consent: false,
  })
  const [regErrors, setRegErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState('')

  const t = T[lang]
  const dir = t.dir

  useEffect(() => { setLang(detectLanguage()) }, [])

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
      } catch { setPageState('notFound') }
    }
    load()
  }, [slug])

  // ── Step 1: check phone ──────────────────────────────────────────────────
  const handleCheckPhone = async () => {
    setPhoneError('')
    if (!phone.trim()) { setPhoneError(t.required); return }
    if (!isValidIsraeliPhone(phone)) { setPhoneError(t.invalidPhone); return }
    setChecking(true)
    try {
      const res = await fetch(`/api/register/${slug}/lookup?phone=${encodeURIComponent(normalizePhone(phone))}`)
      const data = await res.json()
      if (data.found && data.client) {
        setFoundClient(data.client)
        setEditForm({
          first_name: data.client.first_name || '',
          last_name: data.client.last_name || '',
          email: data.client.email || '',
          date_of_birth: data.client.date_of_birth || '',
        })
        setStep('found')
      } else {
        setRegForm(prev => ({ ...prev, phone }))
        setStep('register')
      }
    } catch { setPhoneError(t.error) }
    finally { setChecking(false) }
  }

  // ── Step 2a: save existing client ────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!foundClient) return
    setSaving(true); setSaveError('')
    try {
      const res = await fetch(`/api/register/${slug}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: foundClient.id, ...editForm }),
      })
      if (!res.ok) { setSaveError(t.error); return }
      setSuccessType('update')
      setStep('success')
    } catch { setSaveError(t.error) }
    finally { setSaving(false) }
  }

  // ── Step 2b: register new client ─────────────────────────────────────────
  const validateReg = (): boolean => {
    const errors: any = {}
    if (!regForm.first_name.trim()) errors.first_name = t.required
    if (!regForm.phone.trim()) errors.phone = t.required
    else if (!isValidIsraeliPhone(regForm.phone)) errors.phone = t.invalidPhone
    if (!regForm.email.trim()) errors.email = t.required
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regForm.email)) errors.email = t.invalidEmail
    if (!regForm.date_of_birth) errors.date_of_birth = t.required
    if (!regForm.consent) errors.consent = t.mustConsent
    setRegErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleRegister = async () => {
    if (!validateReg()) return
    setSubmitting(true); setGlobalError('')
    try {
      const res = await fetch(`/api/register/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm),
      })
      const data = await res.json()
      if (res.status === 409) { setRegErrors(prev => ({ ...prev, phone: t.alreadyRegistered })); return }
      if (!res.ok) { setGlobalError(data.error || t.error); return }
      setSuccessType('register')
      setStep('success')
    } catch { setGlobalError(t.error) }
    finally { setSubmitting(false) }
  }

  // ── Static screens ───────────────────────────────────────────────────────
  if (pageState === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-white">
      <div className="text-xl text-gray-500 animate-pulse">{t.loading}</div>
    </div>
  )

  if (pageState === 'notFound' || pageState === 'disabled') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-amber-50 to-white">
      <div className="text-5xl mb-4">🚫</div>
      <p className="text-xl text-gray-700 text-center max-w-sm">
        {pageState === 'disabled' ? t.disabled : t.notFound}
      </p>
    </div>
  )

  if (step === 'success') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-amber-50 to-white" dir={dir}>
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
        <Check className="w-12 h-12 text-green-600" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">{t.successTitle}</h1>
      <p className="text-lg text-gray-600 text-center max-w-sm">
        {successType === 'update' ? t.successUpdateMsg : t.successRegMsg}
      </p>
      {orgInfo?.name && <p className="mt-4 text-amber-600 font-semibold text-lg">{orgInfo.name}</p>}
    </div>
  )

  // ── Header (shared) ──────────────────────────────────────────────────────
  const textAlign = dir === 'rtl' ? 'text-right' : 'text-left'
  const Header = () => (
    <div className={`mb-8 ${textAlign}`}>
      {orgInfo?.logo_url && <img src={orgInfo.logo_url} alt="" className="h-14 mb-4 object-contain" />}
      <h1 className="text-3xl font-bold text-gray-900">{orgInfo?.name}</h1>
      <p className="text-lg text-gray-600 mt-1">{t.title}</p>
      <div className="flex gap-2 mt-3">
        {(['he', 'ru', 'en'] as Language[]).map(l => (
          <button key={l} onClick={() => setLang(l)}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${lang === l ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-white py-8 px-4" dir={dir}>
      <div className="max-w-md mx-auto">
        <Header />

        {/* ── STEP: phone ──────────────────────────────────────────────── */}
        {step === 'phone' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
            <div className={textAlign}>
              <h2 className="text-xl font-bold text-gray-900">{t.enterPhone}</h2>
              <p className="text-sm text-gray-500 mt-1">{t.enterPhoneDesc}</p>
            </div>
            <Field icon={<Phone className="w-4 h-4" />} label={t.phone} error={phoneError} dir={dir}>
              <input
                type="tel" value={phone} placeholder={t.phonePlaceholder} dir="ltr"
                className={inputCls(!!phoneError)}
                onChange={e => { setPhone(e.target.value); setPhoneError('') }}
                onKeyDown={e => e.key === 'Enter' && handleCheckPhone()}
              />
            </Field>
            <button onClick={handleCheckPhone} disabled={checking}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold text-lg rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
              {checking
                ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                : <ArrowRight className="w-5 h-5" />}
              {checking ? t.checking : t.checkPhone}
            </button>
          </div>
        )}

        {/* ── STEP: found — edit existing client ───────────────────────── */}
        {step === 'found' && foundClient && (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
            <div className={textAlign}>
              <div className="flex items-center gap-2 mb-1">
                <Edit3 className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-bold text-gray-900">
                  {t.foundTitle}, {foundClient.first_name}!
                </h2>
              </div>
              <p className="text-sm text-gray-500">{t.foundDesc}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field icon={<User className="w-4 h-4" />} label={t.firstName} dir={dir}>
                <input type="text" value={editForm.first_name} dir={dir}
                  className={inputCls(false)}
                  onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))} />
              </Field>
              <Field label={t.lastName} dir={dir}>
                <input type="text" value={editForm.last_name} dir={dir}
                  className={inputCls(false)}
                  onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))} />
              </Field>
            </div>

            <Field icon={<Phone className="w-4 h-4" />} label={t.phone} dir={dir}>
              <input type="tel" value={foundClient.phone} disabled dir="ltr"
                className="w-full px-3 py-2.5 border-2 border-gray-100 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed" />
            </Field>

            <Field icon={<Mail className="w-4 h-4" />} label={t.email} dir={dir}>
              <input type="email" value={editForm.email} dir="ltr"
                className={inputCls(false)}
                onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
            </Field>

            <Field icon={<Calendar className="w-4 h-4" />} label={t.dob} dir={dir}>
              <input type="date" value={editForm.date_of_birth} dir="ltr"
                max={new Date().toISOString().split('T')[0]}
                className={inputCls(false)}
                onChange={e => setEditForm(p => ({ ...p, date_of_birth: e.target.value }))} />
            </Field>

            {saveError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{saveError}
              </div>
            )}

            <button onClick={handleSaveEdit} disabled={saving}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold text-lg rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
              {saving ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <Check className="w-5 h-5" />}
              {saving ? t.saving : t.saveChanges}
            </button>

            <button onClick={() => { setRegForm(p => ({ ...p, phone })); setStep('register') }}
              className="w-full py-2 text-sm text-gray-500 hover:text-amber-600 transition-colors underline">
              {t.notYou}
            </button>
          </div>
        )}

        {/* ── STEP: register — new client ───────────────────────────────── */}
        {step === 'register' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
            <div className={textAlign}>
              <h2 className="text-xl font-bold text-gray-900">{t.registerTitle}</h2>
              <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field icon={<User className="w-4 h-4" />} label={t.firstName} error={regErrors.first_name as string} dir={dir}>
                <input type="text" value={regForm.first_name} dir={dir}
                  className={inputCls(!!regErrors.first_name)}
                  onChange={e => setRegForm(p => ({ ...p, first_name: e.target.value }))} />
              </Field>
              <Field label={t.lastName} dir={dir}>
                <input type="text" value={regForm.last_name} dir={dir}
                  className={inputCls(false)}
                  onChange={e => setRegForm(p => ({ ...p, last_name: e.target.value }))} />
              </Field>
            </div>

            <Field icon={<Phone className="w-4 h-4" />} label={t.phone} error={regErrors.phone as string} dir={dir}>
              <input type="tel" value={regForm.phone} placeholder={t.phonePlaceholder} dir="ltr"
                className={inputCls(!!regErrors.phone)}
                onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))} />
            </Field>

            <Field icon={<Mail className="w-4 h-4" />} label={t.email} error={regErrors.email as string} dir={dir}>
              <input type="email" value={regForm.email} dir="ltr"
                className={inputCls(!!regErrors.email)}
                onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} />
            </Field>

            <Field icon={<Calendar className="w-4 h-4" />} label={t.dob} error={regErrors.date_of_birth as string} dir={dir}>
              <input type="date" value={regForm.date_of_birth} dir="ltr"
                max={new Date().toISOString().split('T')[0]}
                className={inputCls(!!regErrors.date_of_birth)}
                onChange={e => setRegForm(p => ({ ...p, date_of_birth: e.target.value }))} />
            </Field>

            <div className={`flex items-start gap-3 pt-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <input type="checkbox" id="consent" checked={regForm.consent}
                className="mt-1 h-5 w-5 accent-amber-500 cursor-pointer flex-shrink-0"
                onChange={e => setRegForm(p => ({ ...p, consent: e.target.checked }))} />
              <label htmlFor="consent" className={`text-sm text-gray-700 cursor-pointer ${textAlign}`}>
                {t.consent}
                {orgInfo?.privacy_policy_url
                  ? <a href={orgInfo.privacy_policy_url} target="_blank" rel="noopener noreferrer"
                      className="text-amber-600 underline hover:text-amber-700 mx-1">{t.privacyPolicy}</a>
                  : <span className="text-amber-600 mx-1">{t.privacyPolicy}</span>}
                {t.consentSuffix}
              </label>
            </div>
            {regErrors.consent && (
              <p className={`text-red-500 text-sm flex items-center gap-1 ${textAlign}`}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{regErrors.consent as string}
              </p>
            )}

            {globalError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{globalError}
              </div>
            )}

            <button onClick={handleRegister} disabled={submitting}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold text-lg rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
              {submitting ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <Check className="w-5 h-5" />}
              {t.submit}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

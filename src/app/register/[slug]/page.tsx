'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Check, User, Phone, Mail, Calendar, AlertCircle, ArrowRight, Lock } from 'lucide-react'

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
    successTitle: '!הצלחה',
    successRegMsg: 'פרטיך נשמרו במערכת. נשמח לראותך בקרוב!',
    successUpdateMsg: '!הפרטים שלך עודכנו בהצלחה',
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
    foundDesc: 'Ваши данные найдены. Обновите при необходимости.',
    firstName: 'Имя',
    lastName: 'Фамилия',
    phone: 'Телефон',
    email: 'Email',
    dob: 'Дата рождения',
    saveChanges: 'Сохранить',
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
    enterPhoneDesc: "We'll check if you're already in our system",
    phonePlaceholder: '05X-XXX-XXXX',
    checkPhone: 'Continue',
    checking: 'Checking...',
    foundTitle: 'Hello',
    foundDesc: 'We found your details. Update them if needed.',
    firstName: 'First Name',
    lastName: 'Last Name',
    phone: 'Phone',
    email: 'Email',
    dob: 'Date of Birth',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    notYou: 'Not me — register as new',
    registerTitle: 'Sign Up',
    subtitle: "Fill in your details and we'll add you to our system",
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

interface OrgInfo { name: string; logo_url: string | null; privacy_policy_url: string | null }
interface ClientData { id: string; first_name: string; last_name: string; phone: string; email: string; date_of_birth: string }
interface RegisterForm { first_name: string; last_name: string; phone: string; email: string; date_of_birth: string; consent: boolean }

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
function normalizePhone(phone: string): string { return phone.replace(/[\s\-().]/g, '') }

// Dark theme classes — shared
const darkInput = "w-full px-4 py-3 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-amber-500 transition-colors"
const darkInputDisabled = "w-full px-4 py-3 rounded-xl text-sm text-zinc-500 bg-zinc-900 border border-zinc-800 cursor-not-allowed flex items-center gap-2"
const goldBtn = "w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
const ghostBtn = "w-full py-2.5 text-sm text-zinc-500 hover:text-amber-400 transition-colors underline underline-offset-2"

function DarkField({ label, error, dir, children }: { label: string; error?: string; dir: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={`block text-xs font-medium text-zinc-400 mb-1.5 tracking-wide uppercase ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
        {label}
      </label>
      {children}
      {error && (
        <p className={`mt-1.5 text-red-400 text-xs flex items-center gap-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
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

  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [checking, setChecking] = useState(false)

  const [foundClient, setFoundClient] = useState<ClientData | null>(null)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', date_of_birth: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [regForm, setRegForm] = useState<RegisterForm>({ first_name: '', last_name: '', phone: '', email: '', date_of_birth: '', consent: false })
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
        setEditForm({ first_name: data.client.first_name || '', last_name: data.client.last_name || '', email: data.client.email || '', date_of_birth: data.client.date_of_birth || '' })
        setStep('found')
      } else {
        setRegForm(prev => ({ ...prev, phone }))
        setStep('register')
      }
    } catch { setPhoneError(t.error) }
    finally { setChecking(false) }
  }

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
      setSuccessType('update'); setStep('success')
    } catch { setSaveError(t.error) }
    finally { setSaving(false) }
  }

  const validateReg = (): boolean => {
    const errors: Record<string, string> = {}
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm),
      })
      const data = await res.json()
      if (res.status === 409) { setRegErrors(prev => ({ ...prev, phone: t.alreadyRegistered })); return }
      if (!res.ok) { setGlobalError(data.error || t.error); return }
      setSuccessType('register'); setStep('success')
    } catch { setGlobalError(t.error) }
    finally { setSubmitting(false) }
  }

  // ── Static screens ───────────────────────────────────────────────────────
  if (pageState === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (pageState === 'notFound' || pageState === 'disabled') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950">
      <div className="text-5xl mb-4">🚫</div>
      <p className="text-lg text-zinc-400 text-center max-w-sm">
        {pageState === 'disabled' ? t.disabled : t.notFound}
      </p>
    </div>
  )

  if (step === 'success') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950" dir={dir}>
      <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mb-6">
        <Check className="w-10 h-10 text-amber-400" />
      </div>
      <p className="text-xs tracking-widest text-amber-500 uppercase mb-2">✦ {orgInfo?.name}</p>
      <h1 className="text-2xl font-semibold text-zinc-100 mb-3">{t.successTitle}</h1>
      <p className="text-zinc-400 text-center max-w-sm">
        {successType === 'update' ? t.successUpdateMsg : t.successRegMsg}
      </p>
    </div>
  )

  // ── Language switcher ────────────────────────────────────────────────────
  const LangSwitcher = () => (
    <div className="flex gap-1.5 mt-4">
      {(['he', 'ru', 'en'] as Language[]).map(l => (
        <button key={l} onClick={() => setLang(l)}
          className={`px-3 py-1 rounded-lg text-xs font-semibold tracking-wide transition-all ${
            lang === l ? 'bg-amber-500 text-zinc-900' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'
          }`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 py-10 px-4" dir={dir}>
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className={`mb-8 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
          {orgInfo?.logo_url
            ? <img src={orgInfo.logo_url} alt="" className="h-10 mb-4 object-contain" />
            : <p className="text-xs tracking-widest text-amber-500 uppercase mb-1">✦ {orgInfo?.name}</p>
          }
          <h1 className="text-xl font-semibold text-zinc-100">{t.title}</h1>
          <LangSwitcher />
        </div>

        {/* ── STEP: phone ──────────────────────────────────────────────── */}
        {step === 'phone' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
              <h2 className="text-base font-semibold text-zinc-100">{t.enterPhone}</h2>
              <p className="text-sm text-zinc-500 mt-1">{t.enterPhoneDesc}</p>
            </div>
            <DarkField label={t.phone} error={phoneError} dir={dir}>
              <input type="tel" value={phone} placeholder={t.phonePlaceholder} dir="ltr"
                className={darkInput}
                onChange={e => { setPhone(e.target.value); setPhoneError('') }}
                onKeyDown={e => e.key === 'Enter' && handleCheckPhone()} />
            </DarkField>
            <button onClick={handleCheckPhone} disabled={checking} className={goldBtn}>
              {checking
                ? <span className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                : <ArrowRight className="w-4 h-4" />}
              {checking ? t.checking : t.checkPhone}
            </button>
          </div>
        )}

        {/* ── STEP: found ──────────────────────────────────────────────── */}
        {step === 'found' && foundClient && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-amber-400 font-semibold text-sm">
                  {foundClient.first_name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                <p className="text-sm font-semibold text-zinc-100">{t.foundTitle}, {foundClient.first_name}!</p>
                <p className="text-xs text-zinc-500">{t.foundDesc}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DarkField label={t.firstName} dir={dir}>
                <input type="text" value={editForm.first_name} dir={dir} className={darkInput}
                  onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))} />
              </DarkField>
              <DarkField label={t.lastName} dir={dir}>
                <input type="text" value={editForm.last_name} dir={dir} className={darkInput}
                  onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))} />
              </DarkField>
            </div>

            <DarkField label={t.phone} dir={dir}>
              <div className={darkInputDisabled}>
                <Lock className="w-3.5 h-3.5 text-zinc-600" />
                <span>{foundClient.phone}</span>
              </div>
            </DarkField>

            <DarkField label={t.email} dir={dir}>
              <input type="email" value={editForm.email} dir="ltr" className={darkInput}
                onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
            </DarkField>

            <DarkField label={t.dob} dir={dir}>
              <input type="date" value={editForm.date_of_birth} dir="ltr"
                max={new Date().toISOString().split('T')[0]} className={darkInput}
                onChange={e => setEditForm(p => ({ ...p, date_of_birth: e.target.value }))} />
            </DarkField>

            {saveError && (
              <div className="bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{saveError}
              </div>
            )}
            <button onClick={handleSaveEdit} disabled={saving} className={goldBtn}>
              {saving ? <span className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? t.saving : t.saveChanges}
            </button>
            <button onClick={() => { setRegForm(p => ({ ...p, phone })); setStep('register') }} className={ghostBtn}>
              {t.notYou}
            </button>
          </div>
        )}

        {/* ── STEP: register ───────────────────────────────────────────── */}
        {step === 'register' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
              <h2 className="text-base font-semibold text-zinc-100">{t.registerTitle}</h2>
              <p className="text-sm text-zinc-500 mt-1">{t.subtitle}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DarkField label={t.firstName} error={regErrors.first_name} dir={dir}>
                <input type="text" value={regForm.first_name} dir={dir}
                  className={`${darkInput} ${regErrors.first_name ? 'border-red-500' : ''}`}
                  onChange={e => setRegForm(p => ({ ...p, first_name: e.target.value }))} />
              </DarkField>
              <DarkField label={t.lastName} dir={dir}>
                <input type="text" value={regForm.last_name} dir={dir} className={darkInput}
                  onChange={e => setRegForm(p => ({ ...p, last_name: e.target.value }))} />
              </DarkField>
            </div>

            <DarkField label={t.phone} error={regErrors.phone} dir={dir}>
              <input type="tel" value={regForm.phone} placeholder={t.phonePlaceholder} dir="ltr"
                className={`${darkInput} ${regErrors.phone ? 'border-red-500' : ''}`}
                onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))} />
            </DarkField>

            <DarkField label={t.email} error={regErrors.email} dir={dir}>
              <input type="email" value={regForm.email} dir="ltr"
                className={`${darkInput} ${regErrors.email ? 'border-red-500' : ''}`}
                onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} />
            </DarkField>

            <DarkField label={t.dob} error={regErrors.date_of_birth} dir={dir}>
              <input type="date" value={regForm.date_of_birth} dir="ltr"
                max={new Date().toISOString().split('T')[0]}
                className={`${darkInput} ${regErrors.date_of_birth ? 'border-red-500' : ''}`}
                onChange={e => setRegForm(p => ({ ...p, date_of_birth: e.target.value }))} />
            </DarkField>

            <div className={`flex items-start gap-3 pt-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <input type="checkbox" id="consent" checked={regForm.consent}
                className="mt-0.5 h-4 w-4 accent-amber-500 cursor-pointer flex-shrink-0"
                onChange={e => setRegForm(p => ({ ...p, consent: e.target.checked }))} />
              <label htmlFor="consent" className={`text-xs text-zinc-400 cursor-pointer ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                {t.consent}
                {orgInfo?.privacy_policy_url
                  ? <a href={orgInfo.privacy_policy_url} target="_blank" rel="noopener noreferrer"
                      className="text-amber-500 hover:text-amber-400 underline mx-1">{t.privacyPolicy}</a>
                  : <span className="text-amber-500 mx-1">{t.privacyPolicy}</span>}
                {t.consentSuffix}
              </label>
            </div>
            {regErrors.consent && (
              <p className={`text-red-400 text-xs flex items-center gap-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{regErrors.consent}
              </p>
            )}

            {globalError && (
              <div className="bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{globalError}
              </div>
            )}

            <button onClick={handleRegister} disabled={submitting} className={goldBtn}>
              {submitting ? <span className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              {t.submit}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

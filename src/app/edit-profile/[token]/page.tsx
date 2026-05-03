'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, Camera, Loader2, AlertTriangle, X, User, Phone, Mail, Calendar } from 'lucide-react'

// ── Локализация ───────────────────────────────────────────────────────────────
const I18N = {
  he: {
    title: 'עדכון פרטים אישיים',
    subtitle: 'עדכני את הפרטים שלך — זה לוקח פחות מדקה',
    firstName: 'שם פרטי',
    lastName: 'שם משפחה',
    phone: 'טלפון',
    email: 'אימייל',
    birthDate: 'תאריך לידה',
    photo: 'תמונת פרופיל',
    photoHint: 'לחצי כאן להעלאת תמונה (עד 5MB)',
    save: 'שמור שינויים',
    saving: 'שומר...',
    successTitle: 'הפרטים עודכנו!',
    successText: 'תודה, המידע שלך נשמר בהצלחה.',
    expiredTitle: 'הקישור פג תוקף',
    expiredText: 'ניתן לפנות לסלון לקבלת קישור חדש.',
    contactBtn: 'צור קשר',
    loadingText: 'טוען...',
    photoError: 'שגיאה בהעלאת התמונה. נסי שוב.',
    saveError: 'שגיאה בשמירה. נסי שוב.',
    compressing: 'מעבד תמונה...',
    dir: 'rtl' as const,
  },
  ru: {
    title: 'Редактирование профиля',
    subtitle: 'Обновите свои данные — это займёт меньше минуты',
    firstName: 'Имя',
    lastName: 'Фамилия',
    phone: 'Телефон',
    email: 'Email',
    birthDate: 'Дата рождения',
    photo: 'Фото профиля',
    photoHint: 'Нажмите для загрузки фото (до 5MB)',
    save: 'Сохранить',
    saving: 'Сохранение...',
    successTitle: 'Данные обновлены!',
    successText: 'Спасибо, информация успешно сохранена.',
    expiredTitle: 'Ссылка недействительна',
    expiredText: 'Обратитесь в салон для получения новой ссылки.',
    contactBtn: 'Связаться',
    loadingText: 'Загрузка...',
    photoError: 'Ошибка загрузки фото. Попробуйте снова.',
    saveError: 'Ошибка сохранения. Попробуйте снова.',
    compressing: 'Обработка изображения...',
    dir: 'ltr' as const,
  },
}

interface ClientData {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string
  birth_date: string
  avatar_url: string | null
}

type Lang = 'he' | 'ru'
type PageState = 'loading' | 'ready' | 'expired' | 'success'

// ── Canvas-based image compression → WebP ────────────────────────────────────
async function compressImageToWebP(file: File, maxWidth = 800, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas not supported'))
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Compression failed'))
        },
        'image/webp',
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

// ── Photo upload with compression ────────────────────────────────────────────
async function uploadAvatar(clientId: string, file: File, onStatus: (s: string) => void): Promise<string> {
  onStatus('compressing')
  const blob = await compressImageToWebP(file)
  const formData = new FormData()
  formData.append('file', blob, `${clientId}.webp`)
  formData.append('client_id', clientId)

  const res = await fetch('/api/client-self-edit/avatar', {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Upload failed')
  }
  const { url } = await res.json()
  return url as string
}


// ── Main Component ───────────────────────────────────────────────────────────
export default function EditProfilePage() {
  const params = useParams()
  const token = params.token as string

  const [lang, setLang] = useState<Lang>('he')
  const [pageState, setPageState] = useState<PageState>('loading')
  const [client, setClient] = useState<ClientData | null>(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', email: '', birth_date: '' })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [photoStatus, setPhotoStatus] = useState<'idle' | 'compressing' | 'uploading' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const s = I18N[lang]

  // Auto-detect language from browser
  useEffect(() => {
    const browserLang = navigator.language || ''
    setLang(browserLang.startsWith('ru') ? 'ru' : 'he')
  }, [])

  // Load client data
  useEffect(() => {
    if (!token) return
    fetch(`/api/client-self-edit/token/${token}`)
      .then(async (res) => {
        if (res.status === 410 || res.status === 404) { setPageState('expired'); return }
        if (!res.ok) { setPageState('expired'); return }
        const data = await res.json()
        setClient(data.client)
        setForm({
          first_name: data.client.first_name || '',
          last_name: data.client.last_name || '',
          phone: data.client.phone || '',
          email: data.client.email || '',
          birth_date: data.client.birth_date || '',
        })
        if (data.client.avatar_url) setAvatarPreview(data.client.avatar_url)
        setPageState('ready')
      })
      .catch(() => setPageState('expired'))
  }, [token])

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setSaveError(s.photoError); return }
    setSaveError('')
    setPendingFile(file)
    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)
  }, [s])

  const handleSave = useCallback(async () => {
    if (!client) return
    setIsSaving(true)
    setSaveError('')

    try {
      let avatarUrl: string | undefined

      if (pendingFile) {
        setPhotoStatus('uploading')
        avatarUrl = await uploadAvatar(client.id, pendingFile, (status) => {
          setPhotoStatus(status as typeof photoStatus)
        })
        setPhotoStatus('idle')
      }

      const payload: Record<string, string | undefined> = { ...form }
      if (avatarUrl) payload.avatar_url = avatarUrl

      const res = await fetch(`/api/client-self-edit/token/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Save failed')
      }

      setPageState('success')
    } catch (err: any) {
      setSaveError(s.saveError)
      setPhotoStatus('idle')
    } finally {
      setIsSaving(false)
    }
  }, [client, form, pendingFile, token, s])

  // ── Render: Loading ──────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-gray-500 text-sm">{I18N[lang].loadingText}</p>
        </div>
      </div>
    )
  }

  // ── Render: Expired / Invalid ────────────────────────────────────────────
  if (pageState === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir={s.dir}>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{s.expiredTitle}</h1>
          <p className="text-gray-500 text-sm mb-6">{s.expiredText}</p>
          <a
            href="https://wa.me/972000000000"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            {s.contactBtn}
          </a>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => setLang('he')} className={`text-xs px-2 py-1 rounded ${lang==='he' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-400'}`}>עברית</button>
            <button onClick={() => setLang('ru')} className={`text-xs px-2 py-1 rounded ${lang==='ru' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-400'}`}>Русский</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: Success ──────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir={s.dir}>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{s.successTitle}</h1>
          <p className="text-gray-500 text-sm">{s.successText}</p>
        </div>
      </div>
    )
  }

  // ── Render: Form ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50" dir={s.dir}>
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-600 text-xs font-medium px-3 py-1 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            Trinity CRM
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{s.title}</h1>
          <p className="text-gray-500 text-sm">{s.subtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Photo section */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 flex flex-col items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative group"
              type="button"
            >
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md bg-gray-100">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-10 h-10 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-md group-hover:bg-indigo-700 transition-colors">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </button>
            <p className="text-xs text-gray-500 text-center">{
              photoStatus === 'compressing' || photoStatus === 'uploading' ? s.compressing : s.photoHint
            }</p>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          {/* Fields */}
          <div className="p-6 space-y-4">

            <div className="grid grid-cols-2 gap-3">
              <FormField icon={<User className="w-4 h-4" />} label={s.firstName}>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  className="w-full bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
                  placeholder={s.firstName}
                />
              </FormField>
              <FormField icon={<User className="w-4 h-4" />} label={s.lastName}>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  className="w-full bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
                  placeholder={s.lastName}
                />
              </FormField>
            </div>

            <FormField icon={<Phone className="w-4 h-4" />} label={s.phone}>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
                placeholder="050-000-0000"
                dir="ltr"
              />
            </FormField>

            <FormField icon={<Mail className="w-4 h-4" />} label={s.email}>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
                placeholder="example@email.com"
                dir="ltr"
              />
            </FormField>

            <FormField icon={<Calendar className="w-4 h-4" />} label={s.birthDate}>
              <input
                type="date"
                value={form.birth_date}
                onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
                className="w-full bg-transparent outline-none text-sm text-gray-900"
                dir="ltr"
              />
            </FormField>

            {/* Error */}
            {saveError && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {saveError}
                <button onClick={() => setSaveError('')} className="ml-auto">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={isSaving || !form.first_name.trim()}
              className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {s.saving}
                </>
              ) : s.save}
            </button>
          </div>
        </div>

        {/* Lang switcher */}
        <div className="flex justify-center gap-3 mt-6">
          <button onClick={() => setLang('he')} className={`text-xs px-3 py-1.5 rounded-full transition-colors ${lang==='he' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>עברית</button>
          <button onClick={() => setLang('ru')} className={`text-xs px-3 py-1.5 rounded-full transition-colors ${lang==='ru' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>Русский</button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">Powered by Trinity CRM</p>
      </div>
    </div>
  )
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function FormField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-50 transition-all">
        <span className="text-gray-400 flex-shrink-0">{icon}</span>
        {children}
      </div>
    </div>
  )
}

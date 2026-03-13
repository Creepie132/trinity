'use client'

import { useState, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import { useQueryClient } from '@tanstack/react-query'
import { Save, Upload } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface EditClientSheetProps {
  client: any
  isOpen: boolean
  onClose: () => void
  onSaved: (updatedClient: any) => void
  locale: 'he' | 'ru'
}

// ── Validation ────────────────────────────────────────────────────────────────
const PHONE_RE = /^[\d\s\-+()]{7,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldKey = 'first_name' | 'last_name' | 'phone' | 'email' | 'address' | 'notes'

function validate(form: Record<FieldKey, string>, locale: 'he' | 'ru'): Record<FieldKey, string> {
  const errors: Record<string, string> = {}

  if (!form.first_name.trim()) {
    errors.first_name = locale === 'he' ? 'שם פרטי הוא שדה חובה' : 'Имя обязательно для заполнения'
  }
  if (form.phone && !PHONE_RE.test(form.phone.trim())) {
    errors.phone = locale === 'he' ? 'מספר טלפון לא תקין (לפחות 7 ספרות)' : 'Неверный формат телефона (минимум 7 цифр)'
  }
  if (form.email && !EMAIL_RE.test(form.email.trim())) {
    errors.email = locale === 'he' ? 'כתובת אימייל לא תקינה' : 'Неверный формат email'
  }

  return errors as Record<FieldKey, string>
}

export function EditClientSheet({ client, isOpen, onClose, onSaved, locale }: EditClientSheetProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<Record<FieldKey, string>>({
    first_name: client?.first_name || '',
    last_name:  client?.last_name  || '',
    email:      client?.email      || '',
    phone:      client?.phone      || '',
    address:    client?.address    || '',
    notes:      client?.notes      || '',
  })

  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [shaking, setShaking]   = useState<Record<string, boolean>>({})
  const [avatarFile, setAvatarFile]     = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(client?.avatar_url || null)
  const [saving, setSaving]     = useState(false)

  const l = {
    he: {
      title: 'עריכת לקוח', firstName: 'שם פרטי', lastName: 'שם משפחה',
      email: 'אימייל', phone: 'טלפון', address: 'כתובת', notes: 'הערות',
      save: 'שמור', cancel: 'ביטול', photo: 'שנה תמונה', required: '*',
    },
    ru: {
      title: 'Редактирование клиента', firstName: 'Имя', lastName: 'Фамилия',
      email: 'Email', phone: 'Телефон', address: 'Адрес', notes: 'Заметки',
      save: 'Сохранить', cancel: 'Отмена', photo: 'Изменить фото', required: '*',
    },
  }[locale]

  // ── Shake animation ───────────────────────────────────────────────────────
  const shakeField = useCallback((fields: string[]) => {
    const next: Record<string, boolean> = {}
    fields.forEach(f => { next[f] = true })
    setShaking(next)
    setTimeout(() => setShaking({}), 600)
  }, [])

  // ── Field change ──────────────────────────────────────────────────────────
  const handleChange = (field: FieldKey, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e })
  }

  // ── Avatar ────────────────────────────────────────────────────────────────
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)) }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    // Client-side validation first
    const validationErrors = validate(form, locale)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      shakeField(Object.keys(validationErrors))
      // Show the first error in toast with specific message
      const firstMsg = Object.values(validationErrors)[0]
      toast.error(firstMsg, { duration: 4000 })
      return
    }

    setSaving(true)
    try {
      let avatar_url = client?.avatar_url
      if (avatarFile) {
        const formData = new FormData()
        formData.append('file', avatarFile)
        formData.append('client_id', client.id)
        const uploadRes = await fetch('/api/clients/avatar', { method: 'POST', body: formData })
        if (uploadRes.ok) { const d = await uploadRes.json(); avatar_url = d.url }
      }

      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, avatar_url }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(locale === 'he' ? 'נשמר בהצלחה ✓' : 'Сохранено ✓')
        queryClient.invalidateQueries({ queryKey: ['clients'] })
        queryClient.invalidateQueries({ queryKey: ['client'] })
        onSaved(data)
        onClose()
      } else {
        // Server returned a specific error — parse and show it
        const serverMsg = data?.error || ''
        let userMsg: string

        if (serverMsg.includes('Name is required') || serverMsg.includes('first_name')) {
          userMsg = locale === 'he' ? 'שם פרטי הוא שדה חובה' : 'Имя обязательно для заполнения'
          setErrors({ first_name: userMsg })
          shakeField(['first_name'])
        } else if (serverMsg.includes('phone')) {
          userMsg = locale === 'he' ? 'מספר טלפון לא תקין' : 'Неверный формат телефона'
          setErrors({ phone: userMsg })
          shakeField(['phone'])
        } else if (serverMsg.includes('email')) {
          userMsg = locale === 'he' ? 'כתובת אימייל לא תקינה' : 'Неверный формат email'
          setErrors({ email: userMsg })
          shakeField(['email'])
        } else {
          userMsg = locale === 'he'
            ? `שגיאה בשמירה: ${serverMsg || 'שגיאה לא ידועה'}`
            : `Ошибка сохранения: ${serverMsg || 'неизвестная ошибка'}`
        }

        toast.error(userMsg, { duration: 5000 })
      }
    } catch {
      toast.error(locale === 'he' ? 'שגיאת רשת — בדוק חיבור לאינטרנט' : 'Ошибка сети — проверьте подключение')
    }
    setSaving(false)
  }

  // ── Avatar initials ───────────────────────────────────────────────────────
  const first = (form.first_name || '')[0]?.toUpperCase() || '?'
  const last  = (form.last_name  || '')[0]?.toUpperCase() || ''
  const initials   = (first + last).slice(0, 2) || '??'
  const colors     = ['bg-blue-500','bg-emerald-500','bg-amber-500','bg-purple-500','bg-rose-500','bg-cyan-500']
  const fullName   = `${form.first_name} ${form.last_name}`.trim() || 'Client'
  const avatarColor = colors[fullName.charCodeAt(0) % colors.length]

  // ── Field component ───────────────────────────────────────────────────────
  const Field = ({
    field, label, required, type = 'text', dir, multiline,
  }: {
    field: FieldKey; label: string; required?: boolean
    type?: string; dir?: string; multiline?: boolean
  }) => {
    const hasError = !!errors[field]
    const isShaking = !!shaking[field]

    const base = [
      'w-full px-4 py-3 rounded-xl border text-sm transition-all duration-150',
      'focus:outline-none focus:ring-2',
      hasError
        ? 'border-red-400 bg-red-50 dark:bg-red-950/20 focus:ring-red-300 dark:border-red-500'
        : 'border-border bg-background focus:ring-primary/30',
      isShaking ? 'animate-shake' : '',
    ].join(' ')

    return (
      <div>
        <label className={[
          'text-xs mb-1 block font-medium transition-colors',
          hasError ? 'text-red-500' : 'text-muted-foreground',
        ].join(' ')}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>

        {multiline ? (
          <textarea
            value={form[field]}
            onChange={e => handleChange(field, e.target.value)}
            className={`${base} min-h-[80px] resize-none`}
            rows={3}
          />
        ) : (
          <input
            type={type}
            value={form[field]}
            onChange={e => handleChange(field, e.target.value)}
            className={base}
            dir={dir}
          />
        )}

        {hasError && (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <span>⚠</span> {errors[field]}
          </p>
        )}
      </div>
    )
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={l.title}
      width="480px"
      footer={
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            {l.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-[1.5] py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition whitespace-nowrap"
          >
            <Save size={16} />
            {saving ? (locale === 'he' ? 'שומר...' : 'Сохранение...') : l.save}
          </button>
        </div>
      }
    >
      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        <label className="relative cursor-pointer group">
          {avatarPreview ? (
            <Image src={avatarPreview} alt="" width={80} height={80} className="rounded-full object-cover" />
          ) : (
            <div className={`${avatarColor} w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl`}>
              {initials}
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <Upload size={20} className="text-white" />
          </div>
          <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </label>
        <p className="text-xs text-muted-foreground mt-2">{l.photo}</p>
      </div>

      {/* Form fields */}
      <div className="space-y-3">
        <Field field="first_name" label={l.firstName} required />
        <Field field="last_name"  label={l.lastName} />
        <Field field="phone"      label={l.phone}  type="tel"   dir="ltr" />
        <Field field="email"      label={l.email}  type="email" dir="ltr" />
        <Field field="address"    label={l.address} />
        <Field field="notes"      label={l.notes}  multiline />
      </div>
    </Modal>
  )
}

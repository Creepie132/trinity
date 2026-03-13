'use client'

import { useState, useCallback, memo } from 'react'
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

type FieldKey = 'first_name' | 'last_name' | 'phone' | 'email' | 'address' | 'notes'

const PHONE_RE = /^[\d\s\-+()]{7,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(form: Record<FieldKey, string>, locale: 'he' | 'ru'): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.first_name.trim())
    errors.first_name = locale === 'he' ? 'שם פרטי הוא שדה חובה' : 'Имя обязательно для заполнения'
  if (form.phone && !PHONE_RE.test(form.phone.trim()))
    errors.phone = locale === 'he' ? 'מספר טלפון לא תקין (לפחות 7 ספרות)' : 'Неверный формат телефона (минимум 7 цифр)'
  if (form.email && !EMAIL_RE.test(form.email.trim()))
    errors.email = locale === 'he' ? 'כתובת אימייל לא תקינה' : 'Неверный формат email'
  return errors
}

// ── Field — вынесен ЗА пределы родительского компонента ──────────────────────
// Это КРИТИЧНО: если Field объявлен внутри компонента, React пересоздаёт его
// при каждом ре-рендере → поле теряет фокус после каждого символа
interface FieldProps {
  field: FieldKey
  label: string
  required?: boolean
  type?: string
  dir?: string
  multiline?: boolean
  value: string
  error?: string
  shaking?: boolean
  onChange: (field: FieldKey, value: string) => void
}

const Field = memo(({ field, label, required, type = 'text', dir, multiline, value, error, shaking, onChange }: FieldProps) => {
  const base = [
    'w-full px-4 py-3 rounded-xl border text-sm transition-all duration-150',
    'focus:outline-none focus:ring-2',
    error
      ? 'border-red-400 bg-red-50 dark:bg-red-950/20 focus:ring-red-300 dark:border-red-500'
      : 'border-border bg-background focus:ring-primary/30',
    shaking ? 'animate-shake' : '',
  ].join(' ')

  return (
    <div>
      <label className={['text-xs mb-1 block font-medium transition-colors', error ? 'text-red-500' : 'text-muted-foreground'].join(' ')}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(field, e.target.value)}
          className={`${base} min-h-[80px] resize-none`} rows={3} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(field, e.target.value)}
          className={base} dir={dir} />
      )}
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><span>⚠</span> {error}</p>
      )}
    </div>
  )
})
Field.displayName = 'Field'

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
  const [errors, setErrors]   = useState<Record<string, string>>({})
  const [shaking, setShaking] = useState<Record<string, boolean>>({})
  const [avatarFile, setAvatarFile]       = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(client?.avatar_url || null)
  const [saving, setSaving] = useState(false)

  const l = locale === 'he' ? {
    title: 'עריכת לקוח', firstName: 'שם פרטי', lastName: 'שם משפחה',
    email: 'אימייל', phone: 'טלפון', address: 'כתובת', notes: 'הערות',
    save: 'שמור', saving: 'שומר...', cancel: 'ביטול', photo: 'שנה תמונה',
  } : {
    title: 'Редактирование клиента', firstName: 'Имя', lastName: 'Фамилия',
    email: 'Email', phone: 'Телефон', address: 'Адрес', notes: 'Заметки',
    save: 'Сохранить', saving: 'Сохранение...', cancel: 'Отмена', photo: 'Изменить фото',
  }

  const shakeFields = useCallback((fields: string[]) => {
    const next: Record<string, boolean> = {}
    fields.forEach(f => { next[f] = true })
    setShaking(next)
    setTimeout(() => setShaking({}), 600)
  }, [])

  // useCallback — стабильная ссылка, Field не перерендерится при смене других полей
  const handleChange = useCallback((field: FieldKey, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => { const e = { ...prev }; delete e[field]; return e })
  }, [])

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)) }
  }

  async function handleSave() {
    const validationErrors = validate(form, locale)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      shakeFields(Object.keys(validationErrors))
      toast.error(Object.values(validationErrors)[0], { duration: 4000 })
      return
    }
    setSaving(true)
    try {
      let avatar_url = client?.avatar_url
      if (avatarFile) {
        const fd = new FormData()
        fd.append('file', avatarFile)
        fd.append('client_id', client.id)
        const ur = await fetch('/api/clients/avatar', { method: 'POST', body: fd })
        if (ur.ok) { const d = await ur.json(); avatar_url = d.url }
      }
      const res  = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, avatar_url }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(locale === 'he' ? 'נשמר בהצלחה ✓' : 'Сохранено ✓')
        queryClient.invalidateQueries({ queryKey: ['clients'] })
        queryClient.invalidateQueries({ queryKey: ['client'] })
        onSaved(data); onClose()
      } else {
        const msg = data?.error || ''
        let userMsg: string
        if (msg.includes('Name is required') || msg.includes('first_name')) {
          userMsg = locale === 'he' ? 'שם פרטי הוא שדה חובה' : 'Имя обязательно'
          setErrors({ first_name: userMsg }); shakeFields(['first_name'])
        } else if (msg.includes('phone')) {
          userMsg = locale === 'he' ? 'מספר טלפון לא תקין' : 'Неверный формат телефона'
          setErrors({ phone: userMsg }); shakeFields(['phone'])
        } else if (msg.includes('email')) {
          userMsg = locale === 'he' ? 'כתובת אימייל לא תקינה' : 'Неверный формат email'
          setErrors({ email: userMsg }); shakeFields(['email'])
        } else {
          userMsg = locale === 'he' ? `שגיאה בשמירה: ${msg || 'שגיאה לא ידועה'}` : `Ошибка: ${msg || 'неизвестная'}`
        }
        toast.error(userMsg, { duration: 5000 })
      }
    } catch {
      toast.error(locale === 'he' ? 'שגיאת רשת' : 'Ошибка сети')
    }
    setSaving(false)
  }

  // Avatar initials
  const fullName    = `${form.first_name} ${form.last_name}`.trim() || 'C'
  const initials    = (fullName.split(' ').map(w => w[0]).join('')).slice(0, 2).toUpperCase()
  const colors      = ['bg-blue-500','bg-emerald-500','bg-amber-500','bg-purple-500','bg-rose-500','bg-cyan-500']
  const avatarColor = colors[fullName.charCodeAt(0) % colors.length]

  return (
    <Modal open={isOpen} onClose={onClose} title={l.title} width="480px"
      footer={
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            {l.cancel}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-[1.5] py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
            <Save size={16} />
            {saving ? l.saving : l.save}
          </button>
        </div>
      }
    >
      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        <label className="relative cursor-pointer group">
          {avatarPreview
            ? <Image src={avatarPreview} alt="" width={80} height={80} className="rounded-full object-cover" />
            : <div className={`${avatarColor} w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl`}>{initials || '?'}</div>
          }
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <Upload size={20} className="text-white" />
          </div>
          <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </label>
        <p className="text-xs text-muted-foreground mt-2">{l.photo}</p>
      </div>

      {/* Fields — all props passed explicitly, no nested component definitions */}
      <div className="space-y-3">
        <Field field="first_name" label={l.firstName} required
          value={form.first_name} error={errors.first_name} shaking={shaking.first_name} onChange={handleChange} />
        <Field field="last_name"  label={l.lastName}
          value={form.last_name}  error={errors.last_name}  shaking={shaking.last_name}  onChange={handleChange} />
        <Field field="phone" label={l.phone} type="tel" dir="ltr"
          value={form.phone}  error={errors.phone}  shaking={shaking.phone}  onChange={handleChange} />
        <Field field="email" label={l.email} type="email" dir="ltr"
          value={form.email}  error={errors.email}  shaking={shaking.email}  onChange={handleChange} />
        <Field field="address" label={l.address}
          value={form.address} error={errors.address} shaking={shaking.address} onChange={handleChange} />
        <Field field="notes" label={l.notes} multiline
          value={form.notes}   error={errors.notes}   shaking={shaking.notes}   onChange={handleChange} />
      </div>
    </Modal>
  )
}

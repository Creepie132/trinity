'use client'

import { useState, useCallback, useEffect, memo } from 'react'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { useQueryClient } from '@tanstack/react-query'
import { Save, FileText, Paintbrush, UserPen } from 'lucide-react'
import { toast } from 'sonner'

interface EditClientSheetProps {
  client: any
  isOpen: boolean
  onClose: () => void
  onSaved: (updatedClient: any) => void
  locale: 'he' | 'ru'
}

type FieldKey = 'first_name' | 'last_name' | 'phone' | 'email' | 'address' | 'city' | 'notes' | 'description' | 'paint_code'

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
      {label && (
        <label className={['text-xs mb-1 block font-medium transition-colors', error ? 'text-red-500' : 'text-muted-foreground'].join(' ')}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
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
    first_name:  client?.first_name  || '',
    last_name:   client?.last_name   || '',
    email:       client?.email       || '',
    phone:       client?.phone       || '',
    address:     client?.address     || '',
    city:        client?.city        || '',
    notes:       client?.notes       || '',
    description: client?.description || '',
    paint_code:  client?.paint_code  || '',
  })
  const [showDescription, setShowDescription] = useState(!!(client?.description))
  const [hasPaintCode, setHasPaintCode] = useState(!!(client?.paint_code))
  const [errors, setErrors]   = useState<Record<string, string>>({})
  const [shaking, setShaking] = useState<Record<string, boolean>>({})
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (!client) return
    setForm({
      first_name:  client.first_name  || '',
      last_name:   client.last_name   || '',
      email:       client.email       || '',
      phone:       client.phone       || '',
      address:     client.address     || '',
      city:        client.city        || '',
      notes:       client.notes       || '',
      description: client.description || '',
      paint_code:  client.paint_code  || '',
    })
    setShowDescription(!!(client.description))
    setHasPaintCode(!!(client.paint_code))
    setErrors({})
  }, [client?.id])

  const l = locale === 'he' ? {
    title: 'עריכת לקוח', firstName: 'שם פרטי', lastName: 'שם משפחה',
    email: 'אימייל', phone: 'טלפון', address: 'כתובת', city: 'עיר', notes: 'הערות',
    description: 'תיאור', paintCode: 'מספר צבע',
    save: 'שמור', saving: 'שומר...', cancel: 'ביטול',
  } : {
    title: 'Редактирование клиента', firstName: 'Имя', lastName: 'Фамилия',
    email: 'Email', phone: 'Телефон', address: 'Адрес', city: 'Город', notes: 'Заметки',
    description: 'Описание', paintCode: 'Код краски',
    save: 'Сохранить', saving: 'Сохранение...', cancel: 'Отмена',
  }

  const shakeFields = useCallback((fields: string[]) => {
    const next: Record<string, boolean> = {}
    fields.forEach(f => { next[f] = true })
    setShaking(next)
    setTimeout(() => setShaking({}), 600)
  }, [])

  const handleChange = useCallback((field: FieldKey, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => { const e = { ...prev }; delete e[field]; return e })
  }, [])

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
      const res  = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, paint_code: hasPaintCode ? form.paint_code : null }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(locale === 'he' ? 'נשמר בהצלחה ✓' : 'Сохранено ✓')
        queryClient.invalidateQueries({ queryKey: ['clients'] })
        queryClient.invalidateQueries({ queryKey: ['client'] })
        onSaved(data)
        onClose()
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

  const fullName    = `${form.first_name} ${form.last_name}`.trim() || 'C'
  const initials    = (fullName.split(' ').map(w => w[0]).join('')).slice(0, 2).toUpperCase()
  const colors      = ['bg-blue-500','bg-emerald-500','bg-amber-500','bg-purple-500','bg-rose-500','bg-cyan-500']
  const avatarColor = colors[fullName.charCodeAt(0) % colors.length]
  const dir         = locale === 'he' ? 'rtl' : 'ltr'

  return (
    <Modal open={isOpen} onClose={onClose} width="600px" dir={dir} darkHeader showCloseButton={false}>
      <TrinityModalShell
        open={isOpen}
        onClose={onClose}
        icon={<UserPen />}
        title={l.title}
        subtitle={locale === 'he' ? 'עדכן את פרטי הלקוח' : 'Обновите данные клиента'}
        dir={dir}
        sidebarExtra={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto', paddingTop: 12 }}>
            {/* Аватар */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
              <div className={`${avatarColor} w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg`}>
                {initials || '?'}
              </div>
            </div>
            {/* Имя клиента */}
            <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>
              {fullName}
            </p>
            {/* Кнопка Сохранить */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 14px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                background: saving ? 'rgba(255,255,255,0.15)' : 'var(--trinity-accent, #4a6fa5)',
                color: '#fff', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Save size={14} />
              {saving ? l.saving : l.save}
            </button>
            {/* Кнопка Отмена */}
            <button
              onClick={onClose}
              style={{
                padding: '8px 14px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent', color: 'rgba(255,255,255,0.5)',
                fontSize: 12, cursor: 'pointer', fontWeight: 500,
              }}
            >
              {l.cancel}
            </button>
          </div>
        }
      >
        {/* ── Поля формы ── */}
        <div className="space-y-3">
          {/* Имя + кнопка Описание */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {l.firstName} / {l.lastName}
              </span>
              <button
                type="button"
                onClick={() => setShowDescription(v => !v)}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                  showDescription
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 text-indigo-600'
                    : 'border-border text-muted-foreground hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                <FileText size={13} />
                {l.description}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field field="first_name" label="" required
                value={form.first_name} error={errors.first_name} shaking={shaking.first_name} onChange={handleChange} />
              <Field field="last_name" label=""
                value={form.last_name} error={errors.last_name} shaking={shaking.last_name} onChange={handleChange} />
            </div>
          </div>

          {showDescription && (
            <Field field="description" label={l.description} multiline
              value={form.description} error={errors.description} shaking={shaking.description} onChange={handleChange} />
          )}

          <Field field="phone" label={l.phone} type="tel" dir="ltr"
            value={form.phone} error={errors.phone} shaking={shaking.phone} onChange={handleChange} />
          <Field field="email" label={l.email} type="email" dir="ltr"
            value={form.email} error={errors.email} shaking={shaking.email} onChange={handleChange} />
          <Field field="address" label={l.address}
            value={form.address} error={errors.address} shaking={shaking.address} onChange={handleChange} />
          <Field field="city" label={l.city}
            value={form.city} error={errors.city} shaking={shaking.city} onChange={handleChange} />

          {/* Код краски */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none w-fit mb-1">
              <input
                type="checkbox"
                checked={hasPaintCode}
                onChange={(e) => {
                  setHasPaintCode(e.target.checked)
                  if (!e.target.checked) handleChange('paint_code', '')
                }}
                className="w-4 h-4 rounded border-gray-300 accent-indigo-600"
              />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Paintbrush size={13} className="text-indigo-500" />
                {l.paintCode}
              </span>
            </label>
            {hasPaintCode && (
              <Field field="paint_code" label=""
                value={form.paint_code} error={errors.paint_code} shaking={shaking.paint_code} onChange={handleChange} />
            )}
          </div>

          <Field field="notes" label={l.notes} multiline
            value={form.notes} error={errors.notes} shaking={shaking.notes} onChange={handleChange} />
        </div>
      </TrinityModalShell>
    </Modal>
  )
}

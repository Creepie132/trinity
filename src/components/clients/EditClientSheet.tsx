'use client'

import { useState } from 'react'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'
import { Save, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface EditClientSheetProps {
  client: any
  isOpen: boolean
  onClose: () => void
  onSaved: (updatedClient: any) => void
  locale: 'he' | 'ru'
}

export function EditClientSheet({ client, isOpen, onClose, onSaved, locale }: EditClientSheetProps) {
  const [form, setForm] = useState({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    notes: client?.notes || '',
  })
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(client?.avatar_url || null)
  const [saving, setSaving] = useState(false)

  const t = {
    he: {
      title: 'עריכת לקוח',
      name: 'שם מלא',
      email: 'אימייל',
      phone: 'טלפון',
      address: 'כתובת',
      notes: 'הערות',
      save: 'שמור',
      photo: 'שנה תמונה'
    },
    ru: {
      title: 'Редактирование клиента',
      name: 'Полное имя',
      email: 'Email',
      phone: 'Телефон',
      address: 'Адрес',
      notes: 'Заметки',
      save: 'Сохранить',
      photo: 'Изменить фото'
    },
  }

  const l = t[locale]

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Если есть аватар — загрузить сначала
      let avatar_url = client?.avatar_url
      if (avatarFile) {
        const formData = new FormData()
        formData.append('file', avatarFile)
        formData.append('client_id', client.id)
        
        const uploadRes = await fetch('/api/clients/avatar', {
          method: 'POST',
          body: formData
        })
        
        if (uploadRes.ok) {
          const data = await uploadRes.json()
          avatar_url = data.url
        }
      }

      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, avatar_url }),
      })

      if (res.ok) {
        const updated = await res.json()
        toast.success(locale === 'he' ? 'נשמר בהצלחה' : 'Сохранено')
        onSaved(updated)
        onClose()
      } else {
        toast.error(locale === 'he' ? 'שגיאה בשמירה' : 'Ошибка сохранения')
      }
    } catch (e) {
      toast.error(locale === 'he' ? 'שגיאה' : 'Ошибка')
    }
    setSaving(false)
  }

  // Инициалы
  const initials = form.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500']
  const avatarColor = colors[(client?.name || '').charCodeAt(0) % colors.length]

  const inputClass = "w-full px-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"

  return (
    <TrinityBottomDrawer isOpen={isOpen} onClose={onClose} title={l.title}>
      {/* Аватар с загрузкой */}
      <div className="flex flex-col items-center mb-6">
        <label className="relative cursor-pointer group">
          {avatarPreview ? (
            <img src={avatarPreview} alt="" className="w-20 h-20 rounded-full object-cover" />
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

      {/* Форма */}
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{l.name} *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{l.phone}</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputClass}
            dir="ltr"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{l.email}</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
            dir="ltr"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{l.address}</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{l.notes}</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={`${inputClass} min-h-[80px] resize-none`}
            rows={3}
          />
        </div>
      </div>

      {/* Кнопка сохранить */}
      <button
        onClick={handleSave}
        disabled={saving || !form.name.trim()}
        className="w-full mt-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition"
      >
        <Save size={16} />
        {saving ? '...' : l.save}
      </button>
    </TrinityBottomDrawer>
  )
}

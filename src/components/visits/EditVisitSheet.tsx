'use client'

import { useState } from 'react'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

interface EditVisitSheetProps {
  visit: any
  isOpen: boolean
  onClose: () => void
  onSaved: (updated: any) => void
  locale: 'he' | 'ru'
  isMeetingMode?: boolean
}

export function EditVisitSheet({ visit, isOpen, onClose, onSaved, locale, isMeetingMode }: EditVisitSheetProps) {
  // Парсим текущую дату и время
  const startDate = visit?.scheduled_at ? new Date(visit.scheduled_at) : new Date()
  
  const [form, setForm] = useState({
    date: formatDateInput(startDate),
    time: formatTimeInput(startDate),
    duration: visit?.duration_minutes || 30,
    notes: visit?.notes || '',
    price: visit?.price || '',
  })
  
  const [saving, setSaving] = useState(false)

  function formatDateInput(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function formatTimeInput(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  }

  // Минимальная дата — сегодня
  const todayStr = formatDateInput(new Date())

  // Минимальное время — если выбрана сегодняшняя дата, то текущее время
  const now = new Date()
  const nowTimeStr = formatTimeInput(now)
  const minTime = form.date === todayStr ? nowTimeStr : '00:00'

  const t = {
    he: {
      title: 'עריכת ביקור',
      date: 'תאריך',
      time: 'שעה',
      duration: 'משך (דקות)',
      notes: 'הערות',
      price: 'מחיר (₪)',
      save: 'שמור',
      pastError: 'לא ניתן לבחור תאריך או שעה שעברו'
    },
    ru: {
      title: 'Редактирование визита',
      date: 'Дата',
      time: 'Время',
      duration: 'Длительность (мин)',
      notes: 'Заметки',
      price: 'Цена (₪)',
      save: 'Сохранить',
      pastError: 'Нельзя выбрать прошедшую дату или время'
    },
  }

  const l = t[locale]

  async function handleSave() {
    // Проверка на прошедшее время
    const selectedDateTime = new Date(`${form.date}T${form.time}`)
    if (selectedDateTime < new Date()) {
      toast.error(l.pastError)
      return
    }

    setSaving(true)
    try {
      const scheduled_at = new Date(`${form.date}T${form.time}`).toISOString()
      
      const res = await fetch(`/api/visits/${visit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_at,
          duration_minutes: isMeetingMode ? null : Number(form.duration),
          notes: form.notes,
          price: form.price ? Number(form.price) : null,
        }),
      })

      console.log('=== SAVE VISIT ===')
      console.log('Status:', res.status)
      const data = await res.json()
      console.log('Response:', JSON.stringify(data))

      if (res.ok) {
        toast.success(locale === 'he' ? 'נשמר בהצלחה' : 'Сохранено')
        onSaved(data)
        onClose()
      } else {
        toast.error(data.error || (locale === 'he' ? 'שגיאה' : 'Ошибка'))
      }
    } catch (e) {
      toast.error(locale === 'he' ? 'שגיאה' : 'Ошибка')
    }
    setSaving(false)
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"

  return (
    <TrinityBottomDrawer isOpen={isOpen} onClose={onClose} title={l.title}>
      <div className="space-y-3">
        {/* Дата */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{l.date} *</label>
          <input
            type="date"
            value={form.date}
            min={todayStr}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            onFocus={handleFocus}
            className={inputClass}
            dir="ltr"
          />
        </div>

        {/* Время */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{l.time} *</label>
          <input
            type="time"
            value={form.time}
            min={minTime}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
            onFocus={handleFocus}
            className={inputClass}
            dir="ltr"
          />
        </div>

        {/* Длительность — только если НЕ meeting mode */}
        {!isMeetingMode && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{l.duration}</label>
            <input
              type="number"
              value={form.duration}
              min={5}
              step={5}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              onFocus={handleFocus}
              className={inputClass}
              dir="ltr"
            />
          </div>
        )}

        {/* Цена */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{l.price}</label>
          <input
            type="number"
            value={form.price}
            min={0}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            onFocus={handleFocus}
            className={inputClass}
            dir="ltr"
          />
        </div>

        {/* Заметки */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{l.notes}</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            onFocus={handleFocus}
            className={`${inputClass} min-h-[80px] resize-none`}
            rows={3}
          />
        </div>
      </div>

      {/* Кнопка сохранить */}
      <button
        onClick={handleSave}
        disabled={saving || !form.date || !form.time}
        className="w-full mt-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition"
      >
        <Save size={16} />
        {saving ? '...' : l.save}
      </button>
    </TrinityBottomDrawer>
  )
}

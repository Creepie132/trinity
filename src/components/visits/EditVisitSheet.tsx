'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useLanguage } from '@/contexts/LanguageContext'

interface EditVisitSheetProps {
  visit: any
  isOpen: boolean
  onClose: () => void
  onSaved: (updated: any) => void
  locale?: 'he' | 'ru'
  isMeetingMode?: boolean
}

export function EditVisitSheet({ visit, isOpen, onClose, onSaved, locale: propLocale, isMeetingMode }: EditVisitSheetProps) {
  const { language } = useLanguage()
  const locale = propLocale || language
  const supabase = createSupabaseBrowserClient()
  
  // Парсим текущую дату и время
  const startDate = visit?.scheduled_at ? new Date(visit.scheduled_at) : new Date()
  
  const [form, setForm] = useState({
    date: formatDateInput(startDate),
    time: formatTimeInput(startDate),
    duration: visit?.duration_minutes || 30,
    notes: visit?.notes || '',
    price: visit?.price || '',
    serviceId: visit?.service_id || '',
  })
  
  const [services, setServices] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  
  // Load services
  useEffect(() => {
    async function loadServices() {
      const { data } = await supabase
        .from('services')
        .select('id, name, name_ru, price, duration_minutes')
        .eq('is_active', true)
        .order('name')
      
      if (data) setServices(data)
    }
    
    if (isOpen) {
      loadServices()
    }
  }, [isOpen, supabase])

  function formatDateInput(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function formatTimeInput(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
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
      service: 'שירות',
      date: 'תאריך',
      time: 'שעה',
      duration: 'משך (דקות)',
      notes: 'הערות',
      price: 'מחיר (₪)',
      save: 'שמור',
      cancel: 'ביטול',
      pastError: 'לא ניתן לבחור תאריך או שעה שעברו',
      selectService: 'בחר שירות'
    },
    ru: {
      title: 'Редактирование визита',
      service: 'Услуга',
      date: 'Дата',
      time: 'Время',
      duration: 'Длительность (мин)',
      notes: 'Заметки',
      price: 'Цена (₪)',
      save: 'Сохранить',
      cancel: 'Отмена',
      pastError: 'Нельзя выбрать прошедшую дату или время',
      selectService: 'Выберите услугу'
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
          service_id: form.serviceId || null,
          duration_minutes: isMeetingMode ? null : Number(form.duration),
          notes: form.notes,
          price: form.price ? Number(form.price) : null,
        }),
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('=== SAVE VISIT ===')
        console.log('Status:', res.status)
      }
      const data = await res.json()

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
  
  function handleServiceChange(serviceId: string) {
    const selectedService = services.find(s => s.id === serviceId)
    if (selectedService) {
      setForm({
        ...form,
        serviceId,
        price: selectedService.price?.toString() || form.price,
        duration: selectedService.duration_minutes || form.duration,
      })
    } else {
      setForm({ ...form, serviceId })
    }
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all placeholder:text-gray-400"
  const labelCls = "text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block"

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={l.title}
      width="480px"
      dir={locale === 'he' ? 'rtl' : 'ltr'}
      footer={
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all whitespace-nowrap"
          >
            {l.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.date || !form.time}
            className="flex-[1.5] py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:from-blue-600 hover:to-indigo-600 active:scale-95 transition-all shadow-sm shadow-blue-200 dark:shadow-blue-900/30 whitespace-nowrap"
          >
            <Save size={15} />
            {saving ? '...' : l.save}
          </button>
        </div>
      }
    >
      <div className="space-y-4" dir={locale === 'he' ? 'rtl' : 'ltr'}>
        {/* Date + Time side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{l.date} *</label>
            <input type="date" value={form.date} min={todayStr}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputCls} dir="ltr" />
          </div>
          <div>
            <label className={labelCls}>{l.time} *</label>
            <input type="time" value={form.time} min={minTime}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className={inputCls} dir="ltr" />
          </div>
        </div>

        {/* Service */}
        <div>
          <label className={labelCls}>{l.service}</label>
          <select value={form.serviceId} onChange={(e) => handleServiceChange(e.target.value)}
            className={inputCls}>
            <option value="">{l.selectService}</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {locale === 'he' ? service.name : (service.name_ru || service.name)}
              </option>
            ))}
          </select>
        </div>

        {/* Duration + Price side by side */}
        <div className="grid grid-cols-2 gap-3">
          {!isMeetingMode && (
            <div>
              <label className={labelCls}>{l.duration}</label>
              <input type="number" value={form.duration} min={5} step={5}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className={inputCls} dir="ltr" />
            </div>
          )}
          <div className={isMeetingMode ? 'col-span-2' : ''}>
            <label className={labelCls}>{l.price}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₪</span>
              <input type="number" value={form.price} min={0}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className={`${inputCls} pl-7`} dir="ltr" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={labelCls}>{l.notes}</label>
          <textarea value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={`${inputCls} min-h-[80px] resize-none`}
            rows={3} />
        </div>
      </div>
    </Modal>
  )
}

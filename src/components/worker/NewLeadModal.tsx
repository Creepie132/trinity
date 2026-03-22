'use client'

import { useState } from 'react'

interface NewLeadModalProps {
  open: boolean
  lang: string
  onClose: () => void
  onCreated: () => void
}

const SOURCES = [
  { value: 'whatsapp', label_ru: 'WhatsApp',     label_he: 'וואטסאפ'    },
  { value: 'referral', label_ru: 'Рекомендация', label_he: 'המלצה'       },
  { value: 'instagram',label_ru: 'Instagram',    label_he: 'אינסטגרם'   },
  { value: 'facebook', label_ru: 'Facebook',     label_he: 'פייסבוק'    },
  { value: 'website',  label_ru: 'Сайт',         label_he: 'אתר'         },
  { value: 'cold',     label_ru: 'Холодный звонок', label_he: 'שיחה קרה' },
  { value: 'other',    label_ru: 'Другое',        label_he: 'אחר'         },
]

interface FormState {
  first_name:    string
  last_name:     string
  phone:         string
  business_name: string
  amount:        string
  source:        string
}

const EMPTY: FormState = {
  first_name: '', last_name: '', phone: '',
  business_name: '', amount: '', source: '',
}

export function NewLeadModal({ open, lang, onClose, onCreated }: NewLeadModalProps) {
  const [form,    setForm]    = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const isHe = lang === 'he'

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const isValid = form.first_name.trim().length > 0 && form.phone.trim().length >= 7

  const handleSubmit = async () => {
    if (!isValid || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/worker/leads', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name:    form.first_name.trim(),
          last_name:     form.last_name.trim() || undefined,
          phone:         form.phone.trim(),
          business_name: form.business_name.trim() || undefined,
          amount:        form.amount ? parseFloat(form.amount) : 0,
          source:        form.source || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setForm(EMPTY)
        onCreated()
        onClose()
      }, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white w-full sm:max-w-md sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-250"
        dir={isHe ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-5 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 end-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">🎯</div>
            <div>
              <h2 className="text-lg font-bold">{isHe ? 'ליד חדש' : 'Новый лид'}</h2>
              <p className="text-indigo-200 text-xs">{isHe ? 'הוסף לקוח לפייפליין' : 'Добавить в воронку'}</p>
            </div>
          </div>
        </div>

        {/* Success state */}
        {success ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl animate-bounce">✅</div>
            <p className="font-bold text-gray-800">{isHe ? 'הליד נוסף בהצלחה!' : 'Лид добавлен!'}</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">

            {/* Row 1: Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {isHe ? 'שם פרטי *' : 'Имя *'}
                </label>
                <input
                  value={form.first_name}
                  onChange={set('first_name')}
                  placeholder={isHe ? 'יוסי' : 'Иван'}
                  className="w-full border border-gray-200 focus:border-indigo-400 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {isHe ? 'שם משפחה' : 'Фамилия'}
                </label>
                <input
                  value={form.last_name}
                  onChange={set('last_name')}
                  placeholder={isHe ? 'כהן' : 'Иванов'}
                  className="w-full border border-gray-200 focus:border-indigo-400 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {isHe ? 'טלפון *' : 'Телефон *'}
              </label>
              <input
                value={form.phone}
                onChange={set('phone')}
                placeholder="050-0000000"
                type="tel"
                dir="ltr"
                className="w-full border border-gray-200 focus:border-indigo-400 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
              />
            </div>

            {/* Business / deal title */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {isHe ? 'שם עסק / נושא עסקה' : 'Название бизнеса / тема сделки'}
              </label>
              <input
                value={form.business_name}
                onChange={set('business_name')}
                placeholder={isHe ? 'למשל: Trinity CRM' : 'Напр: Подключение Trinity'}
                className="w-full border border-gray-200 focus:border-indigo-400 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
              />
            </div>

            {/* Amount + Source */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {isHe ? 'סכום עסקה (₪)' : 'Сумма сделки (₪)'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 start-3 flex items-center text-gray-400 text-sm">₪</span>
                  <input
                    value={form.amount}
                    onChange={set('amount')}
                    placeholder="0"
                    type="number"
                    min={0}
                    dir="ltr"
                    className="w-full border border-gray-200 focus:border-indigo-400 rounded-xl ps-7 pe-3 py-2.5 text-sm outline-none transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {isHe ? 'מקור' : 'Источник'}
                </label>
                <select
                  value={form.source}
                  onChange={set('source')}
                  className="w-full border border-gray-200 focus:border-indigo-400 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors bg-white"
                >
                  <option value="">{isHe ? 'בחר...' : 'Выбрать...'}</option>
                  {SOURCES.map(s => (
                    <option key={s.value} value={s.value}>
                      {isHe ? s.label_he : s.label_ru}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1 pb-1">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                {isHe ? 'ביטול' : 'Отмена'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!isValid || loading}
                className="flex-2 flex-1 px-4 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {isHe ? 'הוסף לפייפליין' : 'Добавить в воронку'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

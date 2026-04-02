'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { ShoppingBag, ChevronLeft, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const T = {
  ru: {
    back: 'Настройки',
    title: 'Настройки продаж',
    subtitle: 'Управление поведением модуля продаж',
    alwaysPaidTitle: 'Автоматически считать сделку оплаченной',
    alwaysPaidDesc: 'При создании сделки наличными — сумма автоматически считается оплаченной. Поле ввода суммы и пересчёт сдачи не показываются.',
    saving: 'Сохраняем...',
    saved: 'Сохранено',
    errorLoad: 'Ошибка загрузки настроек',
    errorSave: 'Ошибка сохранения',
    loading: 'Загрузка...',
  },
  he: {
    back: 'הגדרות',
    title: 'הגדרות מכירות',
    subtitle: 'ניהול התנהגות מודול המכירות',
    alwaysPaidTitle: 'סמן עסקה כשולמה אוטומטית',
    alwaysPaidDesc: 'בעת יצירת עסקה במזומן — הסכום נחשב כשולם אוטומטית. שדה הזנת סכום וחישוב עודף לא יוצגו.',
    saving: 'שומר...',
    saved: 'נשמר',
    errorLoad: 'שגיאה בטעינת הגדרות',
    errorSave: 'שגיאה בשמירה',
    loading: 'טוען...',
  },
}

export default function SalesSettingsPage() {
  const { language } = useLanguage()
  const router = useRouter()
  const t = T[language as 'ru' | 'he'] ?? T.ru
  const isRTL = language === 'he'

  const [alwaysPaid, setAlwaysPaid] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    fetch('/api/settings/sales')
      .then(r => r.json())
      .then(d => { setAlwaysPaid(d.sale_always_paid ?? false) })
      .catch(() => toast.error(t.errorLoad))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle(value: boolean) {
    setAlwaysPaid(value)
    setSaving(true)
    try {
      const res = await fetch('/api/settings/sales', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale_always_paid: value }),
      })
      if (!res.ok) throw new Error()
      toast.success(t.saved)
    } catch {
      setAlwaysPaid(!value) // откат
      toast.error(t.errorSave)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Назад */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {t.back}
      </button>

      {/* Заголовок */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
          <ShoppingBag className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
      </div>

      {/* Карточки настроек */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-5 space-y-1">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold">{t.alwaysPaidTitle}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.alwaysPaidDesc}</p>
            </div>
            {/* Тумблер */}
            <div className="flex-shrink-0 flex items-center gap-2 mt-0.5">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              <button
                onClick={() => !saving && handleToggle(!alwaysPaid)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-60
                  ${alwaysPaid ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                role="switch"
                aria-checked={alwaysPaid}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200
                  ${alwaysPaid ? (isRTL ? '-translate-x-6' : 'translate-x-6') : (isRTL ? '-translate-x-1' : 'translate-x-1')}`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageCircle, ArrowRight, ArrowLeft, Save, CreditCard,
  Bell, ShoppingBag, Gift, UserX, CheckCircle2, Zap,
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { apiFetch } from '@/lib/api-fetch'
import { toast } from 'sonner'

interface Trigger {
  trigger_type: string
  is_enabled: boolean
  message_template: string
  hours_before?: number | null
  delay_hours?: number | null
  win_back_days?: number | null
}

const TRIGGER_META: Record<string, {
  icon: React.ElementType; color: string
  label_he: string; label_ru: string
  desc_he: string; desc_ru: string
  showHoursBefore?: boolean; showDelayHours?: boolean; showWinBackDays?: boolean
  vars: string[]
}> = {
  visit_reminder:  { icon: Bell,          color: 'blue',
    label_he: 'תזכורת לפני תור',      label_ru: 'Напоминание до визита',
    desc_he:  'נשלח לפני מועד התור',  desc_ru:  'Отправляется перед визитом',
    showHoursBefore: true, vars: ['{{client_name}}','{{date}}','{{time}}','{{service}}','{{org_name}}'] },
  visit_created:   { icon: Bell,          color: 'indigo',
    label_he: 'אישור תור חדש',         label_ru: 'Подтверждение визита',
    desc_he:  'נשלח כשנוצר תור חדש',  desc_ru:  'Отправляется при создании визита',
    vars: ['{{client_name}}','{{date}}','{{time}}','{{service}}','{{org_name}}'] },
  visit_completed: { icon: CheckCircle2, color: 'green',
    label_he: 'אחרי סיום תור',         label_ru: 'После завершения визита',
    desc_he:  'נשלח כשהתור הושלם',    desc_ru:  'Отправляется когда визит завершён',
    showDelayHours: true, vars: ['{{client_name}}','{{service}}','{{org_name}}'] },
  after_visit:     { icon: MessageCircle, color: 'teal',
    label_he: 'הודעה אחרי ביקור',      label_ru: 'Сообщение после визита',
    desc_he:  'תודה + בקשת ביקורת',   desc_ru:  'Благодарность + просьба об отзыве',
    showDelayHours: true, vars: ['{{client_name}}','{{service}}','{{org_name}}'] },
  after_sale:      { icon: ShoppingBag,  color: 'purple',
    label_he: 'אחרי רכישה',            label_ru: 'После покупки',
    desc_he:  'נשלח לאחר תשלום',      desc_ru:  'Отправляется после оплаты',
    showDelayHours: true, vars: ['{{client_name}}','{{amount}}','{{org_name}}'] },
  birthday:        { icon: Gift,         color: 'pink',
    label_he: 'יום הולדת',             label_ru: 'День рождения',
    desc_he:  'נשלח ביום ההולדת',     desc_ru:  'Отправляется в день рождения',
    vars: ['{{client_name}}','{{org_name}}'] },
  win_back:        { icon: UserX,        color: 'orange',
    label_he: 'לקוח לא חזר',           label_ru: 'Клиент не возвращается',
    desc_he:  'ללקוחות שלא ביקרו זמן רב', desc_ru: 'Клиентам которые давно не приходили',
    showWinBackDays: true, vars: ['{{client_name}}','{{org_name}}'] },
  debt_reminder:   { icon: CreditCard,   color: 'red',
    label_he: 'תזכורת חוב',            label_ru: 'Напоминание о долге',
    desc_he:  'ללקוחות עם תשלום פתוח', desc_ru:  'Клиентам с открытым долгом',
    vars: ['{{client_name}}','{{amount}}','{{org_name}}'] },
  client_added:    { icon: Zap,          color: 'cyan',
    label_he: 'ברוך הבא לקוח חדש',     label_ru: 'Приветствие нового клиента',
    desc_he:  'נשלח כשלקוח נוסף',     desc_ru:  'Отправляется при добавлении клиента',
    vars: ['{{client_name}}','{{org_name}}'] },
  payment_link_created: { icon: CreditCard, color: 'emerald',
    label_he: 'קישור לתשלום נוצר',     label_ru: 'Создана ссылка на оплату',
    desc_he:  'נשלח ללקוח כשנוצר קישור תשלום',
    desc_ru:  'Отправляется клиенту при создании ссылки на оплату',
    vars: ['{{client_name}}','{{amount}}','{{payment_link}}','{{org_name}}'] },
}

const COLOR_BG: Record<string,string> = {
  blue:    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  indigo:  'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  green:   'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  teal:    'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  purple:  'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  pink:    'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  orange:  'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  red:     'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  cyan:    'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
}

// ─── TriggerCard ──────────────────────────────────────────────────────────────

function TriggerCard({
  trigger, meta, lang, onChange,
}: {
  trigger: Trigger
  meta: typeof TRIGGER_META[string]
  lang: 'he' | 'ru'
  onChange: (t: Trigger) => void
}) {
  const [open, setOpen] = useState(false)
  const Icon = meta.icon
  const isHe = lang === 'he'

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all ${
      trigger.is_enabled
        ? 'border-green-300 dark:border-green-700'
        : 'border-gray-200 dark:border-slate-700'
    }`}>
      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${COLOR_BG[meta.color]}`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {isHe ? meta.label_he : meta.label_ru}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {isHe ? meta.desc_he : meta.desc_ru}
          </p>
        </div>
        {/* Toggle */}
        <button
          onClick={() => onChange({ ...trigger, is_enabled: !trigger.is_enabled })}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
            trigger.is_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'
          }`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
            trigger.is_enabled ? 'left-6' : 'left-1'
          }`} />
        </button>
        {/* Expand */}
        <button
          onClick={() => setOpen(v => !v)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1"
        >
          {open
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="18 15 12 9 6 15"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6 9 12 15 18 9"/></svg>
          }
        </button>
      </div>

      {/* Expanded settings */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-slate-800 pt-3">

          {/* hours_before */}
          {meta.showHoursBefore && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {isHe ? 'שעות לפני התור' : 'Часов до визита'}
              </label>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={72}
                  value={trigger.hours_before ?? 24}
                  onChange={e => onChange({ ...trigger, hours_before: parseInt(e.target.value) || 24 })}
                  className="w-20 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <span className="text-sm text-gray-500">{isHe ? 'שעות' : 'часов'}</span>
              </div>
            </div>
          )}

          {/* delay_hours */}
          {meta.showDelayHours && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {isHe ? 'שעות אחרי האירוע' : 'Часов после события'}
              </label>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={72}
                  value={trigger.delay_hours ?? 1}
                  onChange={e => onChange({ ...trigger, delay_hours: parseInt(e.target.value) || 1 })}
                  className="w-20 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <span className="text-sm text-gray-500">{isHe ? 'שעות' : 'часов'}</span>
              </div>
            </div>
          )}

          {/* win_back_days */}
          {meta.showWinBackDays && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {isHe ? 'ימים ללא ביקור' : 'Дней без визита'}
              </label>
              <div className="flex items-center gap-2">
                <input type="number" min={7} max={365}
                  value={trigger.win_back_days ?? 60}
                  onChange={e => onChange({ ...trigger, win_back_days: parseInt(e.target.value) || 60 })}
                  className="w-24 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <span className="text-sm text-gray-500">{isHe ? 'ימים' : 'дней'}</span>
              </div>
            </div>
          )}

          {/* Message template */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {isHe ? 'תבנית הודעה' : 'Шаблон сообщения'}
            </label>
            <textarea
              rows={4}
              value={trigger.message_template}
              onChange={e => onChange({ ...trigger, message_template: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400 resize-none font-mono"
              dir="auto"
            />
            {/* Variables hint */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {meta.vars.map(v => (
                <button key={v}
                  onClick={() => onChange({ ...trigger, message_template: trigger.message_template + v })}
                  className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-xs text-gray-500 dark:text-gray-400 hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors font-mono"
                >{v}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WATriggerSettingsPage() {
  const router = useRouter()
  const { language, dir } = useLanguage()
  const isHe = language === 'he'

  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [triggers, setTriggers] = useState<Trigger[]>([])

  // Ordered display list
  const ORDER = [
    'visit_reminder','visit_created','visit_completed',
    'after_visit','after_sale','payment_link_created',
    'birthday','win_back','debt_reminder','client_added',
  ]

  useEffect(() => {
    apiFetch<{ triggers: Trigger[] }>('/api/wa-triggers')
      .then(data => {
        // Merge with defaults for any missing types
        const existing = data.triggers ?? []
        const merged = ORDER.map(type => {
          const found = existing.find(t => t.trigger_type === type)
          return found ?? {
            trigger_type: type, is_enabled: false,
            message_template: '', hours_before: null,
            delay_hours: 1, win_back_days: 60,
          }
        })
        setTriggers(merged)
      })
      .catch(() => toast.error(isHe ? 'שגיאה בטעינה' : 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [])

  const updateTrigger = useCallback((updated: Trigger) => {
    setTriggers(prev => prev.map(t =>
      t.trigger_type === updated.trigger_type ? updated : t
    ))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiFetch('/api/wa-triggers', { method: 'POST', json: { triggers } })
      toast.success(isHe ? 'הגדרות נשמרו!' : 'Настройки сохранены!')
    } catch (err: any) {
      toast.error(isHe ? 'שגיאה בשמירה' : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const enabledCount = triggers.filter(t => t.is_enabled).length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5" dir={dir}>

      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/settings/whatsapp')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          {dir === 'rtl'
            ? <ArrowLeft size={14} />
            : <ArrowRight size={14} className="rotate-180" />
          }
          {isHe ? 'חזרה להגדרות WhatsApp' : 'Назад к настройкам WhatsApp'}
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {isHe ? 'הודעות אוטומטיות' : 'Автоматические сообщения'}
            </h1>
            <p className="text-sm text-gray-500">
              {isHe
                ? `${enabledCount} מתוך ${triggers.length} פעילים`
                : `${enabledCount} из ${triggers.length} активно`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Trigger cards */}
      <div className="space-y-3">
        {triggers.map(trigger => {
          const meta = TRIGGER_META[trigger.trigger_type]
          if (!meta) return null
          return (
            <TriggerCard
              key={trigger.trigger_type}
              trigger={trigger}
              meta={meta}
              lang={language as 'he' | 'ru'}
              onChange={updateTrigger}
            />
          )
        })}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-2xl bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors sticky bottom-4 shadow-lg shadow-green-500/20"
      >
        {saving
          ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {isHe ? 'שומר...' : 'Сохранение...'}</>
          : <><Save size={16} />{isHe ? 'שמור הגדרות' : 'Сохранить настройки'}</>
        }
      </button>
    </div>
  )
}

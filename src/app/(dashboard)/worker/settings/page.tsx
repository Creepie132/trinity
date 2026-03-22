'use client'

import { useState, useEffect } from 'react'
import { Globe, Bell, Smartphone, Check, Calendar, CreditCard, UserPlus, Cake, Clock, Package } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useLanguage, Language } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { usePushSettings, type PushSettings } from '@/hooks/usePushSettings'
import { toast } from 'sonner'

// ─── Push event config ────────────────────────────────────────────────────────

interface PushEventConfig {
  key: keyof PushSettings
  icon: React.ElementType
  labelHe: string
  labelRu: string
  descHe: string
  descRu: string
}

const PUSH_EVENTS: PushEventConfig[] = [
  { key: 'new_visit', icon: Calendar,
    labelHe: 'ביקור / הזמנה חדשה', labelRu: 'Новый визит / бронь',
    descHe: 'כשנוצרת הזמנה', descRu: 'При создании записи' },
  { key: 'visit_reminder', icon: Clock,
    labelHe: 'תזכורות ביקור', labelRu: 'Напоминания о визите',
    descHe: '4ש׳ / שעה / 30 דק׳ לפני', descRu: 'За 4ч/1ч/30мин до' },
  { key: 'new_payment', icon: CreditCard,
    labelHe: 'תשלום חדש', labelRu: 'Новый платёж',
    descHe: 'כשמתקבל תשלום', descRu: 'При получении платежа' },
  { key: 'task_mentions', icon: Bell,
    labelHe: 'משימות', labelRu: 'Задачи',
    descHe: 'הקצאה, ציון, דדליין', descRu: 'Назначение, упоминание, дедлайн' },
  { key: 'stock_alerts', icon: Package,
    labelHe: 'התראות מלאי', labelRu: 'Уведомления о складе',
    descHe: 'מוצר מגיע לסף נמוך', descRu: 'Товар заканчивается' },
  { key: 'new_client', icon: UserPlus,
    labelHe: 'לקוח חדש', labelRu: 'Новый клиент',
    descHe: 'כשמתווסף לקוח חדש', descRu: 'При добавлении клиента' },
  { key: 'birthday', icon: Cake,
    labelHe: 'יום הולדת', labelRu: 'День рождения',
    descHe: 'ביום הולדת של לקוח', descRu: 'В день рождения клиента' },
]

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
          {icon}
        </div>
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

// ─── Language section ─────────────────────────────────────────────────────────

function LanguageSection({ isHe }: { isHe: boolean }) {
  const { language, setLanguage } = useLanguage()

  const options: { id: Language; flag: string; labelHe: string; labelRu: string; dir: 'rtl' | 'ltr' }[] = [
    { id: 'he', flag: '🇮🇱', labelHe: 'עברית', labelRu: 'Иврит', dir: 'rtl' },
    { id: 'ru', flag: '🇷🇺', labelHe: 'רוסית', labelRu: 'Русский', dir: 'ltr' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => setLanguage(opt.id)}
          className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
            language === opt.id
              ? 'border-indigo-500 bg-indigo-50 shadow-sm'
              : 'border-gray-200 hover:border-gray-300 bg-white/50'
          }`}
        >
          <span className="text-3xl">{opt.flag}</span>
          <span className="text-sm font-semibold text-gray-900">
            {isHe ? opt.labelHe : opt.labelRu}
          </span>
          {language === opt.id && (
            <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Notifications section ────────────────────────────────────────────────────

function NotificationsSection({ isHe }: { isHe: boolean }) {
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()
  const [telegramEnabled, setTelegramEnabled] = useState(false)
  const [chatId, setChatId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const { permissionState, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications()
  const { settings: pushSettings, saving: pushSaving, updateSetting } = usePushSettings()

  useEffect(() => {
    if (!orgId) return
    const load = async () => {
      const { data } = await supabase
        .from('organizations')
        .select('telegram_chat_id, telegram_notifications')
        .eq('id', orgId)
        .single()
      if (data) { setTelegramEnabled(data.telegram_notifications || false); setChatId(data.telegram_chat_id || '') }
      setLoading(false)
    }
    load()
  }, [orgId])

  const saveTelegram = async () => {
    if (!orgId) return
    setSaving(true)
    const { error } = await supabase
      .from('organizations')
      .update({ telegram_notifications: telegramEnabled, telegram_chat_id: chatId || null })
      .eq('id', orgId)
    setSaving(false)
    if (error) toast.error(isHe ? 'שגיאה בשמירה' : 'Ошибка сохранения')
    else toast.success(isHe ? 'נשמר!' : 'Сохранено!')
  }

  const handleTogglePush = async () => {
    if (isSubscribed) {
      await unsubscribe()
      toast.success(isHe ? 'התראות כובו' : 'Уведомления отключены')
    } else {
      const ok = await subscribe()
      if (ok) toast.success(isHe ? 'התראות הופעלו!' : 'Уведомления включены!')
      else toast.error(isHe ? 'לא ניתן להפעיל' : 'Не удалось включить')
    }
  }

  const pushDenied = permissionState === 'denied'
  const pushUnsupported = permissionState === 'unsupported'
  const pushActive = permissionState === 'granted' && isSubscribed

  if (loading) return <div className="h-20 animate-pulse bg-gray-100 rounded-xl" />

  return (
    <div className="space-y-5">
      {/* Push */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
          {isHe ? 'התראות Push' : 'Push уведомления'}
        </p>
        {/* Master toggle */}
        <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-gray-50">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {isHe ? 'התראות במכשיר' : 'Уведомления на устройстве'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {pushUnsupported ? (isHe ? 'לא נתמך' : 'Не поддерживается')
                : pushDenied ? (isHe ? 'חסום בדפדפן' : 'Заблокировано в браузере')
                : pushActive ? (isHe ? 'פעיל' : 'Активно')
                : (isHe ? 'לא פעיל' : 'Неактивно')}
            </p>
          </div>
          <Switch checked={pushActive} onCheckedChange={handleTogglePush}
            disabled={pushLoading || pushUnsupported || pushDenied} />
        </div>

        {/* Per-event toggles */}
        {pushActive && (
          <div className="space-y-1">
            {PUSH_EVENTS.map(ev => {
              const Icon = ev.icon
              return (
                <div key={ev.key} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{isHe ? ev.labelHe : ev.labelRu}</p>
                      <p className="text-xs text-gray-400">{isHe ? ev.descHe : ev.descRu}</p>
                    </div>
                  </div>
                  <Switch checked={pushSettings[ev.key]} onCheckedChange={v => updateSetting(ev.key, v)} disabled={pushSaving} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Telegram */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Telegram</p>
        <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-gray-50">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {isHe ? 'התראות Telegram' : 'Уведомления в Telegram'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isHe ? 'קבל עדכונים ישירות בבוט' : 'Получайте обновления в бот'}
            </p>
          </div>
          <Switch checked={telegramEnabled} onCheckedChange={setTelegramEnabled} />
        </div>

        {telegramEnabled && (
          <div className="space-y-3 px-1">
            <div>
              <Label className="text-xs font-semibold text-gray-600">Chat ID</Label>
              <Input
                value={chatId}
                onChange={e => setChatId(e.target.value)}
                placeholder="123456789"
                className="font-mono mt-1.5 text-sm"
              />
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-800 mb-1.5">
                {isHe ? 'איך מקבלים Chat ID:' : 'Как получить Chat ID:'}
              </p>
              <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                <li>{isHe ? 'חפש' : 'Найди'} <code className="bg-blue-100 px-1 rounded">@userinfobot</code> {isHe ? 'ב-Telegram' : 'в Telegram'}</li>
                <li>{isHe ? 'שלח' : 'Отправь'} <code className="bg-blue-100 px-1 rounded">/start</code></li>
                <li>{isHe ? 'העתק את ה-Chat ID' : 'Скопируй Chat ID из ответа'}</li>
              </ol>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button size="sm" onClick={saveTelegram} disabled={saving}>
            {saving ? '...' : (isHe ? 'שמור' : 'Сохранить')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkerSettingsPage() {
  const { language } = useLanguage()
  const isHe = language === 'he'

  return (
    <div className="min-h-full p-4 lg:p-6 space-y-5" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-gray-900">
          {isHe ? '⚙️ הגדרות' : '⚙️ Настройки'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isHe ? 'התאם אישית את החשבון שלך' : 'Персонализируй свой аккаунт'}
        </p>
      </div>

      {/* Language */}
      <Section
        title={isHe ? 'שפה' : 'Язык'}
        icon={<Globe className="w-4 h-4" />}
      >
        <LanguageSection isHe={isHe} />
      </Section>

      {/* Notifications */}
      <Section
        title={isHe ? 'התראות' : 'Уведомления'}
        icon={<Bell className="w-4 h-4" />}
      >
        <NotificationsSection isHe={isHe} />
      </Section>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Bell, Smartphone, Calendar, CreditCard, UserPlus, Cake, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { usePushSettings, type PushSettings } from '@/hooks/usePushSettings'

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
  {
    key: 'new_visit',
    icon: Calendar,
    labelHe: 'ביקור חדש',
    labelRu: 'Новый визит',
    descHe: 'כשנוצרת תור חדש במערכת',
    descRu: 'При создании новой записи',
  },
  {
    key: 'visit_reminder',
    icon: Clock,
    labelHe: 'תזכורת לביקור',
    labelRu: 'Напоминание о визите',
    descHe: 'שעה לפני הביקור המתוזמן',
    descRu: 'За час до запланированного визита',
  },
  {
    key: 'new_payment',
    icon: CreditCard,
    labelHe: 'תשלום חדש',
    labelRu: 'Новый платёж',
    descHe: 'כשמתקבל תשלום מלקוח',
    descRu: 'При получении платежа от клиента',
  },
  {
    key: 'new_client',
    icon: UserPlus,
    labelHe: 'לקוח חדש',
    labelRu: 'Новый клиент',
    descHe: 'כשמתווסף לקוח חדש למערכת',
    descRu: 'При добавлении нового клиента',
  },
  {
    key: 'birthday',
    icon: Cake,
    labelHe: 'יום הולדת',
    labelRu: 'День рождения',
    descHe: 'ביום הולדת של לקוח',
    descRu: 'В день рождения клиента',
  },
]

export default function NotificationsPage() {
  const router = useRouter()
  const { dir, language } = useLanguage()
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()
  const isHe = language === 'he'

  // Telegram state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [telegramEnabled, setTelegramEnabled] = useState(false)
  const [chatId, setChatId] = useState('')

  // Push state
  const {
    permissionState,
    isSubscribed,
    isLoading: pushLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications()
  const { settings: pushSettings, saving: pushSaving, updateSetting } = usePushSettings()

  useEffect(() => {
    const loadSettings = async () => {
      if (!orgId) return
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('telegram_chat_id, telegram_notifications')
          .eq('id', orgId)
          .single()
        if (error) throw error
        if (data) {
          setTelegramEnabled(data.telegram_notifications || false)
          setChatId(data.telegram_chat_id || '')
        }
      } catch {
        toast.error(isHe ? 'שגיאה בטעינת הגדרות' : 'Ошибка загрузки настроек')
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [orgId])

  const handleSaveTelegram = async () => {
    if (!orgId) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ telegram_notifications: telegramEnabled, telegram_chat_id: chatId || null })
        .eq('id', orgId)
      if (error) throw error
      toast.success(isHe ? 'הגדרות נשמרו!' : 'Настройки сохранены!')
    } catch {
      toast.error(isHe ? 'שגיאה בשמירה' : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePush = async () => {
    if (isSubscribed) {
      await unsubscribe()
      toast.success(isHe ? 'התראות כובו' : 'Уведомления отключены')
    } else {
      const ok = await subscribe()
      if (ok) toast.success(isHe ? 'התראות הופעלו!' : 'Уведомления включены!')
      else toast.error(isHe ? 'לא ניתן להפעיל התראות' : 'Не удалось включить уведомления')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-400">...</div></div>
  }

  const pushDenied = permissionState === 'denied'
  const pushUnsupported = permissionState === 'unsupported'
  const pushActive = permissionState === 'granted' && isSubscribed

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/settings')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowRight className={`w-6 h-6 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isHe ? 'התראות' : 'Уведомления'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isHe ? 'נהל את ההתראות שלך' : 'Управляйте уведомлениями'}
          </p>
        </div>
      </div>

      {/* ── PUSH NOTIFICATIONS ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-indigo-600" />
            </div>
            {isHe ? 'התראות Push' : 'Push уведомления'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Master toggle — enable/disable push */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div dir={dir}>
              <p className="text-sm font-medium text-gray-900">
                {isHe ? 'התראות במכשיר' : 'Уведомления на устройстве'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {pushUnsupported
                  ? (isHe ? 'לא נתמך בדפדפן זה' : 'Не поддерживается в этом браузере')
                  : pushDenied
                  ? (isHe ? 'חסום — אפשר בהגדרות הדפדפן' : 'Заблокировано — разрешите в настройках браузера')
                  : pushActive
                  ? (isHe ? 'פעיל על המכשיר הזה' : 'Активно на этом устройстве')
                  : (isHe ? 'לא מופעל' : 'Не активировано')}
              </p>
            </div>
            <Switch
              checked={pushActive}
              onCheckedChange={handleTogglePush}
              disabled={pushLoading || pushUnsupported || pushDenied}
            />
          </div>

          {/* Per-event toggles — only shown when push is active */}
          {pushActive && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3" dir={dir}>
                {isHe ? 'קבל התראה על:' : 'Получать уведомления о:'}
              </p>
              {PUSH_EVENTS.map((event) => {
                const Icon = event.icon
                return (
                  <div
                    key={event.key}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3" dir={dir}>
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {isHe ? event.labelHe : event.labelRu}
                        </p>
                        <p className="text-xs text-gray-500">
                          {isHe ? event.descHe : event.descRu}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={pushSettings[event.key]}
                      onCheckedChange={(val) => updateSetting(event.key, val)}
                      disabled={pushSaving}
                    />
                  </div>
                )
              })}
            </div>
          )}

          {/* Hint for iOS users */}
          {permissionState === 'prompt' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3" dir={dir}>
              <p className="text-xs text-amber-800">
                {isHe
                  ? '💡 במכשיר iOS — יש להתקין את האפליקציה על מסך הבית כדי לקבל התראות'
                  : '💡 На iOS — установите приложение на главный экран для получения уведомлений'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── TELEGRAM ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Bell className="w-4 h-4 text-blue-600" />
            </div>
            Telegram
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div dir={dir}>
              <p className="text-sm font-medium text-gray-900">
                {isHe ? 'התראות Telegram' : 'Уведомления Telegram'}
              </p>
              <p className="text-xs text-gray-500">
                {isHe ? 'קבל עדכונים ישירות ב-Telegram' : 'Получайте обновления прямо в Telegram'}
              </p>
            </div>
            <Switch checked={telegramEnabled} onCheckedChange={setTelegramEnabled} />
          </div>

          {telegramEnabled && (
            <div className="space-y-3">
              <div dir={dir}>
                <Label htmlFor="chat-id" className="text-sm font-medium">Chat ID</Label>
                <Input
                  id="chat-id"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="123456789"
                  className="font-mono mt-1.5"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3" dir={dir}>
                <p className="text-xs font-semibold text-blue-900 mb-2">
                  {isHe ? 'איך מקבלים Chat ID:' : 'Как получить Chat ID:'}
                </p>
                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                  <li>{isHe ? 'חפש' : 'Найди'} <code className="bg-blue-100 px-1 rounded">@userinfobot</code> {isHe ? 'ב-Telegram' : 'в Telegram'}</li>
                  <li>{isHe ? 'שלח' : 'Отправь'} <code className="bg-blue-100 px-1 rounded">/start</code></li>
                  <li>{isHe ? 'העתק את ה-Chat ID מהתשובה' : 'Скопируй Chat ID из ответа'}</li>
                </ol>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Telegram */}
      <div className="flex justify-end">
        <Button onClick={handleSaveTelegram} disabled={saving}>
          {saving ? '...' : (isHe ? 'שמור' : 'Сохранить')}
        </Button>
      </div>
    </div>
  )
}

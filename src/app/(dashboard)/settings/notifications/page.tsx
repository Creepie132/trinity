'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, Bell, Smartphone, Calendar, CreditCard,
  UserPlus, Cake, Clock, Package, MessageCircle, Shield,
  Bot, ChevronRight, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'
import { useDemoMode } from '@/hooks/useDemoMode'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { usePushSettings, type PushSettings } from '@/hooks/usePushSettings'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotifChannels {
  push: boolean
  telegram: boolean
  email: boolean
}

interface NotificationPreferences {
  [eventKey: string]: NotifChannels
}

const DEFAULT_CHANNELS: NotifChannels = { push: true, telegram: false, email: false }

// ─── Push event config ────────────────────────────────────────────────────────

interface EventConfig {
  key: string
  icon: React.ElementType
  labelHe: string
  labelRu: string
  descHe: string
  descRu: string
  group: 'visits' | 'shop' | 'whatsapp_ai' | 'security'
}

const EVENTS: EventConfig[] = [
  {
    key: 'new_visit',
    icon: Calendar,
    group: 'visits',
    labelHe: 'ביקור / הזמנה חדשה',
    labelRu: 'Новый визит / бронь',
    descHe: 'כשנוצרת הזמנה — ידנית או דרך קישור',
    descRu: 'При создании записи — вручную или по ссылке',
  },
  {
    key: 'visit_reminder',
    icon: Clock,
    group: 'visits',
    labelHe: 'תזכורות ביקור',
    labelRu: 'Напоминания о визите',
    descHe: '4ש׳ / שעה / 30 דק׳ לפני',
    descRu: 'За 4ч / 1ч / 30мин до визита',
  },
  {
    key: 'birthday',
    icon: Cake,
    group: 'visits',
    labelHe: 'יום הולדת',
    labelRu: 'День рождения',
    descHe: 'ביום הולדת של לקוח',
    descRu: 'В день рождения клиента',
  },
  {
    key: 'new_client',
    icon: UserPlus,
    group: 'visits',
    labelHe: 'לקוח חדש',
    labelRu: 'Новый клиент',
    descHe: 'כשמתווסף לקוח חדש',
    descRu: 'При добавлении нового клиента',
  },
  {
    key: 'new_payment',
    icon: CreditCard,
    group: 'shop',
    labelHe: 'תשלום חדש',
    labelRu: 'Новый платёж',
    descHe: 'כשמתקבל תשלום מלקוח',
    descRu: 'При получении платежа от клиента',
  },
  {
    key: 'stock_alerts',
    icon: Package,
    group: 'shop',
    labelHe: 'התראות מלאי',
    labelRu: 'Уведомления о складе',
    descHe: 'מוצר מגיע לסף נמוך או נגמר',
    descRu: 'Товар заканчивается или закончился',
  },
  {
    key: 'new_order',
    icon: MessageCircle,
    group: 'shop',
    labelHe: 'הזמנה חדשה מהאתר',
    labelRu: 'Новый заказ с сайта',
    descHe: 'הזמנה שהגיעה דרך האתר שלך',
    descRu: 'Заказ пришёл через ваш сайт',
  },
  {
    key: 'ai_fallback',
    icon: Bot,
    group: 'whatsapp_ai',
    labelHe: 'Kira AI — לא הצליח לענות',
    labelRu: 'Kira AI — не смог ответить',
    descHe: 'כשה-AI לא הצליח לענות ללקוח',
    descRu: 'Когда AI не справился с вопросом клиента',
  },
  {
    key: 'task_mentions',
    icon: Bell,
    group: 'whatsapp_ai',
    labelHe: 'משימות',
    labelRu: 'Задачи',
    descHe: 'הקצאה, ציון, ביצוע, דדליין',
    descRu: 'Назначение, выполнение, дедлайн',
  },
  {
    key: 'security_login',
    icon: Shield,
    group: 'security',
    labelHe: 'כניסה חדשה לחשבון',
    labelRu: 'Новый вход в аккаунт',
    descHe: 'כניסה ממכשיר או דפדפן חדש',
    descRu: 'Вход с нового устройства или браузера',
  },
]

const GROUPS = [
  {
    key: 'visits' as const,
    icon: Calendar,
    labelHe: 'ביקורים',
    labelRu: 'Визиты',
    color: 'indigo',
  },
  {
    key: 'shop' as const,
    icon: Package,
    labelHe: 'מכירות ומלאי',
    labelRu: 'Продажи и склад',
    color: 'emerald',
  },
  {
    key: 'whatsapp_ai' as const,
    icon: Bot,
    labelHe: 'WhatsApp / AI',
    labelRu: 'WhatsApp / AI',
    color: 'violet',
  },
  {
    key: 'security' as const,
    icon: Shield,
    labelHe: 'אבטחה',
    labelRu: 'Безопасность',
    color: 'rose',
  },
]

// Color map for groups
const GROUP_COLORS: Record<string, string> = {
  indigo: 'bg-indigo-100 text-indigo-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  violet: 'bg-violet-100 text-violet-600',
  rose: 'bg-rose-100 text-rose-600',
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter()
  const { dir, language } = useLanguage()
  const { orgId } = useAuth()
  const { isDemo } = useDemoMode()               // ← ФИКС: хук теперь вверху компонента
  const supabase = createSupabaseBrowserClient()
  const isHe = language === 'he'

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [telegramEnabled, setTelegramEnabled] = useState(false)
  const [chatId, setChatId] = useState('')
  const [savingTelegram, setSavingTelegram] = useState(false)

  // WA alerts
  const [notifyOrdersWa, setNotifyOrdersWa] = useState(false)
  const [notificationPhone, setNotificationPhone] = useState('')

  // notification_preferences (multi-channel)
  const [prefs, setPrefs] = useState<NotificationPreferences>({})
  const [savingPref, setSavingPref] = useState<string | null>(null)

  // Push
  const {
    permissionState,
    isSubscribed,
    isLoading: pushLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications()

  const { settings: pushSettings, saving: pushSaving, updateSetting } = usePushSettings()

  const pushActive = permissionState === 'granted' && isSubscribed
  const pushDenied = permissionState === 'denied'
  const pushUnsupported = permissionState === 'unsupported'

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!orgId) return
    const load = async () => {
      try {
        const [orgRes, prefsRes] = await Promise.all([
          supabase
            .from('organizations')
            .select('telegram_chat_id, telegram_notifications, notify_new_orders_wa, notification_phone')
            .eq('id', orgId)
            .single(),
          fetch('/api/notifications/preferences'),
        ])

        if (orgRes.data) {
          setTelegramEnabled(orgRes.data.telegram_notifications ?? false)
          setChatId(orgRes.data.telegram_chat_id ?? '')
          setNotifyOrdersWa(orgRes.data.notify_new_orders_wa ?? false)
          setNotificationPhone(orgRes.data.notification_phone ?? '')
        }

        if (prefsRes.ok) {
          const json = await prefsRes.json()
          setPrefs(json.preferences ?? {})
        }
      } catch {
        toast.error(isHe ? 'שגיאה בטעינת הגדרות' : 'Ошибка загрузки настроек')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgId])

  // ── Telegram save ──────────────────────────────────────────────────────────
  const handleSaveTelegram = useCallback(async () => {
    if (!orgId) return
    setSavingTelegram(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          telegram_notifications: telegramEnabled,
          telegram_chat_id: chatId || null,
          notify_new_orders_wa: notifyOrdersWa,
          notification_phone: notificationPhone || null,
        })
        .eq('id', orgId)
      if (error) throw error
      toast.success(isHe ? 'הגדרות נשמרו!' : 'Настройки сохранены!')
    } catch {
      toast.error(isHe ? 'שגיאה בשמירה' : 'Ошибка сохранения')
    } finally {
      setSavingTelegram(false)
    }
  }, [orgId, telegramEnabled, chatId, notifyOrdersWa, notificationPhone, isHe])

  // ── Multi-channel pref toggle (Optimistic) ─────────────────────────────────
  const handleTogglePref = useCallback(async (
    eventKey: string,
    channel: keyof NotifChannels,
    value: boolean
  ) => {
    const prevPrefs = prefs
    // Optimistic update
    setPrefs(prev => ({
      ...prev,
      [eventKey]: {
        ...(prev[eventKey] ?? DEFAULT_CHANNELS),
        [channel]: value,
      },
    }))
    setSavingPref(`${eventKey}:${channel}`)
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventKey, channel, value }),
      })
      if (!res.ok) throw new Error('save failed')
    } catch {
      setPrefs(prevPrefs) // revert
      toast.error(isHe ? 'שגיאה בשמירה' : 'Ошибка сохранения')
    } finally {
      setSavingPref(null)
    }
  }, [prefs, isHe])

  // ── Push master toggle ─────────────────────────────────────────────────────
  const handleTogglePush = useCallback(async () => {
    if (isSubscribed) {
      await unsubscribe()
      toast.success(isHe ? 'התראות כובו' : 'Уведомления отключены')
    } else {
      const ok = await subscribe()
      if (ok) toast.success(isHe ? 'התראות הופעלו!' : 'Уведомления включены!')
      else toast.error(isHe ? 'לא ניתן להפעיל' : 'Не удалось включить')
    }
  }, [isSubscribed, subscribe, unsubscribe, isHe])

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 pb-16">

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
            {isHe ? 'ניהול ערוצי ההתראות שלך' : 'Управление каналами уведомлений'}
          </p>
        </div>
      </div>

      {/* Intro banner */}
      <div className="rounded-2xl p-4 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md">
          <Bell className="w-5 h-5 text-white" />
        </div>
        <div dir={dir}>
          <p className="font-semibold text-gray-900 text-sm">
            {isHe ? 'מה אפשר לקבל כאן?' : 'Что настраивается здесь?'}
          </p>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            {isHe
              ? 'Push לדפדפן, Telegram ואימייל — לכל אירוע בנפרד. כל שינוי נשמר מיידית.'
              : 'Push в браузер, Telegram и Email — для каждого события отдельно. Каждое изменение сохраняется мгновенно.'}
          </p>
        </div>
      </div>

      {/* ── Push Master Toggle ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-indigo-600" />
            </div>
            {isHe ? 'Push — מכשיר זה' : 'Push — это устройство'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div dir={dir}>
              <p className="text-sm font-medium text-gray-900">
                {isHe ? 'התראות במכשיר' : 'Уведомления на устройстве'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {pushUnsupported
                  ? (isHe ? 'לא נתמך בדפדפן זה' : 'Не поддерживается')
                  : pushDenied
                  ? (isHe ? 'חסום — אפשר בהגדרות הדפדפן' : 'Заблокировано — разрешите в браузере')
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
          {permissionState === 'prompt' && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3" dir={dir}>
              <p className="text-xs text-amber-800">
                {isHe
                  ? '💡 iOS: יש להתקין את האפליקציה על מסך הבית לפני הפעלת התראות'
                  : '💡 iOS: установите приложение на главный экран для получения уведомлений'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Event Groups (multi-channel) ── */}
      {GROUPS.map((group) => {
        const groupEvents = EVENTS.filter(e => e.group === group.key)
        const GroupIcon = group.icon
        const colorClass = GROUP_COLORS[group.color]

        return (
          <Card key={group.key}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
                  <GroupIcon className="w-4 h-4" />
                </div>
                {isHe ? group.labelHe : group.labelRu}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-0 px-6 pb-4">
              {/* Channel header */}
              <div className="flex items-center justify-end gap-4 mb-2 pr-1">
                <span className="text-xs text-gray-400 w-8 text-center">Push</span>
                <span className="text-xs text-gray-400 w-8 text-center">TG</span>
              </div>
              {groupEvents.map((event) => {
                const Icon = event.icon
                const pref = prefs[event.key] ?? DEFAULT_CHANNELS
                const isSavingThis = savingPref?.startsWith(event.key)
                return (
                  <div
                    key={event.key}
                    className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0" dir={dir}>
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-gray-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {isHe ? event.labelHe : event.labelRu}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {isHe ? event.descHe : event.descRu}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                      {/* Push toggle — uses existing usePushSettings for legacy compat */}
                      <div className="w-8 flex justify-center">
                        {(event.key as keyof PushSettings) in pushSettings ? (
                          <Switch
                            checked={pushSettings[event.key as keyof PushSettings]}
                            onCheckedChange={(v) => updateSetting(event.key as keyof PushSettings, v)}
                            disabled={pushSaving || !pushActive}
                            className="scale-90"
                          />
                        ) : (
                          <Switch
                            checked={pref.push}
                            onCheckedChange={(v) => handleTogglePref(event.key, 'push', v)}
                            disabled={!!isSavingThis || !pushActive}
                            className="scale-90"
                          />
                        )}
                      </div>
                      {/* Telegram toggle */}
                      <div className="w-8 flex justify-center">
                        <Switch
                          checked={pref.telegram}
                          onCheckedChange={(v) => handleTogglePref(event.key, 'telegram', v)}
                          disabled={!!isSavingThis || !telegramEnabled}
                          className="scale-90"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}

      {/* ── WhatsApp alerts ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-green-600" />
            </div>
            {isHe ? 'התראות WhatsApp — הזמנות מהאתר' : 'WhatsApp-алерты — заказы с сайта'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div dir={dir}>
              <p className="text-sm font-medium text-gray-900">
                {isHe ? 'שלח WhatsApp על הזמנה חדשה' : 'Отправлять WA при новом заказе'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isHe ? 'הזמנה מהאתר → הודעה מיידית' : 'Заказ с сайта → мгновенное сообщение'}
              </p>
            </div>
            <Switch checked={notifyOrdersWa} onCheckedChange={setNotifyOrdersWa} />
          </div>
          {notifyOrdersWa && (
            <div dir={dir}>
              <Label htmlFor="notif-phone" className="text-sm font-medium">
                {isHe ? 'מספר טלפון לקבלת התראות' : 'Телефон для алертов'}
              </Label>
              <Input
                id="notif-phone"
                value={notificationPhone}
                onChange={(e) => setNotificationPhone(e.target.value)}
                placeholder={isHe ? '05XXXXXXXX' : '+972 / 05XXXXXXXX'}
                className="font-mono mt-1.5"
              />
              <p className="text-xs text-gray-400 mt-1">
                {isHe ? 'ריק = בעל הארגון. פורמט: 0512345678' : 'Пусто = владелец. Формат: 0512345678'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Telegram ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <ChevronRight className="w-4 h-4 text-blue-600" />
            </div>
            Telegram
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div dir={dir}>
              <p className="text-sm font-medium text-gray-900">
                {isHe ? 'התראות Telegram' : 'Уведомления в Telegram'}
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
                  <li>{isHe ? 'העתק את ה-Chat ID' : 'Скопируй Chat ID из ответа'}</li>
                </ol>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveTelegram} disabled={savingTelegram}>
          {savingTelegram
            ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
            : null}
          {isHe ? 'שמור הגדרות' : 'Сохранить настройки'}
        </Button>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'

export default function NotificationsPage() {
  const router = useRouter()
  const { dir } = useLanguage()
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [telegramEnabled, setTelegramEnabled] = useState(false)
  const [chatId, setChatId] = useState('')

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
      } catch (error) {
        console.error('Failed to load settings:', error)
        toast.error('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [orgId])

  const handleSave = async () => {
    if (!orgId) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          telegram_notifications: telegramEnabled,
          telegram_chat_id: chatId || null,
        })
        .eq('id', orgId)

      if (error) throw error

      toast.success('Настройки сохранены!')
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/settings')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowRight className={`w-6 h-6 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Telegram Notifications / התראות Telegram
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Get instant notifications about bookings and payments
          </p>
        </div>
      </div>

      {/* Telegram Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Telegram уведомления
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="telegram-enabled" className="text-sm font-medium">
                Включить Telegram уведомления
              </Label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Получайте уведомления о новых записях и платежах
              </p>
            </div>
            <Switch
              id="telegram-enabled"
              checked={telegramEnabled}
              onCheckedChange={setTelegramEnabled}
            />
          </div>

          {/* Chat ID */}
          {telegramEnabled && (
            <div className="space-y-3">
              <Label htmlFor="chat-id" className="text-sm font-medium">
                Chat ID
              </Label>
              <Input
                id="chat-id"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="123456789"
                className="font-mono"
              />

              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 text-sm">
                  Как получить Chat ID:
                </h4>
                <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-2 list-decimal list-inside">
                  <li>Найдите бота <code className="bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">@userinfobot</code> в Telegram</li>
                  <li>Напишите ему команду <code className="bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">/start</code></li>
                  <li>Скопируйте ваш Chat ID из ответа бота</li>
                  <li>Вставьте Chat ID в поле выше</li>
                </ol>
              </div>

              {/* What you'll receive */}
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">
                  Вы будете получать уведомления о:
                </h4>
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-lg">📅</span>
                    <span><strong>Новых записях:</strong> Имя клиента, услуга, дата и время</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">💰</span>
                    <span><strong>Платежах:</strong> Сумма, клиент, способ оплаты</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="px-8">
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>
    </div>
  )
}

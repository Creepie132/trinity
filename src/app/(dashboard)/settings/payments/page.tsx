'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { useFeatures } from '@/hooks/useFeatures'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'
import { CreditCard, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PaymentSettingsPage() {
  const { language } = useLanguage()
  const isHe = language === 'he'
  const { orgId } = useAuth()
  const features = useFeatures()
  const supabase = createSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showTokenPass, setShowTokenPass] = useState(false)

  const [form, setForm] = useState({
    tranzila_terminal: '',
    tranzila_password: '',
    tranzila_token_terminal: '',
    tranzila_token_password: '',
  })

  useEffect(() => {
    if (orgId) loadSettings()
  }, [orgId])

  async function loadSettings() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('tranzila_terminal, tranzila_password, tranzila_token_terminal, tranzila_token_password')
        .eq('id', orgId!)
        .single()
      if (error) throw error
      if (data) {
        setForm({
          tranzila_terminal: data.tranzila_terminal || '',
          tranzila_password: data.tranzila_password || '',
          tranzila_token_terminal: data.tranzila_token_terminal || '',
          tranzila_token_password: data.tranzila_token_password || '',
        })
      }
    } catch (e) {
      console.error('Load payment settings error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!orgId) return
    setSaving(true)
    try {
      const payload: Record<string, string | null> = {
        tranzila_terminal: form.tranzila_terminal.trim() || null,
        tranzila_password: form.tranzila_password.trim() || null,
      }
      if (features.recurringEnabled) {
        payload.tranzila_token_terminal = form.tranzila_token_terminal.trim() || null
        payload.tranzila_token_password = form.tranzila_token_password.trim() || null
      }
      const { error } = await supabase
        .from('organizations')
        .update(payload)
        .eq('id', orgId)
      if (error) throw error
      toast.success(isHe ? 'הגדרות נשמרו ✓' : 'Настройки сохранены ✓')
    } catch (e: any) {
      toast.error(e.message || (isHe ? 'שגיאה' : 'Ошибка'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-lg">
      {/* Back */}
      <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        {isHe ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
        {isHe ? 'חזרה להגדרות' : 'Назад к настройкам'}
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30">
          <CreditCard className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{isHe ? 'הגדרות תשלום' : 'Настройки платежей'}</h1>
          <p className="text-sm text-muted-foreground">
            {isHe ? 'Tranzila — שלב אישורי גישה' : 'Tranzila — введите данные доступа'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">{isHe ? 'טוען...' : 'Загрузка...'}</div>
      ) : (
        <div className="space-y-6">
          {/* Main terminal */}
          <div className="p-5 rounded-2xl border bg-card space-y-4">
            <h2 className="font-semibold text-base">{isHe ? 'טרמינל תשלום (Tranzila)' : 'Платёжный терминал (Tranzila)'}</h2>

            <div>
              <label className="text-sm font-medium mb-1 block">
                {isHe ? 'שם הטרמינל' : 'Имя терминала'}
              </label>
              <input
                type="text"
                value={form.tranzila_terminal}
                onChange={e => setForm({ ...form, tranzila_terminal: e.target.value })}
                placeholder="myterminal"
                className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                {isHe ? 'סיסמה' : 'Пароль'}
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.tranzila_password}
                  onChange={e => setForm({ ...form, tranzila_password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pe-10 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Token terminal (only if recurring enabled) */}
          {features.recurringEnabled && (
            <div className="p-5 rounded-2xl border bg-card space-y-4">
              <h2 className="font-semibold text-base">{isHe ? 'טרמינל טוקנים (חיוב חוזר)' : 'Токен-терминал (рекуррентные платежи)'}</h2>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-800 dark:text-amber-300">
                💡 {isHe
                  ? 'בקש מחברת האשראי לבטל CVV בטרמינל הטוקנים'
                  : 'Попросите кредитную компанию отключить CVV на токен-терминале'}
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  {isHe ? 'שם טרמינל הטוקנים' : 'Имя токен-терминала'}
                </label>
                <input
                  type="text"
                  value={form.tranzila_token_terminal}
                  onChange={e => setForm({ ...form, tranzila_token_terminal: e.target.value })}
                  placeholder="mytokenterm"
                  className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  {isHe ? 'סיסמה לטרמינל הטוקנים' : 'Пароль токен-терминала'}
                </label>
                <div className="relative">
                  <input
                    type={showTokenPass ? 'text' : 'password'}
                    value={form.tranzila_token_password}
                    onChange={e => setForm({ ...form, tranzila_token_password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pe-10 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTokenPass(!showTokenPass)}
                    className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    {showTokenPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition disabled:opacity-50"
          >
            {saving ? (isHe ? 'שומר...' : 'Сохранение...') : (isHe ? 'שמור הגדרות' : 'Сохранить настройки')}
          </button>
        </div>
      )}
    </div>
  )
}

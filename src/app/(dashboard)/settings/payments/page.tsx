'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { useFeatures } from '@/hooks/useFeatures'
import { toast } from 'sonner'
import { CreditCard, Eye, EyeOff, ArrowRight, ArrowLeft, Banknote, Smartphone, Building2, FileText, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

// ─── Конфиг методов оплаты ────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  {
    key: 'cash',
    icon: <Banknote size={20} />,
    color: '#16a34a',
    bg: 'rgba(34,197,94,0.1)',
    border: 'rgba(34,197,94,0.3)',
    label: { ru: 'Наличные', he: 'מזומן' },
    desc:  { ru: 'Оплата наличными с выдачей чека', he: 'תשלום במזומן עם קבלה' },
  },
  {
    key: 'bit',
    icon: <Smartphone size={20} />,
    color: '#ea580c',
    bg: 'rgba(249,115,22,0.1)',
    border: 'rgba(249,115,22,0.3)',
    label: { ru: 'Bit', he: 'ביט' },
    desc:  { ru: 'Оплата через приложение Bit', he: 'תשלום דרך אפליקציית ביט' },
  },
  {
    key: 'credit_card',
    icon: <CreditCard size={20} />,
    color: '#4f46e5',
    bg: 'rgba(99,102,241,0.1)',
    border: 'rgba(99,102,241,0.3)',
    label: { ru: 'Кредитная карта', he: 'כרטיס אשראי' },
    desc:  { ru: 'Онлайн-оплата через Tranzila', he: 'תשלום אונליין דרך Tranzila' },
  },
  {
    key: 'bank_transfer',
    icon: <Building2 size={20} />,
    color: '#0284c7',
    bg: 'rgba(14,165,233,0.1)',
    border: 'rgba(14,165,233,0.3)',
    label: { ru: 'Банковский перевод', he: 'העברה בנקאית' },
    desc:  { ru: 'Перевод на банковский счёт', he: 'העברה לחשבון בנק' },
  },
  {
    key: 'check',
    icon: <FileText size={20} />,
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.1)',
    border: 'rgba(124,58,237,0.3)',
    label: { ru: 'Чек', he: "צ'ק" },
    desc:  { ru: 'Оплата банковским чеком', he: "תשלום בצ'ק בנקאי" },
  },
] as const

type MethodKey = typeof PAYMENT_METHODS[number]['key']

interface RecurringPlan {
  id: string
  org_id: string
  name: string
  description: string | null
  price: number
  billing_cycle: 'monthly' | 'yearly' | 'custom'
  custom_days: number | null
  is_active: boolean
  created_at: string
}

const CYCLE_LABELS = {
  he: { monthly: 'חודשי', yearly: 'שנתי', custom: 'מותאם' },
  ru: { monthly: 'Ежемесячно', yearly: 'Ежегодно', custom: 'Кастомный' },
}

export default function PaymentSettingsPage() {
  const { language } = useLanguage()
  const isHe = language === 'he'
  const { orgId } = useAuth()
  const features = useFeatures()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingMethods, setSavingMethods] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showTokenPass, setShowTokenPass] = useState(false)
  const [terminalForm, setTerminalForm] = useState({
    tranzila_terminal: '',
    tranzila_password: '',
    tranzila_token_terminal: '',
    tranzila_token_password: '',
  })
  const [passwordSet, setPasswordSet] = useState(false)
  const [tokenPasswordSet, setTokenPasswordSet] = useState(false)
  const [enabledMethods, setEnabledMethods] = useState<MethodKey[]>(['cash', 'bit', 'credit_card', 'bank_transfer', 'check'])

  useEffect(() => {
    if (orgId) loadSettings()
  }, [orgId])

  async function loadSettings() {
    setLoading(true)
    try {
      const res = await fetch('/api/payments/settings')
      if (!res.ok) throw new Error('Failed to load settings')
      const data = await res.json()
      setTerminalForm({
        tranzila_terminal: data.tranzila_terminal || '',
        tranzila_password: '',
        tranzila_token_terminal: data.tranzila_token_terminal || '',
        tranzila_token_password: '',
      })
      setPasswordSet(data.tranzila_password_set || false)
      setTokenPasswordSet(data.tranzila_token_password_set || false)
      if (Array.isArray(data.enabled_payment_methods)) {
        setEnabledMethods(data.enabled_payment_methods as MethodKey[])
      }
    } catch (e) {
      console.error('Load payment settings error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveTerminal() {
    if (!orgId) return
    setSaving(true)
    try {
      const payload: Record<string, string> = {
        tranzila_terminal: terminalForm.tranzila_terminal.trim(),
      }
      if (terminalForm.tranzila_password.trim()) payload.tranzila_password = terminalForm.tranzila_password.trim()
      if (features.recurringEnabled) {
        payload.tranzila_token_terminal = terminalForm.tranzila_token_terminal.trim()
        if (terminalForm.tranzila_token_password.trim()) payload.tranzila_token_password = terminalForm.tranzila_token_password.trim()
      }
      const res = await fetch('/api/payments/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success(isHe ? 'הגדרות נשמרו ✓' : 'Настройки сохранены ✓')
      if (terminalForm.tranzila_password.trim()) setPasswordSet(true)
      if (terminalForm.tranzila_token_password.trim()) setTokenPasswordSet(true)
      setTerminalForm(f => ({ ...f, tranzila_password: '', tranzila_token_password: '' }))
    } catch (e: any) {
      toast.error(e.message || (isHe ? 'שגיאה' : 'Ошибка'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveMethods() {
    if (!orgId) return
    if (enabledMethods.length === 0) {
      toast.error(isHe ? 'יש לבחור לפחות שיטת תשלום אחת' : 'Выберите хотя бы один способ оплаты')
      return
    }
    setSavingMethods(true)
    try {
      const res = await fetch('/api/payments/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled_payment_methods: enabledMethods }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success(isHe ? 'שיטות התשלום נשמרו ✓' : 'Способы оплаты сохранены ✓')
    } catch (e: any) {
      toast.error(e.message || (isHe ? 'שגיאה' : 'Ошибка'))
    } finally {
      setSavingMethods(false)
    }
  }

  function toggleMethod(key: MethodKey) {
    setEnabledMethods(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  function cycleName(plan: RecurringPlan) {
    const labels = CYCLE_LABELS[isHe ? 'he' : 'ru']
    if (plan.billing_cycle === 'custom') return isHe ? `כל ${plan.custom_days} ימים` : `Каждые ${plan.custom_days} дней`
    return labels[plan.billing_cycle]
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      {/* Back */}
      <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        {isHe ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
        {isHe ? 'חזרה להגדרות' : 'Назад к настройкам'}
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30">
          <CreditCard className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{isHe ? 'הגדרות תשלום' : 'Настройки платежей'}</h1>
          <p className="text-sm text-muted-foreground">
            {isHe ? 'Tranzila — חיבור וחיוב חוזר' : 'Tranzila — подключение и рекуррентные платежи'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">{isHe ? 'טוען...' : 'Загрузка...'}</div>
      ) : (
        <div className="space-y-8">

          {/* ═══ СЕКЦИЯ 1: Способы оплаты ═══ */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">{isHe ? 'שיטות תשלום' : 'Способы оплаты'}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isHe ? 'בחר אילו שיטות תשלום יוצגו ללקוחות ולעובדים' : 'Выберите, какие способы оплаты доступны при создании платежей'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {PAYMENT_METHODS.map(method => {
                const enabled = enabledMethods.includes(method.key)
                const locale = isHe ? 'he' : 'ru'
                return (
                  <button key={method.key} type="button" onClick={() => toggleMethod(method.key)}
                    className="flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99]"
                    style={{
                      borderColor: enabled ? method.border : 'var(--border)',
                      background: enabled ? method.bg : 'var(--card)',
                    }}>
                    {/* Иконка метода */}
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ background: enabled ? `${method.color}20` : 'var(--muted)', color: enabled ? method.color : 'var(--muted-foreground)' }}>
                      {method.icon}
                    </div>
                    {/* Текст */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm" style={{ color: enabled ? method.color : 'var(--foreground)' }}>
                        {method.label[locale]}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{method.desc[locale]}</div>
                    </div>
                    {/* Чекбокс */}
                    <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                      style={{
                        borderColor: enabled ? method.color : 'var(--border)',
                        background: enabled ? method.color : 'transparent',
                      }}>
                      {enabled && <CheckCircle2 size={14} color="white" />}
                    </div>
                  </button>
                )
              })}
            </div>

            <button onClick={handleSaveMethods} disabled={savingMethods || enabledMethods.length === 0}
              className="w-full py-3 rounded-xl font-medium text-sm text-white transition disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
              {savingMethods
                ? (isHe ? 'שומר...' : 'Сохранение...')
                : (isHe ? 'שמור שיטות תשלום' : 'Сохранить способы оплаты')}
            </button>
          </div>

          <hr className="border-border" />

          {/* ═══ СЕКЦИЯ 2: Терминал Tranzila ═══ */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{isHe ? 'טרמינל Tranzila' : 'Терминал Tranzila'}</h2>

            <div className="p-5 rounded-2xl border bg-card space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">{isHe ? 'שם הטרמינל' : 'Имя терминала'}</label>
                <input
                  type="text"
                  value={terminalForm.tranzila_terminal}
                  onChange={e => setTerminalForm({ ...terminalForm, tranzila_terminal: e.target.value })}
                  placeholder="myterminal"
                  className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">{isHe ? 'סיסמה' : 'Пароль'}</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={terminalForm.tranzila_password}
                    onChange={e => setTerminalForm({ ...terminalForm, tranzila_password: e.target.value })}
                    placeholder={passwordSet ? (isHe ? '••••••  (שמור, השאר ריק כדי לא לשנות)' : '••••••  (сохранён, оставь пустым чтобы не менять)') : '••••••••'}
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

              {features.recurringEnabled && (
                <>
                  <hr className="border-muted" />
                  <p className="text-sm font-medium">{isHe ? 'טרמינל טוקנים (חיוב חוזר)' : 'Токен-терминал (рекуррентные платежи)'}</p>

                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-800 dark:text-amber-300">
                    💡 {isHe
                      ? 'בקש מחברת האשראי לבטל CVV בטרמינל הטוקנים'
                      : 'Попросите кредитную компанию отключить CVV на токен-терминале'}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">{isHe ? 'שם טרמינל הטוקנים' : 'Имя токен-терминала'}</label>
                    <input
                      type="text"
                      value={terminalForm.tranzila_token_terminal}
                      onChange={e => setTerminalForm({ ...terminalForm, tranzila_token_terminal: e.target.value })}
                      placeholder="mytokenterm"
                      className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">{isHe ? 'סיסמה לטרמינל הטוקנים' : 'Пароль токен-терминала'}</label>
                    <div className="relative">
                      <input
                        type={showTokenPass ? 'text' : 'password'}
                        value={terminalForm.tranzila_token_password}
                        onChange={e => setTerminalForm({ ...terminalForm, tranzila_token_password: e.target.value })}
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
                </>
              )}
            </div>

            <button
              onClick={handleSaveTerminal}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition disabled:opacity-50"
            >
              {saving ? (isHe ? 'שומר...' : 'Сохранение...') : (isHe ? 'שמור הגדרות' : 'Сохранить настройки')}
            </button>
          </div>

        </div>
      )}
    </div>
  )
}

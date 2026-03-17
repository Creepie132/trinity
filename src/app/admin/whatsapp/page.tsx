'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Save, Loader2, Check, AlertCircle, CheckCircle2, Eye, EyeOff, Zap } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { WaTriggerWizard } from '@/components/wa/WaTriggerWizard'

interface WaIntegration {
  provider_type: string
  instance_id: string
  is_active: boolean
  updated_at: string
}

interface WaStats {
  total: number
  sent: number
  pending: number
  error: number
}

export default function AdminWhatsAppPage() {
  const { language } = useLanguage()
  const l = language === 'he'

  const [integration, setIntegration] = useState<WaIntegration | null>(null)
  const [stats, setStats] = useState<WaStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [showWizard, setShowWizard] = useState(false)

  const [form, setForm] = useState({ providerType: 'whapi', instanceId: '', apiKey: '' })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [intRes, statsRes] = await Promise.all([
        fetch('/api/wa-integration'),
        fetch('/api/wa-stats'),
      ])
      const intData = await intRes.json()
      if (intData.integration) {
        setIntegration(intData.integration)
        setForm(f => ({ ...f, providerType: intData.integration.provider_type, instanceId: intData.integration.instance_id }))
      }
      if (statsRes.ok) setStats(await statsRes.json())
    } catch {
      toast.error(l ? 'שגיאה בטעינה' : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!form.instanceId) return toast.error(l ? 'חסר Instance ID' : 'Заполните Instance ID')
    if (!form.apiKey && !integration) return toast.error(l ? 'חסר טוקן API' : 'Заполните API токен')
    setSaving(true)
    try {
      const res = await fetch('/api/wa-integration', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(l ? '✓ נשמר' : '✓ Сохранено')
      setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500)
      await loadData()
    } catch (e: any) {
      toast.error(e.message || (l ? 'שגיאה' : 'Ошибка'))
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  const isConnected = !!integration?.is_active

  return (
    <>
      {showWizard && <WaTriggerWizard onClose={() => setShowWizard(false)} />}

      <div className="space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-7 h-7 text-green-500" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{l ? 'הגדרות WhatsApp' : 'Настройки WhatsApp'}</h1>
              <p className="text-sm text-slate-500">{l ? 'אינטגרציה ואוטומציות' : 'Интеграция и автоматизации'}</p>
            </div>
          </div>
          {isConnected && (
            <button onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
              <Zap className="w-4 h-4" />
              {l ? 'הגדר טריגרים' : 'Настроить триггеры'}
            </button>
          )}
        </div>

        {/* Status */}
        <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border ${isConnected ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          {isConnected ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />}
          <div>
            <p className={`font-semibold text-sm ${isConnected ? 'text-green-800' : 'text-amber-800'}`}>
              {isConnected ? (l ? '✅ WhatsApp מחובר ופעיל' : '✅ WhatsApp подключён') : (l ? '⚠️ WhatsApp לא מוגדר' : '⚠️ WhatsApp не настроен')}
            </p>
            {isConnected && integration && (
              <p className="text-xs text-green-600 mt-0.5">{integration.provider_type} · {integration.instance_id} · {l ? 'עודכן' : 'Обновлено'}: {new Date(integration.updated_at).toLocaleDateString()}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: l ? 'סה"כ' : 'Всего', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-50' },
              { label: l ? 'נשלח' : 'Отправлено', value: stats.sent, color: 'text-green-700', bg: 'bg-green-50' },
              { label: l ? 'ממתין' : 'В очереди', value: stats.pending, color: 'text-blue-700', bg: 'bg-blue-50' },
              { label: l ? 'שגיאה' : 'Ошибок', value: stats.error, color: 'text-red-700', bg: 'bg-red-50' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-white shadow-sm`}>
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Provider settings */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            {l ? 'הגדרות ספק WhatsApp' : 'Настройки провайдера'}
          </h2>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">{l ? 'ספק' : 'Провайдер'}</label>
            <select value={form.providerType} onChange={e => setForm({ ...form, providerType: e.target.value })}
              className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-sm">
              <option value="whapi">Whapi.cloud</option>
              <option value="wati">Wati.io</option>
              <option value="meta_cloud">Meta Cloud API</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Instance ID / API URL</label>
            <input type="text" value={form.instanceId} onChange={e => setForm({ ...form, instanceId: e.target.value })}
              placeholder="gate.whapi.cloud"
              className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-sm font-mono" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {l ? 'טוקן API' : 'API Токен'}
              {integration && <span className="text-green-500 ms-2 normal-case font-normal">({l ? 'כבר שמור' : 'уже сохранён'})</span>}
            </label>
            <div className="relative">
              <input type={showToken ? 'text' : 'password'} value={form.apiKey}
                onChange={e => setForm({ ...form, apiKey: e.target.value })}
                placeholder={integration ? (l ? 'השאר ריק לשמור את הנוכחי' : 'Оставь пустым чтобы не менять') : 'xagvI...'}
                className="w-full px-3 py-3 pe-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-sm font-mono" />
              <button type="button" onClick={() => setShowToken(!showToken)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="fixed bottom-0 left-0 right-0 z-40 px-6 py-4 bg-white/90 backdrop-blur border-t border-slate-200 flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md ${savedFlash ? 'bg-green-500 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : savedFlash ? <Check size={16} /> : <Save size={16} />}
            {saving ? (l ? 'שומר...' : 'Сохраняю...') : savedFlash ? (l ? 'נשמר!' : 'Сохранено!') : (l ? 'שמור הגדרות' : 'Сохранить')}
          </button>
        </div>
      </div>
    </>
  )
}

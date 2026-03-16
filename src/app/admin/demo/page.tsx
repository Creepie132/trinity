'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Plus, Copy, Trash2, Clock, RefreshCw, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'

interface DemoSession {
  id: string
  label: string
  email: string
  password_plain: string
  expires_at: string
  created_at: string
  is_active: boolean
  org_id: string
}

const ALL_MODULES = [
  { key: 'clients',       label: 'Клиенты' },
  { key: 'visits',        label: 'Визиты' },
  { key: 'payments',      label: 'Платежи' },
  { key: 'analytics',     label: 'Аналитика' },
  { key: 'inventory',     label: 'Склад' },
  { key: 'subscriptions', label: 'Абонементы' },
  { key: 'booking',       label: 'Онлайн запись' },
  { key: 'diary',         label: 'Дневник' },
  { key: 'sales',         label: 'Продажи' },
]

function timeLeft(expiresAt: string): { text: string; expired: boolean; pct: number } {
  const now = Date.now()
  const exp = new Date(expiresAt).getTime()
  const total = 24 * 3600 * 1000
  const remaining = exp - now
  if (remaining <= 0) return { text: 'Истёк', expired: true, pct: 0 }
  const h = Math.floor(remaining / 3600000)
  const m = Math.floor((remaining % 3600000) / 60000)
  return { text: `${h}ч ${m}м`, expired: false, pct: Math.max(0, (remaining / total) * 100) }
}

export default function AdminDemoPage() {
  const [sessions, setSessions] = useState<DemoSession[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [hours, setHours] = useState(24)
  const [demoLang, setDemoLang] = useState<'he' | 'ru'>('ru')
  const [selectedModules, setSelectedModules] = useState(['clients','visits','payments','analytics'])
  const [newSession, setNewSession] = useState<{email:string;password:string;expires_at:string}|null>(null)
  const [showPasswords, setShowPasswords] = useState<Record<string,boolean>>({})
  const [copied, setCopied] = useState('')
  const [createError, setCreateError] = useState('')

  const load = async () => {
    setLoading(true)
    const r = await fetch('/api/admin/demo')
    if (r.ok) setSessions(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const t = setInterval(() => setSessions(s => [...s]), 60000)
    return () => clearInterval(t)
  }, [])

  const create = async () => {
    if (!label.trim()) return
    setCreating(true)
    setCreateError('')
    try {
      const r = await fetch('/api/admin/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, hours, modules: selectedModules, lang: demoLang }),
      })
      const data = await r.json()
      if (!r.ok) { setCreateError(data.error || 'Ошибка при создании'); return }
      setNewSession(data)
      setLabel('')
      setShowForm(false)
      load()
    } finally {
      setCreating(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Удалить этот демо-аккаунт?')) return
    await fetch('/api/admin/demo', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const toggleModule = (k: string) =>
    setSelectedModules(m => m.includes(k) ? m.filter(x => x !== k) : [...m, k])

  return (
    <div className="space-y-6 max-w-4xl" dir="ltr">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-md">
              <Sparkles size={20} className="text-white"/>
            </div>
            Демо аккаунты
          </h1>
          <p className="text-gray-500 mt-1">Создавайте временные демо-аккаунты с ограниченным доступом</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all" title="Обновить">
            <RefreshCw size={18} className="text-gray-500"/>
          </button>
          <button onClick={() => { setShowForm(f => !f); setCreateError('') }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]">
            <Plus size={18}/>
            Создать демо аккаунт
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">✨ Новый демо аккаунт</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Название / описание (только для вас)</label>
              <input value={label} onChange={e => setLabel(e.target.value)}
                placeholder='Например: "Алина коуч"'
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"/>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Язык интерфейса и данных</label>
              <div className="flex gap-2">
                {([['ru', '🇷🇺 Русский'], ['he', '🇮🇱 Иврит']] as const).map(([l, name]) => (
                  <button key={l} onClick={() => setDemoLang(l)}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${demoLang === l ? 'bg-blue-500 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Срок доступа</label>
              <div className="flex gap-2">
                {[12, 24, 48, 72].map(h => (
                  <button key={h} onClick={() => setHours(h)}
                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${hours === h ? 'bg-amber-500 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {h}ч
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Модули</label>
              <div className="flex flex-wrap gap-2">
                {ALL_MODULES.map(m => (
                  <button key={m.key} onClick={() => toggleModule(m.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedModules.includes(m.key) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            {createError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-sm">
                <AlertCircle size={16}/> {createError}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowForm(false); setCreateError('') }}
                className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                Отмена
              </button>
              <button onClick={create} disabled={creating || !label.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {creating && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
                {creating ? 'Создаётся...' : 'Создать аккаунт'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New session result */}
      {newSession && (
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={20}/>
            </div>
            <div>
              <p className="font-bold text-lg">Аккаунт создан! 🎉</p>
              <p className="text-white/60 text-sm">Действует до {new Date(newSession.expires_at).toLocaleString('ru-RU')}</p>
            </div>
            <button onClick={() => setNewSession(null)} className="ml-auto p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white/60 hover:text-white">✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-xs text-white/50 mb-1">Email</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm flex-1 truncate">{newSession.email}</p>
                <button onClick={() => copyText(newSession.email, 'email')}
                  className={`p-1.5 rounded-lg transition-all ${copied==='email' ? 'bg-green-500' : 'bg-white/20 hover:bg-white/30'}`}>
                  <Copy size={14}/>
                </button>
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-xs text-white/50 mb-1">Пароль</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm flex-1">{newSession.password}</p>
                <button onClick={() => copyText(newSession.password, 'pass')}
                  className={`p-1.5 rounded-lg transition-all ${copied==='pass' ? 'bg-green-500' : 'bg-white/20 hover:bg-white/30'}`}>
                  <Copy size={14}/>
                </button>
              </div>
            </div>
          </div>
          <button onClick={() => copyText(`Вход в Trinity CRM:\nСайт: https://ambersol.co.il/login\nEmail: ${newSession.email}\nПароль: ${newSession.password}`, 'all')}
            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${copied==='all' ? 'bg-green-500' : 'bg-white/15 hover:bg-white/25'}`}>
            {copied==='all' ? '✅ Скопировано!' : '📋 Скопировать всё для отправки'}
          </button>
        </div>
      )}

      {/* Sessions list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse"/>)}</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-amber-400"/>
          </div>
          <p className="text-gray-500 font-medium">Демо аккаунтов пока нет</p>
          <p className="text-sm text-gray-400 mt-1">Нажмите «Создать демо аккаунт» для начала</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => {
            const tl = timeLeft(s.expires_at)
            const showPass = showPasswords[s.id]
            return (
              <div key={s.id} className={`bg-white rounded-2xl border p-5 transition-all ${tl.expired ? 'border-red-200 opacity-70' : 'border-gray-200 hover:shadow-md hover:border-amber-200'}`}>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${tl.expired ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`}/>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900">{s.label}</p>
                      <p className="text-xs text-gray-500 font-mono truncate">{s.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className={`flex items-center gap-1.5 text-sm font-semibold ${tl.expired ? 'text-red-500' : 'text-emerald-600'}`}>
                      <Clock size={14}/> {tl.text}
                    </div>
                    {!tl.expired && (
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" style={{width:`${tl.pct}%`}}/>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                      <span className="font-mono text-sm text-gray-700">{showPass ? s.password_plain : '••••••••'}</span>
                      <button onClick={() => setShowPasswords(p => ({...p, [s.id]: !p[s.id]}))} className="text-gray-400 hover:text-gray-600">
                        {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    </div>
                    <button onClick={() => copyText(`Вход в Trinity CRM:\nСайт: https://ambersol.co.il/login\nEmail: ${s.email}\nПароль: ${s.password_plain}`, s.id)}
                      className={`p-2 rounded-xl transition-all ${copied===s.id ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`} title="Скопировать">
                      <Copy size={14}/>
                    </button>
                    <button onClick={() => remove(s.id)} className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-all" title="Удалить">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { toast } from 'sonner'

interface Agent {
  user_id: string
  email: string
  full_name: string | null
  created_at: string
}

export default function SalesAgentsPage() {
  const router = useRouter()
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin()

  const [agents,  setAgents]  = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [email,   setEmail]   = useState('')
  const [name,    setName]    = useState('')
  const [sending, setSending] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    if (!adminLoading && !isAdmin) router.replace('/dashboard')
  }, [isAdmin, adminLoading, router])

  const loadAgents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/sales-agents')
      if (res.ok) setAgents((await res.json()).agents ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAgents() }, [loadAgents])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/sales-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), full_name: name.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.status === 'invited') {
        toast.success(`📧 Приглашение отправлено на ${email.trim()}`)
      } else {
        toast.success(`✅ Флаг продажника установлен для ${email.trim()}`)
      }
      setEmail('')
      setName('')
      await loadAgents()
    } catch (e: any) {
      toast.error(`Ошибка: ${e.message}`)
    } finally {
      setSending(false)
    }
  }

  const handleRemove = async (agent: Agent) => {
    if (!confirm(`Снять роль продажника с ${agent.email}?`)) return
    setRemoving(agent.user_id)
    try {
      const res = await fetch('/api/admin/sales-agents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: agent.user_id }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(`Роль снята с ${agent.email}`)
      await loadAgents()
    } catch (e: any) {
      toast.error(`Ошибка: ${e.message}`)
    } finally {
      setRemoving(null)
    }
  }

  if (adminLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🧑‍💼 Продажники Trinity</h1>
        <p className="text-sm text-gray-500 mt-1">
          Введите email — человек получит письмо со ссылкой для входа.<br />
          После регистрации он будет автоматически попадать в <strong>Кабинет продажника</strong>.
        </p>
      </div>

      {/* Invite form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Пригласить нового продажника</p>
        <form onSubmit={handleInvite} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="sales@example.com"
              required
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Имя (необязательно)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Имя Фамилия"
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={sending || !email.trim()}
            className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Отправка...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Отправить приглашение
              </>
            )}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-3 text-center">
          Письмо придёт от Supabase Auth — пользователь установит пароль и войдёт в кабинет
        </p>
      </div>

      {/* Active agents list */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Активные продажники</p>
          {!loading && (
            <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 font-semibold rounded-full">
              {agents.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : agents.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            Продажников пока нет — пригласите первого ☝️
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {agents.map(a => (
              <div key={a.user_id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                    {(a.full_name || a.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{a.full_name || a.email}</p>
                    <p className="text-xs text-gray-400">{a.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(a)}
                  disabled={removing === a.user_id}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  {removing === a.user_id ? '...' : 'Снять роль'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

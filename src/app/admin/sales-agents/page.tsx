'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { toast } from 'sonner'

interface SalesAgent {
  user_id: string
  email: string
  full_name: string | null
  is_sales_agent: boolean
  created_at: string
}

interface OrgUser {
  user_id: string
  email: string
  role: string
  avatar_url: string | null
}

export default function SalesAgentsPage() {
  const router = useRouter()
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin()

  const [agents,   setAgents]   = useState<SalesAgent[]>([])
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState<string | null>(null)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    if (!adminLoading && !isAdmin) router.replace('/dashboard')
  }, [isAdmin, adminLoading, router])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [agentsRes, usersRes] = await Promise.all([
        fetch('/api/admin/sales-agents'),
        fetch('/api/admin/invitations'),  // список всех admin_users
      ])
      if (agentsRes.ok) {
        const d = await agentsRes.json()
        setAgents(d.agents ?? [])
      }
      // Загружаем список admin_users напрямую
      const adminsRes = await fetch('/api/admin/sales-agents/all')
      if (adminsRes.ok) {
        const d = await adminsRes.json()
        setOrgUsers(d.users ?? [])
      }
    } catch (e) {
      toast.error('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const toggle = async (user: OrgUser, makeAgent: boolean) => {
    setSaving(user.user_id)
    try {
      const res = await fetch('/api/admin/sales-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          email: user.email,
          is_sales_agent: makeAgent,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(makeAgent ? `✅ ${user.email} — назначен продажником` : `🗑 ${user.email} — снят с роли`)
      await loadData()
    } catch (e: any) {
      toast.error(`Ошибка: ${e.message}`)
    } finally {
      setSaving(null)
    }
  }

  const agentIds = new Set(agents.map(a => a.user_id))

  const filtered = orgUsers.filter(u =>
    !search || u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (adminLoading || loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🧑‍💼 Продажники Trinity</h1>
        <p className="text-sm text-gray-500 mt-1">
          Пользователи с этим флагом при входе видят <strong>Кабинет продажника</strong> вместо дашборда руководителя.
        </p>
      </div>

      {/* Active agents */}
      {agents.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-3">
            Активные продажники ({agents.length})
          </p>
          <div className="space-y-2">
            {agents.map(a => (
              <div key={a.user_id} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-indigo-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                    {(a.full_name ?? a.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{a.full_name ?? a.email}</p>
                    <p className="text-xs text-gray-400">{a.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggle({ user_id: a.user_id, email: a.email, role: 'user', avatar_url: null }, false)}
                  disabled={saving === a.user_id}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  {saving === a.user_id ? '...' : 'Снять роль'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + list */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по email..."
            className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Пользователи не найдены</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(u => {
              const isAgent = agentIds.has(u.user_id)
              return (
                <div key={u.user_id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                      {u.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.email}</p>
                      <p className="text-xs text-gray-400 capitalize">{u.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAgent && (
                      <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-semibold">
                        Продажник ✓
                      </span>
                    )}
                    <button
                      onClick={() => toggle(u, !isAgent)}
                      disabled={saving === u.user_id}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40 ${
                        isAgent
                          ? 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {saving === u.user_id ? '...' : isAgent ? 'Снять' : 'Назначить'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Изменения вступают в силу при следующем входе пользователя в систему.
      </p>
    </div>
  )
}

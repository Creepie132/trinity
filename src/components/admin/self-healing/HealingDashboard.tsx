'use client'
/**
 * components/admin/self-healing/HealingDashboard.tsx
 * Админ-панель: список авто-исправлений со статусами и кнопкой Rollback
 */
import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { AiHealingLog, HealingStatus } from '@/lib/self-healing/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HealingRow extends AiHealingLog {
  system_errors: {
    route: string
    error_message: string
    severity: string
    is_critical_path: boolean
    attempt_count: number
  }
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<HealingStatus, { label: string; color: string; icon: string }> = {
  analyzing:          { label: 'Анализ',           color: 'bg-blue-100 text-blue-700',    icon: '🔍' },
  fix_generated:      { label: 'Фикс готов',       color: 'bg-indigo-100 text-indigo-700', icon: '🛠' },
  testing:            { label: 'Тестирование',     color: 'bg-yellow-100 text-yellow-700', icon: '🧪' },
  merged:             { label: 'Замержено',        color: 'bg-teal-100 text-teal-700',     icon: '🔀' },
  deployed:           { label: 'Внедрено',         color: 'bg-green-100 text-green-700',   icon: '✅' },
  rolled_back:        { label: 'Откат',            color: 'bg-orange-100 text-orange-700', icon: '🔁' },
  failed:             { label: 'Ошибка',           color: 'bg-red-100 text-red-700',       icon: '❌' },
  awaiting_approval:  { label: 'Ждёт апрува',      color: 'bg-purple-100 text-purple-700', icon: '🔐' },
}

const SEVERITY_COLOR: Record<string, string> = {
  low:      'bg-gray-100 text-gray-600',
  medium:   'bg-yellow-100 text-yellow-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HealingDashboard() {
  const [rows, setRows] = useState<HealingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [rollingBack, setRollingBack] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

  // Начальная загрузка
  useEffect(() => {
    loadLogs()
  }, [])

  // Realtime-подписка на статусы
  useEffect(() => {
    const channel = supabase
      .channel('ai_healing_logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_healing_logs' },
        () => loadLogs()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadLogs() {
    setLoading(true)
    const { data } = await supabase
      .from('ai_healing_logs')
      .select(`
        *,
        system_errors (
          route, error_message, severity,
          is_critical_path, attempt_count
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50)
    setRows((data as HealingRow[]) ?? [])
    setLoading(false)
  }

  async function handleRollback(row: HealingRow) {
    if (!row.previous_deployment_id) return
    const confirmed = window.confirm(
      `Откатить продакшн на деплой ${row.previous_deployment_id}?\nЭто действие немедленно применится к продакшну.`
    )
    if (!confirmed) return

    setRollingBack(row.id)
    try {
      const res = await fetch('/api/self-healing/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId: row.id,
          deploymentId: row.previous_deployment_id,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      await loadLogs()
    } catch (e: any) {
      alert(`Ошибка отката: ${e.message}`)
    } finally {
      setRollingBack(null)
    }
  }

  const toggleExpand = (id: string) =>
    setExpanded(prev => (prev === id ? null : id))

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🤖 Автономные исправления</h1>
          <p className="text-sm text-gray-500 mt-1">
            Self-Healing пайплайн Trinity CRM — последние 50 событий
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
        >
          🔄 Обновить
        </button>
      </div>

      {/* Stats bar */}
      <StatsBar rows={rows} />

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          🎉 Ошибок нет — система здорова
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(row => (
            <HealingCard
              key={row.id}
              row={row}
              expanded={expanded === row.id}
              onToggle={() => toggleExpand(row.id)}
              onRollback={() => handleRollback(row)}
              isRollingBack={rollingBack === row.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── StatsBar ─────────────────────────────────────────────────────────────────

function StatsBar({ rows }: { rows: HealingRow[] }) {
  const counts = {
    deployed: rows.filter(r => r.status === 'deployed' || r.status === 'merged').length,
    failed:   rows.filter(r => r.status === 'failed').length,
    active:   rows.filter(r => ['analyzing','fix_generated','testing'].includes(r.status)).length,
    rolledBack: rows.filter(r => r.status === 'rolled_back').length,
  }
  return (
    <div className="grid grid-cols-4 gap-3">
      {[
        { label: 'Внедрено', value: counts.deployed, color: 'text-green-600' },
        { label: 'Активных', value: counts.active,   color: 'text-blue-600' },
        { label: 'Ошибок',   value: counts.failed,   color: 'text-red-600' },
        { label: 'Откатов',  value: counts.rolledBack, color: 'text-orange-600' },
      ].map(s => (
        <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
          <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          <div className="text-xs text-gray-500 mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── HealingCard ──────────────────────────────────────────────────────────────

interface CardProps {
  row: HealingRow
  expanded: boolean
  onToggle: () => void
  onRollback: () => void
  isRollingBack: boolean
}

function HealingCard({ row, expanded, onToggle, onRollback, isRollingBack }: CardProps) {
  const status = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.failed
  const error = row.system_errors
  const canRollback = ['deployed','merged'].includes(row.status) && !!row.previous_deployment_id

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition"
        onClick={onToggle}
      >
        <span className="text-lg">{status.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
              {error?.route ?? 'unknown'}
            </code>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
              {status.label}
            </span>
            {error?.is_critical_path && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                🔐 критический
              </span>
            )}
            {error?.severity && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_COLOR[error.severity]}`}>
                {error.severity}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 truncate">{error?.error_message}</p>
        </div>
        <div className="text-xs text-gray-400 whitespace-nowrap">
          {new Date(row.created_at).toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit',
          })}
        </div>
        {canRollback && (
          <button
            onClick={e => { e.stopPropagation(); onRollback() }}
            disabled={isRollingBack}
            className="ml-2 text-xs px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition disabled:opacity-50 font-medium"
          >
            {isRollingBack ? '⏳...' : '↩️ Откатить'}
          </button>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3 text-sm">
          {row.claude_analysis && (
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">🤖 Анализ Claude</div>
              <p className="text-gray-700 bg-blue-50 rounded-lg p-3 text-xs leading-relaxed">
                {row.claude_analysis}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {row.pr_url && (
              <a href={row.pr_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline">
                🔗 Pull Request
              </a>
            )}
            {row.preview_url && (
              <a href={`https://${row.preview_url}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline">
                🔗 Preview
              </a>
            )}
            {row.test_result && (
              <span className={row.test_result === 'pass' ? 'text-green-600' : 'text-red-600'}>
                🧪 Тест: {row.test_result === 'pass' ? 'PASS ✓' : 'FAIL ✗'}
              </span>
            )}
            {row.build_result && (
              <span className={row.build_result === 'success' ? 'text-green-600' : 'text-red-600'}>
                🏗 Билд: {row.build_result === 'success' ? 'OK ✓' : 'ERROR ✗'}
              </span>
            )}
          </div>
          {row.generated_diff && (
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">📄 Diff изменений</div>
              <pre className="text-xs bg-gray-900 text-green-400 rounded-lg p-3 overflow-x-auto max-h-48 scrollbar-thin">
                {row.generated_diff.slice(0, 1500)}
              </pre>
            </div>
          )}
          {row.rollback_triggered && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700">
              ⚠️ Dead Man's Switch сработал {row.rollback_at
                ? `в ${new Date(row.rollback_at).toLocaleString('ru-RU')}`
                : ''
              }. Продакшн откатан.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

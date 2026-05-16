'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { formatDistanceToNow, format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import {
  Bot, GitBranch, GitMerge, FlaskConical, CheckCircle2,
  XCircle, RotateCcw, Clock, ShieldAlert, RefreshCw,
  ChevronDown, ChevronUp, ExternalLink, AlertTriangle,
  Zap, Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ── Types ────────────────────────────────────────────────────────────────────

type HealingStatus = 'analyzing' | 'fix_generated' | 'testing' | 'merged' |
  'deployed' | 'rolled_back' | 'failed' | 'awaiting_approval'

type Severity = 'low' | 'medium' | 'high' | 'critical'

interface HealingRow {
  id: string
  error_id: string
  status: HealingStatus
  branch_name: string | null
  pr_url: string | null
  preview_url: string | null
  deployment_id: string | null
  previous_deployment_id: string | null
  claude_analysis: string | null
  generated_diff: string | null
  test_file_content: string | null
  test_result: 'pass' | 'fail' | null
  build_result: 'success' | 'failure' | null
  rollback_triggered: boolean
  rollback_at: string | null
  merged_at: string | null
  created_at: string
  updated_at: string
  system_errors: {
    route: string
    method: string
    error_message: string
    error_stack: string | null
    severity: Severity
    is_critical_path: boolean
    attempt_count: number
    healed: boolean
  } | null
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<HealingStatus, { label: string; labelRu: string; icon: any; cls: string }> = {
  analyzing:         { label: 'מנתח',        labelRu: 'Анализ',         icon: Bot,          cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  fix_generated:     { label: 'תיקון נוצר',  labelRu: 'Фикс готов',    icon: GitBranch,    cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  testing:           { label: 'בודק',        labelRu: 'Тестирование',   icon: FlaskConical, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  merged:            { label: 'מוזג',        labelRu: 'Замержено',      icon: GitMerge,     cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  deployed:          { label: 'פורס',        labelRu: 'Задеплоено',     icon: CheckCircle2, cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  rolled_back:       { label: 'חזרה לאחור', labelRu: 'Откат',          icon: RotateCcw,    cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  failed:            { label: 'נכשל',        labelRu: 'Ошибка',         icon: XCircle,      cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  awaiting_approval: { label: 'ממתין לאישור', labelRu: 'Ждёт апрува',  icon: ShieldAlert,  cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
}

const SEVERITY_CLS: Record<Severity, string> = {
  low:      'bg-gray-100 text-gray-600',
  medium:   'bg-yellow-100 text-yellow-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

const ACTIVE_STATUSES: HealingStatus[] = ['analyzing', 'fix_generated', 'testing']
const FINAL_STATUSES: HealingStatus[]  = ['merged', 'deployed', 'rolled_back', 'failed', 'awaiting_approval']

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ rows, lang }: { rows: HealingRow[]; lang: string }) {
  const ru_ = lang === 'ru'
  const stats = {
    active:   rows.filter(r => ACTIVE_STATUSES.includes(r.status)).length,
    merged:   rows.filter(r => r.status === 'merged' || r.status === 'deployed').length,
    failed:   rows.filter(r => r.status === 'failed').length,
    rollback: rows.filter(r => r.status === 'rolled_back').length,
  }
  const items = [
    { label: ru_ ? 'В процессе' : 'בתהליך',  value: stats.active,   cls: 'text-blue-600',   icon: Activity },
    { label: ru_ ? 'Исправлено' : 'תוקן',     value: stats.merged,   cls: 'text-green-600',  icon: CheckCircle2 },
    { label: ru_ ? 'Ошибок' : 'כשלונות',      value: stats.failed,   cls: 'text-red-600',    icon: XCircle },
    { label: ru_ ? 'Откатов' : 'חזרות',       value: stats.rollback, cls: 'text-orange-600', icon: RotateCcw },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(s => {
        const Icon = s.icon
        return (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3 shadow-sm">
            <div className={cn('p-2 rounded-xl bg-gray-50 dark:bg-gray-800', s.cls)}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className={cn('text-2xl font-bold', s.cls)}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Healing card ──────────────────────────────────────────────────────────────

function HealingCard({ row, lang, onRollback, rolling }: {
  row: HealingRow; lang: string
  onRollback: (row: HealingRow) => void
  rolling: boolean
}) {
  const [open, setOpen] = useState(false)
  const ru_ = lang === 'ru'
  const st = STATUS[row.status]
  const StIcon = st.icon
  const err = row.system_errors
  const canRollback = ['merged', 'deployed'].includes(row.status) && !!row.previous_deployment_id
  const isActive = ACTIVE_STATUSES.includes(row.status)

  return (
    <div className={cn(
      'bg-white dark:bg-gray-900 rounded-2xl border shadow-sm overflow-hidden transition-all',
      isActive ? 'border-blue-200 dark:border-blue-800' : 'border-gray-100 dark:border-gray-800'
    )}>
      {/* Active pulse indicator */}
      {isActive && (
        <div className="h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-pulse" />
      )}

      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setOpen(o => !o)}>

        {/* Status icon */}
        <div className={cn('p-1.5 rounded-lg flex-shrink-0', st.cls)}>
          <StIcon className="w-4 h-4" />
        </div>

        {/* Route + error */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">
              {err?.route ?? '?'}
            </code>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', st.cls)}>
              {ru_ ? st.labelRu : st.label}
            </span>
            {err?.is_critical_path && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-medium">
                🔐 {ru_ ? 'критич.' : 'קריטי'}
              </span>
            )}
            {err?.severity && (
              <span className={cn('text-xs px-2 py-0.5 rounded-full', SEVERITY_CLS[err.severity])}>
                {err.severity}
              </span>
            )}
            {isActive && (
              <span className="flex items-center gap-1 text-xs text-blue-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                {ru_ ? 'В процессе' : 'פעיל'}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {err?.error_message ?? '—'}
          </p>
        </div>

        {/* Time + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400 hidden sm:block">
            {formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: ru })}
          </span>
          {canRollback && (
            <button
              onClick={e => { e.stopPropagation(); onRollback(row) }}
              disabled={rolling}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-700 hover:bg-orange-100 transition disabled:opacity-50 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              {ru_ ? 'Откат' : 'החזרה'}
            </button>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Expanded details */}
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-4 space-y-4">

          {/* Timeline */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {[
              { label: ru_ ? 'Создан' : 'נוצר', value: format(new Date(row.created_at), 'dd.MM HH:mm') },
              row.merged_at && { label: ru_ ? 'Мерж' : 'מוזג', value: format(new Date(row.merged_at), 'dd.MM HH:mm') },
              row.rollback_at && { label: ru_ ? 'Откат' : 'חזרה', value: format(new Date(row.rollback_at), 'dd.MM HH:mm') },
            ].filter(Boolean).map((item: any) => (
              <span key={item.label} className="bg-gray-100 dark:bg-gray-800 rounded-lg px-2 py-1">
                <span className="text-gray-400">{item.label}: </span>
                <span className="text-gray-700 dark:text-gray-300 font-medium">{item.value}</span>
              </span>
            ))}
          </div>

          {/* Claude analysis */}
          {row.claude_analysis && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" /> {ru_ ? 'Анализ Claude' : 'ניתוח Claude'}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 leading-relaxed">
                {row.claude_analysis}
              </p>
            </div>
          )}

          {/* Links + results */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {row.pr_url && (
              <a href={row.pr_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline">
                <GitBranch className="w-3 h-3" /> Pull Request <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {row.preview_url && (
              <a href={`https://${row.preview_url}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline">
                <ExternalLink className="w-3 h-3" /> Preview
              </a>
            )}
            {row.build_result && (
              <span className={row.build_result === 'success' ? 'text-green-600' : 'text-red-600'}>
                🏗 {ru_ ? 'Билд' : 'בנייה'}: {row.build_result === 'success' ? '✓ OK' : '✗ FAIL'}
              </span>
            )}
            {row.test_result && (
              <span className={row.test_result === 'pass' ? 'text-green-600' : 'text-red-600'}>
                🧪 {ru_ ? 'Тест' : 'בדיקה'}: {row.test_result === 'pass' ? '✓ PASS' : '✗ FAIL'}
              </span>
            )}
          </div>

          {/* Diff */}
          {row.generated_diff && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Diff</p>
              <pre className="text-xs bg-gray-900 text-green-400 rounded-xl p-3 overflow-x-auto max-h-56 scrollbar-thin font-mono leading-relaxed">
                {row.generated_diff.slice(0, 2000)}
              </pre>
            </div>
          )}

          {/* Error stack */}
          {err?.error_stack && (
            <details>
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                {ru_ ? 'Stack trace' : 'מחסנית שגיאות'}
              </summary>
              <pre className="mt-2 text-xs bg-red-950/20 text-red-400 rounded-xl p-3 overflow-x-auto max-h-40 font-mono">
                {err.error_stack.slice(0, 1500)}
              </pre>
            </details>
          )}

          {/* Rollback alert */}
          {row.rollback_triggered && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl p-3 text-sm text-orange-700 dark:text-orange-400">
              ⚠️ Dead Man's Switch — {ru_ ? 'автооткат' : 'חזרה אוטומטית'}
              {row.rollback_at && ` · ${format(new Date(row.rollback_at), 'dd.MM HH:mm')}`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HealingPage() {
  const { language } = useLanguage()
  const ru_ = language === 'ru'
  const supabase = createSupabaseBrowserClient()

  const [rows, setRows] = useState<HealingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [rolling, setRolling] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all')

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const { data } = await supabase
      .from('ai_healing_logs')
      .select(`*, system_errors(route,method,error_message,error_stack,severity,is_critical_path,attempt_count,healed)`)
      .order('created_at', { ascending: false })
      .limit(100)
    setRows((data ?? []) as HealingRow[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // ── Realtime ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel('admin-healing')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_healing_logs' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, load])

  // ── Rollback ────────────────────────────────────────────────────────────────
  const handleRollback = useCallback(async (row: HealingRow) => {
    if (!row.previous_deployment_id) return
    if (!confirm(ru_
      ? `Откатить продакшн на ${row.previous_deployment_id}?`
      : `לחזור לגרסה ${row.previous_deployment_id}?`
    )) return
    setRolling(row.id)
    try {
      const res = await fetch('/api/self-healing/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId: row.id, deploymentId: row.previous_deployment_id }),
      })
      if (!res.ok) throw new Error(await res.text())
      await load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setRolling(null)
    }
  }, [ru_, load])

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = rows.filter(r => {
    if (filter === 'active') return ACTIVE_STATUSES.includes(r.status)
    if (filter === 'done') return FINAL_STATUSES.includes(r.status)
    return true
  })

  const activeCount = rows.filter(r => ACTIVE_STATUSES.includes(r.status)).length

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Zap className="w-6 h-6 text-indigo-500" />
            {ru_ ? 'Авто-исправления' : 'תיקונים אוטומטיים'}
            {activeCount > 0 && (
              <Badge className="bg-blue-100 text-blue-700 border-0 animate-pulse">
                {activeCount} {ru_ ? 'активных' : 'פעילים'}
              </Badge>
            )}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {ru_ ? 'Self-Healing System · Realtime мониторинг' : 'מערכת ריפוי עצמי · מעקב בזמן אמת'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          {ru_ ? 'Обновить' : 'רענן'}
        </Button>
      </div>

      {/* Stats */}
      <StatsBar rows={rows} lang={language} />

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all',    labelRu: 'Все',         labelHe: 'הכל' },
          { key: 'active', labelRu: 'В процессе',  labelHe: 'פעיל' },
          { key: 'done',   labelRu: 'Завершённые', labelHe: 'סיום' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
              filter === f.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300'
            )}
          >
            {ru_ ? f.labelRu : f.labelHe}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
          <CheckCircle2 className="w-12 h-12 opacity-30" />
          <p className="text-sm">{ru_ ? 'Записей нет' : 'אין רשומות'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(row => (
            <HealingCard
              key={row.id}
              row={row}
              lang={language}
              onRollback={handleRollback}
              rolling={rolling === row.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

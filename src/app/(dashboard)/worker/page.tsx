'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import Link from 'next/link'
import { CommissionWidget }  from '@/components/worker/CommissionWidget'
import { NewLeadModal }      from '@/components/worker/NewLeadModal'
import { NotificationBell } from '@/components/worker/NotificationBell'
import { QuickNoteModal }   from '@/components/worker/QuickNoteModal'
import { WaTemplateModal }  from '@/components/worker/WaTemplateModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BurningTask {
  id: string; title: string; due_date: string
  client_name?: string | null; urgency: 'overdue' | 'today'
}

interface RedZoneDeal {
  id: string; title: string; amount: number; currency: string
  last_contact_at: string | null; next_action: string | null
  minutes_silent: number | null
  client: { id: string; first_name: string; last_name: string; phone: string } | null
}

interface NewLead {
  id: string; title: string; amount: number; currency: string
  source: string | null; created_at: string
  client: { id: string; first_name: string; last_name: string; phone: string } | null
}

interface KpiData {
  amount: number; target_amount: number | null; target_deals: number | null
  currency: string; percent: number | null; period: { year: number; month: number }
}

interface FunnelStage { name: string; color: string; count: number; position: number }

interface ActivityItem {
  id: string; type: string; title: string; body: string | null; created_at: string
}

interface DashboardData {
  burning_tasks:    BurningTask[]
  red_zone_deals:   RedZoneDeal[]
  new_leads:        NewLead[]
  kpi:              KpiData
  funnel:           FunnelStage[]
  my_clients_count: number
  my_active_deals:  number
  activity_feed:    ActivityItem[]
  is_working_hours: boolean
  settings:         { phone_mask_enabled: boolean; can_view_reports: boolean }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, currency = 'ILS') {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

function monthName(month: number, lang: string) {
  return new Date(2024, month - 1, 1).toLocaleString(lang === 'he' ? 'he-IL' : 'ru-RU', { month: 'long' })
}

function waLink(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  const num   = clean.startsWith('0') ? '972' + clean.slice(1) : clean
  return `https://wa.me/${num}`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse space-y-3">
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-5/6" />
    </div>
  )
}

// ─── Widget wrapper ────────────────────────────────────────────────────────────

function Widget({ title, action, children, className = '' }: {
  title: string; action?: ReactNode; children: ReactNode; className?: string
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col ${className}`}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h2>
        {action}
      </div>
      <div className="px-4 pb-4 flex-1">{children}</div>
    </div>
  )
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

function QuickActions({
  lang, onNewLead, onQuickNote, onWaTemplate,
}: {
  lang: string
  onNewLead:    () => void
  onQuickNote:  () => void
  onWaTemplate: () => void
}) {
  const isHe = lang === 'he'

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Отправить шаблон WA */}
      <button
        onClick={onWaTemplate}
        className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl text-xs font-bold transition-all shadow-sm bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.523 5.845L.057 23.054a.75.75 0 00.916.916l5.209-1.466A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.963 0-3.8-.5-5.403-1.378l-.386-.217-4.003 1.126 1.126-4.003-.217-.386A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
        </svg>
        <span className="text-center leading-tight">{isHe ? 'שלח תבנית WA' : 'Шаблон WA'}</span>
      </button>

      {/* Быстрая заметка */}
      <button
        onClick={onQuickNote}
        className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl text-xs font-bold transition-all shadow-sm bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span className="text-center leading-tight">{isHe ? 'הערה מהירה' : 'Быстрая заметка'}</span>
      </button>

      {/* Новый лид */}
      <button
        onClick={onNewLead}
        className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl text-xs font-bold transition-all shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-center leading-tight">{isHe ? 'ליד חדש' : 'Новый лид'}</span>
      </button>
    </div>
  )
}

// ─── Red Zone Card ────────────────────────────────────────────────────────────

function RedZoneCard({ deal, lang, maskPhone }: {
  deal: RedZoneDeal; lang: string; maskPhone: boolean
}) {
  const isHe = lang === 'he'
  const clientName = deal.client
    ? `${deal.client.first_name} ${deal.client.last_name}`.trim()
    : (isHe ? 'לא מוגדר' : 'Не указан')
  const phone = deal.client?.phone ?? ''
  const mins  = deal.minutes_silent

  const silentLabel = mins == null
    ? (isHe ? 'אין מגע' : 'Без касания')
    : mins < 60
      ? (isHe ? `${mins} דק` : `${mins} мин`)
      : (isHe ? `${Math.floor(mins / 60)} ש'` : `${Math.floor(mins / 60)} ч`)

  return (
    <div className="relative flex items-start gap-3 p-3 rounded-xl border-2 border-red-200 bg-red-50/60 hover:bg-red-50 transition-colors">
      <span className="relative mt-1 shrink-0 flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{clientName}</p>
        <p className="text-xs text-gray-500 truncate">{deal.title}</p>
        {deal.next_action && (
          <p className="text-xs text-indigo-600 truncate mt-0.5">{deal.next_action}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
          {silentLabel}
        </span>
        {phone && (
          <a
            href={waLink(phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.523 5.845L.057 23.054a.75.75 0 00.916.916l5.209-1.466A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.963 0-3.8-.5-5.403-1.378l-.386-.217-4.003 1.126 1.126-4.003-.217-.386A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
            WA
          </a>
        )}
      </div>
    </div>
  )
}

// ─── New Lead Card ────────────────────────────────────────────────────────────

function NewLeadCard({ lead, lang }: { lead: NewLead; lang: string }) {
  const isHe = lang === 'he'
  const clientName = lead.client
    ? `${lead.client.first_name} ${lead.client.last_name}`.trim()
    : (isHe ? 'לא מוגדר' : 'Не указан')
  const phone = lead.client?.phone ?? ''

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50 transition-colors">
      <span className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-base">🎯</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{clientName}</p>
        <p className="text-xs text-gray-500 truncate">{lead.title}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {lead.amount > 0 && (
          <span className="text-xs font-bold text-indigo-600">{fmt(lead.amount, lead.currency)}</span>
        )}
        {phone && (
          <a href={waLink(phone)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg transition-colors">
            WA
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, lang }: { task: BurningTask; lang: string }) {
  const isHe = lang === 'he'
  return (
    <li className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className={`shrink-0 w-2 h-2 rounded-full mt-0.5 ${
        task.urgency === 'overdue' ? 'bg-red-500' : 'bg-amber-400'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
      </div>
      <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
        task.urgency === 'overdue' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
      }`}>
        {task.urgency === 'overdue' ? (isHe ? 'פג' : 'Просроч.') : (isHe ? 'היום' : 'Сегодня')}
      </span>
    </li>
  )
}

// ─── KPI Bar ──────────────────────────────────────────────────────────────────

function KpiBar({ kpi, lang }: { kpi: KpiData; lang: string }) {
  const isHe = lang === 'he'
  const pct  = kpi.percent ?? 0
  const bar  = Math.min(pct, 100)
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xl font-bold text-gray-900">{fmt(kpi.amount, kpi.currency)}</span>
        {kpi.target_amount && (
          <span className="text-xs text-gray-400">
            {isHe ? `יעד: ${fmt(kpi.target_amount, kpi.currency)}` : `план: ${fmt(kpi.target_amount, kpi.currency)}`}
          </span>
        )}
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${
            pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : 'bg-amber-400'
          }`}
          style={{ width: `${bar}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">
        {monthName(kpi.period.month, lang)} — {pct}%{kpi.target_amount ? (isHe ? ' מהיעד' : ' от плана') : ''}
      </p>
    </div>
  )
}

// ─── Compact Funnel ───────────────────────────────────────────────────────────

function CompactFunnel({ stages, lang }: { stages: FunnelStage[]; lang: string }) {
  const isHe = lang === 'he'
  if (stages.length === 0) {
    return <p className="text-xs text-gray-400 py-2">{isHe ? 'אין עסקאות' : 'Нет сделок'}</p>
  }
  const max = Math.max(...stages.map(s => s.count), 1)
  return (
    <div className="flex items-end gap-1.5 h-12">
      {stages.map(s => (
        <div key={s.name} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold text-gray-700">{s.count}</span>
          <div
            className="w-full rounded-t-sm transition-all duration-500"
            style={{ height: `${Math.max(4, Math.round((s.count / max) * 32))}px`, backgroundColor: s.color }}
          />
          <span className="text-[9px] text-gray-400 truncate w-full text-center" title={s.name}>
            {s.name.length > 6 ? s.name.slice(0, 5) + '…' : s.name}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkerDashboardPage() {
  const { language } = useLanguage()
  const isHe = language === 'he'

  const [data,           setData]           = useState<DashboardData | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState<string | null>(null)
  const [newLeadOpen,    setNewLeadOpen]    = useState(false)
  const [quickNoteOpen,  setQuickNoteOpen]  = useState(false)
  const [waTemplateOpen, setWaTemplateOpen] = useState(false)

  const fetchDashboard = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/worker/dashboard', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
    const id = setInterval(fetchDashboard, 2 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchDashboard])

  const maskPhone = data?.settings.phone_mask_enabled ?? false

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-5" dir={isHe ? 'rtl' : 'ltr'}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            {isHe ? '🏋️ לוח עבודה' : '🏋️ Рабочий стол'}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date().toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', {
              weekday: 'short', day: 'numeric', month: 'short',
            })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell lang={language} />
          <Link
            href="/worker/pipeline"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-indigo-200 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            {isHe ? 'פייפליין' : 'Пайплайн'}
          </Link>
          <button
            onClick={fetchDashboard} disabled={loading}
            className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 border border-red-100 px-4 py-2 text-sm text-red-600">
          {isHe ? `שגיאה: ${error}` : `Ошибка: ${error}`}
        </div>
      )}

      {loading && !data && (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton /><Skeleton /><Skeleton /><Skeleton />
        </div>
      )}

      {data && (
        <div className="space-y-3">

          {/* Row 1: KPI Cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="bg-indigo-50 rounded-2xl px-4 py-3 flex flex-col gap-0.5">
              <span className="text-2xl font-bold text-indigo-600">{data.my_active_deals}</span>
              <span className="text-xs text-gray-500">{isHe ? 'עסקאות פעילות' : 'Активных сделок'}</span>
            </div>
            <div className="bg-emerald-50 rounded-2xl px-4 py-3 flex flex-col gap-0.5">
              <span className="text-2xl font-bold text-emerald-600">{data.my_clients_count}</span>
              <span className="text-xs text-gray-500">{isHe ? 'לקוחות שלי' : 'Моих клиентов'}</span>
            </div>
            <div className="bg-red-50 rounded-2xl px-4 py-3 flex flex-col gap-0.5">
              <span className="text-2xl font-bold text-red-600">{data.red_zone_deals.length}</span>
              <span className="text-xs text-gray-500">{isHe ? 'אזור אדום' : 'Красная зона'}</span>
            </div>
            <div className="bg-amber-50 rounded-2xl px-4 py-3 flex flex-col gap-0.5">
              <span className="text-2xl font-bold text-amber-600">{data.burning_tasks.length}</span>
              <span className="text-xs text-gray-500">{isHe ? 'משימות דחופות' : 'Срочных задач'}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <Widget title={isHe ? '⚡ פעולות מהירות' : '⚡ Быстрые действия'}>
            <QuickActions
              lang={language}
              onNewLead={    () => setNewLeadOpen(true)}
              onQuickNote={  () => setQuickNoteOpen(true)}
              onWaTemplate={ () => setWaTemplateOpen(true)}
            />
          </Widget>

          {/* Row 2: Red Zone + Tasks */}
          <div className="grid gap-3 md:grid-cols-2">
            <Widget
              title={isHe ? '🔴 אזור אדום' : '🔴 Красная зона'}
              action={data.red_zone_deals.length > 0 ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                  {data.red_zone_deals.length}
                </span>
              ) : null}
            >
              {!data.is_working_hours ? (
                <p className="text-xs text-gray-400 py-2 text-center">
                  {isHe ? '💤 מחוץ לשעות עבודה' : '💤 Нерабочее время'}
                </p>
              ) : data.red_zone_deals.length === 0 ? (
                <p className="text-sm text-emerald-600 py-2 text-center font-medium">
                  {isHe ? '✅ הכל בסדר!' : '✅ Всё под контролем!'}
                </p>
              ) : (
                <div className="space-y-2">
                  {data.red_zone_deals.map(d => (
                    <RedZoneCard key={d.id} deal={d} lang={language} maskPhone={maskPhone} />
                  ))}
                </div>
              )}
            </Widget>

            <Widget
              title={isHe ? '🔥 משימות דחופות' : '🔥 Срочные задачи'}
              action={
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  data.burning_tasks.length > 0 ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400'
                }`}>{data.burning_tasks.length}</span>
              }
            >
              {data.burning_tasks.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">{isHe ? 'אין משימות 🎉' : 'Нет задач 🎉'}</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {data.burning_tasks.map(t => <TaskRow key={t.id} task={t} lang={language} />)}
                </ul>
              )}
            </Widget>
          </div>

          {/* New Leads feed */}
          {data.new_leads.length > 0 && (
            <Widget
              title={isHe ? '🎯 לידים חדשים (24ש׳)' : '🎯 Новые лиды (24ч)'}
              action={
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                  {data.new_leads.length}
                </span>
              }
            >
              <div className="space-y-2">
                {data.new_leads.map(l => <NewLeadCard key={l.id} lead={l} lang={language} />)}
              </div>
            </Widget>
          )}

          {/* Row 3: KPI + Funnel + Commission */}
          <div className="grid gap-3 md:grid-cols-3">
            <Widget title={isHe ? '📊 ביצועים חודשיים' : '📊 Выполнение плана'}>
              <KpiBar kpi={data.kpi} lang={language} />
            </Widget>
            <Widget
              title={isHe ? '📈 מפת הוורקה' : '📈 Карта воронки'}
              action={
                <Link href="/worker/pipeline" className="text-xs text-indigo-500 hover:text-indigo-700">
                  {isHe ? 'לפייפליין ←' : '→ пайплайн'}
                </Link>
              }
            >
              <CompactFunnel stages={data.funnel} lang={language} />
            </Widget>
            <CommissionWidget lang={language} />
          </div>

        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <NewLeadModal
        open={newLeadOpen}
        lang={language}
        onClose={() => setNewLeadOpen(false)}
        onCreated={fetchDashboard}
      />
      <QuickNoteModal
        open={quickNoteOpen}
        lang={language}
        onClose={() => setQuickNoteOpen(false)}
      />
      <WaTemplateModal
        open={waTemplateOpen}
        lang={language}
        onClose={() => setWaTemplateOpen(false)}
      />
    </div>
  )
}

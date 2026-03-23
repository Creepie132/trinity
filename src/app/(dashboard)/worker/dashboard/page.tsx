'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { CommissionWidget } from '@/components/worker/CommissionWidget'
import { NewLeadModal } from '@/components/worker/NewLeadModal'
import { QuickNoteModal } from '@/components/worker/QuickNoteModal'
import { WaTemplateModal } from '@/components/worker/WaTemplateModal'

interface BurningTask { id: string; title: string; due_date: string; urgency: 'overdue' | 'today' }
interface RedZoneDeal {
  id: string; title: string; amount: number; currency: string
  last_contact_at: string | null; next_action: string | null; minutes_silent: number | null
  client: { id: string; first_name: string; last_name: string; phone: string } | null
}
interface NewLead {
  id: string; title: string; amount: number; currency: string; created_at: string
  client: { id: string; first_name: string; last_name: string; phone: string } | null
}
interface KpiData {
  amount: number; target_amount: number | null; currency: string
  percent: number | null; period: { year: number; month: number }
}
interface FunnelStage { name: string; color: string; count: number; position: number }
interface DashboardData {
  burning_tasks: BurningTask[]; red_zone_deals: RedZoneDeal[]
  new_leads: NewLead[]; kpi: KpiData; funnel: FunnelStage[]
  my_clients_count: number; my_active_deals: number
  is_working_hours: boolean; settings: { phone_mask_enabled: boolean }
}

function fmt(n: number, currency = 'ILS') {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}
function waLink(phone: string) {
  const clean = phone.replace(/\D/g, '')
  return `https://wa.me/${clean.startsWith('0') ? '972' + clean.slice(1) : clean}`
}
function monthName(m: number, lang: string) {
  return new Date(2024, m - 1, 1).toLocaleString(lang === 'he' ? 'he-IL' : 'ru-RU', { month: 'long' })
}
function initials(f: string, l: string) { return ((f[0] ?? '') + (l[0] ?? '')).toUpperCase() }
const AV_COLORS = ['from-purple-400 to-indigo-500','from-emerald-400 to-teal-500','from-amber-400 to-orange-500','from-pink-400 to-rose-500','from-blue-400 to-cyan-500']
function avColor(name: string) { return AV_COLORS[name.charCodeAt(0) % AV_COLORS.length] }

function KpiCard({ value, label, color, icon, glow }: { value: number|string; label: string; color: string; icon: React.ReactNode; glow: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 bg-white/70 backdrop-blur-sm border border-white/60 shadow-lg hover:shadow-xl transition-all ${glow}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white shadow-md`}>{icon}</div>
        <svg className="w-16 h-8 opacity-20" viewBox="0 0 64 32">
          <polyline points="0,28 12,20 24,22 36,10 48,14 64,4" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-600"/>
        </svg>
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
    </div>
  )
}

function MiniDealCard({ deal, lang }: { deal: RedZoneDeal | NewLead; lang: string }) {
  const isHe = lang === 'he'
  const c = deal.client
  const name = c ? `${c.first_name} ${c.last_name}`.trim() : (isHe ? 'לא מוגדר' : 'Неизвестно')
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 backdrop-blur-sm border border-white/50 hover:bg-white/80 transition-all">
      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avColor(name)} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
        {initials(c?.first_name ?? '?', c?.last_name ?? '')}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-400 truncate">{deal.title}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {deal.amount > 0 && <span className="text-xs font-bold text-emerald-600">{fmt(deal.amount, deal.currency)}</span>}
        {c?.phone && (
          <a href={waLink(c.phone)} target="_blank" rel="noopener noreferrer"
            className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold hover:bg-emerald-200 transition-colors">WA</a>
        )}
      </div>
    </div>
  )
}

function GlassWidget({ title, children, action, className = '' }: { title: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-lg overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h3>
        {action}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  )
}

export default function WorkerDashboardPage() {
  const { language, dir } = useLanguage()
  const isHe = language === 'he'
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newLeadOpen, setNewLeadOpen] = useState(false)
  const [quickNoteOpen, setQuickNoteOpen] = useState(false)
  const [waTemplateOpen, setWaTemplateOpen] = useState(false)

  const fetchDashboard = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/worker/dashboard', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchDashboard(true)
    const id = setInterval(() => fetchDashboard(false), 2 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchDashboard])

  const now = new Date()
  const greeting = isHe
    ? `שלום! ${now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}`
    : `Привет! ${now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}`

  return (
    <div className="min-h-full p-4 lg:p-6 space-y-5" dir={dir}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">{isHe ? '🏋️ לוח עבודה' : '🏋️ Рабочий стол'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{greeting}</p>
        </div>
        <button onClick={() => fetchDashboard(false)} disabled={loading}
          className="p-2.5 rounded-xl bg-white/70 border border-white/50 text-gray-400 hover:text-gray-600 shadow-sm transition-all disabled:opacity-40">
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2 text-sm text-red-600">{error}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard value={data?.my_active_deals ?? 0} label={isHe ? 'עסקאות פעילות' : 'Активных сделок'}
          color="bg-gradient-to-br from-indigo-500 to-indigo-600" glow="hover:shadow-indigo-100/60"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>}/>
        <KpiCard value={data?.red_zone_deals.length ?? 0} label={isHe ? 'אזור אדום' : 'Красная зона'}
          color="bg-gradient-to-br from-red-400 to-red-500" glow="hover:shadow-red-100/60"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>}/>
        <KpiCard value={data?.my_clients_count ?? 0} label={isHe ? 'לקוחות שלי' : 'Моих клиентов'}
          color="bg-gradient-to-br from-emerald-400 to-emerald-500" glow="hover:shadow-emerald-100/60"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}/>
        <KpiCard value={data?.burning_tasks.length ?? 0} label={isHe ? 'משימות פעילות' : 'Активных задач'}
          color="bg-gradient-to-br from-amber-400 to-amber-500" glow="hover:shadow-amber-100/60"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}/>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setWaTemplateOpen(true)}
          className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200/50 hover:shadow-xl transition-all active:scale-[0.97] text-xs font-bold">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.523 5.845L.057 23.054a.75.75 0 00.916.916l5.209-1.466A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.963 0-3.8-.5-5.403-1.378l-.386-.217-4.003 1.126 1.126-4.003-.217-.386A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
          {isHe ? 'שלח תבנית WA' : 'Шаблон WA'}
        </button>
        <button onClick={() => setQuickNoteOpen(true)}
          className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 text-gray-700 shadow-lg hover:shadow-xl hover:bg-white/90 transition-all active:scale-[0.97] text-xs font-bold">
          <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          {isHe ? 'הערה מהירה' : 'Быстрая заметка'}
        </button>
        <button onClick={() => setNewLeadOpen(true)}
          className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-200/50 hover:shadow-xl transition-all active:scale-[0.97] text-xs font-bold">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
          {isHe ? 'ליד חדש' : 'Новый лид'}
        </button>
      </div>

      {/* Red zone + Tasks */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassWidget title={isHe ? '🔴 אזור אדום' : '🔴 Красная зона'}
          action={data && data.red_zone_deals.length > 0 ? <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{data.red_zone_deals.length}</span> : null}>
          {loading && !data ? <div className="space-y-2 animate-pulse">{[1,2].map(i=><div key={i} className="h-14 bg-gray-100 rounded-xl"/>)}</div>
            : !data || !data.is_working_hours ? <p className="text-sm text-gray-400 py-3 text-center">💤 {isHe ? 'מחוץ לשעות עבודה' : 'Нерабочее время'}</p>
            : data.red_zone_deals.length === 0 ? <p className="text-sm text-emerald-600 py-3 text-center font-medium">✅ {isHe ? 'הכל בסדר!' : 'Всё под контролем!'}</p>
            : <div className="space-y-2">{data.red_zone_deals.map(d=><MiniDealCard key={d.id} deal={d} lang={language}/>)}</div>}
        </GlassWidget>

        <GlassWidget title={isHe ? '🔥 משימות דחופות' : '🔥 Срочные задачи'}
          action={data ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${data.burning_tasks.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>{data.burning_tasks.length}</span> : null}>
          {loading && !data ? <div className="space-y-2 animate-pulse">{[1,2,3].map(i=><div key={i} className="h-8 bg-gray-100 rounded-lg"/>)}</div>
            : !data || data.burning_tasks.length === 0 ? <p className="text-sm text-gray-400 py-3 text-center">{isHe ? 'אין משימות 🎉' : 'Нет задач 🎉'}</p>
            : <ul className="space-y-1.5">{data.burning_tasks.map(t=>(
              <li key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/50 border border-white/40">
                <span className={`w-2 h-2 rounded-full shrink-0 ${t.urgency === 'overdue' ? 'bg-red-500' : 'bg-amber-400'}`}/>
                <span className="text-sm font-medium text-gray-800 flex-1 truncate">{t.title}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${t.urgency === 'overdue' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                  {t.urgency === 'overdue' ? (isHe ? 'פג' : 'Просроч.') : (isHe ? 'היום' : 'Сегодня')}
                </span>
              </li>
            ))}</ul>}
        </GlassWidget>
      </div>

      {/* New leads */}
      {data && data.new_leads.length > 0 && (
        <GlassWidget title={isHe ? '🎯 לידים חדשים (24ש׳)' : '🎯 Новые лиды (24ч)'}
          action={<span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">{data.new_leads.length}</span>}>
          <div className="space-y-2">{data.new_leads.map(l=><MiniDealCard key={l.id} deal={l} lang={language}/>)}</div>
        </GlassWidget>
      )}

      {/* KPI + Funnel + Commission */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassWidget title={isHe ? '📊 ביצועים חודשיים' : '📊 Выполнение плана'}>
          {loading && !data ? <div className="space-y-2 animate-pulse"><div className="h-6 bg-gray-100 rounded w-1/2"/><div className="h-2 bg-gray-100 rounded-full"/></div>
            : <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-gray-900">{fmt(data.kpi.amount, data.kpi.currency)}</span>
                {data.kpi.target_amount && <span className="text-[10px] text-gray-400">{isHe ? `יעד: ${fmt(data.kpi.target_amount, data.kpi.currency)}` : `план: ${fmt(data.kpi.target_amount, data.kpi.currency)}`}</span>}
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full transition-all duration-700 ${(data.kpi.percent??0)>=100?'bg-emerald-500':(data.kpi.percent??0)>=60?'bg-indigo-500':'bg-amber-400'}`}
                  style={{width:`${Math.min(data.kpi.percent??0,100)}%`}}/>
              </div>
              <p className="text-[10px] text-gray-400">{monthName(data.kpi.period.month, language)} — {data.kpi.percent??0}%</p>
            </div>}
        </GlassWidget>

        <GlassWidget title={isHe ? '📈 מפת הפייפליין' : '📈 Карта пайплайна'}
          action={<Link href="/worker/pipeline" className="text-[10px] text-indigo-500 font-semibold hover:text-indigo-700">{isHe ? 'לפייפליין ←' : '→ пайплайн'}</Link>}>
          {!data || data.funnel.length === 0
            ? <p className="text-xs text-gray-400 py-2">{isHe ? 'אין עסקאות' : 'Нет сделок'}</p>
            : <div className="flex items-end gap-1.5 h-14">
              {data.funnel.map(s=>{
                const max = Math.max(...data.funnel.map(f=>f.count),1)
                return <div key={s.name} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-gray-700">{s.count}</span>
                  <div className="w-full rounded-t-md transition-all" style={{height:`${Math.max(6,Math.round((s.count/max)*36))}px`,backgroundColor:s.color}}/>
                  <span className="text-[8px] text-gray-400 truncate w-full text-center">{s.name.slice(0,6)}</span>
                </div>
              })}
            </div>}
        </GlassWidget>

        <CommissionWidget lang={language}/>
      </div>

      {/* Rocket banner */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border border-amber-100/80 p-4 flex items-center gap-4">
        <span className="text-4xl">🚀</span>
        <div className="flex-1">
          <p className="font-bold text-amber-800 text-sm">Amber Solutions</p>
          <p className="text-xs text-amber-600 mt-0.5">{isHe ? 'המכירות שלך הן הצמיחה שלנו. בהצלחה היום!' : 'Твои продажи — наш рост. Удачи сегодня!'}</p>
        </div>
        <span className="text-amber-300 text-2xl">✨</span>
      </div>

      <NewLeadModal open={newLeadOpen} lang={language} onClose={() => setNewLeadOpen(false)} onCreated={fetchDashboard}/>
      <QuickNoteModal open={quickNoteOpen} lang={language} onClose={() => setQuickNoteOpen(false)}/>
      <WaTemplateModal open={waTemplateOpen} lang={language} onClose={() => setWaTemplateOpen(false)}/>
    </div>
  )
}

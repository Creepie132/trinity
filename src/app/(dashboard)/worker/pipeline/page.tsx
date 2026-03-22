'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePipeline, PipelineDeal, PipelineStage } from '@/hooks/usePipeline'
import { DealDrawer } from '@/components/worker/DealDrawer'

// ─── Utils ────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000), hours = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000)
  const isHe = lang === 'he'
  if (mins < 2)   return isHe ? 'עכשיו'            : 'только что'
  if (mins < 60)  return isHe ? `לפני ${mins} ד'`  : `${mins} мин назад`
  if (hours < 24) return isHe ? `לפני ${hours} ש'` : `${hours} ч назад`
  return isHe ? `לפני ${days} ימים` : `${days} дн назад`
}

const AVATAR_GRADIENTS = [
  ['#8B5CF6','#6366F1'], ['#10B981','#0D9488'], ['#F59E0B','#EF4444'],
  ['#EC4899','#F43F5E'], ['#3B82F6','#06B6D4'], ['#8B5CF6','#A855F7'],
]
const avGrad  = (name: string) => AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length]
const initials = (f: string, l: string) => ((f[0] ?? '') + (l[0] ?? '')).toUpperCase()
const fmt = (n: number) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)

// ─── Rejection Modal ──────────────────────────────────────────────────────────

const REJECTION_CATS = [
  { value: 'price',      he: 'מחיר',    ru: 'Цена'            },
  { value: 'competitor', he: 'מתחרה',   ru: 'Конкурент'       },
  { value: 'timing',     he: 'תזמון',   ru: 'Не время'        },
  { value: 'no_need',    he: 'אין צורך', ru: 'Нет потребности' },
  { value: 'other',      he: 'אחר',     ru: 'Другое'          },
]

function RejectionModal({ open, lang, onConfirm, onCancel }: {
  open: boolean; lang: string
  onConfirm: (r: string, c: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  const [category, setCategory] = useState('other')
  const isHe = lang === 'he'
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
      <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4 border border-white/60 animate-in fade-in zoom-in-95 duration-200" dir={isHe ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-xl">❌</div>
          <h2 className="text-lg font-bold text-gray-900">{isHe ? 'סיבת סגירה' : 'Причина закрытия'}</h2>
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-red-400 bg-white/80">
          {REJECTION_CATS.map(c => <option key={c.value} value={c.value}>{isHe ? c.he : c.ru}</option>)}
        </select>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
          placeholder={isHe ? 'מה קרה?' : 'Что пошло не так?'}
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-red-400 resize-none bg-white/80" />
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all">
            {isHe ? 'ביטול' : 'Отмена'}
          </button>
          <button onClick={() => reason.trim() && onConfirm(reason.trim(), category)} disabled={!reason.trim()}
            className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-2xl disabled:opacity-40 transition-all">
            {isHe ? 'אשר סגירה' : 'Подтвердить'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Income Modal ─────────────────────────────────────────────────────────────

function IncomeModal({ open, lang, dealTitle, clientName, onConfirm, onSkip }: {
  open: boolean; lang: string; dealTitle: string; clientName: string
  onConfirm: (d: number, f: number) => Promise<void>
  onSkip: () => void
}) {
  const [dealAmt, setDealAmt] = useState('')
  const [fee, setFee] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isHe = lang === 'he'
  const feeNum = parseFloat(fee) || 0
  const commission = Math.round(feeNum * 0.3 * 100) / 100
  const isValid = feeNum > 0 && feeNum <= 99999

  const handleConfirm = async () => {
    if (!isValid || loading) return
    setLoading(true); setError(null)
    try { await onConfirm(parseFloat(dealAmt) || 0, feeNum); setDealAmt(''); setFee('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(false) }
  }
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
      <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-white/60 animate-in fade-in zoom-in-95 duration-200" dir={isHe ? 'rtl' : 'ltr'}>
        <div className="relative bg-gradient-to-br from-emerald-500 to-teal-500 px-6 py-6 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shadow-lg">🎉</div>
            <div>
              <h2 className="text-xl font-black">{isHe ? 'עסקה נסגרה!' : 'Сделка закрыта!'}</h2>
              <p className="text-emerald-100 text-sm truncate max-w-[220px]">{clientName} · {dealTitle}</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isHe ? 'סכום העסקה' : 'Сумма сделки'}</label>
            <div className="relative"><span className="absolute inset-y-0 start-4 flex items-center text-gray-400 font-bold">₪</span>
              <input type="number" value={dealAmt} onChange={e => setDealAmt(e.target.value)} placeholder="0" min={0} dir="ltr"
                className="w-full border-2 border-gray-100 focus:border-emerald-400 rounded-2xl ps-10 pe-4 py-3 text-lg font-black outline-none bg-gray-50/80 focus:bg-white transition-all"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isHe ? 'עלות הקמה *' : 'Стоимость подключения *'}</label>
            <div className="relative"><span className="absolute inset-y-0 start-4 flex items-center text-gray-400 font-bold">₪</span>
              <input type="number" value={fee} onChange={e => setFee(e.target.value)} placeholder="0" min={0} max={99999} dir="ltr"
                className="w-full border-2 border-gray-100 focus:border-emerald-400 rounded-2xl ps-10 pe-4 py-3 text-lg font-black outline-none bg-gray-50/80 focus:bg-white transition-all"/>
            </div>
          </div>
          <div className={`rounded-2xl p-4 border-2 transition-all ${isValid ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{isHe ? 'העמלה שלי (30%)' : 'Моя комиссия (30%)'}</p>
                <p className={`text-3xl font-black mt-1 ${isValid ? 'text-emerald-600' : 'text-gray-300'}`}>{isValid ? fmt(commission) : '—'}</p>
              </div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${isValid ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-gray-200'}`}>💰</div>
            </div>
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-2xl px-4 py-3">{error}</p>}
          <div className="flex gap-3 pb-1">
            <button onClick={onSkip} className="flex-1 py-3 text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all">{isHe ? 'דלג' : 'Пропустить'}</button>
            <button onClick={handleConfirm} disabled={!isValid || loading}
              className="flex-[2] py-3 text-sm font-black text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-emerald-200/60 transition-all active:scale-[0.97]">
              {loading ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : null}
              {isHe ? 'שמור עמלה' : 'Сохранить комиссию'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Deal Card ────────────────────────────────────────────────────────────────

function DealCard({ deal, lang, onDragStart, onCardClick, index, isSelected }: {
  deal: PipelineDeal; lang: string
  onDragStart: (id: string) => void
  onCardClick: (id: string) => void
  index: number
  isSelected: boolean
}) {
  const isHe = lang === 'he'
  const c = deal.client
  const name = c ? `${c.first_name} ${c.last_name}`.trim() : (isHe ? 'לקוח לא ידוע' : 'Неизвестно')
  const [g1, g2] = avGrad(name)
  const isOverdue = deal.next_action_date && new Date(deal.next_action_date) < new Date()
  const lastTouch = deal.last_contact_at ? timeAgo(deal.last_contact_at, lang) : null

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Don't open drawer if we're dragging
    e.stopPropagation()
    onCardClick(deal.id)
  }, [deal.id, onCardClick])

  return (
    <div
      draggable
      onDragStart={() => onDragStart(deal.id)}
      onClick={handleClick}
      className={`group relative rounded-2xl backdrop-blur-sm border shadow-md
                 hover:shadow-xl hover:-translate-y-0.5
                 transition-all duration-300 cursor-pointer
                 active:scale-[0.97] select-none p-4
                 ${isSelected
                   ? 'bg-indigo-50/90 border-indigo-300/80 shadow-indigo-100/60 ring-2 ring-indigo-400/30'
                   : 'bg-white/80 border-white/70 hover:shadow-indigo-100/60 hover:border-indigo-200/70'
                 }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-50/0 to-indigo-50/0 group-hover:from-indigo-50/20 group-hover:to-purple-50/10 transition-all duration-300 pointer-events-none" />

      {/* Top row */}
      <div className="relative flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow-md"
          style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
          {initials(c?.first_name ?? '?', c?.last_name ?? '')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate leading-tight">{name}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">{deal.title}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {deal.amount > 0 && (
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-xl">
              {fmt(deal.amount)}
            </span>
          )}
          {/* Open arrow */}
          <span className="text-gray-300 group-hover:text-indigo-400 transition-colors text-xs">›</span>
        </div>
      </div>

      {/* Tags */}
      {deal.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {deal.tags.map(({ tag }) => (
            <span key={tag.id} className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-sm"
              style={{ backgroundColor: tag.color }}>{tag.name}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] pt-2.5 border-t border-gray-100">
        {lastTouch && (
          <span className="text-gray-400 font-medium flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
            {lastTouch}
          </span>
        )}
        {deal.next_action && (
          <span className={`font-bold truncate max-w-[60%] flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-indigo-500'}`}>
            {isOverdue ? '⚠️' : '→'}{deal.next_action}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Stage Column ─────────────────────────────────────────────────────────────

function StageColumn({ stage, lang, stageName, draggingId, selectedDealId, onDragStart, onDrop, onCardClick }: {
  stage: PipelineStage; lang: string
  stageName: (s: PipelineStage) => string
  draggingId: string | null
  selectedDealId: string | null
  onDragStart: (dealId: string, stageId: string) => void
  onDrop: (toStageId: string) => void
  onCardClick: (dealId: string) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const isHe = lang === 'he'
  const col = stage.color

  return (
    <div className="flex flex-col min-w-[300px] max-w-[300px]"
      onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => { setIsDragOver(false); onDrop(stage.id) }}>
      {/* Header */}
      <div className="rounded-2xl px-4 py-3.5 mb-3 bg-white/70 backdrop-blur-sm border border-white/60 shadow-md"
        style={{ borderTop: `3px solid ${col}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ backgroundColor: col }} />
              <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: col }} />
            </div>
            <span className="text-sm font-black text-gray-800">{stageName(stage)}</span>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">{stage.deals_count}</span>
          </div>
          {stage.total_amount > 0 && (
            <span className="text-xs font-black text-gray-600 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-xl">
              {fmt(stage.total_amount)}
            </span>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div className={`flex-1 space-y-2.5 rounded-2xl p-2.5 min-h-[200px] transition-all duration-300 ${
        isDragOver && draggingId
          ? 'bg-indigo-100/70 border-2 border-dashed border-indigo-400/70 scale-[1.01] shadow-inner'
          : 'bg-white/20'
      }`}>
        {stage.deals.map((deal, i) => (
          <DealCard key={deal.id} deal={deal} lang={lang} index={i}
            isSelected={selectedDealId === deal.id}
            onDragStart={id => onDragStart(id, stage.id)}
            onCardClick={onCardClick} />
        ))}
        {stage.deals.length === 0 && !isDragOver && (
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/60 flex items-center justify-center">
              <span className="text-xl opacity-30">📭</span>
            </div>
            <span className="text-xs text-gray-400 font-medium">{isHe ? 'אין עסקאות' : 'Нет сделок'}</span>
          </div>
        )}
        {isDragOver && draggingId && (
          <div className="flex items-center justify-center h-16 rounded-xl border-2 border-dashed border-indigo-400/50">
            <span className="text-xs font-bold text-indigo-500">{isHe ? 'שחרר כאן ↓' : 'Отпусти здесь ↓'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PipelineSkeleton() {
  return (
    <div className="flex gap-4 px-5 py-5">
      {[1, 2, 3].map(i => (
        <div key={i} className="min-w-[300px] space-y-3">
          <div className="h-14 rounded-2xl bg-white/60 animate-pulse" />
          {[1, 2].map(j => (
            <div key={j} className="h-24 rounded-2xl bg-white/40 animate-pulse" style={{ animationDelay: `${j * 150}ms` }} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkerPipelinePage() {
  const { language } = useLanguage()
  const isHe = language === 'he'
  const { stages, loading, error, filterTag, setFilterTag, includeClosed, setIncludeClosed, load, moveDeal, stageName } = usePipeline()

  const draggingDealId  = useRef<string | null>(null)
  const draggingStageId = useRef<string | null>(null)
  const [draggingId,       setDraggingId]       = useState<string | null>(null)
  const [moveError,        setMoveError]        = useState<string | null>(null)
  const [feeSuccess,       setFeeSuccess]       = useState<number | null>(null)
  const [selectedDealId,   setSelectedDealId]   = useState<string | null>(null)  // ← Drawer
  const [rejectionTarget,  setRejectionTarget]  = useState<{ dealId: string; fromStageId: string; toStageId: string } | null>(null)
  const [incomeTarget,     setIncomeTarget]     = useState<{ dealId: string; fromStageId: string; toStageId: string; dealTitle: string; clientName: string } | null>(null)

  useEffect(() => { load({ tag: filterTag ?? undefined, include_closed: includeClosed }) }, [load, filterTag, includeClosed])

  const allTags = Array.from(new Map(stages.flatMap(s => s.deals.flatMap(d => d.tags.map(t => [t.tag.id, t.tag])))).values())

  const handleDragStart = useCallback((dealId: string, stageId: string) => {
    draggingDealId.current = dealId; draggingStageId.current = stageId; setDraggingId(dealId)
  }, [])

  const handleDrop = useCallback((toStageId: string) => {
    const dealId = draggingDealId.current, fromStageId = draggingStageId.current
    setDraggingId(null); draggingDealId.current = null; draggingStageId.current = null
    if (!dealId || !fromStageId || fromStageId === toStageId) return
    const toStage   = stages.find(s => s.id === toStageId)
    const fromStage = stages.find(s => s.id === fromStageId)
    const deal      = fromStage?.deals.find(d => d.id === dealId)
    if (toStage?.is_lost) { setRejectionTarget({ dealId, fromStageId, toStageId }); return }
    if (toStage?.is_won) {
      const clientName = deal?.client ? `${deal.client.first_name} ${deal.client.last_name}`.trim() : (isHe ? 'לקוח' : 'Клиент')
      moveDeal(dealId, fromStageId, toStageId).then(r => { if (!r.ok) setMoveError(r.error ?? 'Error') })
      setIncomeTarget({ dealId, fromStageId, toStageId, dealTitle: deal?.title ?? '', clientName }); return
    }
    moveDeal(dealId, fromStageId, toStageId).then(r => { if (!r.ok) setMoveError(r.error ?? 'Error') })
  }, [stages, moveDeal, isHe])

  const handleRejectionConfirm = useCallback((reason: string, category: string) => {
    if (!rejectionTarget) return
    const { dealId, fromStageId, toStageId } = rejectionTarget; setRejectionTarget(null)
    moveDeal(dealId, fromStageId, toStageId, { rejection_reason: reason, rejection_category: category }).then(r => { if (!r.ok) setMoveError(r.error ?? 'Error') })
  }, [rejectionTarget, moveDeal])

  const handleIncomeConfirm = useCallback(async (_: number, setupFee: number) => {
    if (!incomeTarget) return
    const res = await fetch('/api/worker/pipeline/complete-deal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deal_id: incomeTarget.dealId, setup_fee: setupFee }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Failed')
    setIncomeTarget(null); setFeeSuccess(data.commission_amount); setTimeout(() => setFeeSuccess(null), 5000)
  }, [incomeTarget])

  const totalDeals  = stages.reduce((s, st) => s + st.deals_count, 0)
  const totalAmount = stages.reduce((s, st) => s + st.total_amount, 0)

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-100 via-blue-50/40 to-indigo-50/30 min-h-screen" dir="rtl">

      {/* Header */}
      <div className="shrink-0 px-5 pt-5 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{isHe ? 'פייפליין שלי' : 'Мой пайплайн'}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-500">{isHe ? `${totalDeals} עסקאות` : `${totalDeals} сделок`}</span>
              {totalAmount > 0 && <><span className="text-gray-300">·</span><span className="text-sm font-bold text-emerald-600">{fmt(totalAmount)}</span></>}
              {selectedDealId && (
                <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                  {isHe ? '← לחץ לסגירה' : 'кликни вне для закрытия'}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => load({ tag: filterTag ?? undefined, include_closed: includeClosed })}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 text-gray-500 hover:text-gray-700 shadow-sm hover:shadow-md transition-all disabled:opacity-40 active:scale-95">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setIncludeClosed(v => !v)}
            className={`text-xs font-bold px-3.5 py-2 rounded-2xl border transition-all ${includeClosed ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-white/70 text-gray-600 border-white/60 hover:border-gray-300 shadow-sm'}`}>
            {isHe ? (includeClosed ? 'הסתר סגורים' : 'הצג סגורים') : (includeClosed ? 'Скрыть закрытые' : 'Закрытые')}
          </button>
          {allTags.length > 0 && (
            <>
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <button onClick={() => setFilterTag(null)}
                className={`text-xs font-bold px-3.5 py-2 rounded-2xl border transition-all ${!filterTag ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200/50' : 'bg-white/70 text-gray-600 border-white/60 hover:border-indigo-300 shadow-sm'}`}>
                {isHe ? 'הכל' : 'Все'}
              </button>
              {allTags.map(tag => (
                <button key={tag.id} onClick={() => setFilterTag(filterTag === tag.name ? null : tag.name)}
                  className="text-xs font-bold px-3.5 py-2 rounded-2xl border transition-all shadow-sm hover:shadow-md"
                  style={{ backgroundColor: filterTag === tag.name ? tag.color : tag.color + '18', borderColor: filterTag === tag.name ? tag.color : tag.color + '44', color: filterTag === tag.name ? 'white' : tag.color }}>
                  {tag.name}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Commission toast */}
      {feeSuccess !== null && (
        <div className="mx-5 mb-3 px-5 py-3.5 bg-emerald-500 rounded-2xl flex items-center gap-3 text-white shadow-xl shadow-emerald-200/60 animate-in slide-in-from-top fade-in duration-300">
          <span className="text-2xl">💰</span>
          <div>
            <p className="font-black text-sm">{isHe ? 'עמלה נרשמה!' : 'Комиссия зафиксирована!'}</p>
            <p className="text-emerald-100 text-xs">{fmt(feeSuccess)} {isHe ? 'יתווסף לסיכום החודשי' : 'добавлено к итогу месяца'}</p>
          </div>
          <button onClick={() => setFeeSuccess(null)} className="ms-auto text-white/70 hover:text-white">✕</button>
        </div>
      )}

      {/* Error */}
      {(error || moveError) && (
        <div className="mx-5 mb-3 px-4 py-3 bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-700 text-sm rounded-2xl flex items-center justify-between shadow-sm">
          <span className="font-medium">{error ?? moveError}</span>
          <button onClick={() => setMoveError(null)} className="ms-3 text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
        </div>
      )}

      {/* Board */}
      {loading && stages.length === 0 ? (
        <PipelineSkeleton />
      ) : (
        <div className="flex-1 overflow-x-auto px-5 pb-6">
          <div className="flex gap-4 min-h-full" style={{ minWidth: `${stages.length * 316}px` }}>
            {stages.map(stage => (
              <StageColumn key={stage.id} stage={stage} lang={language}
                stageName={stageName} draggingId={draggingId}
                selectedDealId={selectedDealId}
                onDragStart={handleDragStart} onDrop={handleDrop}
                onCardClick={setSelectedDealId} />
            ))}
          </div>
        </div>
      )}

      {/* ── Deal Drawer ──────────────────────────────────────────────────── */}
      <DealDrawer
        dealId={selectedDealId}
        lang={language}
        onClose={() => setSelectedDealId(null)}
        onUpdated={() => load({ tag: filterTag ?? undefined, include_closed: includeClosed })}
      />

      {/* Modals */}
      <RejectionModal open={!!rejectionTarget} lang={language}
        onConfirm={handleRejectionConfirm} onCancel={() => setRejectionTarget(null)} />
      <IncomeModal open={!!incomeTarget} lang={language}
        dealTitle={incomeTarget?.dealTitle ?? ''} clientName={incomeTarget?.clientName ?? ''}
        onConfirm={handleIncomeConfirm} onSkip={() => setIncomeTarget(null)} />
    </div>
  )
}

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePipeline, PipelineDeal, PipelineStage } from '@/hooks/usePipeline'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string, lang: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  const isHe  = lang === 'he'
  if (mins < 2)   return isHe ? 'עכשיו'              : 'только что'
  if (mins < 60)  return isHe ? `לפני ${mins} ד'`    : `${mins} мин назад`
  if (hours < 24) return isHe ? `לפני ${hours} ש'`   : `${hours} ч назад`
  return isHe ? `לפני ${days} ימים` : `${days} дн назад`
}

const AVATAR_COLORS = [
  'from-purple-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-pink-400 to-rose-500',
  'from-blue-400 to-cyan-500',
  'from-violet-400 to-purple-500',
]
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}
function initials(first: string, last: string) {
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase()
}
function fmt(n: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
}

// ─── Rejection modal ──────────────────────────────────────────────────────────

const REJECTION_CATS = [
  { value: 'price',      he: 'מחיר',       ru: 'Цена'            },
  { value: 'competitor', he: 'מתחרה',       ru: 'Конкурент'       },
  { value: 'timing',     he: 'תזמון',       ru: 'Не время'        },
  { value: 'no_need',    he: 'אין צורך',    ru: 'Нет потребности' },
  { value: 'other',      he: 'אחר',         ru: 'Другое'          },
]

function RejectionModal({ open, lang, onConfirm, onCancel }: {
  open: boolean; lang: string
  onConfirm: (reason: string, category: string) => void
  onCancel: () => void
}) {
  const [reason,   setReason]   = useState('')
  const [category, setCategory] = useState('other')
  const isHe = lang === 'he'
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4 border border-white/60 animate-in fade-in zoom-in-95 duration-200" dir={isHe ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">❌</span>
          <h2 className="text-lg font-bold text-gray-900">{isHe ? 'סיבת סגירה' : 'Причина закрытия'}</h2>
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400">
          {REJECTION_CATS.map(c => <option key={c.value} value={c.value}>{isHe ? c.he : c.ru}</option>)}
        </select>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
          placeholder={isHe ? 'מה קרה?' : 'Что пошло не так?'}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 resize-none" />
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            {isHe ? 'ביטול' : 'Отмена'}
          </button>
          <button onClick={() => reason.trim() && onConfirm(reason.trim(), category)}
            disabled={!reason.trim()}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-40 transition-colors">
            {isHe ? 'אשר' : 'Подтвердить'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Income modal (won stage) ─────────────────────────────────────────────────

function IncomeModal({ open, lang, dealTitle, clientName, onConfirm, onSkip }: {
  open: boolean; lang: string; dealTitle: string; clientName: string
  onConfirm: (dealAmount: number, setupFee: number) => Promise<void>
  onSkip: () => void
}) {
  const [dealAmt, setDealAmt] = useState('')
  const [fee,     setFee]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const isHe = lang === 'he'

  const feeNum   = parseFloat(fee) || 0
  const dealNum  = parseFloat(dealAmt) || 0
  const commission = Math.round(feeNum * 0.3 * 100) / 100
  const isValid  = feeNum > 0 && feeNum <= 99999

  const fmt2 = (n: number) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)

  const handleConfirm = async () => {
    if (!isValid || loading) return
    setLoading(true); setError(null)
    try {
      await onConfirm(dealNum, feeNum)
      setDealAmt(''); setFee('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-white/60 animate-in fade-in zoom-in-95 duration-200" dir={isHe ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <h2 className="text-lg font-bold">{isHe ? 'עסקה נסגרה!' : 'Сделка закрыта!'}</h2>
              <p className="text-emerald-100 text-xs">{clientName} · {dealTitle}</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Deal amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {isHe ? 'סכום העסקה (₪)' : 'Сумма сделки (₪)'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 start-3 flex items-center text-gray-400 text-sm">₪</span>
              <input type="number" value={dealAmt} onChange={e => setDealAmt(e.target.value)}
                placeholder="0" min={0} dir="ltr"
                className="w-full border-2 border-gray-200 focus:border-emerald-400 rounded-xl ps-8 pe-4 py-2.5 text-base font-bold outline-none transition-colors" />
            </div>
          </div>
          {/* Setup fee */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {isHe ? 'עלות הקמה (₪) *' : 'Стоимость подключения (₪) *'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 start-3 flex items-center text-gray-400 text-sm">₪</span>
              <input type="number" value={fee} onChange={e => setFee(e.target.value)}
                placeholder="0" min={0} max={99999} dir="ltr"
                className="w-full border-2 border-gray-200 focus:border-emerald-400 rounded-xl ps-8 pe-4 py-2.5 text-base font-bold outline-none transition-colors" />
            </div>
          </div>
          {/* Commission preview */}
          <div className={`rounded-xl p-3.5 border-2 transition-all ${isValid ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{isHe ? 'העמלה שלי (30%):' : 'Моя комиссия (30%):'}</span>
              <span className={`text-xl font-black ${isValid ? 'text-emerald-600' : 'text-gray-400'}`}>
                {isValid ? fmt2(commission) : '—'}
              </span>
            </div>
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onSkip} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
              {isHe ? 'דלג' : 'Пропустить'}
            </button>
            <button onClick={handleConfirm} disabled={!isValid || loading}
              className="flex-1 py-2.5 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-md shadow-emerald-200">
              {loading
                ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <span>💰</span>
              }
              {isHe ? 'שמור עמלה' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Deal Card ────────────────────────────────────────────────────────────────

function DealCard({ deal, lang, onDragStart }: {
  deal: PipelineDeal; lang: string; onDragStart: (id: string) => void
}) {
  const isHe       = lang === 'he'
  const client     = deal.client
  const name       = client ? `${client.first_name} ${client.last_name}`.trim() : (isHe ? 'לקוח לא ידוע' : 'Неизвестно')
  const color      = avatarColor(name)
  const isOverdue  = deal.next_action_date && new Date(deal.next_action_date) < new Date()
  const lastTouch  = deal.last_contact_at ? timeAgo(deal.last_contact_at, lang) : null

  return (
    <div
      draggable
      onDragStart={() => onDragStart(deal.id)}
      className="group rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 shadow-sm hover:shadow-lg hover:shadow-indigo-100/50 hover:border-indigo-200/60 transition-all duration-200 cursor-grab active:cursor-grabbing active:scale-[0.98] select-none p-3.5 space-y-3"
    >
      {/* Top: avatar + name + amount */}
      <div className="flex items-start gap-2.5">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
          {initials(client?.first_name ?? '?', client?.last_name ?? '')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate leading-tight">{name}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{deal.title}</p>
        </div>
        {deal.amount > 0 && (
          <span className="shrink-0 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            {fmt(deal.amount)}
          </span>
        )}
      </div>

      {/* Tags */}
      {deal.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {deal.tags.map(({ tag }) => (
            <span key={tag.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: tag.color }}>
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-100/80">
        {lastTouch && <span>{lastTouch}</span>}
        {deal.next_action && (
          <span className={`font-semibold truncate max-w-[60%] ${isOverdue ? 'text-red-500' : 'text-indigo-500'}`}>
            {deal.next_action}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Stage Column ─────────────────────────────────────────────────────────────

function StageColumn({ stage, lang, stageName, draggingId, onDragStart, onDrop }: {
  stage: PipelineStage; lang: string; stageName: (s: PipelineStage) => string
  draggingId: string | null
  onDragStart: (dealId: string, stageId: string) => void
  onDrop: (toStageId: string) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const isHe = lang === 'he'

  return (
    <div className="flex flex-col min-w-[290px] max-w-[290px]"
      onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => { setIsDragOver(false); onDrop(stage.id) }}
    >
      {/* Column header */}
      <div className="rounded-2xl px-4 py-3 mb-3 flex items-center justify-between bg-white/60 backdrop-blur-sm border border-white/50 shadow-sm"
        style={{ borderTop: `3px solid ${stage.color}` }}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="text-sm font-bold text-gray-800">{stageName(stage)}</span>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {stage.deals_count}
          </span>
        </div>
        {stage.total_amount > 0 && (
          <span className="text-xs font-bold text-gray-600">₪{stage.total_amount.toLocaleString()}</span>
        )}
      </div>

      {/* Drop zone */}
      <div className={`flex-1 space-y-2.5 rounded-2xl p-2 min-h-[150px] transition-all duration-200 ${
        isDragOver && draggingId
          ? 'bg-indigo-100/60 border-2 border-dashed border-indigo-300 scale-[1.01]'
          : 'bg-white/20'
      }`}>
        {stage.deals.map(deal => (
          <DealCard key={deal.id} deal={deal} lang={lang}
            onDragStart={id => onDragStart(id, stage.id)} />
        ))}
        {stage.deals.length === 0 && !isDragOver && (
          <div className="flex flex-col items-center justify-center h-24 gap-2">
            <span className="text-2xl opacity-30">📭</span>
            <span className="text-xs text-gray-400">{isHe ? 'אין עסקאות' : 'Нет сделок'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkerPipelinePage() {
  const { language } = useLanguage()
  const isHe = language === 'he'
  const {
    stages, loading, error,
    filterTag, setFilterTag,
    includeClosed, setIncludeClosed,
    load, moveDeal, stageName,
  } = usePipeline()

  const draggingDealId  = useRef<string | null>(null)
  const draggingStageId = useRef<string | null>(null)
  const [draggingId, setDraggingId]   = useState<string | null>(null)
  const [moveError,  setMoveError]    = useState<string | null>(null)
  const [feeSuccess, setFeeSuccess]   = useState<number | null>(null)

  const [rejectionTarget, setRejectionTarget] = useState<{
    dealId: string; fromStageId: string; toStageId: string
  } | null>(null)

  const [incomeTarget, setIncomeTarget] = useState<{
    dealId: string; fromStageId: string; toStageId: string
    dealTitle: string; clientName: string
  } | null>(null)

  useEffect(() => {
    load({ tag: filterTag ?? undefined, include_closed: includeClosed })
  }, [load, filterTag, includeClosed])

  const allTags = Array.from(
    new Map(
      stages.flatMap(s => s.deals.flatMap(d => d.tags.map(t => [t.tag.id, t.tag])))
    ).values()
  )

  const handleDragStart = useCallback((dealId: string, stageId: string) => {
    draggingDealId.current  = dealId
    draggingStageId.current = stageId
    setDraggingId(dealId)
  }, [])

  const handleDrop = useCallback((toStageId: string) => {
    const dealId      = draggingDealId.current
    const fromStageId = draggingStageId.current
    setDraggingId(null)
    draggingDealId.current  = null
    draggingStageId.current = null
    if (!dealId || !fromStageId || fromStageId === toStageId) return

    const toStage   = stages.find(s => s.id === toStageId)
    const fromStage = stages.find(s => s.id === fromStageId)
    const deal      = fromStage?.deals.find(d => d.id === dealId)

    if (toStage?.is_lost) {
      setRejectionTarget({ dealId, fromStageId, toStageId }); return
    }
    if (toStage?.is_won) {
      const clientName = deal?.client
        ? `${deal.client.first_name} ${deal.client.last_name}`.trim()
        : (isHe ? 'לקוח' : 'Клиент')
      // Move first, then prompt
      moveDeal(dealId, fromStageId, toStageId).then(r => { if (!r.ok) setMoveError(r.error ?? 'Error') })
      setIncomeTarget({ dealId, fromStageId, toStageId, dealTitle: deal?.title ?? '', clientName }); return
    }
    moveDeal(dealId, fromStageId, toStageId).then(r => { if (!r.ok) setMoveError(r.error ?? 'Error') })
  }, [stages, moveDeal, isHe])

  const handleRejectionConfirm = useCallback((reason: string, category: string) => {
    if (!rejectionTarget) return
    const { dealId, fromStageId, toStageId } = rejectionTarget
    setRejectionTarget(null)
    moveDeal(dealId, fromStageId, toStageId, { rejection_reason: reason, rejection_category: category })
      .then(r => { if (!r.ok) setMoveError(r.error ?? 'Error') })
  }, [rejectionTarget, moveDeal])

  const handleIncomeConfirm = useCallback(async (dealAmount: number, setupFee: number) => {
    if (!incomeTarget) return
    const res = await fetch('/api/worker/pipeline/complete-deal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deal_id: incomeTarget.dealId, setup_fee: setupFee }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Failed')
    setIncomeTarget(null)
    setFeeSuccess(data.commission_amount)
    setTimeout(() => setFeeSuccess(null), 4000)
  }, [incomeTarget])

  return (
    <div className="flex flex-col h-full" dir="rtl">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-5 py-4 flex items-center justify-between bg-white/40 backdrop-blur-sm border-b border-white/40">
        <div>
          <h1 className="text-xl font-black text-gray-900">{isHe ? 'פייפליין שלי' : 'Мой пайплайн'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isHe ? 'גרור עסקאות בין שלבים' : 'Перетаскивай сделки между этапами'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tag filters */}
          {allTags.length > 0 && (
            <>
              <button onClick={() => setFilterTag(null)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${!filterTag ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white/70 text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                {isHe ? 'הכל' : 'Все'}
              </button>
              {allTags.map(tag => (
                <button key={tag.id}
                  onClick={() => setFilterTag(filterTag === tag.name ? null : tag.name)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-all"
                  style={{
                    backgroundColor: filterTag === tag.name ? tag.color : tag.color + '22',
                    borderColor: tag.color,
                    color: filterTag === tag.name ? 'white' : tag.color,
                  }}>
                  {tag.name}
                </button>
              ))}
            </>
          )}

          {/* Closed toggle */}
          <button onClick={() => setIncludeClosed(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${includeClosed ? 'bg-gray-800 text-white border-gray-800' : 'bg-white/70 text-gray-600 border-gray-200'}`}>
            {isHe ? (includeClosed ? 'הסתר סגורים' : 'הצג סגורים') : (includeClosed ? 'Скрыть' : 'Закрытые')}
          </button>

          {/* Refresh */}
          <button onClick={() => load({ tag: filterTag ?? undefined, include_closed: includeClosed })}
            disabled={loading}
            className="p-2 rounded-xl bg-white/70 border border-gray-200 hover:border-indigo-300 transition-all disabled:opacity-40">
            <svg className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Commission toast */}
      {feeSuccess !== null && (
        <div className="mx-5 mt-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700 text-sm animate-in fade-in slide-in-from-top duration-300">
          <span className="text-xl">💰</span>
          <span className="font-bold">
            {isHe ? `עמלה נרשמה: ₪${feeSuccess.toLocaleString()}` : `Комиссия: ₪${feeSuccess.toLocaleString()}`}
          </span>
        </div>
      )}

      {/* Error */}
      {(error || moveError) && (
        <div className="mx-5 mt-3 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center justify-between">
          <span>{error ?? moveError}</span>
          <button onClick={() => setMoveError(null)} className="ms-3 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ── Board ───────────────────────────────────────────────────────── */}
      {loading && stages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto px-5 py-5">
          <div className="flex gap-4 h-full" style={{ minWidth: `${stages.length * 308}px` }}>
            {stages.map(stage => (
              <StageColumn key={stage.id} stage={stage} lang={language}
                stageName={stageName} draggingId={draggingId}
                onDragStart={handleDragStart} onDrop={handleDrop} />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <RejectionModal open={!!rejectionTarget} lang={language}
        onConfirm={handleRejectionConfirm} onCancel={() => setRejectionTarget(null)} />
      <IncomeModal
        open={!!incomeTarget} lang={language}
        dealTitle={incomeTarget?.dealTitle ?? ''} clientName={incomeTarget?.clientName ?? ''}
        onConfirm={handleIncomeConfirm} onSkip={() => setIncomeTarget(null)} />
    </div>
  )
}

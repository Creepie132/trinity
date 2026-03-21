'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePipeline, PipelineDeal, PipelineStage } from '@/hooks/usePipeline'
// Lightweight relative-time helper (no external dependency)
function timeAgo(dateStr: string, lang: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  const isHe  = lang === 'he'
  if (mins < 2)   return isHe ? 'עכשיו'            : 'только что'
  if (mins < 60)  return isHe ? `לפני ${mins} ד'`  : `${mins} мин. назад`
  if (hours < 24) return isHe ? `לפני ${hours} ש'` : `${hours} ч. назад`
  if (days < 30)  return isHe ? `לפני ${days} ימים` : `${days} дн. назад`
  return new Date(dateStr).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU')
}

// ─── Rejection modal ─────────────────────────────────────────────────────────

const REJECTION_CATEGORIES = [
  { value: 'price',       label_ru: 'Цена',         label_he: 'מחיר'           },
  { value: 'competitor',  label_ru: 'Конкурент',     label_he: 'מתחרה'          },
  { value: 'timing',      label_ru: 'Не подходит время', label_he: 'תזמון'      },
  { value: 'no_need',     label_ru: 'Нет потребности',   label_he: 'אין צורך'   },
  { value: 'other',       label_ru: 'Другое',        label_he: 'אחר'            },
]

function RejectionModal({
  open, lang, onConfirm, onCancel,
}: {
  open: boolean
  lang: string
  onConfirm: (reason: string, category: string) => void
  onCancel: () => void
}) {
  const [reason, setReason]     = useState('')
  const [category, setCategory] = useState('other')
  const isHe = lang === 'he'

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4"
        dir={isHe ? 'rtl' : 'ltr'}
      >
        <h2 className="text-lg font-semibold text-gray-900">
          {isHe ? 'סיבת סגירה' : 'Причина закрытия'}
        </h2>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {isHe ? 'קטגוריה' : 'Категория'}
          </label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {REJECTION_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>
                {isHe ? c.label_he : c.label_ru}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {isHe ? 'פירוט *' : 'Подробности *'}
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            placeholder={isHe ? 'מה קרה?' : 'Что пошло не так?'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isHe ? 'ביטול' : 'Отмена'}
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim(), category)}
            disabled={!reason.trim()}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isHe ? 'אשר סגירה' : 'Подтвердить закрытие'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Deal card ───────────────────────────────────────────────────────────────

function DealCard({
  deal, lang,
  onDragStart,
}: {
  deal: PipelineDeal
  lang: string
  onDragStart: (dealId: string) => void
}) {
  const isHe       = lang === 'he'
  const clientName = deal.client
    ? `${deal.client.first_name} ${deal.client.last_name}`.trim()
    : (isHe ? 'לקוח לא ידוע' : 'Клиент не указан')

  const lastContact = deal.last_contact_at
    ? timeAgo(deal.last_contact_at, lang)
    : null

  const isOverdue = deal.next_action_date
    && new Date(deal.next_action_date) < new Date()

  return (
    <div
      draggable
      onDragStart={() => onDragStart(deal.id)}
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all select-none space-y-2"
    >
      {/* Client name + amount */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">
          {clientName}
        </span>
        {deal.amount > 0 && (
          <span className="shrink-0 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            ₪{Number(deal.amount).toLocaleString()}
          </span>
        )}
      </div>

      {/* Deal title */}
      <p className="text-xs text-gray-500 line-clamp-1">{deal.title}</p>

      {/* Tags */}
      {deal.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {deal.tags.map(({ tag }) => (
            <span
              key={tag.id}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer: last contact + next action */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-100">
        {lastContact && <span>{lastContact}</span>}
        {deal.next_action && (
          <span className={`font-medium ${isOverdue ? 'text-red-500' : 'text-indigo-500'}`}>
            {deal.next_action}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Stage column ─────────────────────────────────────────────────────────────

function StageColumn({
  stage, lang, stageName, draggingId,
  onDragStart, onDrop,
}: {
  stage:      PipelineStage
  lang:       string
  stageName:  (s: PipelineStage) => string
  draggingId: string | null
  onDragStart: (dealId: string, stageId: string) => void
  onDrop:      (toStageId: string) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const isHe = lang === 'he'

  return (
    <div
      className="flex flex-col min-w-[280px] max-w-[280px]"
      onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => { setIsDragOver(false); onDrop(stage.id) }}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-xl mb-2"
        style={{ backgroundColor: stage.color + '20', borderBottom: `3px solid ${stage.color}` }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="text-sm font-semibold text-gray-800">{stageName(stage)}</span>
          <span className="text-xs font-medium text-gray-500 bg-white/70 px-1.5 py-0.5 rounded-full">
            {stage.deals_count}
          </span>
        </div>
        {stage.total_amount > 0 && (
          <span className="text-xs font-semibold text-gray-600">
            ₪{stage.total_amount.toLocaleString()}
          </span>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={`flex-1 space-y-2 rounded-xl p-2 min-h-[120px] transition-colors ${
          isDragOver && draggingId
            ? 'bg-indigo-50 border-2 border-dashed border-indigo-300'
            : 'bg-gray-50/50'
        }`}
      >
        {stage.deals.map(deal => (
          <DealCard
            key={deal.id}
            deal={deal}
            lang={lang}
            onDragStart={id => onDragStart(id, stage.id)}
          />
        ))}
        {stage.deals.length === 0 && !isDragOver && (
          <div className="flex items-center justify-center h-[80px]">
            <span className="text-xs text-gray-400">
              {isHe ? 'אין עסקאות' : 'Нет сделок'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const { language }  = useLanguage()
  const isHe          = language === 'he'
  const {
    stages, loading, error,
    filterTag, setFilterTag,
    includeClosed, setIncludeClosed,
    load, moveDeal, stageName,
  } = usePipeline()

  // Drag state
  const draggingDealId  = useRef<string | null>(null)
  const draggingStageId = useRef<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  // Rejection modal state
  const [rejectionTarget, setRejectionTarget] = useState<{
    dealId: string; fromStageId: string; toStageId: string
  } | null>(null)

  const [moveError, setMoveError] = useState<string | null>(null)

  // Initial load
  useEffect(() => {
    load({ tag: filterTag ?? undefined, include_closed: includeClosed })
  }, [load, filterTag, includeClosed])

  // Collect all unique tags across all deals for the filter bar
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

    // Check if target is the "lost" stage
    const toStage = stages.find(s => s.id === toStageId)
    if (toStage?.is_lost) {
      setRejectionTarget({ dealId, fromStageId, toStageId })
      return
    }

    moveDeal(dealId, fromStageId, toStageId).then(result => {
      if (!result.ok) setMoveError(result.error ?? 'Move failed')
    })
  }, [stages, moveDeal])

  const handleRejectionConfirm = useCallback((reason: string, category: string) => {
    if (!rejectionTarget) return
    const { dealId, fromStageId, toStageId } = rejectionTarget
    setRejectionTarget(null)
    moveDeal(dealId, fromStageId, toStageId, {
      rejection_reason:   reason,
      rejection_category: category,
    }).then(result => {
      if (!result.ok) setMoveError(result.error ?? 'Move failed')
    })
  }, [rejectionTarget, moveDeal])

  return (
    <div className="flex flex-col h-full" dir={isHe ? 'rtl' : 'ltr'}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isHe ? 'פייפליין' : 'Воронка продаж'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isHe ? 'גרור עסקאות בין שלבים' : 'Перетаскивайте сделки между этапами'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Back to dashboard */}
          <Link
            href="/worker"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 hover:border-gray-300 shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={isHe ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'} />
            </svg>
            {isHe ? 'לוח בקרה' : 'Кабинет'}
          </Link>
          {/* Tag filter */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setFilterTag(null)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  !filterTag
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
                }`}
              >
                {isHe ? 'הכל' : 'Все'}
              </button>
              {allTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => setFilterTag(filterTag === tag.name ? null : tag.name)}
                  className="text-xs px-3 py-1 rounded-full border text-white transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: filterTag === tag.name ? tag.color : tag.color + '33',
                    borderColor:     tag.color,
                    color:           filterTag === tag.name ? 'white' : tag.color,
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          {/* Toggle closed stages */}
          <button
            onClick={() => setIncludeClosed(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              includeClosed
                ? 'bg-gray-700 text-white border-gray-700'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {isHe
              ? (includeClosed ? 'הסתר סגורים' : 'הצג סגורים')
              : (includeClosed ? 'Скрыть закрытые' : 'Показать закрытые')}
          </button>

          {/* Refresh */}
          <button
            onClick={() => load({ tag: filterTag ?? undefined, include_closed: includeClosed })}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-300 hover:border-indigo-300 transition-colors disabled:opacity-40"
            title={isHe ? 'רענן' : 'Обновить'}
          >
            <svg className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {(error || moveError) && (
        <div className="mx-6 mt-3 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between">
          <span>{error ?? moveError}</span>
          <button onClick={() => { setMoveError(null) }} className="ml-4 text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* ── Board ────────────────────────────────────────────────────────── */}
      {loading && stages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto px-6 py-4">
          <div className="flex gap-4 h-full" style={{ minWidth: `${stages.length * 296}px` }}>
            {stages.map(stage => (
              <StageColumn
                key={stage.id}
                stage={stage}
                lang={language}
                stageName={stageName}
                draggingId={draggingId}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Rejection modal ───────────────────────────────────────────────── */}
      <RejectionModal
        open={!!rejectionTarget}
        lang={language}
        onConfirm={handleRejectionConfirm}
        onCancel={() => setRejectionTarget(null)}
      />
    </div>
  )
}

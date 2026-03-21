import { useState, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

export type PipelineTag = { id: string; name: string; color: string }

export type PipelineDeal = {
  id:                  string
  title:               string
  amount:              number
  currency:            string
  stage_id:            string
  assigned_to:         string | null
  expected_close_date: string | null
  last_contact_at:     string | null
  next_action:         string | null
  next_action_date:    string | null
  source:              string | null
  updated_at:          string
  client:              { id: string; first_name: string; last_name: string; phone: string } | null
  tags:                { tag: PipelineTag }[]
}

export type PipelineStage = {
  id:               string
  name:             string
  name_he:          string | null
  color:            string
  position:         number
  is_won:           boolean
  is_lost:          boolean
  is_booking_stage: boolean
  deals:            PipelineDeal[]
  deals_count:      number
  total_amount:     number
}

export function usePipeline() {
  const { language } = useLanguage()
  const [stages, setStages]     = useState<PipelineStage[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [filterTag, setFilterTag]         = useState<string | null>(null)
  const [includeClosed, setIncludeClosed] = useState(false)

  const load = useCallback(async (params?: {
    tag?: string | null
    include_closed?: boolean
  }) => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (params?.tag)            qs.set('tag', params.tag)
      if (params?.include_closed) qs.set('include_closed', '1')

      const res = await fetch(`/api/worker/pipeline?${qs}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load pipeline')
      setStages(json.stages)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Optimistic drag-and-drop: move deal locally then confirm via API
  const moveDeal = useCallback(async (
    dealId:      string,
    fromStageId: string,
    toStageId:   string,
    rejectionPayload?: { rejection_reason: string; rejection_category: string }
  ): Promise<{ ok: boolean; error?: string }> => {
    // 1. Optimistic update
    setStages(prev => {
      const next = prev.map(s => ({ ...s, deals: [...s.deals] }))
      const fromStage = next.find(s => s.id === fromStageId)
      const toStage   = next.find(s => s.id === toStageId)
      if (!fromStage || !toStage) return prev

      const idx = fromStage.deals.findIndex(d => d.id === dealId)
      if (idx === -1) return prev

      const [deal] = fromStage.deals.splice(idx, 1)
      const moved  = { ...deal, stage_id: toStageId }
      toStage.deals.unshift(moved)

      // Recalculate totals
      fromStage.deals_count  = fromStage.deals.length
      fromStage.total_amount = fromStage.deals.reduce((s, d) => s + Number(d.amount), 0)
      toStage.deals_count    = toStage.deals.length
      toStage.total_amount   = toStage.deals.reduce((s, d) => s + Number(d.amount), 0)

      return next
    })

    // 2. If moving to lost stage — PATCH deal with rejection data
    if (rejectionPayload) {
      const res = await fetch(`/api/deals/${dealId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ stage_id: toStageId, ...rejectionPayload }),
      })
      if (!res.ok) {
        const json = await res.json()
        // Rollback on error
        await load({ tag: filterTag ?? undefined, include_closed: includeClosed })
        return { ok: false, error: json.error }
      }
      return { ok: true }
    }

    // 3. Otherwise just update the stage
    const res = await fetch(`/api/deals/${dealId}/stage`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ stage_id: toStageId }),
    })

    if (!res.ok) {
      const json = await res.json()
      // Rollback
      await load({ tag: filterTag ?? undefined, include_closed: includeClosed })
      return { ok: false, error: json.error }
    }

    return { ok: true }
  }, [load, filterTag, includeClosed])

  // Get localised stage name
  const stageName = useCallback((stage: PipelineStage) => {
    return (language === 'he' && stage.name_he) ? stage.name_he : stage.name
  }, [language])

  return {
    stages, loading, error,
    filterTag, setFilterTag,
    includeClosed, setIncludeClosed,
    load, moveDeal, stageName,
  }
}

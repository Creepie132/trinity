'use client'

import { useCallback, useEffect, useState } from 'react'

interface NoteItem {
  id: string
  text: string
  created_at: string
  deal:   { id: string; title: string } | null
  client: { id: string; first_name: string; last_name: string } | null
}

interface QuickNoteModalProps {
  open:    boolean
  lang:    string
  onClose: () => void
}

function timeAgo(iso: string, lang: string): string {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  const isHe  = lang === 'he'
  if (mins < 2)   return isHe ? 'עכשיו'             : 'только что'
  if (mins < 60)  return isHe ? `לפני ${mins} ד'`   : `${mins} мин назад`
  if (hours < 24) return isHe ? `לפני ${hours} ש'`  : `${hours} ч назад`
  return isHe ? `לפני ${days} ימים` : `${days} дн назад`
}

export function QuickNoteModal({ open, lang, onClose }: QuickNoteModalProps) {
  const [text,    setText]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [notes,   setNotes]   = useState<NoteItem[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const isHe = lang === 'he'

  const loadNotes = useCallback(async () => {
    setLoadingNotes(true)
    try {
      const res = await fetch('/api/worker/quick-note')
      if (res.ok) {
        const d = await res.json()
        setNotes(d.notes ?? [])
      }
    } finally {
      setLoadingNotes(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadNotes()
  }, [open, loadNotes])

  const handleSave = async () => {
    if (!text.trim() || saving) return
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/worker/quick-note', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: text.trim() }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Error')
      }
      const { note } = await res.json()
      // Prepend new note locally — no extra fetch needed
      setNotes(prev => [note, ...prev])
      setDone(true)
      setText('')
      setTimeout(() => setDone(false), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave()
    if (e.key === 'Escape') onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white w-full sm:max-w-md sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        dir={isHe ? 'rtl' : 'ltr'}
        style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">📝</span>
            <span className="font-bold text-gray-800 text-sm">
              {isHe ? 'הערות מהירות' : 'Быстрые заметки'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Input area ────────────────────────────────────────────────── */}
        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-gray-100 space-y-3">
          <div className="relative">
            <textarea
              autoFocus
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              rows={3}
              maxLength={1000}
              placeholder={isHe
                ? 'כתוב הערה... (Ctrl+Enter לשמירה)'
                : 'Напиши заметку... (Ctrl+Enter — сохранить)'}
              className="w-full border border-gray-200 focus:border-indigo-400 rounded-xl px-4 py-3 text-sm text-gray-800 resize-none outline-none transition-colors"
            />
            {/* Success flash */}
            {done && (
              <div className="absolute inset-0 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-2 animate-in fade-in duration-150">
                <span className="text-xl">✅</span>
                <span className="text-sm font-semibold text-emerald-700">
                  {isHe ? 'נשמר!' : 'Сохранено!'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-gray-400">{text.length}/1000</span>
            <div className="flex gap-2">
              {error && <span className="text-xs text-red-500">{error}</span>}
              <button
                onClick={handleSave}
                disabled={!text.trim() || saving}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                {saving
                  ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                }
                {isHe ? 'שמור' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Notes history ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {isHe ? 'הערות אחרונות' : 'Последние заметки'}
            </p>
          </div>

          {loadingNotes ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2 text-gray-300">
              <span className="text-3xl">📭</span>
              <p className="text-xs">{isHe ? 'עדיין אין הערות' : 'Заметок пока нет'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notes.map(n => (
                <div key={n.id} className="px-5 py-3 hover:bg-gray-50/70 transition-colors">
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{n.text}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-gray-400">{timeAgo(n.created_at, lang)}</span>
                    {n.deal && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-full font-medium">
                        💼 {n.deal.title}
                      </span>
                    )}
                    {n.client && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">
                        👤 {n.client.first_name} {n.client.last_name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

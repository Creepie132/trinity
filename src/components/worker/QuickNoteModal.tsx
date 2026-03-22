'use client'

import { useState } from 'react'

interface QuickNoteModalProps {
  open:    boolean
  lang:    string
  onClose: () => void
}

export function QuickNoteModal({ open, lang, onClose }: QuickNoteModalProps) {
  const [text,    setText]    = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const isHe = lang === 'he'

  const handleSave = async () => {
    if (!text.trim() || loading) return
    setLoading(true); setError(null)
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
      setDone(true)
      setTimeout(() => {
        setDone(false); setText(''); onClose()
      }, 1000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave()
    if (e.key === 'Escape') onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        dir={isHe ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">📝</span>
            <span className="font-bold text-gray-800 text-sm">
              {isHe ? 'הערה מהירה' : 'Быстрая заметка'}
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

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {done ? (
            <div className="flex flex-col items-center py-6 gap-2">
              <span className="text-3xl animate-bounce">✅</span>
              <p className="text-sm font-semibold text-gray-700">
                {isHe ? 'נשמר!' : 'Сохранено!'}
              </p>
            </div>
          ) : (
            <>
              <textarea
                autoFocus
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKey}
                rows={4}
                maxLength={1000}
                placeholder={isHe
                  ? 'כתוב הערה... (Ctrl+Enter לשמירה)'
                  : 'Напиши заметку... (Ctrl+Enter — сохранить)'}
                className="w-full border border-gray-200 focus:border-indigo-400 rounded-xl px-4 py-3 text-sm text-gray-800 resize-none outline-none transition-colors"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{text.length}/1000</span>
                {error && <span className="text-xs text-red-500">{error}</span>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  {isHe ? 'ביטול' : 'Отмена'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!text.trim() || loading}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {loading
                    ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                  }
                  {isHe ? 'שמור' : 'Сохранить'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

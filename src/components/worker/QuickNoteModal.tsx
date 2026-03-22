'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface NoteItem {
  id:         string
  text:       string
  created_at: string
  deal:   { id: string; title: string } | null
  client: { id: string; first_name: string; last_name: string } | null
}

interface MentionUser {
  user_id:   string
  full_name: string
  role:      string
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
  if (mins < 2)   return isHe ? 'עכשיו'            : 'только что'
  if (mins < 60)  return isHe ? `לפני ${mins} ד'`  : `${mins} мин назад`
  if (hours < 24) return isHe ? `לפני ${hours} ש'` : `${hours} ч назад`
  return isHe ? `לפני ${days} ימים` : `${days} дн назад`
}

// Extract @mention usernames from text
function extractMentions(text: string): string[] {
  const matches = text.match(/@[\wа-яёА-ЯЁ\u0400-\u04FF]+/g) || []
  return matches.map(m => m.slice(1).toLowerCase())
}

export function QuickNoteModal({ open, lang, onClose }: QuickNoteModalProps) {
  const [text,         setText]         = useState('')
  const [saving,       setSaving]       = useState(false)
  const [done,         setDone]         = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [notes,        setNotes]        = useState<NoteItem[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [orgUsers,     setOrgUsers]     = useState<MentionUser[]>([])

  // Mention autocomplete
  const [mentionQuery,    setMentionQuery]    = useState('')
  const [mentionVisible,  setMentionVisible]  = useState(false)
  const [mentionFiltered, setMentionFiltered] = useState<MentionUser[]>([])
  const [mentionIndex,    setMentionIndex]    = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isHe = lang === 'he'

  // ── Load org users for mention ──────────────────────────────────────────────
  const loadOrgUsers = useCallback(async () => {
    try {
      const r = await fetch('/api/org-users')
      if (r.ok) setOrgUsers(await r.json())
    } catch {}
  }, [])

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
    if (open) { loadNotes(); loadOrgUsers() }
  }, [open, loadNotes, loadOrgUsers])

  // ── Mention autocomplete logic ───────────────────────────────────────────────
  const handleTextChange = (val: string) => {
    setText(val)
    // Detect @mention being typed
    const cursorPos = textareaRef.current?.selectionStart ?? val.length
    const textBefore = val.slice(0, cursorPos)
    const mentionMatch = textBefore.match(/@([\wа-яёА-ЯЁ]*)$/)
    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase()
      setMentionQuery(query)
      const filtered = orgUsers.filter(u =>
        u.full_name.toLowerCase().includes(query)
      )
      setMentionFiltered(filtered)
      setMentionVisible(filtered.length > 0)
      setMentionIndex(0)
    } else {
      setMentionVisible(false)
    }
  }

  const insertMention = (user: MentionUser) => {
    const cursorPos = textareaRef.current?.selectionStart ?? text.length
    const textBefore = text.slice(0, cursorPos)
    const mentionStart = textBefore.lastIndexOf('@')
    const newText = text.slice(0, mentionStart) + `@${user.full_name} ` + text.slice(cursorPos)
    setText(newText)
    setMentionVisible(false)
    setTimeout(() => {
      const pos = mentionStart + user.full_name.length + 2
      textareaRef.current?.setSelectionRange(pos, pos)
      textareaRef.current?.focus()
    }, 0)
  }

  // ── Save ────────────────────────────────────────────────────────────────────
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
      const { note, worker_name } = await res.json()
      setNotes(prev => [note, ...prev])
      setDone(true)
      // Send mention notifications
      const mentionedNames = extractMentions(text.trim())
      if (mentionedNames.length > 0) {
        for (const name of mentionedNames) {
          const matched = orgUsers.find(u => u.full_name.toLowerCase().includes(name))
          if (matched) {
            await fetch('/api/worker/mention-notify', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({
                mentioned_user_id: matched.user_id,
                note_text:         text.trim(),
                worker_name:       worker_name ?? isHe ? 'עובד' : 'Сотрудник',
              }),
            })
          }
        }
      }
      setText('')
      setTimeout(() => setDone(false), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (mentionVisible) {
      if (e.key === 'ArrowDown')  { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, mentionFiltered.length - 1)); return }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionFiltered[mentionIndex]); return }
      if (e.key === 'Escape')     { setMentionVisible(false); return }
    }
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
        {/* ── Dark header ─────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4"
          style={{ background: '#0f172a' }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">📝</span>
            <span className="font-bold text-white text-sm">
              {isHe ? 'הערות מהירות' : 'Быстрые заметки'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-white/40 hover:text-white hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Mention hint bar ──────────────────────────────────────────────── */}
        <div className="shrink-0 px-5 py-2 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {isHe ? 'כתוב @ לאזכור:' : 'Напиши @ для упоминания:'}
          </span>
          {orgUsers.slice(0, 5).map(u => (
            <button key={u.user_id}
              onClick={() => {
                const pos = text.length
                setText(t => t + `@${u.full_name} `)
                textareaRef.current?.focus()
              }}
              className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-semibold transition-colors">
              @{u.full_name.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* ── Input area ────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-gray-100 space-y-3 relative">
          <div className="relative">
            <textarea
              ref={textareaRef}
              autoFocus
              value={text}
              onChange={e => handleTextChange(e.target.value)}
              onKeyDown={handleKey}
              rows={3}
              maxLength={1000}
              placeholder={isHe
                ? 'כתוב הערה... השתמש @ לאזכור מנהל (Ctrl+Enter לשמירה)'
                : 'Напиши заметку... Используй @ для упоминания (Ctrl+Enter — сохранить)'}
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

            {/* Mention autocomplete dropdown */}
            {mentionVisible && (
              <div className="absolute bottom-full mb-1 start-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10 min-w-48">
                {mentionFiltered.map((u, i) => (
                  <button key={u.user_id}
                    onClick={() => insertMention(u)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-start hover:bg-indigo-50 transition-colors ${i === mentionIndex ? 'bg-indigo-50' : ''}`}>
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {u.full_name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{u.full_name}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{u.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-gray-400">{text.length}/1000</span>
            <div className="flex gap-2 items-center">
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

        {/* ── Notes history ──────────────────────────────────────────────────── */}
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
              {notes.map(n => {
                const mentions = extractMentions(n.text)
                return (
                  <div key={n.id} className="px-5 py-3 hover:bg-gray-50/70 transition-colors">
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {/* Highlight @mentions */}
                      {n.text.split(/(@[\wа-яёА-ЯЁ]+)/g).map((part, i) =>
                        part.startsWith('@')
                          ? <span key={i} className="text-indigo-600 font-semibold bg-indigo-50 px-1 rounded">{part}</span>
                          : part
                      )}
                    </p>
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
                      {mentions.length > 0 && (
                        <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full font-medium">
                          📣 {isHe ? 'אוזכר' : 'Упомянут'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

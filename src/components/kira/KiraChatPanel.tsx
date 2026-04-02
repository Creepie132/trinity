'use client'

import { useRef, useEffect, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Send, Loader2, Sparkles } from 'lucide-react'
import { KiraWave } from '@/components/kira/KiraWave'
import type { KiraWaveState } from '@/components/kira/KiraWave'

interface KiraChatPanelProps {
  orgId: string
}

type HistoryMessage = { role: 'user' | 'assistant'; content: string }

export function KiraChatPanel({ orgId }: KiraChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [text, setText]           = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionReady, setReady]  = useState(false)
  const [initMsgs, setInitMsgs]   = useState<HistoryMessage[]>([])

  // Init session on mount
  useEffect(() => {
    fetch('/api/kira/session', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.sessionId) { setSessionId(d.sessionId); setInitMsgs(d.messages ?? []) }
      })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [orgId])


  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/kira',
      body: { sessionId, orgId },
    }),
    messages: initMsgs.map((m, i) => ({
      id: `hist-${i}`,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      parts: [{ type: 'text' as const, text: m.content }],
    })),
  })

  const isLoading = status === 'streaming' || status === 'submitted'
  const waveState: KiraWaveState = isLoading ? 'thinking' : 'idle'

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isLoading])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    sendMessage({ role: 'user', content: trimmed, parts: [{ type: 'text', text: trimmed }] })
    setText('')
  }

  if (!sessionReady) {
    return (
      <div className="rounded-2xl flex items-center justify-center" style={{ background: '#1e2027', height: 120 }}>
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'rgba(130,170,255,0.4)' }} />
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: '#1e2027', minHeight: 0 }}>

      {/* Волна */}
      <div className="relative flex flex-col items-center px-3 pt-4 pb-2 flex-shrink-0" style={{ background: '#1e2027' }}>
        <div className="absolute inset-0 opacity-20"
          style={{ background: 'radial-gradient(circle at 50% 90%, rgba(40,80,255,0.4) 0%, transparent 70%)' }} />
        <KiraWave state={waveState} width={220} height={60} />
        <div className="flex items-center gap-1.5 mt-1 relative z-10">
          <Sparkles className="w-3 h-3" style={{ color: 'rgba(130,170,255,0.7)' }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(130,170,255,0.6)' }}>
            Kira AI
          </span>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: isLoading ? '#a78bfa' : '#34d399' }} />
        </div>
      </div>


      {/* Сообщения */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2"
        style={{ maxHeight: 220, minHeight: 80, scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.2) transparent' }}>

        {messages.length === 0 && !isLoading && (
          <p className="text-center text-xs py-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Спроси меня о бизнесе...
          </p>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed"
              style={msg.role === 'user'
                ? { background: 'rgba(99,102,241,0.3)', color: 'rgba(255,255,255,0.9)', borderBottomRightRadius: 4 }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', borderBottomLeftRadius: 4 }
              }>
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-3 py-2 flex items-center gap-1.5"
              style={{ background: 'rgba(255,255,255,0.06)', borderBottomLeftRadius: 4 }}>
              {[0,1,2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: 'rgba(130,170,255,0.6)', animationDelay: `${i*0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-center text-xs" style={{ color: 'rgba(248,113,113,0.7)' }}>
            Ошибка соединения. Попробуй ещё раз.
          </p>
        )}
      </div>

      {/* Инпут */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Спроси Киру..."
          disabled={isLoading}
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-gray-600"
          style={{ color: 'rgba(255,255,255,0.8)', caretColor: 'rgba(130,170,255,0.8)' }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
        />
        <button onClick={handleSend} disabled={isLoading || !text.trim()}
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-30"
          style={{ background: 'rgba(99,102,241,0.4)' }}>
          {isLoading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'rgba(130,170,255,0.8)' }} />
            : <Send className="w-3.5 h-3.5" style={{ color: 'rgba(130,170,255,0.9)' }} />
          }
        </button>
      </div>

    </div>
  )
}


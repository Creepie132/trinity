'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Send, Loader2, Sparkles, Bell, RotateCcw } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { KiraWave } from '@/components/kira/KiraWave'
import type { KiraWaveState } from '@/components/kira/KiraWave'
import { DebtWidget } from '@/components/kira/ui/DebtWidget'

interface KiraChatPanelProps { orgId: string }
type HistoryMessage = { role: 'user' | 'assistant'; content: string }

const supabaseRealtime = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function KiraChatPanel({ orgId }: KiraChatPanelProps) {
  const scrollRef      = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // Ref для sessionId — читается при каждом запросе, не при монтировании
  const sessionIdRef   = useRef<string | null>(null)
  const [text, setText]              = useState('')
  const [sessionId, setSessionId]    = useState<string | null>(null)
  const [sessionReady, setReady]     = useState(false)
  const [proactiveBadge, setBadge]   = useState(false)
  const [proactiveMsg, setProactive] = useState<string | null>(null)


  // body — ФУНКЦИЯ, читает актуальный sessionIdRef при каждом запросе
  // Это решает проблему stale closure: транспорт создаётся один раз,
  // но body вычисляется свежим при каждой отправке
  const { messages, sendMessage, setMessages, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/kira',
      body: () => ({ sessionId: sessionIdRef.current, orgId }),
    }),
  })

  // ── Инициализация сессии + гидратация истории ─────────────────────────
  useEffect(() => {
    fetch('/api/kira/session', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.sessionId) {
          // Обновляем и ref (читается в body транспорта) и state (для Realtime)
          sessionIdRef.current = d.sessionId
          setSessionId(d.sessionId)

          const historyMsgs = (d.messages as HistoryMessage[] ?? []).map((m, i) => ({
            id:      `hist-${i}`,
            role:    m.role as 'user' | 'assistant',
            content: m.content,
            parts:   [{ type: 'text' as const, text: m.content }],
          }))

          if (historyMsgs.length > 0) {
            setMessages(historyMsgs)
            console.log('[kira] hydrated', historyMsgs.length, 'messages from DB')
          }
        }
      })
      .catch(e => console.error('[kira] session init error:', e))
      .finally(() => setReady(true))
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps


  // ── Realtime — проактивные сообщения от cron ──────────────────────────
  useEffect(() => {
    if (!sessionId) return
    const channel = supabaseRealtime
      .channel(`kira-proactive-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'kira_messages',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const msg = payload.new as { role: string; content: string; is_proactive: boolean }
        if (msg.is_proactive && msg.role === 'assistant') {
          setBadge(true)
          setProactive(msg.content)
        }
      })
      .subscribe()
    return () => { supabaseRealtime.removeChannel(channel) }
  }, [sessionId])

  const dismissProactive = useCallback(() => { setBadge(false); setProactive(null) }, [])

  // ── Новая сессия (сброс контекста) ────────────────────────────────────
  const handleNewSession = useCallback(async () => {
    // 1. Закрываем сессию в БД — чтобы при F5 она не восстановилась
    if (sessionIdRef.current) {
      try {
        await fetch(`/api/kira/session?sessionId=${sessionIdRef.current}`, { method: 'DELETE' })
      } catch (e) {
        console.error('[kira] failed to close session:', e)
      }
    }
    // 2. Чистим локальный стейт
    setMessages([])
    sessionIdRef.current = null
    setSessionId(null)
    // Следующее сообщение автоматически создаст новую сессию через /api/kira/session
  }, [setMessages])

  const isLoading = status === 'streaming' || status === 'submitted'
  const waveState: KiraWaveState = isLoading ? 'thinking' : 'idle'

  // ── Автоскролл вниз при новых сообщениях ─────────────────────────────
  useEffect(() => {
    // setTimeout даёт DOM время физически отрисовать новые блоки.
    // scrollTop на контейнере — единственный надёжный способ скролла
    // внутри div с overflow-y-auto (scrollIntoView работает от window).
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [messages, isLoading])

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    dismissProactive()
    if (error) clearError()

    // Если сессия была сброшена — создаём новую перед отправкой
    if (!sessionIdRef.current) {
      try {
        const r = await fetch('/api/kira/session', { method: 'POST' })
        const d = await r.json()
        if (d.sessionId) {
          sessionIdRef.current = d.sessionId
          setSessionId(d.sessionId)
        }
      } catch (e) {
        console.error('[kira] new session error:', e)
      }
    }

    sendMessage({ text: trimmed })
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
          {proactiveBadge && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          {/* Кнопка новой сессии */}
          <button
            onClick={handleNewSession}
            disabled={isLoading}
            title="Новая сессия"
            className="ms-1 w-5 h-5 rounded-full flex items-center justify-center opacity-40 hover:opacity-80 transition-opacity disabled:opacity-20"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <RotateCcw className="w-2.5 h-2.5" style={{ color: 'rgba(130,170,255,0.9)' }} />
          </button>
        </div>
      </div>

      {/* Баннер проактивного сообщения */}
      {proactiveMsg && (
        <div className="mx-3 mt-2 rounded-xl px-3 py-2.5 flex gap-2 items-start flex-shrink-0"
          style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)' }}>
          <Bell className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'rgba(165,180,252,0.9)' }} />
          <p className="text-xs leading-relaxed flex-1" style={{ color: 'rgba(220,220,255,0.85)' }}>{proactiveMsg}</p>
          <button onClick={dismissProactive} className="flex-shrink-0 text-xs opacity-40 hover:opacity-70 transition-opacity"
            style={{ color: 'white' }}>x</button>
        </div>
      )}

      {/* Сообщения */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2"
        style={{ maxHeight: 260, minHeight: 80, scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.2) transparent' }}>

        {messages.length === 0 && !isLoading && (
          <p className="text-center text-xs py-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Спроси меня о бизнесе...
          </p>
        )}


        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            {(msg.parts ?? []).map((part: any, i: number) => {
              if (part.type === 'text' && part.text) {
                return (
                  <div key={i} className="max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed"
                    style={msg.role === 'user'
                      ? { background: 'rgba(99,102,241,0.3)', color: 'rgba(255,255,255,0.9)', borderBottomRightRadius: 4 }
                      : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', borderBottomLeftRadius: 4 }
                    }>
                    {part.text}
                  </div>
                )
              }
              if (part.type === 'tool-getDebts' && part.state === 'output-available') {
                return <div key={i} className="w-full"><DebtWidget result={part.output} /></div>
              }
              if (part.type?.startsWith('tool-') && (part.state === 'input-available' || part.state === 'input-streaming')) {
                return (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg"
                    style={{ background: 'rgba(99,102,241,0.12)', color: 'rgba(130,170,255,0.6)' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-indigo-400" />
                    Анализирую данные...
                  </div>
                )
              }
              return null
            })}
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

        {/* Якорь для автоскролла */}
        <div ref={messagesEndRef} />
      </div>

      {/* Инпут */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <input value={text} onChange={e => setText(e.target.value)}
          placeholder="Спроси Киру..." disabled={isLoading}
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

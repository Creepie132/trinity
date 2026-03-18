'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  MessageCircle, Search, Send, UserPlus, Calendar,
  CheckCheck, Clock, X, Phone, Sparkles, Inbox
} from 'lucide-react'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { format, formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'

type ConvStatus = 'new' | 'in_progress' | 'waiting' | 'closed'
type LeadStatus = 'new' | 'contacted' | 'demo_scheduled' | 'converted' | 'lost'

interface Conversation {
  id: string; phone: string; contact_name: string | null
  status: ConvStatus; lead_status: LeadStatus
  last_message_at: string; last_message_text: string | null
  unread_count: number; client_id: string | null
  clients?: { id: string; first_name: string; last_name: string } | null
}

interface Message {
  id: string; direction: 'inbound' | 'outbound'
  message_type: string; body: string | null
  status: string; created_at: string
  _pending?: boolean
}

const LEAD_LABELS: Record<LeadStatus, string> = {
  new: 'Лид', contacted: 'Контакт', demo_scheduled: 'Демо',
  converted: 'Клиент', lost: 'Потерян'
}
const LEAD_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-700', contacted: 'bg-amber-100 text-amber-700',
  demo_scheduled: 'bg-violet-100 text-violet-700', converted: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-500',
}
const STATUS_LABELS: Record<ConvStatus, string> = {
  new: 'Новый', in_progress: 'В работе', waiting: 'Ожидание', closed: 'Закрыт'
}
const STATUS_COLORS: Record<ConvStatus, string> = {
  new: 'bg-blue-500', in_progress: 'bg-amber-500',
  waiting: 'bg-purple-500', closed: 'bg-gray-400'
}

function Avatar({ name, phone }: { name: string | null; phone: string }) {
  const label = name ? name.slice(0, 2).toUpperCase() : phone.slice(-2)
  const palettes = [
    'from-violet-400 to-purple-500', 'from-emerald-400 to-teal-500',
    'from-blue-400 to-indigo-500', 'from-amber-400 to-orange-500',
    'from-rose-400 to-pink-500', 'from-cyan-400 to-sky-500',
  ]
  const idx = phone.charCodeAt(phone.length - 1) % palettes.length
  return (
    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${palettes[idx]} flex items-center justify-center font-bold text-white text-xs flex-shrink-0 shadow-sm`}>
      {label}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start px-4 py-1">
      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100 flex gap-1 items-center">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ConvStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showCreateClient, setShowCreateClient] = useState(false)
  const [showCreateVisit, setShowCreateVisit] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [visitNote, setVisitNote] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatPhone, setNewChatPhone] = useState('')
  const [newChatName, setNewChatName] = useState('')
  const [creatingChat, setCreatingChat] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastMessageCountRef = useRef(0)

  // Scroll helpers
  const isNearBottom = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100
  }, [])

  const scrollToBottom = useCallback((force = false) => {
    if (force || isNearBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isNearBottom])

  const scrollToBottomInstant = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [])

  // Conversations
  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/wa-inbox/conversations')
    if (!res.ok) return
    const data = await res.json()
    setConversations(data.conversations ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])
  useEffect(() => {
    const interval = setInterval(() => loadConversations(), 5000)
    return () => clearInterval(interval)
  }, [loadConversations])

  useEffect(() => {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const channel = supabase
      .channel('wa_conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_conversations' },
        () => loadConversations())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadConversations])

  // Messages polling (no notifications here — handled globally by WaNotificationProvider)
  const loadMessages = useCallback(async (convId: string, opts: { scroll?: boolean } = {}) => {
    const res = await fetch(`/api/wa-inbox/${convId}`)
    if (!res.ok) return
    const data = await res.json()
    const newMsgs: Message[] = data.messages ?? []
    setMessages(prev => {
      const realPrev = prev.filter(m => !m._pending)
      if (realPrev.length === newMsgs.length &&
          realPrev[realPrev.length - 1]?.id === newMsgs[newMsgs.length - 1]?.id) {
        return prev
      }
      const pending = prev.filter(m => m._pending)
      lastMessageCountRef.current = newMsgs.length
      return [...newMsgs, ...pending]
    })
    if (opts.scroll) setTimeout(() => scrollToBottom(true), 60)
  }, [scrollToBottom])

  // Select conversation — скролл в самый низ после загрузки
  const selectConversation = useCallback((conv: Conversation) => {
    setSelected(conv)
    setMessages([])
    setMessagesLoading(true)
    setShowCreateClient(false)
    setShowCreateVisit(false)
    lastMessageCountRef.current = 0
    fetch(`/api/wa-inbox/${conv.id}`)
      .then(r => r.json())
      .then(data => {
        const msgs: Message[] = data.messages ?? []
        lastMessageCountRef.current = msgs.length
        setMessages(msgs)
        setMessagesLoading(false)
        // Instant scroll после рендера
        requestAnimationFrame(() => {
          requestAnimationFrame(() => scrollToBottomInstant())
        })
      })
      .catch(() => setMessagesLoading(false))
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c))
  }, [scrollToBottomInstant])

  // Scroll to bottom when messages array changes (new message arrived)
  const prevMsgCountRef = useRef(0)
  useEffect(() => {
    const realMsgs = messages.filter(m => !m._pending)
    if (realMsgs.length > prevMsgCountRef.current) {
      prevMsgCountRef.current = realMsgs.length
      setTimeout(() => scrollToBottom(false), 80)
    }
    if (realMsgs.length === 0) prevMsgCountRef.current = 0
  }, [messages, scrollToBottom])

  // Polling every 3s
  useEffect(() => {
    if (!selected) return
    const interval = setInterval(() => loadMessages(selected.id), 3000)
    return () => clearInterval(interval)
  }, [selected, loadMessages])

  // Realtime subscription
  useEffect(() => {
    if (!selected) return
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const channel = supabase
      .channel(`wa_messages_${selected.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'wa_messages',
        filter: `conversation_id=eq.${selected.id}`
      }, (payload) => {
        const newMsg = payload.new as Message
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev
          lastMessageCountRef.current = prev.filter(m => !m._pending).length + 1
          return [...prev.filter(m => !m._pending), newMsg, ...prev.filter(m => m._pending)]
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'wa_messages',
        filter: `conversation_id=eq.${selected.id}`
      }, (payload) => {
        setMessages(prev => prev.map(m =>
          m.id === (payload.new as Message).id ? { ...m, status: (payload.new as Message).status } : m
        ))
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'wa_conversations',
        filter: `id=eq.${selected.id}`
      }, (payload) => {
        setIsTyping((payload.new as any).is_typing ?? false)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selected])

  const sendMessage = async () => {
    if (!selected || !text.trim() || sending) return
    setSending(true)
    const body = text.trim()
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = '40px'
    const tempId = `temp_${Date.now()}`
    const optimisticMsg: Message = {
      id: tempId, direction: 'outbound', message_type: 'text',
      body, status: 'pending', created_at: new Date().toISOString(), _pending: true,
    }
    setMessages(prev => [...prev, optimisticMsg])
    setTimeout(() => scrollToBottom(true), 60)
    const res = await fetch('/api/wa-inbox/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: selected.id, message: body }),
    })
    if (res.ok) {
      const data = await res.json()
      const realMsg: Message | null = data.message ?? null
      setMessages(prev => prev.map(m => {
        if (m.id !== tempId) return m
        if (realMsg) return { ...realMsg, _pending: false }
        return { ...m, _pending: false, status: 'sent' }
      }))
    } else {
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, _pending: false, status: 'failed' } : m
      ))
    }
    setSending(false)
  }

  const updateStatus = async (field: 'status' | 'lead_status', value: string) => {
    if (!selected) return
    await fetch(`/api/wa-inbox/${selected.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    setSelected(prev => prev ? { ...prev, [field]: value as any } : prev)
    setConversations(prev => prev.map(c => c.id === selected.id ? { ...c, [field]: value as any } : c))
  }

  const createNewClient = async () => {
    if (!selected || !newClientName.trim()) return
    const res = await fetch(`/api/wa-inbox/${selected.id}/create-client`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: newClientName.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setSelected(prev => prev ? { ...prev, client_id: data.client.id } : prev)
      setShowCreateClient(false); setNewClientName('')
      loadConversations()
    }
  }

  const createVisit = async () => {
    if (!selected?.client_id || !visitDate) return
    await fetch(`/api/wa-inbox/${selected.id}/create-visit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: selected.client_id, scheduled_at: visitDate, notes: visitNote }),
    })
    setShowCreateVisit(false); setVisitDate(''); setVisitNote('')
    updateStatus('lead_status', 'demo_scheduled')
  }

  const startNewChat = async () => {
    if (!newChatPhone.trim() || creatingChat) return
    setCreatingChat(true)
    const phone = newChatPhone.replace(/\D/g, '')
    const res = await fetch('/api/wa-inbox/conversations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, contact_name: newChatName.trim() || null }),
    })
    if (res.ok) {
      const data = await res.json()
      setShowNewChat(false); setNewChatPhone(''); setNewChatName('')
      await loadConversations()
      if (data.conversation) selectConversation(data.conversation)
    }
    setCreatingChat(false)
  }

  const filtered = conversations.filter(c => {
    const matchSearch = !search || c.phone.includes(search) ||
      (c.contact_name?.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count ?? 0), 0)

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-br from-slate-50 to-gray-100">

      {/* Модалка нового чата */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={e => e.target === e.currentTarget && setShowNewChat(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Новый разговор</h3>
              <button onClick={() => setShowNewChat(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Номер телефона *</label>
                <input className="w-full h-9 text-sm border border-gray-200 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-violet-300"
                  placeholder="+972501234567" value={newChatPhone}
                  onChange={e => setNewChatPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && startNewChat()} autoFocus />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Имя (необязательно)</label>
                <input className="w-full h-9 text-sm border border-gray-200 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-violet-300"
                  placeholder="Имя контакта..." value={newChatName}
                  onChange={e => setNewChatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && startNewChat()} />
              </div>
              <button onClick={startNewChat} disabled={!newChatPhone.trim() || creatingChat}
                className="w-full h-9 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
                {creatingChat ? 'Создаём...' : 'Начать разговор'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ЛЕВАЯ ПАНЕЛЬ ── */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-white/80 backdrop-blur-sm border-r border-gray-200/60 shadow-sm">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-sm">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 text-sm leading-none">WhatsApp</h1>
                <p className="text-xs text-gray-400 mt-0.5">Входящие сообщения</p>
              </div>
            </div>
            {totalUnread > 0 && (
              <span className="bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                {totalUnread}
              </span>
            )}
            <button onClick={() => setShowNewChat(true)}
              className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm ml-auto">
              <span className="text-lg leading-none font-light">+</span>
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input className="w-full pl-8 pr-3 h-8 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all"
              placeholder="Поиск по имени или номеру..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-1 px-3 pb-2 overflow-x-auto scrollbar-hide">
          {(['all', 'new', 'in_progress', 'waiting', 'closed'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                filterStatus === s
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm scale-105'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {s === 'all' ? 'Все' : STATUS_LABELS[s as ConvStatus]}
            </button>
          ))}
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-3" />
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="space-y-1 p-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Inbox className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">Нет разговоров</p>
              <p className="text-xs mt-1 opacity-60">Сообщения появятся здесь</p>
            </div>
          ) : (
            <div className="space-y-0.5 px-2">
              {filtered.map(conv => (
                <button key={conv.id} onClick={() => selectConversation(conv)}
                  className={`w-full text-left p-3 rounded-xl transition-all duration-200 group ${
                    selected?.id === conv.id
                      ? 'bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200/60 shadow-sm'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}>
                  <div className="flex items-start gap-2.5">
                    <div className="relative">
                      <Avatar name={conv.contact_name} phone={conv.phone} />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${STATUS_COLORS[conv.status]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-gray-900 truncate">{conv.contact_name ?? conv.phone}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                          {formatDistanceToNow(new Date(conv.last_message_at), { locale: he, addSuffix: false })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{conv.last_message_text ?? '—'}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${LEAD_COLORS[conv.lead_status]}`}>
                          {LEAD_LABELS[conv.lead_status]}
                        </span>
                        {conv.unread_count > 0 && (
                          <span className="bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── ПРАВАЯ ПАНЕЛЬ ── */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-10 h-10 text-violet-400" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1">Выберите разговор</h3>
            <p className="text-sm text-gray-400">Нажмите на контакт слева</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">

          {/* Шапка чата */}
          <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200/60 px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar name={selected.contact_name} phone={selected.phone} />
              <div>
                <div className="font-bold text-gray-900">{selected.contact_name ?? selected.phone}</div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Phone className="w-3 h-3" /> {selected.phone}
                  {selected.clients && (
                    <span className="ml-1 text-emerald-600 font-semibold">
                      ✓ {selected.clients.first_name} {selected.clients.last_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {!selected.client_id && (
                <Button size="sm" variant="outline"
                  className="text-xs h-7 gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                  onClick={() => { setShowCreateClient(true); setShowCreateVisit(false) }}>
                  <UserPlus className="w-3.5 h-3.5" /> Создать клиента
                </Button>
              )}
              {selected.client_id && (
                <Button size="sm" variant="outline"
                  className="text-xs h-7 gap-1 border-purple-200 text-purple-600 hover:bg-purple-50"
                  onClick={() => { setShowCreateVisit(true); setShowCreateClient(false) }}>
                  <Calendar className="w-3.5 h-3.5" /> Встреча
                </Button>
              )}
              <select value={selected.status} onChange={e => updateStatus('status', e.target.value)}
                className="text-xs px-2 py-1 rounded-lg border border-gray-200 bg-white font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-300">
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select value={selected.lead_status} onChange={e => updateStatus('lead_status', e.target.value)}
                className="text-xs px-2 py-1 rounded-lg border border-gray-200 bg-white font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-300">
                {Object.entries(LEAD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Создать клиента */}
          {showCreateClient && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200/60 px-4 py-2.5 flex items-center gap-3 animate-in slide-in-from-top duration-200">
              <UserPlus className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <input className="flex-1 h-7 text-sm bg-white border border-blue-200 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Имя клиента..." value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createNewClient()} autoFocus />
              <button onClick={createNewClient}
                className="px-3 h-7 text-xs font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                Создать
              </button>
              <button onClick={() => setShowCreateClient(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Создать встречу */}
          {showCreateVisit && (
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-200/60 px-4 py-2.5 flex items-center gap-3 animate-in slide-in-from-top duration-200">
              <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <input type="datetime-local"
                className="h-7 text-sm border border-purple-200 rounded-lg px-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
                value={visitDate} onChange={e => setVisitDate(e.target.value)} />
              <input className="flex-1 h-7 text-sm bg-white border border-purple-200 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="Услуга / заметка..." value={visitNote} onChange={e => setVisitNote(e.target.value)} />
              <button onClick={createVisit}
                className="px-3 h-7 text-xs font-semibold bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                Создать
              </button>
              <button onClick={() => setShowCreateVisit(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Сообщения */}
          <div ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.07) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
            {messagesLoading && (
              <div className="space-y-3 pt-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} animate-pulse`}>
                    <div className={`h-9 rounded-2xl ${i % 2 === 0 ? 'bg-violet-100 w-40' : 'bg-gray-100 w-56'}`} />
                  </div>
                ))}
              </div>
            )}
            {!messagesLoading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
                <Sparkles className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Начало разговора</p>
              </div>
            )}
            {!messagesLoading && messages.map((msg, i) => {
              const isOut = msg.direction === 'outbound'
              const showTime = i === 0 || new Date(msg.created_at).getMinutes() !== new Date(messages[i - 1]?.created_at).getMinutes()
              return (
                <div key={msg.id}>
                  {showTime && (
                    <div className="flex justify-center my-2">
                      <span className="text-xs text-gray-400 bg-white/60 px-2 py-0.5 rounded-full">
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-3.5 py-2 rounded-2xl text-sm shadow-sm transition-all ${
                      isOut
                        ? msg.status === 'failed'
                          ? 'bg-red-100 text-red-700 rounded-br-sm border border-red-200'
                          : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-br-sm'
                        : 'bg-white text-gray-900 rounded-bl-sm border border-gray-100'
                    } ${msg._pending ? 'opacity-75' : 'opacity-100'}`}>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                      {isOut && (
                        <div className="flex items-center justify-end gap-1 mt-1">
                          {msg._pending ? (
                            <svg className="w-3 h-3 text-violet-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                          ) : msg.status === 'failed' ? (
                            <span className="text-xs text-red-500 font-bold">!</span>
                          ) : msg.status === 'read' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-violet-200" />
                          ) : (
                            <svg className="w-3 h-3 text-violet-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Поле ввода */}
          <div className="bg-white/90 backdrop-blur-sm border-t border-gray-200/60 px-4 py-3">
            <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 px-3 py-2 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
              <textarea ref={textareaRef}
                className="flex-1 resize-none bg-transparent text-sm focus:outline-none max-h-32 min-h-[24px] placeholder-gray-400"
                placeholder="Написать сообщение..." value={text} rows={1}
                onChange={e => {
                  setText(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              />
              <button onClick={sendMessage} disabled={!text.trim() || sending}
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                  text.trim() && !sending
                    ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm hover:shadow-md hover:scale-105 active:scale-95'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}>
                {sending ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 px-1">Enter — отправить · Shift+Enter — новая строка</p>
          </div>

        </div>
      )}
    </div>
  )
}

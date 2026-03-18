'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  MessageCircle, Search, Send, UserPlus, Calendar,
  ChevronDown, CheckCheck, Clock, X, Phone
} from 'lucide-react'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { format, formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'

// ── Типы ─────────────────────────────────────────────────────────────────────
type ConvStatus = 'new' | 'in_progress' | 'waiting' | 'closed'
type LeadStatus = 'new' | 'contacted' | 'demo_scheduled' | 'converted' | 'lost'

interface Conversation {
  id: string
  phone: string
  contact_name: string | null
  status: ConvStatus
  lead_status: LeadStatus
  last_message_at: string
  last_message_text: string | null
  unread_count: number
  client_id: string | null
  clients?: { id: string; first_name: string; last_name: string } | null
}

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  message_type: string
  body: string | null
  status: string
  created_at: string
}

// ── Статусы ───────────────────────────────────────────────────────────────────
const CONV_STATUS_LABELS: Record<ConvStatus, string> = {
  new: 'Новый', in_progress: 'В работе', waiting: 'Ожидание', closed: 'Закрыт'
}
const CONV_STATUS_COLORS: Record<ConvStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  waiting: 'bg-purple-100 text-purple-700',
  closed: 'bg-gray-100 text-gray-500',
}
const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Лид', contacted: 'Контакт', demo_scheduled: 'Демо',
  converted: 'Клиент', lost: 'Потерян'
}
const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-50 text-blue-600',
  contacted: 'bg-amber-50 text-amber-600',
  demo_scheduled: 'bg-purple-50 text-purple-700',
  converted: 'bg-emerald-50 text-emerald-700',
  lost: 'bg-red-50 text-red-500',
}

// ── Аватар ────────────────────────────────────────────────────────────────────
function Avatar({ name, phone }: { name: string | null; phone: string }) {
  const label = name ? name[0].toUpperCase() : phone.slice(-2)
  const colors = [
    'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700',
    'bg-blue-100 text-blue-700', 'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
  ]
  const idx = phone.charCodeAt(phone.length - 1) % colors.length
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${colors[idx]}`}>
      {label}
    </div>
  )
}

// ── Главный компонент ─────────────────────────────────────────────────────────
export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Загрузка разговоров
  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/wa-inbox/conversations')
    if (!res.ok) return
    const data = await res.json()
    setConversations(data.conversations ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  // Realtime через Supabase
  useEffect(() => {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const channel = supabase
      .channel('wa_conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_conversations' },
        () => loadConversations()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadConversations])

  // Загрузка сообщений выбранного разговора
  const loadMessages = useCallback(async (convId: string) => {
    const res = await fetch(`/api/wa-inbox/${convId}`)
    if (!res.ok) return
    const data = await res.json()
    setMessages(data.messages ?? [])
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [])

  const selectConversation = useCallback((conv: Conversation) => {
    setSelected(conv)
    setShowCreateClient(false)
    setShowCreateVisit(false)
    loadMessages(conv.id)
    // Сброс счётчика непрочитанных локально
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c))
  }, [loadMessages])

  // Realtime для сообщений
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
        setMessages(prev => [...prev, payload.new as Message])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selected])

  // Отправка сообщения
  const sendMessage = async () => {
    if (!selected || !text.trim() || sending) return
    setSending(true)
    const body = text.trim()
    setText('')
    await fetch('/api/wa-inbox/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: selected.id, message: body }),
    })
    setSending(false)
    loadMessages(selected.id)
  }

  // Смена статуса
  const updateStatus = async (field: 'status' | 'lead_status', value: string) => {
    if (!selected) return
    await fetch(`/api/wa-inbox/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    setSelected(prev => prev ? { ...prev, [field]: value as any } : prev)
    setConversations(prev => prev.map(c => c.id === selected.id ? { ...c, [field]: value as any } : c))
  }

  // Создать клиента
  const createNewClient = async () => {
    if (!selected || !newClientName.trim()) return
    const res = await fetch(`/api/wa-inbox/${selected.id}/create-client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: newClientName.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setSelected(prev => prev ? { ...prev, client_id: data.client.id } : prev)
      setShowCreateClient(false)
      setNewClientName('')
      loadConversations()
    }
  }

  // Создать встречу
  const createVisit = async () => {
    if (!selected?.client_id || !visitDate) return
    await fetch(`/api/wa-inbox/${selected.id}/create-visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: selected.client_id,
        scheduled_at: visitDate,
        notes: visitNote,
      }),
    })
    setShowCreateVisit(false)
    setVisitDate('')
    setVisitNote('')
    updateStatus('lead_status', 'demo_scheduled')
  }

  // Фильтрация
  const filtered = conversations.filter(c => {
    const matchSearch = !search ||
      c.phone.includes(search) ||
      (c.contact_name?.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count ?? 0), 0)

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden">

      {/* ── Левая панель: список разговоров ── */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">

        {/* Заголовок */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-violet-600" />
              <h1 className="font-semibold text-gray-900">WhatsApp</h1>
              {totalUnread > 0 && (
                <span className="bg-violet-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}
            </div>
          </div>
          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              className="pl-8 h-8 text-sm bg-gray-50 border-gray-200"
              placeholder="Поиск..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Фильтры */}
        <div className="flex gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto">
          {(['all', 'new', 'in_progress', 'waiting', 'closed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                filterStatus === s
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? 'Все' : CONV_STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Список */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Загрузка...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <MessageCircle className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Нет разговоров</p>
            </div>
          ) : filtered.map(conv => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                selected?.id === conv.id ? 'bg-violet-50 border-l-2 border-l-violet-500' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <Avatar name={conv.contact_name} phone={conv.phone} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {conv.contact_name ?? conv.phone}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                      {formatDistanceToNow(new Date(conv.last_message_at), { locale: he, addSuffix: false })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mb-1">{conv.last_message_text ?? '—'}</p>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${LEAD_STATUS_COLORS[conv.lead_status]}`}>
                      {LEAD_STATUS_LABELS[conv.lead_status]}
                    </span>
                    {conv.unread_count > 0 && (
                      <span className="ml-auto bg-violet-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Правая панель: чат ── */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Выберите разговор</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">

          {/* Шапка чата */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={selected.contact_name} phone={selected.phone} />
              <div>
                <div className="font-semibold text-gray-900 text-sm">
                  {selected.contact_name ?? selected.phone}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Phone className="w-3 h-3" />
                  {selected.phone}
                  {selected.clients && (
                    <span className="ml-2 text-emerald-600 font-medium">
                      ✓ {selected.clients.first_name} {selected.clients.last_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="flex items-center gap-2">
              {!selected.client_id && (
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1"
                  onClick={() => { setShowCreateClient(true); setShowCreateVisit(false) }}>
                  <UserPlus className="w-3.5 h-3.5" /> Создать клиента
                </Button>
              )}
              {selected.client_id && (
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1"
                  onClick={() => { setShowCreateVisit(true); setShowCreateClient(false) }}>
                  <Calendar className="w-3.5 h-3.5" /> Встреча
                </Button>
              )}

              {/* Статус разговора */}
              <select
                value={selected.status}
                onChange={e => updateStatus('status', e.target.value)}
                className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${CONV_STATUS_COLORS[selected.status]}`}
              >
                {Object.entries(CONV_STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>

              {/* Статус лида */}
              <select
                value={selected.lead_status}
                onChange={e => updateStatus('lead_status', e.target.value)}
                className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${LEAD_STATUS_COLORS[selected.lead_status]}`}
              >
                {Object.entries(LEAD_STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Панель создания клиента */}
          {showCreateClient && (
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center gap-3">
              <UserPlus className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <Input
                className="h-7 text-sm flex-1"
                placeholder="Имя клиента..."
                value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createNewClient()}
                autoFocus
              />
              <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={createNewClient}>
                Создать
              </Button>
              <button onClick={() => setShowCreateClient(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Панель создания встречи */}
          {showCreateVisit && (
            <div className="bg-purple-50 border-b border-purple-200 px-4 py-3 flex items-center gap-3">
              <Calendar className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <input
                type="datetime-local"
                className="h-7 text-sm border border-purple-200 rounded px-2 bg-white"
                value={visitDate}
                onChange={e => setVisitDate(e.target.value)}
              />
              <Input
                className="h-7 text-sm flex-1"
                placeholder="Услуга / заметка..."
                value={visitNote}
                onChange={e => setVisitNote(e.target.value)}
              />
              <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700" onClick={createVisit}>
                Создать
              </Button>
              <button onClick={() => setShowCreateVisit(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Сообщения */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl text-sm ${
                  msg.direction === 'outbound'
                    ? 'bg-violet-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-900 shadow-sm rounded-bl-sm border border-gray-100'
                }`}>
                  <p className="leading-relaxed">{msg.body}</p>
                  <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-xs ${msg.direction === 'outbound' ? 'text-violet-200' : 'text-gray-400'}`}>
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </span>
                    {msg.direction === 'outbound' && (
                      <CheckCheck className={`w-3 h-3 ${msg.status === 'read' ? 'text-blue-300' : 'text-violet-300'}`} />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Поле ввода */}
          <div className="bg-white border-t border-gray-200 px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 max-h-32 min-h-[40px]"
                placeholder="Написать сообщение..."
                value={text}
                onChange={e => setText(e.target.value)}
                rows={1}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
              />
              <Button
                onClick={sendMessage}
                disabled={!text.trim() || sending}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-10 w-10 p-0 flex-shrink-0"
              >
                {sending ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Enter — отправить, Shift+Enter — новая строка</p>
          </div>

        </div>
      )}
    </div>
  )
}

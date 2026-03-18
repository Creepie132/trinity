'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { MessageCircle, X } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface WaToast {
  id: number
  name: string | null
  phone: string
  text: string | null
}

let _toastId = 0

// ── Sound ─────────────────────────────────────────────────────────────────────
function playSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch {}
}

// ── Browser notification ───────────────────────────────────────────────────
async function requestPermission() {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'default') await Notification.requestPermission()
}

function showBrowserNotif(name: string | null, phone: string, text: string | null) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(name ?? phone, {
      body: text ?? 'Новое сообщение из WhatsApp',
      icon: '/favicon.ico',
      tag: 'wa-inbox-new',
    })
  } catch {}
}

// ── Toast UI ──────────────────────────────────────────────────────────────────
function ToastList({ toasts, onDismiss }: { toasts: WaToast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 bg-white rounded-2xl border border-gray-100 px-4 py-3 w-72 animate-in slide-in-from-right duration-300"
          style={{ boxShadow: '0 8px 32px rgba(109,40,217,0.18), 0 2px 8px rgba(0,0,0,0.08)' }}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-900 truncate">{t.name ?? t.phone}</p>
              <button
                onClick={() => onDismiss(t.id)}
                className="text-gray-300 hover:text-gray-500 ml-2 flex-shrink-0 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{t.text ?? 'Новое сообщение'}</p>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-green-600 font-medium">WhatsApp</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function WaNotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<WaToast[]>([])
  // Храним последние известные conversation_id → last message id чтобы не дублировать
  const seenRef = useRef<Set<string>>(new Set())

  const fire = useCallback((name: string | null, phone: string, text: string | null) => {
    playSound()
    if (document.hidden) showBrowserNotif(name, phone, text)
    const id = ++_toastId
    setToasts(prev => [...prev, { id, name, phone, text }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  // Запрашиваем разрешение один раз при монтировании
  useEffect(() => { requestPermission() }, [])

  // Realtime подписка на ВСЕ входящие сообщения
  useEffect(() => {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel('wa_global_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wa_messages' },
        async (payload) => {
          const msg = payload.new as any
          if (msg.direction !== 'inbound') return
          if (seenRef.current.has(msg.id)) return
          seenRef.current.add(msg.id)

          // Получаем имя контакта из conversations
          let name: string | null = null
          let phone = ''
          try {
            const { data } = await supabase
              .from('wa_conversations')
              .select('contact_name, phone')
              .eq('id', msg.conversation_id)
              .single()
            name = data?.contact_name ?? null
            phone = data?.phone ?? ''
          } catch {}

          fire(name, phone, msg.body)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fire])

  return (
    <>
      {children}
      <ToastList toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />
    </>
  )
}

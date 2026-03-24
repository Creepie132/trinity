'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MessageCircle, X } from 'lucide-react'

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
      tag: `wa-${phone}`,
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
              <button onClick={() => onDismiss(t.id)} className="text-gray-300 hover:text-gray-500 ml-2 flex-shrink-0 transition-colors">
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
// Работает через polling /api/wa-inbox/conversations — надёжно, без RLS проблем Realtime
export function WaNotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<WaToast[]>([])

  const prevRef = useRef<Map<string, { unread: number; lastAt: string }> | null>(null)
  const isFirstPollRef = useRef(true)
  // Если получили 403 — прекращаем polling навсегда (нет доступа к WA Inbox)
  const stoppedRef = useRef(false)

  useEffect(() => { requestPermission() }, [])

  const fire = useCallback((name: string | null, phone: string, text: string | null) => {
    playSound()
    showBrowserNotif(name, phone, text)
    const id = ++_toastId
    setToasts(prev => [...prev, { id, name, phone, text }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const poll = useCallback(async () => {
    if (stoppedRef.current) return
    try {
      const res = await fetch('/api/wa-inbox/conversations')
      // 403 = нет доступа (не isAdmin) — останавливаем polling навсегда
      if (res.status === 403) { stoppedRef.current = true; return }
      if (!res.ok) return
      const data = await res.json()
      const convs: any[] = data.conversations ?? []

      if (isFirstPollRef.current) {
        // Первый poll — просто запоминаем состояние, ничего не показываем
        const map = new Map<string, { unread: number; lastAt: string }>()
        for (const c of convs) map.set(c.id, { unread: c.unread_count ?? 0, lastAt: c.last_message_at })
        prevRef.current = map
        isFirstPollRef.current = false
        return
      }

      const prev = prevRef.current!
      const next = new Map<string, { unread: number; lastAt: string }>()

      for (const c of convs) {
        const prevEntry = prev.get(c.id)
        const curUnread = c.unread_count ?? 0
        const curAt = c.last_message_at

        // Новый разговор ИЛИ unread вырос ИЛИ новое сообщение по времени
        const isNew = !prevEntry
        const unreadGrew = prevEntry && curUnread > prevEntry.unread
        const newMsg = prevEntry && curAt !== prevEntry.lastAt && curUnread > 0

        if (isNew || unreadGrew || newMsg) {
          fire(c.contact_name ?? null, c.phone, c.last_message_text ?? null)
        }

        next.set(c.id, { unread: curUnread, lastAt: curAt })
      }

      prevRef.current = next
    } catch {}
  }, [fire])

  useEffect(() => {
    // Первый poll сразу
    poll()
    // Затем каждые 4 секунды
    const interval = setInterval(poll, 4000)
    return () => clearInterval(interval)
  }, [poll])

  return (
    <>
      {children}
      <ToastList toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />
    </>
  )
}

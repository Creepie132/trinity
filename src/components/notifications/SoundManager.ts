// ─── SoundManager — Web Audio API + preloaded Audio fallback ─────────────────
// Fix: preload ONE Audio element and clone it — avoids per-play creation lag
// and browser autoplay policy blocks on repeated new Audio() calls.

import type { ToastVariant, ToastPriority } from './types'

declare global {
  interface Window {
    _trinityAudioCtx?: AudioContext
    _trinityAudioUnlocked?: boolean
    _trinityAudioEl?: HTMLAudioElement
  }
}

// ── Preload the MP3 once at module load ───────────────────────────────────────
function getPreloadedAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (!window._trinityAudioEl) {
    try {
      const el = new Audio('/sounds/Notification.mp3')
      el.volume = 0.55
      el.preload = 'auto'
      // Trigger preload
      el.load()
      window._trinityAudioEl = el
    } catch {
      return null
    }
  }
  return window._trinityAudioEl
}

// ── AudioContext management ───────────────────────────────────────────────────
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!window._trinityAudioCtx) {
    try {
      window._trinityAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch {
      return null
    }
  }
  return window._trinityAudioCtx
}

// Unlock on ANY user gesture
if (typeof window !== 'undefined') {
  const unlock = () => {
    window._trinityAudioUnlocked = true
    // Preload audio on first gesture
    getPreloadedAudio()
    const ctx = getCtx()
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
  }
  window.addEventListener('click',       unlock, { passive: true })
  window.addEventListener('touchstart',  unlock, { passive: true })
  window.addEventListener('keydown',     unlock, { passive: true })
  window.addEventListener('pointerdown', unlock, { passive: true })
}

// ── MP3 fallback — clone preloaded element to avoid policy blocks ─────────────
function playMp3(volume = 0.55) {
  try {
    const src = getPreloadedAudio()
    if (!src) return
    // cloneNode reuses decoded audio buffer, avoids new network request
    const clone = src.cloneNode() as HTMLAudioElement
    clone.volume = volume
    clone.currentTime = 0
    const p = clone.play()
    if (p) p.catch(() => {
      // Last resort: try original element
      try { src.currentTime = 0; src.play().catch(() => {}) } catch {}
    })
  } catch {}
}

// ── Web Audio synthesis ───────────────────────────────────────────────────────
function tone(ctx: AudioContext, freq: number, type: OscillatorType, g: number, dur: number, delay = 0) {
  try {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay)
    gain.gain.setValueAtTime(0, ctx.currentTime + delay)
    gain.gain.linearRampToValueAtTime(g, ctx.currentTime + delay + 0.012)
    gain.gain.setValueAtTime(g, ctx.currentTime + delay + dur - 0.04)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + dur)
    osc.start(ctx.currentTime + delay)
    osc.stop(ctx.currentTime + delay + dur + 0.01)
  } catch {}
}

function chime(ctx: AudioContext)  { tone(ctx, 880, 'sine', 0.17, 0.24); tone(ctx, 1108, 'sine', 0.11, 0.19, 0.13) }
function pop(ctx: AudioContext)    { tone(ctx, 660, 'sine', 0.20, 0.14); tone(ctx, 880,  'sine', 0.09, 0.10, 0.09) }
function alert(ctx: AudioContext)  { tone(ctx, 440, 'triangle', 0.19, 0.11); tone(ctx, 440, 'triangle', 0.19, 0.11, 0.19) }
function urgent(ctx: AudioContext) { tone(ctx, 330, 'square', 0.07, 0.08); tone(ctx, 440, 'square', 0.07, 0.08, 0.13); tone(ctx, 550, 'square', 0.07, 0.08, 0.26) }

function synthPlay(ctx: AudioContext, variant: ToastVariant, priority: ToastPriority) {
  if (priority === 'urgent' || variant === 'critical') return urgent(ctx)
  if (priority === 'high'   || variant === 'warning'  || variant === 'error') return alert(ctx)
  if (variant === 'payment' || variant === 'client') return pop(ctx)
  chime(ctx)
}

// ── Public API ────────────────────────────────────────────────────────────────
export function playNotificationSound(variant: ToastVariant, priority: ToastPriority): void {
  if (typeof window === 'undefined') return

  const ctx      = getCtx()
  const unlocked = !!window._trinityAudioUnlocked

  if (ctx && unlocked) {
    if (ctx.state === 'running') {
      synthPlay(ctx, variant, priority)
      return
    }
    if (ctx.state === 'suspended') {
      ctx.resume()
        .then(() => synthPlay(ctx, variant, priority))
        .catch(() => playMp3())
      return
    }
  }

  // No unlock yet or ctx failed — use MP3
  playMp3()
}

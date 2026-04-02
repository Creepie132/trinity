// ─── SoundManager — Web Audio API + MP3 fallback ────────────────────────────
// Strategy:
// 1. Try Web Audio API synthesis (no files needed, works after user gesture)
// 2. If AudioContext is blocked/missing → fallback to /sounds/Notification.mp3
// 3. MP3 fallback always tried so sound works even before first click

import type { ToastVariant, ToastPriority } from './types'

declare global {
  interface Window {
    _trinityAudioCtx?: AudioContext
    _trinityAudioUnlocked?: boolean
  }
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

// Unlock AudioContext on ANY user gesture (needed for Web Audio API)
if (typeof window !== 'undefined') {
  const unlock = () => {
    window._trinityAudioUnlocked = true
    const ctx = getCtx()
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
  }
  window.addEventListener('click',      unlock, { passive: true })
  window.addEventListener('touchstart', unlock, { passive: true })
  window.addEventListener('keydown',    unlock, { passive: true })
  window.addEventListener('pointerdown',unlock, { passive: true })
}

// ── MP3 fallback — works even without user gesture unlock ────────────────────
function playMp3Fallback(volume = 0.5) {
  try {
    const audio = new Audio('/sounds/Notification.mp3')
    audio.volume = volume
    const p = audio.play()
    if (p) p.catch(() => {})
  } catch {}
}

// ── Web Audio synthesis ───────────────────────────────────────────────────────
function playTone(
  ctx: AudioContext, freq: number, type: OscillatorType,
  gainPeak: number, dur: number, delay = 0,
) {
  try {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay)
    gain.gain.setValueAtTime(0, ctx.currentTime + delay)
    gain.gain.linearRampToValueAtTime(gainPeak, ctx.currentTime + delay + 0.015)
    gain.gain.setValueAtTime(gainPeak, ctx.currentTime + delay + dur - 0.04)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + dur)
    osc.start(ctx.currentTime + delay)
    osc.stop(ctx.currentTime + delay + dur + 0.01)
  } catch {}
}

function playChime(ctx: AudioContext) {
  playTone(ctx, 880,  'sine', 0.18, 0.25, 0)
  playTone(ctx, 1108, 'sine', 0.12, 0.20, 0.13)
}

function playPop(ctx: AudioContext) {
  playTone(ctx, 660, 'sine', 0.22, 0.15, 0)
  playTone(ctx, 880, 'sine', 0.10, 0.10, 0.09)
}

function playAlert(ctx: AudioContext) {
  playTone(ctx, 440, 'triangle', 0.20, 0.12, 0)
  playTone(ctx, 440, 'triangle', 0.20, 0.12, 0.20)
}

function playUrgent(ctx: AudioContext) {
  playTone(ctx, 330, 'square', 0.08, 0.08, 0)
  playTone(ctx, 440, 'square', 0.08, 0.08, 0.13)
  playTone(ctx, 550, 'square', 0.08, 0.08, 0.26)
}

// ── Public API ────────────────────────────────────────────────────────────────
export function playNotificationSound(
  variant: ToastVariant,
  priority: ToastPriority,
): void {
  if (typeof window === 'undefined') return

  const ctx = getCtx()
  const unlocked = !!window._trinityAudioUnlocked

  // Try Web Audio if context is ready and unlocked
  if (ctx && unlocked && ctx.state === 'running') {
    if (priority === 'urgent' || variant === 'critical') { playUrgent(ctx); return }
    if (priority === 'high'   || variant === 'warning' || variant === 'error') { playAlert(ctx); return }
    if (variant === 'payment' || variant === 'client')  { playPop(ctx);    return }
    playChime(ctx)
    return
  }

  // Try to resume suspended context
  if (ctx && unlocked && ctx.state === 'suspended') {
    ctx.resume().then(() => {
      if (priority === 'urgent' || variant === 'critical') { playUrgent(ctx); return }
      if (priority === 'high'   || variant === 'warning' || variant === 'error') { playAlert(ctx); return }
      if (variant === 'payment' || variant === 'client')  { playPop(ctx);    return }
      playChime(ctx)
    }).catch(() => playMp3Fallback())
    return
  }

  // Fallback: HTML Audio — works even before user gesture in some browsers
  playMp3Fallback(0.5)
}

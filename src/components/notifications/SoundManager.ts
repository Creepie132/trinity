// ─── SoundManager — Web Audio API based, tasteful & short ───────────────────
// Generates sounds procedurally — no external files needed.
// Fallback to /sounds/Notification.mp3 if already unlocked by NotificationBell.

import type { ToastVariant, ToastPriority } from './types'

// Reuse AudioContext that NotificationBell may have already created
declare global {
  interface Window {
    _trinityAudioCtx?: AudioContext
    _trinityAudioUnlocked?: boolean
  }
}

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

function resume(ctx: AudioContext) {
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
}

// Unlock on first user gesture — same pattern as NotificationBell
if (typeof window !== 'undefined' && !window._trinityAudioUnlocked) {
  const unlock = () => {
    window._trinityAudioUnlocked = true
    getCtx()
    window.removeEventListener('click', unlock)
    window.removeEventListener('touchstart', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('click', unlock, { once: true })
  window.addEventListener('touchstart', unlock, { once: true })
  window.addEventListener('keydown', unlock, { once: true })
}

// ── Sound recipes — pure synthesis, no files ──────────────────────────────
function playTone(
  ctx: AudioContext,
  frequency: number,
  type: OscillatorType,
  gainPeak: number,
  duration: number,
  startDelay = 0,
  fadeStart?: number,
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = type
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + startDelay)
  gain.gain.setValueAtTime(0, ctx.currentTime + startDelay)
  gain.gain.linearRampToValueAtTime(gainPeak, ctx.currentTime + startDelay + 0.01)
  const fadeAt = fadeStart ?? (ctx.currentTime + startDelay + duration - 0.05)
  gain.gain.setValueAtTime(gainPeak, fadeAt)
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startDelay + duration)
  osc.start(ctx.currentTime + startDelay)
  osc.stop(ctx.currentTime + startDelay + duration + 0.01)
}

// Soft two-note ding — info / success / normal
function playChime(ctx: AudioContext, gain = 0.18) {
  playTone(ctx, 880, 'sine', gain, 0.25, 0)
  playTone(ctx, 1108, 'sine', gain * 0.7, 0.2, 0.12)
}

// Warm single pop — payment / client
function playPop(ctx: AudioContext, gain = 0.22) {
  playTone(ctx, 660, 'sine', gain, 0.15, 0)
  playTone(ctx, 880, 'sine', gain * 0.5, 0.1, 0.08)
}

// Subtle alert — warning / high priority
function playAlert(ctx: AudioContext, gain = 0.2) {
  playTone(ctx, 440, 'triangle', gain, 0.12, 0)
  playTone(ctx, 440, 'triangle', gain, 0.12, 0.18)
}

// Urgent pulse — critical / error
function playUrgent(ctx: AudioContext, gain = 0.25) {
  playTone(ctx, 330, 'square', gain * 0.3, 0.08, 0)
  playTone(ctx, 440, 'square', gain * 0.3, 0.08, 0.12)
  playTone(ctx, 550, 'square', gain * 0.3, 0.08, 0.24)
}

export function playNotificationSound(
  variant: ToastVariant,
  priority: ToastPriority,
): void {
  const ctx = getCtx()
  if (!ctx || !window._trinityAudioUnlocked) return
  resume(ctx)

  if (priority === 'urgent' || variant === 'critical') {
    playUrgent(ctx)
    return
  }
  if (priority === 'high' || variant === 'warning' || variant === 'error') {
    playAlert(ctx)
    return
  }
  if (variant === 'payment' || variant === 'client') {
    playPop(ctx)
    return
  }
  // info, success, visit, task, system
  playChime(ctx)
}

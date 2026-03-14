'use client'

import { useEffect, useRef, useState } from 'react'

// ─── KiraFace — процедурное лицо на Canvas 2D ────────────────────────────────
// Вдохновлено: dribbble.com/shots/24507130
// Техника: Canvas 2D, procedural animation, mouse tracking, HSL gradients

interface KiraFaceProps {
  size?: number
  isThinking?: boolean
  mood?: 'idle' | 'happy' | 'thinking' | 'speaking'
}

export function KiraFace({ size = 200, isThinking = false, mood = 'idle' }: KiraFaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const timeRef = useRef(0)
  const mouseRef = useRef({ x: 0, y: 0 })
  const targetMouseRef = useRef({ x: 0, y: 0 })
  const blinkRef = useRef(1) // 1 = open, 0 = closed
  const blinkTimerRef = useRef(0)
  const moodRef = useRef(mood)
  const speakRef = useRef(0) // 0-1 mouth open

  useEffect(() => { moodRef.current = mood }, [mood])
  useEffect(() => {
    if (isThinking) moodRef.current = 'thinking'
  }, [isThinking])

  // Mouse tracking
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.closest('aside') || document.body

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      targetMouseRef.current = {
        x: (e.clientX - rect.left - size / 2) / (size / 2),
        y: (e.clientY - rect.top - size / 2) / (size / 2),
      }
    }
    const onLeave = () => { targetMouseRef.current = { x: 0, y: 0 } }
    parent.addEventListener('mousemove', onMove as any)
    parent.addEventListener('mouseleave', onLeave)
    return () => {
      parent.removeEventListener('mousemove', onMove as any)
      parent.removeEventListener('mouseleave', onLeave)
    }
  }, [size])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const S = size
    const cx = S / 2, cy = S / 2

    const draw = () => {
      timeRef.current += 0.016
      const t = timeRef.current

      // Smooth mouse follow
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.08
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.08

      // Blink logic
      blinkTimerRef.current += 0.016
      if (blinkTimerRef.current > 3 + Math.random() * 2) {
        blinkTimerRef.current = 0
        blinkRef.current = 0
        setTimeout(() => { blinkRef.current = 1 }, 150)
      }

      // Speak animation
      if (moodRef.current === 'speaking') {
        speakRef.current = 0.3 + Math.sin(t * 12) * 0.3
      } else {
        speakRef.current += (0 - speakRef.current) * 0.15
      }

      ctx.clearRect(0, 0, S, S)

      // ── 1. Outer glow ──
      const glowR = S * 0.52
      const glow = ctx.createRadialGradient(cx, cy, glowR * 0.4, cx, cy, glowR)
      const h = (260 + Math.sin(t * 0.3) * 30) % 360
      glow.addColorStop(0, `hsla(${h}, 80%, 65%, 0.18)`)
      glow.addColorStop(0.6, `hsla(${h + 40}, 70%, 55%, 0.08)`)
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, S, S)

      // ── 2. Face base — тёмный круг с градиентом ──
      const faceR = S * 0.38
      const faceGrad = ctx.createRadialGradient(
        cx - faceR * 0.2, cy - faceR * 0.2, faceR * 0.1,
        cx, cy, faceR
      )
      faceGrad.addColorStop(0, `hsla(${h + 20}, 30%, 22%, 1)`)
      faceGrad.addColorStop(0.6, `hsla(${h}, 25%, 14%, 1)`)
      faceGrad.addColorStop(1, `hsla(${h - 20}, 20%, 8%, 1)`)
      ctx.beginPath(); ctx.arc(cx, cy, faceR, 0, Math.PI * 2)
      ctx.fillStyle = faceGrad; ctx.fill()

      // ── 3. Face rim light ──
      const rimGrad = ctx.createRadialGradient(cx, cy, faceR * 0.85, cx, cy, faceR)
      rimGrad.addColorStop(0, 'transparent')
      rimGrad.addColorStop(1, `hsla(${h + 60}, 70%, 60%, 0.25)`)
      ctx.beginPath(); ctx.arc(cx, cy, faceR, 0, Math.PI * 2)
      ctx.fillStyle = rimGrad; ctx.fill()

      // ── 4. Eyes ──
      const eyeOffsetX = S * 0.11
      const eyeOffsetY = S * -0.05
      const eyeR = S * 0.075
      const eyePositions = [
        { x: cx - eyeOffsetX, y: cy + eyeOffsetY },
        { x: cx + eyeOffsetX, y: cy + eyeOffsetY },
      ]

      eyePositions.forEach((eye, i) => {
        // Eye socket
        const socketGrad = ctx.createRadialGradient(eye.x, eye.y, 0, eye.x, eye.y, eyeR * 1.3)
        socketGrad.addColorStop(0, `hsla(${h}, 60%, 8%, 0.9)`)
        socketGrad.addColorStop(1, 'transparent')
        ctx.beginPath(); ctx.arc(eye.x, eye.y, eyeR * 1.3, 0, Math.PI * 2)
        ctx.fillStyle = socketGrad; ctx.fill()

        // Iris — следит за мышью
        const lookX = mouseRef.current.x * eyeR * 0.35
        const lookY = mouseRef.current.y * eyeR * 0.35
        const irisX = eye.x + lookX
        const irisY = eye.y + lookY
        const irisR = eyeR * 0.8

        const irisGrad = ctx.createRadialGradient(irisX - irisR * 0.3, irisY - irisR * 0.3, irisR * 0.05, irisX, irisY, irisR)
        irisGrad.addColorStop(0, `hsla(${h + 20}, 90%, 75%, 1)`)
        irisGrad.addColorStop(0.4, `hsla(${h}, 80%, 55%, 1)`)
        irisGrad.addColorStop(1, `hsla(${h - 30}, 70%, 30%, 1)`)
        ctx.beginPath(); ctx.arc(irisX, irisY, irisR, 0, Math.PI * 2)
        ctx.fillStyle = irisGrad; ctx.fill()

        // Pupil
        const pupilX = irisX + lookX * 0.2
        const pupilY = irisY + lookY * 0.2
        const pupilR = irisR * (moodRef.current === 'thinking' ? 0.3 : 0.45)
        ctx.beginPath(); ctx.arc(pupilX, pupilY, pupilR, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fill()

        // Catchlight
        ctx.beginPath(); ctx.arc(irisX - irisR * 0.25, irisY - irisR * 0.25, irisR * 0.2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill()
        ctx.beginPath(); ctx.arc(irisX + irisR * 0.15, irisY + irisR * 0.3, irisR * 0.1, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill()

        // Blink — верхнее веко
        const blinkProgress = blinkRef.current
        if (blinkProgress < 1) {
          const lidH = eyeR * 1.1 * (1 - blinkProgress)
          ctx.beginPath()
          ctx.rect(eye.x - eyeR * 1.2, eye.y - eyeR * 1.1, eyeR * 2.4, lidH + eyeR * 0.1)
          ctx.fillStyle = `hsla(${h}, 25%, 14%, 1)`; ctx.fill()
        }
      })

      // ── 5. Нос — минималистичный ──
      const noseY = cy + S * 0.04
      const noseGrad = ctx.createRadialGradient(cx + S * 0.01, noseY, 0, cx, noseY + S * 0.02, S * 0.04)
      noseGrad.addColorStop(0, `hsla(${h}, 40%, 35%, 0.6)`)
      noseGrad.addColorStop(1, 'transparent')
      ctx.beginPath(); ctx.ellipse(cx, noseY, S * 0.025, S * 0.018, 0, 0, Math.PI * 2)
      ctx.fillStyle = noseGrad; ctx.fill()

      // ── 6. Рот с анимацией ──
      const mouthY = cy + S * 0.13
      const mouthW = S * 0.12
      const smileAmount = moodRef.current === 'happy' ? 0.8 : moodRef.current === 'thinking' ? -0.2 : 0.3 + Math.sin(t * 0.5) * 0.1
      const mouthOpen = speakRef.current

      ctx.save()
      ctx.beginPath()

      if (mouthOpen > 0.05) {
        // Open mouth — говорит
        ctx.ellipse(cx, mouthY + mouthW * 0.1, mouthW, mouthW * 0.3 * mouthOpen, 0, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${h - 30}, 40%, 8%, 0.9)`; ctx.fill()
        // Зубы
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.fillRect(cx - mouthW * 0.5, mouthY, mouthW, mouthW * 0.1 * mouthOpen)
      }

      // Линия рта / улыбка
      ctx.beginPath()
      ctx.moveTo(cx - mouthW, mouthY)
      ctx.bezierCurveTo(
        cx - mouthW * 0.5, mouthY + mouthW * smileAmount,
        cx + mouthW * 0.5, mouthY + mouthW * smileAmount,
        cx + mouthW, mouthY
      )
      ctx.strokeStyle = `hsla(${h + 30}, 60%, 60%, 0.7)`
      ctx.lineWidth = S * 0.014
      ctx.lineCap = 'round'
      ctx.stroke()
      ctx.restore()

      // ── 7. Брови — настроение ──
      const browY = cy - S * 0.16
      const browOffsetX = S * 0.09
      const browTilt = moodRef.current === 'thinking' ? 0.06 : moodRef.current === 'happy' ? -0.03 : 0
      ;[-1, 1].forEach(side => {
        const bx = cx + side * browOffsetX
        ctx.beginPath()
        ctx.moveTo(bx - S * 0.05 * side, browY + browTilt * S * side)
        ctx.lineTo(bx + S * 0.05 * side, browY - browTilt * S * side)
        ctx.strokeStyle = `hsla(${h + 40}, 60%, 70%, 0.6)`
        ctx.lineWidth = S * 0.012
        ctx.lineCap = 'round'
        ctx.stroke()
      })

      // ── 8. Thinking dots ──
      if (moodRef.current === 'thinking') {
        for (let i = 0; i < 3; i++) {
          const dotPhase = (t * 2 + i * 0.5) % (Math.PI * 2)
          const dotY = cy + faceR + S * 0.08 + Math.sin(dotPhase) * S * 0.015
          const alpha = 0.4 + Math.sin(dotPhase) * 0.4
          ctx.beginPath()
          ctx.arc(cx + (i - 1) * S * 0.06, dotY, S * 0.018, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${h}, 80%, 70%, ${alpha})`; ctx.fill()
        }
      }

      // ── 9. Частицы вокруг лица ──
      for (let i = 0; i < 6; i++) {
        const angle = (t * 0.4 + i * Math.PI / 3) + Math.sin(t * 0.8 + i) * 0.3
        const dist = faceR + S * 0.06 + Math.sin(t + i * 2) * S * 0.025
        const px = cx + Math.cos(angle) * dist
        const py = cy + Math.sin(angle) * dist
        const pr = S * 0.012 + Math.sin(t * 1.5 + i) * S * 0.006
        const alpha = 0.3 + Math.sin(t * 1.2 + i) * 0.2
        ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${(h + i * 30) % 360}, 80%, 70%, ${alpha})`; ctx.fill()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="block"
      style={{ imageRendering: 'auto' }}
    />
  )
}

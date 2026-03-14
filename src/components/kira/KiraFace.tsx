'use client'

import { useEffect, useRef } from 'react'

interface KiraFaceProps {
  size?: number
  mood?: 'idle' | 'happy' | 'thinking' | 'speaking'
}

export function KiraFace({ size = 180, mood = 'idle' }: KiraFaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const timeRef = useRef(0)
  const mouseRef = useRef({ x: 0, y: 0 })
  const targetRef = useRef({ x: 0, y: 0 })
  const moodRef = useRef(mood)

  useEffect(() => { moodRef.current = mood }, [mood])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const panel = canvas.closest('aside') || document.body
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      targetRef.current = {
        x: Math.max(-1, Math.min(1, (e.clientX - rect.left - size / 2) / (size / 2))),
        y: Math.max(-1, Math.min(1, (e.clientY - rect.top  - size / 2) / (size / 2))),
      }
    }
    const onLeave = () => { targetRef.current = { x: 0, y: 0 } }
    panel.addEventListener('mousemove', onMove as any)
    panel.addEventListener('mouseleave', onLeave)
    return () => {
      panel.removeEventListener('mousemove', onMove as any)
      panel.removeEventListener('mouseleave', onLeave)
    }
  }, [size])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const S = size, cx = S / 2, cy = S / 2
    const R = S * 0.34 // радиус шара

    const draw = () => {
      timeRef.current += 0.014
      const t = timeRef.current

      // Smooth mouse
      mouseRef.current.x += (targetRef.current.x - mouseRef.current.x) * 0.07
      mouseRef.current.y += (targetRef.current.y - mouseRef.current.y) * 0.07
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      ctx.clearRect(0, 0, S, S)

      // ── Внешние кольца свечения (как на dribbble) ──────────────────
      for (let i = 3; i >= 1; i--) {
        const ringR = R + S * 0.07 * i
        const alpha = 0.04 + Math.sin(t * 0.6 + i) * 0.015
        const grad = ctx.createRadialGradient(cx, cy, ringR - S * 0.025, cx, cy, ringR + S * 0.025)
        grad.addColorStop(0, `rgba(255, 220, 180, ${alpha * 1.5})`)
        grad.addColorStop(0.5, `rgba(255, 180, 120, ${alpha})`)
        grad.addColorStop(1, 'transparent')
        ctx.beginPath(); ctx.arc(cx, cy, ringR + S * 0.025, 0, Math.PI * 2)
        ctx.fillStyle = grad; ctx.fill()
      }

      // ── Основной шар — тёплый, светлый, как на картинке ───────────
      const orbGrad = ctx.createRadialGradient(
        cx - R * 0.3, cy - R * 0.35, R * 0.05,
        cx + R * 0.1, cy + R * 0.1, R * 1.15
      )
      orbGrad.addColorStop(0,   'rgba(255, 245, 235, 0.98)')
      orbGrad.addColorStop(0.25,'rgba(255, 225, 195, 0.96)')
      orbGrad.addColorStop(0.6, 'rgba(250, 195, 155, 0.92)')
      orbGrad.addColorStop(1,   'rgba(235, 160, 110, 0.85)')
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = orbGrad; ctx.fill()

      // ── Внутреннее тонкое кольцо (глубина шара) ───────────────────
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255, 200, 150, 0.3)'
      ctx.lineWidth = S * 0.008
      ctx.stroke()

      // ── Блик (highlight) ───────────────────────────────────────────
      const hlGrad = ctx.createRadialGradient(
        cx - R * 0.32, cy - R * 0.38, 0,
        cx - R * 0.2,  cy - R * 0.2,  R * 0.5
      )
      hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)')
      hlGrad.addColorStop(0.5,'rgba(255, 255, 255, 0.18)')
      hlGrad.addColorStop(1, 'transparent')
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = hlGrad; ctx.fill()

      // ── Мягкая тень снизу ─────────────────────────────────────────
      const shadowGrad = ctx.createRadialGradient(cx, cy + R * 0.2, R * 0.4, cx, cy, R)
      shadowGrad.addColorStop(0, 'transparent')
      shadowGrad.addColorStop(1, 'rgba(180, 100, 50, 0.18)')
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = shadowGrad; ctx.fill()

      // ── ГЛАЗА — два вертикальных прямоугольника (|| дэши) ─────────
      const eyeOffX = R * 0.28
      const eyeBaseY = cy + R * 0.05

      // Смещение взгляда за мышью
      const lookX = mx * R * 0.12
      const lookY = my * R * 0.08

      const eyeW = R * 0.13
      const eyeH = moodRef.current === 'happy'
        ? R * 0.10  // прищур при happy
        : R * 0.30

      ;[-1, 1].forEach((side) => {
        const ex = cx + side * eyeOffX + lookX
        const ey = eyeBaseY + lookY

        // Тень под глазом
        const eyeShadow = ctx.createRadialGradient(ex, ey, 0, ex, ey, eyeW * 2.5)
        eyeShadow.addColorStop(0, 'rgba(80, 40, 20, 0.25)')
        eyeShadow.addColorStop(1, 'transparent')
        ctx.fillStyle = eyeShadow
        ctx.fillRect(ex - eyeW * 1.5, ey - eyeH * 0.8, eyeW * 3, eyeH * 2.2)

        // Сам глаз — скруглённый прямоугольник, тёмный
        const radius = eyeW * 0.5
        ctx.beginPath()
        ctx.moveTo(ex - eyeW + radius, ey - eyeH / 2)
        ctx.arcTo(ex + eyeW, ey - eyeH / 2, ex + eyeW, ey + eyeH / 2, radius)
        ctx.arcTo(ex + eyeW, ey + eyeH / 2, ex - eyeW, ey + eyeH / 2, radius)
        ctx.arcTo(ex - eyeW, ey + eyeH / 2, ex - eyeW, ey - eyeH / 2, radius)
        ctx.arcTo(ex - eyeW, ey - eyeH / 2, ex + eyeW, ey - eyeH / 2, radius)
        ctx.closePath()
        ctx.fillStyle = 'rgba(55, 30, 15, 0.82)'
        ctx.fill()

        // Микро блик в глазу
        ctx.beginPath()
        ctx.arc(ex - eyeW * 0.3, ey - eyeH * 0.25, eyeW * 0.22, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.fill()
      })

      // ── Thinking dots ──────────────────────────────────────────────
      if (moodRef.current === 'thinking') {
        for (let i = 0; i < 3; i++) {
          const phase = (t * 2.5 + i * 0.6) % (Math.PI * 2)
          const dy = Math.sin(phase) * S * 0.012
          const alpha = 0.4 + Math.sin(phase) * 0.35
          ctx.beginPath()
          ctx.arc(cx + (i - 1) * S * 0.07, cy + R + S * 0.1 + dy, S * 0.016, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(200, 130, 80, ${alpha})`; ctx.fill()
        }
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [size])

  return <canvas ref={canvasRef} width={size} height={size} className="block" />
}

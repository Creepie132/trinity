'use client'

import { useRef, useEffect } from 'react'

interface KiraOrbProps {
  size?: number
  isThinking?: boolean
}

export default function KiraOrb({ size = 280, isThinking = false }: KiraOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const timeRef = useRef<number>(0)
  const speedRef = useRef<number>(1)

  useEffect(() => {
    speedRef.current = isThinking ? 3 : 1
  }, [isThinking])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      timeRef.current += 0.016 * speedRef.current
      const t = timeRef.current
      const s = canvas.width
      ctx.clearRect(0, 0, s, s)
      const cx = s / 2, cy = s / 2, r = s * 0.32

      const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.67, cx, cy, r * 1.44)
      glowGrad.addColorStop(0, `hsla(${280 + Math.sin(t * 0.5) * 30}, 80%, 70%, 0.15)`)
      glowGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = glowGrad
      ctx.fillRect(0, 0, s, s)

      const h1 = (280 + Math.sin(t * 0.4) * 40) % 360
      const h2 = (180 + Math.sin(t * 0.3) * 30) % 360
      const h3 = (320 + Math.cos(t * 0.5) * 40) % 360
      const orbGrad = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.33, r * 0.06, cx, cy, r)
      orbGrad.addColorStop(0, `hsla(${h1}, 90%, 85%, 0.95)`)
      orbGrad.addColorStop(0.4, `hsla(${h2}, 80%, 65%, 0.9)`)
      orbGrad.addColorStop(0.8, `hsla(${h3}, 70%, 50%, 0.85)`)
      orbGrad.addColorStop(1, `hsla(${h3}, 60%, 30%, 0.7)`)
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = orbGrad
      ctx.fill()

      for (let i = 0; i < 3; i++) {
        const wave = Math.sin(t * (1.5 + i * 0.5) + i * 2) * r * 0.17
        const wg = ctx.createRadialGradient(cx + wave, cy - r * 0.22 + wave * 0.5, 0, cx + wave, cy - r * 0.22 + wave * 0.5, r * 0.56 + i * r * 0.17)
        wg.addColorStop(0, `hsla(${200 + i * 40}, 100%, 95%, 0.15)`)
        wg.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fillStyle = wg
        ctx.fill()
      }

      const hlGrad = ctx.createRadialGradient(cx - r * 0.31, cy - r * 0.39, 0, cx - r * 0.22, cy - r * 0.28, r * 0.5)
      hlGrad.addColorStop(0, 'rgba(255,255,255,0.7)')
      hlGrad.addColorStop(0.5, 'rgba(255,255,255,0.2)')
      hlGrad.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = hlGrad
      ctx.fill()

      if (speedRef.current > 1.5) {
        const pulseR = r + r * 0.11 + Math.sin(t * 4) * r * 0.09
        ctx.beginPath()
        ctx.arc(cx, cy, pulseR, 0, Math.PI * 2)
        ctx.strokeStyle = `hsla(${h1}, 80%, 70%, ${0.3 + Math.sin(t * 4) * 0.2})`
        ctx.lineWidth = 2
        ctx.stroke()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  )
}

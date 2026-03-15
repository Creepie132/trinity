'use client'

import { useEffect, useRef } from 'react'

export type KiraWaveState = 'idle' | 'sale' | 'client' | 'thinking' | 'payment' | 'visit' | 'cancel'

const STATES: Record<KiraWaveState, { speed: number; amp: number; freq: number; color: [number,number,number]; bloom: number }> = {
  // Все цвета подобраны под фон #2a2d35 — тёплые, контрастные, без синего в idle
  idle:     { speed:0.45, amp:0.55, freq:5,  color:[0.85,0.85,0.95], bloom:1.5 }, // белёсо-серебристый, как hover
  sale:     { speed:2.50, amp:1.10, freq:12, color:[0.30,1.00,0.55], bloom:3.0 }, // яркий зелёный
  client:   { speed:1.80, amp:0.90, freq:8,  color:[1.00,0.70,0.20], bloom:2.5 }, // золотой янтарь
  thinking: { speed:0.60, amp:0.50, freq:3,  color:[0.70,0.75,1.00], bloom:1.8 }, // мягкий лавандовый
  payment:  { speed:3.00, amp:1.30, freq:15, color:[0.75,0.35,1.00], bloom:3.5 }, // фиолетовый взрыв
  visit:    { speed:1.20, amp:0.70, freq:7,  color:[0.30,0.95,0.85], bloom:2.2 }, // мятный циан
  cancel:   { speed:0.25, amp:0.20, freq:2,  color:[0.50,0.50,0.55], bloom:0.6 }, // тускло-серый
}

interface KiraWaveProps {
  state?: KiraWaveState
  width?: number
  height?: number
}

export function KiraWave({ state = 'idle', width = 240, height = 80 }: KiraWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef(state)
  const animRef  = useRef<number>(0)

  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const BAR_COUNT = 80
    const BAR_W = 2

    let t = 0
    let mouseNorm = -1  // -1 = нет мыши
    let isHovering = false

    // Текущие и предыдущие параметры для плавного перехода
    let currS = { ...STATES[stateRef.current] }
    let prevS = { ...currS }
    let blend = 1.0
    let lastState = stateRef.current

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseNorm = (e.clientX - rect.left) / rect.width
      isHovering = true
    }
    const onLeave = () => { isHovering = false; mouseNorm = -1 }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)

    function lerp(a: number, b: number, f: number) { return a + (b - a) * f }
    function ease(x: number) { return x < 0.5 ? 2*x*x : 1 - Math.pow(-2*x+2, 2)/2 }

    const draw = () => {
      animRef.current = requestAnimationFrame(draw)
      t += 0.016

      // Смена состояния
      if (stateRef.current !== lastState) {
        prevS = { ...currS }
        currS = { ...STATES[stateRef.current] }
        blend = 0
        lastState = stateRef.current
      }
      blend = Math.min(1, blend + 0.04)
      const e = ease(blend)

      const speed = lerp(prevS.speed, currS.speed, e)
      const amp   = lerp(prevS.amp,   currS.amp,   e)
      const freq  = lerp(prevS.freq,  currS.freq,  e)
      const cr = lerp(prevS.color[0], currS.color[0], e)
      const cg = lerp(prevS.color[1], currS.color[1], e)
      const cb = lerp(prevS.color[2], currS.color[2], e)

      ctx.clearRect(0, 0, W, H)

      // Центральная линия
      ctx.beginPath()
      ctx.moveTo(0, H/2); ctx.lineTo(W, H/2)
      ctx.strokeStyle = `rgba(${Math.round(cr*80)},${Math.round(cg*80)},${Math.round(cb*100)},0.25)`
      ctx.lineWidth = 1; ctx.stroke()

      for (let i = 0; i < BAR_COUNT; i++) {
        const norm = i / BAR_COUNT
        const x = norm * W
        const env = Math.sin(norm * Math.PI)

        const w1 = Math.sin(norm * Math.PI * freq - t * speed) * 0.55
        const w2 = Math.sin(norm * Math.PI * freq * 2.1 - t * speed * 1.4) * 0.28
        const w3 = Math.sin(norm * Math.PI * freq * 0.5 - t * speed * 0.7) * 0.17
        let combined = (w1 + w2 + w3) * env * amp

        // Hover ripple
        let hoverBoost = 0
        if (isHovering && mouseNorm >= 0) {
          const dist = Math.abs(norm - mouseNorm)
          const ripple = Math.sin(dist * Math.PI * 20 - t * 8) * Math.exp(-dist * 6) * 0.5
          const peak   = Math.exp(-dist * dist * 40) * 0.8
          hoverBoost = peak + ripple
        }

        const h = Math.max(2, (Math.abs(combined) + hoverBoost) * (H * 0.42))
        const bright = 0.45 + (h / (H * 0.42)) * 0.55

        // Hover glow
        const distMouse = isHovering ? Math.abs(norm - mouseNorm) : 1
        const mouseGlow = isHovering ? Math.exp(-distMouse * distMouse * 30) * 0.5 : 0

        const r = Math.min(255, Math.round((cr * bright + mouseGlow) * 255))
        const g = Math.min(255, Math.round((cg * bright + mouseGlow * 0.9) * 255))
        const b = Math.min(255, Math.round((cb * bright + mouseGlow * 0.4) * 255))
        const a = Math.min(1, 0.65 + bright * 0.35 + mouseGlow)

        // Bloom — размытое свечение
        const grd = ctx.createLinearGradient(x, H/2 - h*1.5, x, H/2 + h*1.5)
        grd.addColorStop(0, `rgba(${r},${g},${b},0)`)
        grd.addColorStop(0.4, `rgba(${r},${g},${b},${a * 0.3})`)
        grd.addColorStop(0.5, `rgba(${r},${g},${b},${a})`)
        grd.addColorStop(0.6, `rgba(${r},${g},${b},${a * 0.3})`)
        grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.fillStyle = grd
        ctx.fillRect(x - BAR_W/2, H/2 - h, BAR_W, h * 2)
      }
    }

    draw()
    return () => {
      cancelAnimationFrame(animRef.current)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block', cursor: 'crosshair' }}
    />
  )
}

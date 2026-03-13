'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'kira_hal_position'
const DEFAULT_POS = { x: 24, y: 24 } // bottom-right offset handled via CSS

export default function KiraHAL() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const timeRef = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Position state — loaded from localStorage
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const posRef = useRef(DEFAULT_POS)

  // Load saved position
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        posRef.current = parsed
        setPos(parsed)
      } else {
        // Default: bottom-right corner
        const defaultPos = {
          x: window.innerWidth - 88,
          y: window.innerHeight - 88,
        }
        posRef.current = defaultPos
        setPos(defaultPos)
      }
    } catch {
      setPos({ x: window.innerWidth - 88, y: window.innerHeight - 88 })
    }
  }, [])

  // Save position to localStorage
  const savePos = useCallback((p: { x: number; y: number }) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch {}
  }, [])

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    setDragging(true)
  }, [])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    dragOffset.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    setDragging(true)
  }, [])

  useEffect(() => {
    if (!dragging) return

    const onMove = (e: MouseEvent) => {
      const newPos = {
        x: Math.max(0, Math.min(window.innerWidth - 72, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 72, e.clientY - dragOffset.current.y)),
      }
      posRef.current = newPos
      setPos({ ...newPos })
    }

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      const newPos = {
        x: Math.max(0, Math.min(window.innerWidth - 72, touch.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 72, touch.clientY - dragOffset.current.y)),
      }
      posRef.current = newPos
      setPos({ ...newPos })
    }

    const onUp = () => {
      setDragging(false)
      savePos(posRef.current)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [dragging, savePos])

  // Canvas HAL 9000 animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const S = 72 // canvas size
    const cx = S / 2, cy = S / 2

    const draw = () => {
      timeRef.current += 0.016
      const t = timeRef.current
      ctx.clearRect(0, 0, S, S)

      // ── Outer dark shell ──────────────────────────────────────────
      const shellGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 36)
      shellGrad.addColorStop(0, '#1a1a1a')
      shellGrad.addColorStop(0.7, '#0d0d0d')
      shellGrad.addColorStop(1, '#050505')
      ctx.beginPath()
      ctx.arc(cx, cy, 34, 0, Math.PI * 2)
      ctx.fillStyle = shellGrad
      ctx.fill()

      // ── Outer ring — silver chrome ────────────────────────────────
      ctx.beginPath()
      ctx.arc(cx, cy, 34, 0, Math.PI * 2)
      ctx.strokeStyle = '#555'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // ── Inner rings — concentric chrome circles ───────────────────
      for (let i = 0; i < 3; i++) {
        const ringR = 26 - i * 5
        const alpha = 0.15 + i * 0.08 + Math.sin(t * 0.8 + i) * 0.04
        ctx.beginPath()
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(180,180,180,${alpha})`
        ctx.lineWidth = 0.8
        ctx.stroke()
      }

      // ── Red glow behind eye ───────────────────────────────────────
      const pulse = 0.5 + Math.sin(t * 1.2) * 0.15
      const glowR = ctx.createRadialGradient(cx, cy, 0, cx, cy, 22)
      glowR.addColorStop(0, `rgba(255,30,0,${0.6 * pulse})`)
      glowR.addColorStop(0.5, `rgba(200,0,0,${0.3 * pulse})`)
      glowR.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(cx, cy, 22, 0, Math.PI * 2)
      ctx.fillStyle = glowR
      ctx.fill()

      // ── Red eye lens ──────────────────────────────────────────────
      const eyeGrad = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 13)
      eyeGrad.addColorStop(0, `rgba(255,120,80,${0.9 + Math.sin(t * 2) * 0.05})`)
      eyeGrad.addColorStop(0.3, `rgba(220,20,0,0.95)`)
      eyeGrad.addColorStop(0.7, `rgba(160,0,0,0.9)`)
      eyeGrad.addColorStop(1, `rgba(80,0,0,0.85)`)
      ctx.beginPath()
      ctx.arc(cx, cy, 13, 0, Math.PI * 2)
      ctx.fillStyle = eyeGrad
      ctx.fill()

      // ── Iris ring ─────────────────────────────────────────────────
      ctx.beginPath()
      ctx.arc(cx, cy, 13, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255,60,20,${0.6 + Math.sin(t * 1.5) * 0.15})`
      ctx.lineWidth = 1
      ctx.stroke()

      // ── Pupil (dark center) ───────────────────────────────────────
      const pupilGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 5)
      pupilGrad.addColorStop(0, 'rgba(0,0,0,0.95)')
      pupilGrad.addColorStop(1, 'rgba(40,0,0,0.6)')
      ctx.beginPath()
      ctx.arc(cx, cy, 5, 0, Math.PI * 2)
      ctx.fillStyle = pupilGrad
      ctx.fill()

      // ── Specular highlight (top-left glint) ───────────────────────
      const hlGrad = ctx.createRadialGradient(cx - 4, cy - 4, 0, cx - 4, cy - 4, 6)
      hlGrad.addColorStop(0, `rgba(255,200,180,${0.5 + Math.sin(t * 1.8) * 0.1})`)
      hlGrad.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(cx, cy, 13, 0, Math.PI * 2)
      ctx.fillStyle = hlGrad
      ctx.fill()

      // ── Outer red pulse ring (breathing) ─────────────────────────
      const pulseR2 = 34 + Math.sin(t * 1.2) * 3
      const pulseAlpha = 0.12 + Math.sin(t * 1.2) * 0.08
      ctx.beginPath()
      ctx.arc(cx, cy, pulseR2, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255,0,0,${pulseAlpha})`
      ctx.lineWidth = 2
      ctx.stroke()

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  if (!pos) return null

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        filter: 'drop-shadow(0 0 8px rgba(255,0,0,0.4))',
        transition: dragging ? 'none' : 'filter 0.3s',
      }}
    >
      <canvas
        ref={canvasRef}
        width={72}
        height={72}
        style={{ width: 72, height: 72, display: 'block', borderRadius: '50%' }}
      />
    </div>
  )
}

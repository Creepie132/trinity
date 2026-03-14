'use client'

import { useRef, useCallback, useEffect } from 'react'

/**
 * useDraggableDialog — drag-to-move для Modal.tsx
 * Фиксы:
 * - Окно "захватывается" в точке клика (не прыгает к курсору)
 * - Окно никогда не уходит выше видимой области (minY ≥ -vh/2 + halfH + 8)
 * - Граница строго по экрану со всех сторон
 */
export function useDraggableDialog() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const handleRef = useRef<HTMLDivElement | null>(null)

  const state = useRef({
    dragging: false,
    // Смещение от центра viewport (то что в translate)
    currentX: 0,
    currentY: 0,
    // Позиция курсора при mousedown
    mouseStartX: 0,
    mouseStartY: 0,
    // Смещение окна при mousedown
    dragStartX: 0,
    dragStartY: 0,
  })

  const clamp = useCallback((dx: number, dy: number, W: number, H: number): [number, number] => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const halfW = W / 2
    const halfH = H / 2
    const pad = 8

    // Центр окна: vw/2 + dx, vh/2 + dy
    // Левый край: vw/2 + dx - halfW ≥ pad  → dx ≥ halfW + pad - vw/2
    // Правый край: vw/2 + dx + halfW ≤ vw - pad → dx ≤ vw/2 - halfW - pad
    // Верхний край: vh/2 + dy - halfH ≥ pad → dy ≥ halfH + pad - vh/2
    // Нижний край: vh/2 + dy + halfH ≤ vh - pad → dy ≤ vh/2 - halfH - pad
    const minX = halfW + pad - vw / 2
    const maxX = vw / 2 - halfW - pad
    const minY = halfH + pad - vh / 2   // НИКОГДА выше экрана
    const maxY = vh / 2 - halfH - pad

    return [
      Math.min(maxX, Math.max(minX, dx)),
      Math.min(maxY, Math.max(minY, dy)),
    ]
  }, [])

  const onMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('a')) return
    if (!containerRef.current) return

    const s = state.current
    s.dragging = true
    // Запоминаем позицию курсора и текущее смещение окна
    s.mouseStartX = e.clientX
    s.mouseStartY = e.clientY
    s.dragStartX = s.currentX
    s.dragStartY = s.currentY

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
    e.preventDefault()
  }, [])

  const onMouseMove = useCallback((e: MouseEvent) => {
    const s = state.current
    if (!s.dragging || !containerRef.current) return

    // Новое смещение = начальное смещение + дельта курсора
    const rawX = s.dragStartX + (e.clientX - s.mouseStartX)
    const rawY = s.dragStartY + (e.clientY - s.mouseStartY)

    const W = containerRef.current.offsetWidth
    const H = containerRef.current.offsetHeight

    const [cx, cy] = clamp(rawX, rawY, W, H)
    s.currentX = cx
    s.currentY = cy

    containerRef.current.style.transform =
      `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px))`
  }, [clamp])

  const onMouseUp = useCallback(() => {
    state.current.dragging = false
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  }, [])

  useEffect(() => {
    const handle = handleRef.current
    if (!handle) return

    handle.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      handle.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseDown, onMouseMove, onMouseUp])

  const resetPosition = useCallback(() => {
    state.current.currentX = 0
    state.current.currentY = 0
    if (containerRef.current) {
      containerRef.current.style.transform = ''
    }
  }, [])

  // Возвращает текущую позицию (для pin)
  const getCurrentPosition = useCallback(() => ({
    x: state.current.currentX,
    y: state.current.currentY,
  }), [])

  return { containerRef, handleRef, resetPosition, getCurrentPosition }
}

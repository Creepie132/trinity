'use client'

import { useRef, useCallback, useEffect } from 'react'

/**
 * useDraggableDialog — drag-to-move для Modal.tsx (кастомный компонент).
 * Работает через прямые ref на div контейнер и div хэндл.
 * На мобильных устройствах не активируется (touch-only).
 */
export function useDraggableDialog() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const handleRef = useRef<HTMLDivElement | null>(null)

  const state = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  })

  const onMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('a')) return

    const s = state.current
    s.dragging = true
    s.startX = e.clientX - s.currentX
    s.startY = e.clientY - s.currentY
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
    e.preventDefault()
  }, [])

  const onMouseMove = useCallback((e: MouseEvent) => {
    const s = state.current
    if (!s.dragging || !containerRef.current) return

    const dx = e.clientX - s.startX
    const dy = e.clientY - s.startY

    // Используем offsetWidth/Height — они не меняются в процессе drag (в отличие от getBoundingClientRect)
    const W = containerRef.current.offsetWidth
    const H = containerRef.current.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Центр окна в px от центра viewport: translate(calc(-50% + X), calc(-50% + Y))
    // Центр viewport = vw/2, vh/2. Левый край окна = vw/2 + dx - W/2.
    // Ограничиваем: левый край >= 8px, правый край <= vw - 8px, верх >= 8px, низ <= vh - 8px
    const halfW = W / 2
    const halfH = H / 2
    const minX = -(vw / 2 - halfW - 8)  // левый край = vw/2 + minX - halfW = 8 → minX = halfW + 8 - vw/2
    const maxX = vw / 2 - halfW - 8     // правый край = vw/2 + maxX + halfW = vw - 8 → maxX = vw/2 - halfW - 8
    const minY = -(vh / 2 - halfH - 8)
    const maxY = vh / 2 - halfH - 8

    s.currentX = Math.min(maxX, Math.max(minX, dx))
    s.currentY = Math.min(maxY, Math.max(minY, dy))

    containerRef.current.style.transform =
      `translate(calc(-50% + ${s.currentX}px), calc(-50% + ${s.currentY}px))`
  }, [])

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
      containerRef.current.style.transform = 'translate(-50%, -50%)'
    }
  }, [])

  return { containerRef, handleRef, resetPosition }
}

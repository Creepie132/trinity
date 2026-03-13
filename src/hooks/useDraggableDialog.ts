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

    const rect = containerRef.current.getBoundingClientRect()
    const maxX = window.innerWidth - rect.width / 2
    const minX = -(rect.width / 2)
    const maxY = window.innerHeight - 40
    const minY = -(rect.height / 2) + 40

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

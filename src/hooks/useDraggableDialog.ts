'use client'

import { useRef, useCallback, useEffect } from 'react'

/**
 * useDraggableDialog — drag-to-move для модальных окон на десктопе.
 * Возвращает ref для контейнера и ref для drag-handle (заголовок).
 * На мобильных (touch-only) — не активируется.
 */
export function useDraggableDialog() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const handleRef = useRef<HTMLDivElement | null>(null)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const currentX = useRef(0)
  const currentY = useRef(0)

  const onMouseDown = useCallback((e: MouseEvent) => {
    // Только левая кнопка мыши, не на кнопках/input внутри хедера
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input')) return

    dragging.current = true
    startX.current = e.clientX - currentX.current
    startY.current = e.clientY - currentY.current
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
  }, [])

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current || !containerRef.current) return

    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current

    // Ограничиваем чтобы окно не уходило за экран
    const rect = containerRef.current.getBoundingClientRect()
    const maxX = window.innerWidth - rect.width / 2
    const minX = -rect.width / 2
    const maxY = window.innerHeight - 40
    const minY = -(rect.height / 2) + 40

    currentX.current = Math.min(maxX, Math.max(minX, dx))
    currentY.current = Math.min(maxY, Math.max(minY, dy))

    containerRef.current.style.transform =
      `translate(calc(-50% + ${currentX.current}px), calc(-50% + ${currentY.current}px))`
  }, [])

  const onMouseUp = useCallback(() => {
    dragging.current = false
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

  // Сброс позиции при закрытии (вызывается из onOpenChange)
  const resetPosition = useCallback(() => {
    currentX.current = 0
    currentY.current = 0
    if (containerRef.current) {
      containerRef.current.style.transform = 'translate(-50%, -50%)'
    }
  }, [])

  return { containerRef, handleRef, resetPosition }
}

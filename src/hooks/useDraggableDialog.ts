'use client'

import { useRef, useCallback, useEffect } from 'react'

/**
 * useDraggableDialog v3
 *
 * Архитектура: модалка позиционируется через position:fixed + left:50% + top:50% + transform:translate(-50%,-50%).
 * При drag мы меняем left и top напрямую (в px от левого/верхнего края viewport).
 * Это исключает конфликт между flexbox-центрированием и transform-смещением.
 *
 * Границы: окно никогда не выходит за viewport (8px отступ со всех сторон).
 * Захват: курсор захватывает окно в точке клика — окно не прыгает.
 */
export function useDraggableDialog() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const handleRef = useRef<HTMLDivElement | null>(null)

  const state = useRef({
    dragging: false,
    // Текущий left и top окна (px от левого/верхнего края viewport)
    currentLeft: 0,
    currentTop: 0,
    // Позиция курсора в момент mousedown
    mouseStartX: 0,
    mouseStartY: 0,
    // left и top окна в момент mousedown
    leftAtDragStart: 0,
    topAtDragStart: 0,
    // Инициализированы ли координаты
    initialized: false,
  })

  // Вычисляет реальный left/top из текущего стиля (учитывает transform translate(-50%,-50%))
  const getActualPosition = useCallback((): { left: number; top: number } => {
    const el = containerRef.current
    if (!el) return { left: window.innerWidth / 2, top: window.innerHeight / 2 }
    const rect = el.getBoundingClientRect()
    // rect.left и rect.top — левый и верхний края окна в viewport
    // Нам нужен center: rect.left + rect.width/2 = left, rect.top + rect.height/2 = top
    return {
      left: rect.left + rect.width / 2,
      top: rect.top + rect.height / 2,
    }
  }, [])

  const clampPosition = useCallback((left: number, top: number): { left: number; top: number } => {
    const el = containerRef.current
    if (!el) return { left, top }
    const W = el.offsetWidth
    const H = el.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8

    // left — это центр окна по горизонтали
    // Левый край: left - W/2 >= pad → left >= W/2 + pad
    // Правый край: left + W/2 <= vw - pad → left <= vw - W/2 - pad
    // Верхний край: top - H/2 >= pad → top >= H/2 + pad
    // Нижний край: top + H/2 <= vh - pad → top <= vh - H/2 - pad
    const minLeft = W / 2 + pad
    const maxLeft = vw - W / 2 - pad
    const minTop = H / 2 + pad
    const maxTop = vh - H / 2 - pad

    return {
      left: Math.min(maxLeft, Math.max(minLeft, left)),
      top: Math.min(maxTop, Math.max(minTop, top)),
    }
  }, [])

  const applyPosition = useCallback((left: number, top: number) => {
    const el = containerRef.current
    if (!el) return
    el.style.left = `${left}px`
    el.style.top = `${top}px`
    el.style.transform = 'translate(-50%, -50%)'
    state.current.currentLeft = left
    state.current.currentTop = top
  }, [])

  const onMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('a')) return
    if (!containerRef.current) return

    const s = state.current

    // При первом drag — инициализируем текущую позицию из реального положения элемента
    if (!s.initialized) {
      const pos = getActualPosition()
      s.currentLeft = pos.left
      s.currentTop = pos.top
      s.initialized = true
    }

    s.dragging = true
    s.mouseStartX = e.clientX
    s.mouseStartY = e.clientY
    s.leftAtDragStart = s.currentLeft
    s.topAtDragStart = s.currentTop

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
    e.preventDefault()
  }, [getActualPosition])

  const onMouseMove = useCallback((e: MouseEvent) => {
    const s = state.current
    if (!s.dragging || !containerRef.current) return

    const rawLeft = s.leftAtDragStart + (e.clientX - s.mouseStartX)
    const rawTop = s.topAtDragStart + (e.clientY - s.mouseStartY)

    const { left, top } = clampPosition(rawLeft, rawTop)
    applyPosition(left, top)
  }, [clampPosition, applyPosition])

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
    const s = state.current
    s.currentLeft = 0
    s.currentTop = 0
    s.initialized = false
    const el = containerRef.current
    if (el) {
      el.style.left = '50%'
      el.style.top = '50%'
      el.style.transform = 'translate(-50%, -50%)'
    }
  }, [])

  // Возвращает смещение от центра viewport (для совместимости с pin store)
  const getCurrentPosition = useCallback(() => {
    const s = state.current
    if (!s.initialized) return { x: 0, y: 0 }
    return {
      x: s.currentLeft - window.innerWidth / 2,
      y: s.currentTop - window.innerHeight / 2,
    }
  }, [])

  return { containerRef, handleRef, resetPosition, getCurrentPosition }
}

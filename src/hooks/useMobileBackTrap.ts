'use client'

/**
 * useMobileBackTrap — универсальный хук перехвата кнопки "Назад".
 *
 * Применяется к ЛЮБОМУ открытому слою UI: модалка, шторка, свайп-действие,
 * drawer, picker — всему что имеет boolean open-стейт и функцию закрытия.
 *
 * Использование:
 *
 *   // В TrinityModalShell, ModalBottomSheet, TrinityMob:
 *   useMobileBackTrap(open, onClose)
 *
 *   // Для локального стейта (свайп карточки):
 *   useMobileBackTrap(swipeX !== 0, () => setSwipeX(0))
 *
 *   // Для шторки клиента:
 *   useMobileBackTrap(sheetOpen, () => setSheetOpen(false))
 *
 * Поведение:
 *   - isOpen true  → регистрируем слой в useUIStackStore (pushState в историю)
 *   - isOpen false → снимаем слой (history.back() для синхронизации)
 *   - Нажатие "Назад" → useUIStackStore._handlePopState() → closeFn()
 *
 * Ограничение: работает ТОЛЬКО на мобильных (<768px).
 * На десктопе хук не активен — там кнопка "Назад" нативная и не нужна.
 */

import { useEffect, useId, useRef } from 'react'
import { useUIStackStore } from '@/store/useUIStackStore'

export function useMobileBackTrap(
  isOpen: boolean,
  closeFn: () => void,
) {
  // useId генерирует стабильный уникальный ID для этого экземпляра хука
  const reactId = useId()
  // Делаем ID более читаемым (убираем двоеточия React)
  const id = reactId.replace(/:/g, '_')

  const { registerLayer, unregisterLayer } = useUIStackStore()

  // Храним актуальную closeFn в ref чтобы не перерегистрировать слой
  // при каждом рендере (closeFn часто пересоздаётся родителем)
  const closeFnRef = useRef(closeFn)
  useEffect(() => {
    closeFnRef.current = closeFn
  }, [closeFn])

  // Проверяем мобильный viewport (только там перехватываем "Назад")
  // SSR-safe: window доступен только на клиенте
  const isMobile = typeof window !== 'undefined'
    ? window.matchMedia('(max-width: 767px)').matches
    : false

  useEffect(() => {
    // Не активен на десктопе
    if (!isMobile) return

    if (isOpen) {
      // Регистрируем слой — стор сам сделает pushState
      registerLayer(id, () => {
        // Вызываем актуальную closeFn через ref
        closeFnRef.current()
      })
    } else {
      // Слой закрылся — снимаем регистрацию (стор сделает history.back())
      unregisterLayer(id)
    }

    // Cleanup при анмаунте: если компонент уничтожается пока открыт —
    // снимаем слой чтобы не оставлять "мёртвые" записи в стеке
    return () => {
      // При анмаунте передаём skipHistoryBack=true если isOpen=false
      // (history.back уже был вызван выше при переходе isOpen: true → false)
      // При анмаунте пока isOpen=true — нужно убрать синтетическую запись
      if (isOpen) {
        unregisterLayer(id, { skipHistoryBack: false })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, id, isMobile])
}

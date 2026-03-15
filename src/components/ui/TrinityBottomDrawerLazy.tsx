/**
 * TrinityBottomDrawerLazy — drop-in замена TrinityBottomDrawer.
 * framer-motion (~150KB) грузится только когда drawer реально нужен.
 * Используй этот компонент везде вместо прямого импорта TrinityBottomDrawer.
 */
'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type { TrinityBottomDrawer as TrinityBottomDrawerType } from './TrinityBottomDrawer'

const TrinityBottomDrawerInner = dynamic(
  () => import('./TrinityBottomDrawer').then(m => ({ default: m.TrinityBottomDrawer })),
  { ssr: false }
)

type Props = ComponentProps<typeof TrinityBottomDrawerType>

export function TrinityBottomDrawer(props: Props) {
  // Не рендерим ничего пока drawer закрыт — не грузим framer-motion
  if (!props.isOpen) return null
  return <TrinityBottomDrawerInner {...props} />
}

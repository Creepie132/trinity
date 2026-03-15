/**
 * BarcodeScannerLazy — drop-in замена BarcodeScanner.
 * @zxing/library (~300KB) грузится только при открытии сканера.
 */
'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type { BarcodeScanner as BarcodeScannerType } from './BarcodeScanner'

const BarcodeScannerInner = dynamic(
  () => import('./BarcodeScanner').then(m => ({ default: m.BarcodeScanner })),
  { ssr: false }
)

type Props = ComponentProps<typeof BarcodeScannerType>

export function BarcodeScanner(props: Props) {
  // Не грузим @zxing пока сканер закрыт
  if (!props.open) return null
  return <BarcodeScannerInner {...props} />
}

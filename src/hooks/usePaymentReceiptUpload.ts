'use client'

/**
 * usePaymentReceiptUpload — загрузка фото чеков и квитанций в Supabase.
 *
 * Клиентская компрессия через browser-image-compression (до 1MB, max 1920px).
 * Загрузка через /api/payments/upload-receipt (Zero Trust, orgId на сервере).
 */

import { useState, useCallback } from 'react'
import imageCompression from 'browser-image-compression'

export interface UploadedFile {
  url: string
  path: string
  originalName: string
}

interface UploadOptions {
  paymentId?: string
  slot: string // 'front' | 'back' | 'receipt' | 'check_N_front' etc.
}

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,           // Максимум 1MB после сжатия
  maxWidthOrHeight: 1920, // Сохраняем читаемость документа
  useWebWorker: true,
  fileType: 'image/jpeg',
}

export function usePaymentReceiptUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadFile = useCallback(async (
    file: File,
    options: UploadOptions,
  ): Promise<UploadedFile | null> => {
    setError(null)
    setUploading(true)

    try {
      // 1. Компрессия на клиенте
      let compressed: File
      if (file.size > 1 * 1024 * 1024) {
        compressed = await imageCompression(file, COMPRESSION_OPTIONS) as File
      } else {
        compressed = file
      }

      // 2. Отправка через API route
      const fd = new FormData()
      fd.append('file', compressed, file.name)
      fd.append('slot', options.slot)
      if (options.paymentId) fd.append('payment_id', options.paymentId)

      const res = await fetch('/api/payments/upload-receipt', {
        method: 'POST',
        body: fd,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }

      const data: { url: string; path: string } = await res.json()
      return { url: data.url, path: data.path, originalName: file.name }

    } catch (e: any) {
      const msg = e?.message ?? 'Upload error'
      setError(msg)
      return null
    } finally {
      setUploading(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { uploadFile, uploading, error, clearError }
}

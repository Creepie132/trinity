'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/input'
import { Camera, SwitchCamera, Keyboard } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface BarcodeScannerProps {
  open: boolean
  onClose: () => void
  onScan: (barcode: string) => void
}

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const { t } = useLanguage()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string>('')
  const [manualEntry, setManualEntry] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)

  useEffect(() => {
    if (open) {
      setManualEntry(false)
      setError('')
    }
  }, [open])

  // USB Scanner Detection
  useEffect(() => {
    if (!open) return

    let buffer = ''
    let timeout: NodeJS.Timeout

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      clearTimeout(timeout)
      timeout = setTimeout(() => { buffer = '' }, 100)

      if (e.key === 'Enter' && buffer.length >= 8) {
        onScan(buffer)
        onClose()
        buffer = ''
      } else if (e.key.length === 1) {
        buffer += e.key
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(timeout)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onScan, onClose])

  // Camera Scanning
  useEffect(() => {
    if (!open || manualEntry) return

    const initScanner = async () => {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName })
        if (permissionStatus.state === 'denied') {
          setError('לא ניתן לגשת למצלמה. אנא אפשר גישה בהגדרות הדפדפן.')
          setManualEntry(true)
          return
        }
      } catch {}

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { ideal: 'environment' } } 
        })
        stream.getTracks().forEach(track => track.stop())

        const videoDevices = await navigator.mediaDevices.enumerateDevices()
        const cameras = videoDevices.filter((device) => device.kind === 'videoinput')
        setDevices(cameras)

        if (cameras.length === 0) {
          setError(t('inventory.scanner.cameraError'))
          setManualEntry(true)
          return
        }

        const codeReader = new BrowserMultiFormatReader()
        codeReaderRef.current = codeReader

        const selectedDevice = cameras[currentDeviceIndex] || cameras[0]

        await codeReader.decodeFromVideoDevice(
          selectedDevice.deviceId,
          videoRef.current!,
          (result, error) => {
            if (result) {
              onScan(result.getText())
              onClose()
            }
            if (error && !(error instanceof NotFoundException)) {
              console.error('Scanner error:', error)
            }
          }
        )
      } catch (err: any) {
        let errorMessage = t('inventory.scanner.cameraError')
        
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'אישור גישה למצלמה נדרש. אנא אשר גישה בהגדרות הדפדפן.'
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'לא נמצאה מצלמה במכשיר זה.'
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'המצלמה בשימוש על ידי אפליקציה אחרת.'
        }
        
        setError(errorMessage)
        setManualEntry(true)
      }
    }

    initScanner()
    return () => { codeReaderRef.current?.reset() }
  }, [open, manualEntry, currentDeviceIndex, onScan, onClose, t])

  const handleSwitchCamera = () => {
    if (devices.length > 1) setCurrentDeviceIndex((prev) => (prev + 1) % devices.length)
  }

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim())
      onClose()
      setManualBarcode('')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('inventory.scanner.title')}
      width="440px"
    >
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-400 mb-4">
          {error}
        </div>
      )}

      {!manualEntry ? (
        <div className="space-y-4">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline />
          </div>

          <div className="flex gap-2">
            {devices.length > 1 && (
              <button
                onClick={handleSwitchCamera}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <SwitchCamera className="w-4 h-4" />
                {t('inventory.scanner.switchCamera')}
              </button>
            )}
            <button
              onClick={() => setManualEntry(true)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <Keyboard className="w-4 h-4" />
              {t('inventory.scanner.manualEntry')}
            </button>
          </div>

          <p className="text-xs text-center text-gray-500">
            {t('inventory.scanner.placeBarcode') || 'Поместите штрих-код в рамку камеры'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            placeholder={t('inventory.barcode')}
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit() }}
            autoFocus
          />

          <div className="flex gap-2">
            <button
              onClick={handleManualSubmit}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              {t('common.save')}
            </button>
            {devices.length > 0 && (
              <button
                onClick={() => { setManualEntry(false); setError('') }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                {t('inventory.scanner.title')}
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

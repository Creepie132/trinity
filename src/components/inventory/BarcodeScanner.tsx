'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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

  // USB Scanner Detection
  useEffect(() => {
    if (!open) return

    let buffer = ''
    let timeout: NodeJS.Timeout

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement) return

      // Clear buffer after 100ms of inactivity
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        buffer = ''
      }, 100)

      // Collect characters
      if (e.key === 'Enter' && buffer.length >= 8) {
        // USB scanner detected
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
        // First, request camera permission explicitly
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { ideal: 'environment' } 
          } 
        })

        // Stop the permission stream immediately (we'll use ZXing's stream)
        stream.getTracks().forEach(track => track.stop())

        // Get available video devices after permission is granted
        const videoDevices = await navigator.mediaDevices.enumerateDevices()
        const cameras = videoDevices.filter((device) => device.kind === 'videoinput')
        setDevices(cameras)

        if (cameras.length === 0) {
          setError(t('inventory.scanner.cameraError'))
          setManualEntry(true)
          return
        }

        // Initialize code reader
        const codeReader = new BrowserMultiFormatReader()
        codeReaderRef.current = codeReader

        const selectedDevice = cameras[currentDeviceIndex] || cameras[0]

        // Start scanning
        await codeReader.decodeFromVideoDevice(
          selectedDevice.deviceId,
          videoRef.current!,
          (result, error) => {
            if (result) {
              const barcode = result.getText()
              onScan(barcode)
              onClose()
            }
            if (error && !(error instanceof NotFoundException)) {
              console.error('Scanner error:', error)
            }
          }
        )
      } catch (err: any) {
        console.error('Camera access error:', err)
        
        // Provide specific error messages based on error type
        let errorMessage = t('inventory.scanner.cameraError')
        
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = t('inventory.scanner.permissionDenied') || 'אישור גישה למצלמה נדרש. אנא אשר גישה בהגדרות הדפדפן.'
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = t('inventory.scanner.noCameraFound') || 'לא נמצאה מצלמה במכשיר זה.'
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = t('inventory.scanner.cameraInUse') || 'המצלמה בשימוש על ידי אפליקציה אחרת.'
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = t('inventory.scanner.unsupportedConstraints') || 'המצלמה אינה תומכת בהגדרות הנדרשות.'
        } else if (err.name === 'TypeError') {
          errorMessage = t('inventory.scanner.notSupported') || 'הדפדפן אינו תומך בגישה למצלמה. אנא השתמש בדפדפן מעודכן.'
        }
        
        setError(errorMessage)
        setManualEntry(true)
      }
    }

    initScanner()

    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset()
      }
    }
  }, [open, manualEntry, currentDeviceIndex, onScan, onClose, t])

  const handleSwitchCamera = () => {
    if (devices.length > 1) {
      setCurrentDeviceIndex((prev) => (prev + 1) % devices.length)
    }
  }

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim())
      onClose()
      setManualBarcode('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {t('inventory.scanner.title')}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {!manualEntry ? (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
              />
            </div>

            <div className="flex gap-2">
              {devices.length > 1 && (
                <Button
                  variant="outline"
                  onClick={handleSwitchCamera}
                  className="flex-1"
                >
                  <SwitchCamera className="w-4 h-4 mr-2" />
                  {t('inventory.scanner.switchCamera')}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setManualEntry(true)}
                className="flex-1"
              >
                <Keyboard className="w-4 h-4 mr-2" />
                {t('inventory.scanner.manualEntry')}
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              {t('inventory.scanner.placeBarcode') || 'Поместите штрих-код в рамку камеры'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Input
                placeholder={t('inventory.barcode')}
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualSubmit()
                }}
                autoFocus
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleManualSubmit} className="flex-1">
                {t('common.save')}
              </Button>
              {devices.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setManualEntry(false)
                    setError('')
                  }}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {t('inventory.scanner.title')}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

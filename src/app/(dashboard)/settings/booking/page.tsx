'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { ArrowLeft, Copy, Check, Download, Printer, QrCode } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import QRCode from 'qrcode'

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

interface WorkingDay {
  enabled: boolean
  start: string
  end: string
}

interface BookingSettings {
  enabled: boolean
  slug: string
  working_hours: Record<typeof DAYS[number], WorkingDay>
  break_times: { start: string; end: string }[]
  slot_duration: number
  min_advance_hours: number
  max_days_ahead: number
  confirm_message_he: string
  confirm_message_ru: string
}

const defaultSettings: BookingSettings = {
  enabled: false,
  slug: '',
  working_hours: {
    sunday: { enabled: true, start: '09:00', end: '17:00' },
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: false, start: '09:00', end: '13:00' },
    saturday: { enabled: false, start: '09:00', end: '13:00' },
  },
  break_times: [{ start: '13:00', end: '14:00' }],
  slot_duration: 60,
  min_advance_hours: 24,
  max_days_ahead: 30,
  confirm_message_he: 'תודה על ההזמנה! נחזור אליך בהקדם.',
  confirm_message_ru: 'Спасибо за запись! Мы свяжемся с вами.',
}

export default function BookingSettingsPage() {
  const { t, language } = useLanguage()
  const { orgId, user } = useAuth()
  const [settings, setSettings] = useState<BookingSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hasBreak, setHasBreak] = useState(true)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [orgName, setOrgName] = useState<string>('')

  // Generate slug from org name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  // Load settings
  useEffect(() => {
    if (!orgId) {
      setLoading(false)
      return
    }

    const loadSettings = async () => {
      try {
        console.log('[BOOKING SETTINGS] Loading for org:', orgId)
        const res = await fetch(`/api/organizations/${orgId}`)
        
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || `HTTP ${res.status}`)
        }

        const { data } = await res.json()
        console.log('[BOOKING SETTINGS] Loaded org data:', data?.name)
        
        // Save org name for QR code
        if (data?.name) {
          setOrgName(data.name)
        }
        
        if (data?.booking_settings) {
          console.log('[BOOKING SETTINGS] Found existing settings')
          setSettings(prev => ({ ...prev, ...data.booking_settings }))
          setHasBreak(data.booking_settings.break_times?.length > 0)
        } else if (data?.slug) {
          console.log('[BOOKING SETTINGS] Found slug, using defaults')
          // If slug exists but no settings, use defaults with that slug
          setSettings(prev => ({ ...prev, slug: data.slug }))
        } else if (data?.name) {
          console.log('[BOOKING SETTINGS] Generating slug from name:', data.name)
          // Auto-generate slug from org name
          const autoSlug = generateSlug(data.name)
          setSettings(prev => ({ ...prev, slug: autoSlug }))
        }
      } catch (error: any) {
        console.error('[BOOKING SETTINGS] Error loading:', error)
        toast.error(error.message || 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [orgId])

  // Generate QR code when slug changes
  useEffect(() => {
    const generateQR = async () => {
      if (!settings.slug) return

      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
        const bookingUrl = `${appUrl}/book/${settings.slug}`
        const qrDataUrl = await QRCode.toDataURL(bookingUrl, {
          width: 512,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        })
        setQrCodeUrl(qrDataUrl)
      } catch (error) {
        console.error('QR generation error:', error)
      }
    }

    generateQR()
  }, [settings.slug])

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return

    const link = document.createElement('a')
    link.download = `${settings.slug}-qr-code.png`
    link.href = qrCodeUrl
    link.click()
    toast.success('QR код скачан!')
  }

  const handlePrintQR = () => {
    if (!qrCodeUrl) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR код - ${orgName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            }
            .container {
              text-align: center;
              padding: 40px;
            }
            h1 {
              font-size: 32px;
              margin-bottom: 10px;
              color: #1a1a1a;
            }
            .emoji {
              font-size: 48px;
              margin-bottom: 20px;
            }
            img {
              max-width: 400px;
              margin: 20px 0;
            }
            p {
              font-size: 20px;
              color: #666;
              margin: 10px 0;
            }
            @media print {
              body {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${orgName}</h1>
            <div class="emoji">📱</div>
            <p>Запишитесь онлайн!</p>
            <p>Сканируйте QR-код</p>
            <img src="${qrCodeUrl}" alt="QR Code" />
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  const handleSave = async () => {
    if (!orgId) {
      toast.error('Organization ID not found')
      return
    }

    console.log('[BOOKING SETTINGS] Saving settings for org:', orgId)
    setSaving(true)
    
    try {
      // Prepare settings with or without break
      const settingsToSave = {
        ...settings,
        break_times: hasBreak ? settings.break_times : [],
      }

      console.log('[BOOKING SETTINGS] Payload:', {
        orgId,
        settings: settingsToSave,
      })

      const res = await fetch(`/api/organizations/booking-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          booking_settings: settingsToSave,
        }),
      })

      const data = await res.json()
      console.log('[BOOKING SETTINGS] Response:', { status: res.status, data })

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`)
      }

      toast.success(t('booking.saved'))
    } catch (error: any) {
      console.error('[BOOKING SETTINGS] Error saving:', error)
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const copyBookingLink = () => {
    const link = `https://ambersol.co.il/book/${settings.slug}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success(t('booking.slug.copied'))
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('booking.title')}
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
            {t('booking.subtitle')}
          </p>
        </div>
      </div>

      {/* Enable Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>{t('booking.enabled')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between w-full min-h-[44px] gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">
              {t('booking.enabled.desc')}
            </p>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Slug */}
      <Card>
        <CardHeader>
          <CardTitle>{t('booking.slug')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="slug" className="text-sm">{t('booking.slug.desc')}</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="slug"
                value={settings.slug}
                onChange={(e) =>
                  setSettings({ ...settings, slug: e.target.value })
                }
                placeholder={t('booking.slug.placeholder')}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyBookingLink}
                disabled={!settings.slug}
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('booking.slug.preview')}:
              </p>
              <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 font-mono break-all">
                ambersol.co.il/book/{settings.slug || '...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card>
        <CardHeader>
          <CardTitle>{t('booking.workingHours')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('booking.workingHours.desc')}
          </p>
          
          <div className="space-y-3 overflow-hidden">
            {DAYS.map((day) => (
              <div key={day} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
                {/* Mobile: Vertical Layout */}
                <div className="flex flex-col gap-3 md:hidden">
                  {/* Day name + toggle */}
                  <div className="flex items-center justify-between w-full min-h-[44px]">
                    <span className="font-medium text-sm">{t(`booking.day.${day}`)}</span>
                    <Switch
                      checked={settings.working_hours[day].enabled}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          working_hours: {
                            ...settings.working_hours,
                            [day]: { ...settings.working_hours[day], enabled: checked },
                          },
                        })
                      }
                    />
                  </div>
                  
                  {/* Time inputs (if enabled) */}
                  {settings.working_hours[day].enabled && (
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex-1 min-w-0">
                        <Label className="text-xs block mb-1">{t('booking.hours.start')}</Label>
                        <Input
                          type="time"
                          value={settings.working_hours[day].start}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              working_hours: {
                                ...settings.working_hours,
                                [day]: { ...settings.working_hours[day], start: e.target.value },
                              },
                            })
                          }
                          className="w-full max-w-[100px] dark:bg-gray-700 dark:border-gray-600 text-sm"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Label className="text-xs block mb-1">{t('booking.hours.end')}</Label>
                        <Input
                          type="time"
                          value={settings.working_hours[day].end}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              working_hours: {
                                ...settings.working_hours,
                                [day]: { ...settings.working_hours[day], end: e.target.value },
                              },
                            })
                          }
                          className="w-full max-w-[100px] dark:bg-gray-700 dark:border-gray-600 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop: Horizontal Layout */}
                <div className="hidden md:flex md:items-center md:gap-4">
                  <div className="w-28 flex-shrink-0">
                    <span className="font-medium">{t(`booking.day.${day}`)}</span>
                  </div>
                  <Switch
                    checked={settings.working_hours[day].enabled}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        working_hours: {
                          ...settings.working_hours,
                          [day]: { ...settings.working_hours[day], enabled: checked },
                        },
                      })
                    }
                  />
                  {settings.working_hours[day].enabled && (
                    <>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">{t('booking.hours.start')}</Label>
                        <Input
                          type="time"
                          value={settings.working_hours[day].start}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              working_hours: {
                                ...settings.working_hours,
                                [day]: { ...settings.working_hours[day], start: e.target.value },
                              },
                            })
                          }
                          className="w-32 dark:bg-gray-700 dark:border-gray-600"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">{t('booking.hours.end')}</Label>
                        <Input
                          type="time"
                          value={settings.working_hours[day].end}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              working_hours: {
                                ...settings.working_hours,
                                [day]: { ...settings.working_hours[day], end: e.target.value },
                              },
                            })
                          }
                          className="w-32 dark:bg-gray-700 dark:border-gray-600"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Break Times */}
      <Card>
        <CardHeader>
          <CardTitle>{t('booking.break')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between w-full min-h-[44px] gap-4">
            <Label className="flex-1">{t('booking.break.enabled')}</Label>
            <Switch
              checked={hasBreak}
              onCheckedChange={setHasBreak}
            />
          </div>
          
          {hasBreak && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
              {/* Mobile: Vertical */}
              <div className="flex flex-col gap-3 md:hidden">
                <div className="flex-1 min-w-0">
                  <Label className="text-xs block mb-1">{t('booking.break.start')}</Label>
                  <Input
                    type="time"
                    value={settings.break_times[0]?.start || '13:00'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        break_times: [
                          { ...settings.break_times[0], start: e.target.value },
                        ],
                      })
                    }
                    className="w-full max-w-[100px] dark:bg-gray-700 dark:border-gray-600 text-sm"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="text-xs block mb-1">{t('booking.break.end')}</Label>
                  <Input
                    type="time"
                    value={settings.break_times[0]?.end || '14:00'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        break_times: [
                          { ...settings.break_times[0], end: e.target.value },
                        ],
                      })
                    }
                    className="w-full max-w-[100px] dark:bg-gray-700 dark:border-gray-600 text-sm"
                  />
                </div>
              </div>

              {/* Desktop: Horizontal */}
              <div className="hidden md:flex md:items-center md:gap-4">
                <div className="flex items-center gap-2">
                  <Label>{t('booking.break.start')}</Label>
                  <Input
                    type="time"
                    value={settings.break_times[0]?.start || '13:00'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        break_times: [
                          { ...settings.break_times[0], start: e.target.value },
                        ],
                      })
                    }
                    className="w-32 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>{t('booking.break.end')}</Label>
                  <Input
                    type="time"
                    value={settings.break_times[0]?.end || '14:00'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        break_times: [
                          { ...settings.break_times[0], end: e.target.value },
                        ],
                      })
                    }
                    className="w-32 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Duration & Advance Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Slot Duration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">{t('booking.slotDuration')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-3">
              {t('booking.slotDuration.desc')}
            </p>
            <Select
              value={settings.slot_duration.toString()}
              onValueChange={(value) =>
                setSettings({ ...settings, slot_duration: parseInt(value) })
              }
            >
              <SelectTrigger className="w-full dark:bg-gray-700 dark:border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700">
                {[15, 30, 45, 60].map((minutes) => (
                  <SelectItem key={minutes} value={minutes.toString()} className="dark:text-white">
                    {minutes} דקות / минут
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Min Advance Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">{t('booking.minAdvanceHours')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-3">
              {t('booking.minAdvanceHours.desc')}
            </p>
            <Select
              value={settings.min_advance_hours.toString()}
              onValueChange={(value) =>
                setSettings({ ...settings, min_advance_hours: parseInt(value) })
              }
            >
              <SelectTrigger className="w-full dark:bg-gray-700 dark:border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700">
                {[1, 2, 3, 4, 6, 12, 24].map((hours) => (
                  <SelectItem key={hours} value={hours.toString()} className="dark:text-white">
                    {hours} שעות / часов
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Max Days Ahead */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">{t('booking.maxDaysAhead')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-3">
              {t('booking.maxDaysAhead.desc')}
            </p>
            <Select
              value={settings.max_days_ahead.toString()}
              onValueChange={(value) =>
                setSettings({ ...settings, max_days_ahead: parseInt(value) })
              }
            >
              <SelectTrigger className="w-full dark:bg-gray-700 dark:border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700">
                {[7, 14, 30, 60].map((days) => (
                  <SelectItem key={days} value={days.toString()} className="dark:text-white">
                    {days} ימים / дней
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">{t('booking.confirmMessage')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden">
            <Label htmlFor="msg-he" className="text-sm">{t('booking.confirmMessage.desc')}</Label>
            <Textarea
              id="msg-he"
              value={settings.confirm_message_he}
              onChange={(e) =>
                setSettings({ ...settings, confirm_message_he: e.target.value })
              }
              placeholder={t('booking.confirmMessage.placeholder')}
              rows={3}
              className="mt-2 w-full dark:bg-gray-700 dark:border-gray-600 text-sm resize-none"
            />
          </div>
          <div className="overflow-hidden">
            <Label htmlFor="msg-ru" className="text-sm">{t('booking.confirmMessageRu.desc')}</Label>
            <Textarea
              id="msg-ru"
              value={settings.confirm_message_ru}
              onChange={(e) =>
                setSettings({ ...settings, confirm_message_ru: e.target.value })
              }
              placeholder={t('booking.confirmMessageRu.placeholder')}
              rows={3}
              className="mt-2 w-full dark:bg-gray-700 dark:border-gray-600 text-sm resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* QR Code Section */}
      {settings.slug && qrCodeUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR-код для клиентов / קוד QR ללקוחות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
              Клиенты могут отсканировать этот QR-код чтобы перейти на страницу онлайн-записи
            </p>
            
            {/* QR Code Display */}
            <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-64 h-64 mb-4"
              />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {orgName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Ссылка: {process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/book/{settings.slug}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const url = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/book/${settings.slug}`
                    navigator.clipboard.writeText(url)
                    toast.success('Ссылка скопирована!')
                  }}
                  className="text-xs"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Скопировать ссылку
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleDownloadQR}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Download className="w-4 h-4" />
                Скачать QR
              </Button>
              <Button
                onClick={handlePrintQR}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Printer className="w-4 h-4" />
                Печать
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end pb-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="w-full md:w-auto md:min-w-[200px]"
        >
          {saving ? t('booking.saving') : t('booking.save')}
        </Button>
      </div>
    </div>
  )
}

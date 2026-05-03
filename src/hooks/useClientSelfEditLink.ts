'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface GenerateLinkResult {
  url: string
  expires_at: string
}

export function useClientSelfEditLink(locale: 'he' | 'ru' = 'he') {
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastUrl, setLastUrl] = useState<string | null>(null)

  const generateLink = useCallback(async (clientId: string): Promise<string | null> => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/client-self-edit/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to generate link')
      }

      const data: GenerateLinkResult = await res.json()
      setLastUrl(data.url)

      // Copy to clipboard
      await navigator.clipboard.writeText(data.url)
      toast.success(
        locale === 'he' ? '🔗 הקישור הועתק ללוח!' : '🔗 Ссылка скопирована!',
        {
          description: locale === 'he'
            ? 'הקישור תקף ל-24 שעות'
            : 'Ссылка действительна 24 часа',
          duration: 4000,
        }
      )

      return data.url
    } catch (err: any) {
      toast.error(
        locale === 'he' ? 'שגיאה ביצירת הקישור' : 'Ошибка генерации ссылки',
        { description: err.message }
      )
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [locale])

  return { generateLink, isGenerating, lastUrl }
}

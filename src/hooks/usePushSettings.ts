'use client'

import { useState, useEffect, useCallback } from 'react'
// Тип и константа вынесены в lib/push-settings.ts (route-файл не может экспортировать не-HTTP-хэндлеры)
import { type PushSettings, DEFAULT_PUSH_SETTINGS } from '@/lib/push-settings'

export type { PushSettings }
export { DEFAULT_PUSH_SETTINGS }

export function usePushSettings() {
  const [settings, setSettings] = useState<PushSettings>(DEFAULT_PUSH_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/push/settings')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setSettings(data.settings)
    } catch (err) {
      console.error('[usePushSettings] load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const updateSetting = useCallback(async (key: keyof PushSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaving(true)
    try {
      const res = await fetch('/api/push/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { [key]: value } }),
      })
      if (!res.ok) {
        setSettings(prev => ({ ...prev, [key]: !value }))
        throw new Error('Failed to save')
      }
    } catch (err) {
      console.error('[usePushSettings] save error:', err)
    } finally {
      setSaving(false)
    }
  }, [])

  return { settings, loading, saving, updateSetting }
}

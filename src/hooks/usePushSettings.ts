'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PushSettings } from '@/app/api/push/settings/route'

export type { PushSettings }

export const DEFAULT_PUSH_SETTINGS: PushSettings = {
  new_visit: true,
  visit_reminder: true,
  new_payment: true,
  new_client: false,
  birthday: false,
}

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
    // Optimistic update
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaving(true)
    try {
      const res = await fetch('/api/push/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { [key]: value } }),
      })
      if (!res.ok) {
        // Revert on error
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

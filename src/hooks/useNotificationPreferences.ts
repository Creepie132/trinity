'use client'

/**
 * useNotificationPreferences
 * Загружает и сохраняет настройки уведомлений из таблицы notification_preferences.
 * Optimistic UI: каждый toggle обновляет стейт немедленно, откат при ошибке.
 */

import { useState, useEffect, useCallback } from 'react'

// ─── Types (зеркало серверного route.ts) ─────────────────────────────────────

export interface NotifChannels {
  push: boolean
  telegram: boolean
  email: boolean
}

export interface NotificationPreferences {
  [eventKey: string]: NotifChannels
}

export const DEFAULT_CHANNELS: NotifChannels = {
  push: true,
  telegram: false,
  email: false,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    fetch('/api/notifications/preferences')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        if (!cancelled) setPreferences(data.preferences ?? {})
      })
      .catch(err => console.error('[useNotificationPreferences] load:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // ── Toggle a single channel for an event (optimistic) ─────────────────────
  const toggleChannel = useCallback(async (
    eventKey: string,
    channel: keyof NotifChannels,
    value: boolean,
  ) => {
    const key = `${eventKey}:${channel}`
    const prev = preferences

    // Optimistic
    setPreferences(p => ({
      ...p,
      [eventKey]: { ...(p[eventKey] ?? DEFAULT_CHANNELS), [channel]: value },
    }))
    setSavingKey(key)

    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventKey, channel, value }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      console.error('[useNotificationPreferences] save error:', err)
      setPreferences(prev)   // revert
    } finally {
      setSavingKey(null)
    }
  }, [preferences])

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Returns channels for an event, falling back to DEFAULT_CHANNELS */
  const getChannels = useCallback((eventKey: string): NotifChannels => {
    return preferences[eventKey] ?? DEFAULT_CHANNELS
  }, [preferences])

  const isSaving = useCallback((eventKey: string, channel: keyof NotifChannels) => {
    return savingKey === `${eventKey}:${channel}`
  }, [savingKey])

  return {
    preferences,
    loading,
    savingKey,
    toggleChannel,
    getChannels,
    isSaving,
  }
}

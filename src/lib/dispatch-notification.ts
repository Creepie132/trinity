/**
 * dispatch-notification.ts
 * Server-side helper: вызывает Edge Function `send-notification`.
 *
 * Использование (новый API с шаблонами):
 *   await dispatchNotification({
 *     event_type: 'new_visit',
 *     org_id,
 *     template: { key: 'new_visit', vars: { time: '14:30', service: 'Маникюр' } }
 *   })
 *
 * Использование (legacy API — готовые title/body, без локализации):
 *   await dispatchNotification({
 *     event_type: 'new_visit', org_id,
 *     payload: { title, body, url }
 *   })
 *
 * Fire-and-forget — никогда не бросает, не блокирует caller.
 * Если Edge Function недоступна — логирует и продолжает.
 */

export interface NotifPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

export interface NotifTemplate {
  /** Ключ шаблона в Edge Function (должен существовать в TEMPLATES) */
  key: string
  /** Переменные для подстановки в шаблон вида {name} */
  vars?: Record<string, string | number>
}

export interface DispatchNotificationParams {
  event_type: string
  org_id: string
  /** Новый API — локализованные шаблоны (предпочтительно) */
  template?: NotifTemplate
  /** Legacy API — готовые title/body (fallback, без локализации) */
  payload?: Partial<NotifPayload>
}

export async function dispatchNotification(params: DispatchNotificationParams): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('[dispatchNotification] Missing SUPABASE env vars')
    return
  }

  if (!params.template && !params.payload?.title) {
    console.error('[dispatchNotification] Either template or payload.title required')
    return
  }

  const url = `${supabaseUrl}/functions/v1/send-notification`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(params),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`[dispatchNotification] ${params.event_type} → HTTP ${res.status}: ${text}`)
    } else {
      const data = await res.json()
      console.log(`[dispatchNotification] ${params.event_type}`, data)
    }
  } catch (err) {
    // Fire-and-forget: не бросаем, не блокируем основной запрос
    console.error('[dispatchNotification] fetch error:', err)
  }
}

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// ─── Validation schema ────────────────────────────────────────────────────────
const WebsiteSettingsSchema = z.object({
  hero_title:      z.string().max(255).optional().nullable(),
  hero_subtitle:   z.string().max(1000).optional().nullable(),
  hero_image_url:  z.string().optional().nullable(),
  seo_description: z.string().max(500).optional().nullable(),
  social_links: z.object({
    instagram:  z.string().optional().nullable(),
    facebook:   z.string().optional().nullable(),
    whatsapp:   z.string().optional().nullable(),
  }).optional().default({}),
})

export type WebsiteSettingsInput = z.infer<typeof WebsiteSettingsSchema>

export interface SaveWebsiteSettingsResult {
  success: boolean
  error?: string
  revalidated?: boolean
}

// ─── BM revalidate config ─────────────────────────────────────────────────────
const BM_REVALIDATE_URL = process.env.BM_REVALIDATE_URL ?? ''
const BM_REVALIDATE_SECRET = process.env.BM_REVALIDATE_SECRET ?? ''

// ─── Main action ──────────────────────────────────────────────────────────────
export async function saveWebsiteSettings(
  input: WebsiteSettingsInput
): Promise<SaveWebsiteSettingsResult> {
  // 1. Auth check
  const auth = await getAuthContext()
  if ('error' in auth) return { success: false, error: 'Unauthorized' }
  if (auth.orgRole !== 'owner' && auth.orgRole !== 'moderator' && !auth.isAdmin) {
    return { success: false, error: 'Insufficient permissions' }
  }

  // 2. Validate input
  const parsed = WebsiteSettingsSchema.safeParse(input)
  if (!parsed.success) {
    // Zod v4: .issues (v3 used .errors)
    const issues = parsed.error.issues ?? (parsed.error as any).errors ?? []
    return { success: false, error: issues[0]?.message ?? 'Invalid data' }
  }

  const data = parsed.data
  const orgId = auth.orgId

  // 3. Upsert via service role (RLS bypass safe — auth already verified above)
  const service = createSupabaseServiceClient()
  const { error: dbError } = await service
    .from('website_settings')
    .upsert(
      {
        org_id:          orgId,
        hero_title:      data.hero_title      ?? null,
        hero_subtitle:   data.hero_subtitle   ?? null,
        hero_image_url:  data.hero_image_url  || null,
        seo_description: data.seo_description ?? null,
        social_links:    data.social_links    ?? {},
      },
      { onConflict: 'org_id' }
    )

  if (dbError) {
    console.error('[website-settings] DB upsert error:', dbError)
    return { success: false, error: 'Failed to save settings' }
  }

  // 4. Revalidate Trinity UI cache
  revalidatePath('/office/website/settings')

  // 5. Trigger Beautymania site revalidation (fire-and-forget with timeout)
  let revalidated = false
  if (BM_REVALIDATE_URL) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(BM_REVALIDATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': BM_REVALIDATE_SECRET,
        },
        body: JSON.stringify({ org_id: orgId, tag: 'website-settings' }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      revalidated = res.ok
      if (!res.ok) console.warn('[website-settings] Revalidate webhook non-ok:', res.status)
    } catch (e: any) {
      // Timeout or network — не блокируем успешный save
      console.warn('[website-settings] Revalidate webhook failed:', e?.message)
    }
  }

  return { success: true, revalidated }
}

// ─── Load action (SSR prefetch) ───────────────────────────────────────────────
export async function loadWebsiteSettings(): Promise<WebsiteSettingsInput | null> {
  const auth = await getAuthContext()
  if ('error' in auth) return null

  const service = createSupabaseServiceClient()
  const { data, error } = await service
    .from('website_settings')
    .select('hero_title, hero_subtitle, hero_image_url, seo_description, social_links')
    .eq('org_id', auth.orgId)
    .maybeSingle()

  if (error) {
    console.error('[website-settings] Load error:', error)
    return null
  }

  return data as WebsiteSettingsInput | null
}
